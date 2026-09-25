var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, U = Math.min(W, H) / 20;
var HORIZ = W >= H;
var PADDLE_LEN = HORIZ ? H * 0.22 : W * 0.22;
var PADDLE_THICK = U * 0.6;
var PADDLE_MARGIN = U * 1.3;
var BALL_R = U * 0.42;
var BASE_SPEED = U * 9;
var MAX_SPEED = U * 20;
var PLAYER_SPEED = U * 13;
var WIN_SCORE = 7;
var COL_BG1 = '#0a0e1a', COL_BG2 = '#131a2e';
var COL_PLAYER = '#38f2ff', COL_AI = '#ff3fa4', COL_BALL = '#fff6d8', COL_LINE = 'rgba(255,255,255,0.18)';
var bgGrad = ctx.createLinearGradient(0, 0, W, H);
bgGrad.addColorStop(0, COL_BG2);
bgGrad.addColorStop(1, COL_BG1);
var stars = [];
for (var s = 0; s < 24; s++) { stars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * U * 0.12 + U * 0.03, ph: Math.random() * 6.28 }); }
var audioCtx = null;
function initAudio() { if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; } } }
function playTone(freq, dur, type, vol) {
  if (!audioCtx) return;
  try {
    var t0 = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + dur);
  } catch (e) {}
}
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function makeParticlePool(n) { var arr = []; for (var i = 0; i < n; i++) arr.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, color: '#fff', size: 2 }); return arr; }
function makeFloatPool(n) { var arr = []; for (var i = 0; i < n; i++) arr.push({ active: false, x: 0, y: 0, text: '', life: 0, maxLife: 1, color: '#fff' }); return arr; }
function newGame(best) {
  return {
    phase: 'start', usedTouch: false, time: 0,
    score: { player: 0, ai: 0 }, best: best || 0, winner: null,
    ball: { x: W / 2, y: H / 2, vx: 0, vy: 0, speed: BASE_SPEED },
    serving: true, serveTimer: 0.9, serveDir: Math.random() < 0.5 ? 1 : -1,
    player: { pos: HORIZ ? H / 2 : W / 2 },
    ai: { pos: HORIZ ? H / 2 : W / 2 },
    rally: 0, level: 1, shake: 0, flash: 0,
    keys: { up: false, down: false },
    touch: { dragId: null, dragVal: null, upId: null, downId: null },
    particles: makeParticlePool(50), floats: makeFloatPool(8)
  };
}
var game = newGame(0);
function spawnParticles(x, y, color, count, spd) {
  var n = 0;
  for (var i = 0; i < game.particles.length && n < count; i++) {
    var p = game.particles[i];
    if (!p.active) {
      p.active = true; p.x = x; p.y = y;
      var ang = Math.random() * 6.283;
      var sp = (spd || U * 4) * (0.4 + Math.random() * 0.8);
      p.vx = Math.cos(ang) * sp; p.vy = Math.sin(ang) * sp;
      p.life = p.maxLife = 0.4 + Math.random() * 0.3;
      p.color = color; p.size = U * (0.08 + Math.random() * 0.1);
      n++;
    }
  }
}
function spawnFloat(x, y, text, color) {
  for (var i = 0; i < game.floats.length; i++) {
    var f = game.floats[i];
    if (!f.active) { f.active = true; f.x = x; f.y = y; f.text = text; f.color = color; f.life = f.maxLife = 1.0; return; }
  }
}
function getRect(who) {
  if (who === 'player') {
    if (HORIZ) return { x: PADDLE_MARGIN - PADDLE_THICK / 2, y: game.player.pos - PADDLE_LEN / 2, w: PADDLE_THICK, h: PADDLE_LEN };
    return { x: game.player.pos - PADDLE_LEN / 2, y: H - PADDLE_MARGIN - PADDLE_THICK / 2, w: PADDLE_LEN, h: PADDLE_THICK };
  } else {
    if (HORIZ) return { x: W - PADDLE_MARGIN - PADDLE_THICK / 2, y: game.ai.pos - PADDLE_LEN / 2, w: PADDLE_THICK, h: PADDLE_LEN };
    return { x: game.ai.pos - PADDLE_LEN / 2, y: PADDLE_MARGIN - PADDLE_THICK / 2, w: PADDLE_LEN, h: PADDLE_THICK };
  }
}
function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  var cxp = clamp(cx, rx, rx + rw), cyp = clamp(cy, ry, ry + rh);
  var dx = cx - cxp, dy = cy - cyp;
  return dx * dx + dy * dy <= r * r;
}
function launchBall() {
  var b = game.ball;
  var ang = (Math.random() * 0.6 - 0.3);
  b.speed = BASE_SPEED;
  if (HORIZ) { b.vx = game.serveDir * b.speed * Math.cos(ang); b.vy = b.speed * Math.sin(ang); }
  else { b.vy = game.serveDir * b.speed * Math.cos(ang); b.vx = b.speed * Math.sin(ang); }
  game.serving = false;
}
function startServe(dir) {
  game.serveDir = dir; game.serving = true; game.serveTimer = 0.8;
  game.ball.x = W / 2; game.ball.y = H / 2; game.ball.vx = 0; game.ball.vy = 0;
}
function paddleBounce(who) {
  var r = getRect(who);
  var b = game.ball;
  var offset, angle;
  b.speed = Math.min(MAX_SPEED, b.speed * 1.06);
  game.rally++; game.level = 1 + Math.floor(game.rally / 4);
  if (HORIZ) {
    offset = clamp((b.y - (r.y + r.h / 2)) / (r.h / 2), -1, 1);
    angle = offset * 0.95;
    var dir = who === 'player' ? 1 : -1;
    b.vx = dir * b.speed * Math.cos(angle);
    b.vy = b.speed * Math.sin(angle);
    b.x = who === 'player' ? r.x + r.w + BALL_R + 0.5 : r.x - BALL_R - 0.5;
    spawnParticles(b.x, b.y, who === 'player' ? COL_PLAYER : COL_AI, 12);
  } else {
    offset = clamp((b.x - (r.x + r.w / 2)) / (r.w / 2), -1, 1);
    angle = offset * 0.95;
    var dirv = who === 'player' ? -1 : 1;
    b.vy = dirv * b.speed * Math.cos(angle);
    b.vx = b.speed * Math.sin(angle);
    b.y = who === 'player' ? r.y - BALL_R - 0.5 : r.y + r.h + BALL_R + 0.5;
    spawnParticles(b.x, b.y, who === 'player' ? COL_PLAYER : COL_AI, 12);
  }
  playTone(who === 'player' ? 220 : 180, 0.08, 'square', 0.09);
}
function addScore(who) {
  game.score[who]++;
  game.best = Math.max(game.best, game.score.player);
  game.shake = U * 0.5; game.flash = 0.35;
  var col = who === 'player' ? COL_PLAYER : COL_AI;
  spawnFloat(W / 2, H / 2 - U, '+1 ' + (who === 'player' ? 'YOU' : 'AI'), col);
  spawnParticles(W / 2, H / 2, col, 20, U * 6);
  playTone(who === 'player' ? 520 : 140, 0.25, 'sawtooth', 0.1);
  if (game.score[who] >= WIN_SCORE) {
    game.phase = 'over'; game.winner = who;
    playTone(who === 'player' ? 660 : 110, 0.5, who === 'player' ? 'triangle' : 'sawtooth', 0.12);
  } else {
    startServe(who === 'player' ? -1 : 1);
  }
}
function updatePlay(dt) {
  var b = game.ball;
  var dir = 0;
  if (game.keys.up || game.touch.upId !== null) dir -= 1;
  if (game.keys.down || game.touch.downId !== null) dir += 1;
  if (game.touch.dragVal !== null) {
    game.player.pos = game.touch.dragVal;
  } else if (dir !== 0) {
    game.player.pos += dir * PLAYER_SPEED * dt;
  }
  var half = PADDLE_LEN / 2, lim = (HORIZ ? H : W) - half - U * 0.2;
  game.player.pos = clamp(game.player.pos, half + U * 0.2, lim);
  var target = HORIZ ? b.y : b.x;
  var aiSpeed = U * (7 + game.level * 1.3);
  var diff = target - game.ai.pos;
  var move = clamp(diff, -aiSpeed * dt, aiSpeed * dt);
  game.ai.pos = clamp(game.ai.pos + move, half + U * 0.2, lim);
  if (game.serving) {
    game.serveTimer -= dt;
    if (game.serveTimer <= 0) launchBall();
    return;
  }
  b.x += b.vx * dt; b.y += b.vy * dt;
  if (HORIZ) {
    if (b.y - BALL_R < 0) { b.y = BALL_R; b.vy = Math.abs(b.vy); spawnParticles(b.x, 0, COL_BALL, 6); playTone(440, 0.05, 'sine', 0.05); }
    if (b.y + BALL_R > H) { b.y = H - BALL_R; b.vy = -Math.abs(b.vy); spawnParticles(b.x, H, COL_BALL, 6); playTone(440, 0.05, 'sine', 0.05); }
  } else {
    if (b.x - BALL_R < 0) { b.x = BALL_R; b.vx = Math.abs(b.vx); spawnParticles(0, b.y, COL_BALL, 6); playTone(440, 0.05, 'sine', 0.05); }
    if (b.x + BALL_R > W) { b.x = W - BALL_R; b.vx = -Math.abs(b.vx); spawnParticles(W, b.y, COL_BALL, 6); playTone(440, 0.05, 'sine', 0.05); }
  }
  var pr = getRect('player'), ar = getRect('ai');
  if (HORIZ) {
    if (b.vx < 0 && circleRectHit(b.x, b.y, BALL_R, pr.x, pr.y, pr.w, pr.h)) paddleBounce('player');
    else if (b.vx > 0 && circleRectHit(b.x, b.y, BALL_R, ar.x, ar.y, ar.w, ar.h)) paddleBounce('ai');
  } else {
    if (b.vy < 0 && circleRectHit(b.x, b.y, BALL_R, ar.x, ar.y, ar.w, ar.h)) paddleBounce('ai');
    else if (b.vy > 0 && circleRectHit(b.x, b.y, BALL_R, pr.x, pr.y, pr.w, pr.h)) paddleBounce('player');
  }
  if (HORIZ) { if (b.x < -BALL_R * 2) addScore('ai'); else if (b.x > W + BALL_R * 2) addScore('player'); }
  else { if (b.y < -BALL_R * 2) addScore('player'); else if (b.y > H + BALL_R * 2) addScore('ai'); }
}
function update(dt) {
  game.time += dt;
  if (game.phase === 'play') updatePlay(dt);
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * U * 3);
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 1.2);
  var i;
  for (i = 0; i < game.particles.length; i++) {
    var p = game.particles[i];
    if (p.active) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; if (p.life <= 0) p.active = false; }
  }
  for (i = 0; i < game.floats.length; i++) {
    var f = game.floats[i];
    if (f.active) { f.y -= U * 1.2 * dt; f.life -= dt * 0.7; if (f.life <= 0) f.active = false; }
  }
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawPaddle(rect, color) {
  ctx.save();
  ctx.shadowColor = color; ctx.shadowBlur = U * 0.6;
  ctx.fillStyle = color;
  roundRect(rect.x, rect.y, rect.w, rect.h, Math.min(rect.w, rect.h) * 0.4);
  ctx.fill();
  ctx.restore();
}
function drawText(text, x, y, size, color, align) {
  ctx.font = '700 ' + size + 'px system-ui, sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.15;
  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
function drawPanel(x, y, w, h) {
  ctx.fillStyle = 'rgba(5,8,16,0.72)';
  roundRect(x, y, w, h, U * 0.4);
  ctx.fill();
}
function drawButtons() {
  var bs = Math.max(U * 2.4, 48 / (canvas.clientWidth ? (canvas.width / canvas.clientWidth) : 1));
  bs = U * 2.2;
  var margin = U * 0.6;
  var y = H - bs - margin;
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = '#ffffff';
  roundRect(margin, y, bs, bs, U * 0.4); ctx.fill();
  roundRect(margin + bs + margin * 0.6, y, bs, bs, U * 0.4); ctx.fill();
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = '#0a0e1a';
  ctx.beginPath();
  var cx1 = margin + bs / 2, cy = y + bs / 2;
  ctx.moveTo(cx1, cy - bs * 0.22); ctx.lineTo(cx1 - bs * 0.2, cy + bs * 0.15); ctx.lineTo(cx1 + bs * 0.2, cy + bs * 0.15); ctx.closePath(); ctx.fill();
  var cx2 = margin + bs + margin * 0.6 + bs / 2;
  ctx.beginPath();
  ctx.moveTo(cx2, cy + bs * 0.22); ctx.lineTo(cx2 - bs * 0.2, cy - bs * 0.15); ctx.lineTo(cx2 + bs * 0.2, cy - bs * 0.15); ctx.closePath(); ctx.fill();
  ctx.restore();
  game._btnUp = { x: margin, y: y, w: bs, h: bs };
  game._btnDown = { x: margin + bs + margin * 0.6, y: y, w: bs, h: bs };
}
function draw() {
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  ctx.fillStyle = bgGrad; ctx.fillRect(-10, -10, W + 20, H + 20);
  var i;
  ctx.fillStyle = '#ffffff';
  for (i = 0; i < stars.length; i++) {
    var st = stars[i];
    ctx.globalAlpha = 0.15 + 0.15 * Math.sin(game.time * 1.5 + st.ph);
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, 6.283); ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COL_LINE; ctx.lineWidth = U * 0.1;
  ctx.setLineDash([U * 0.4, U * 0.4]);
  ctx.beginPath();
  if (HORIZ) { ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); } else { ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); }
  ctx.stroke(); ctx.setLineDash([]);
  drawPaddle(getRect('player'), COL_PLAYER);
  drawPaddle(getRect('ai'), COL_AI);
  if (game.phase === 'play' || game.phase === 'over') {
    ctx.save();
    ctx.shadowColor = COL_BALL; ctx.shadowBlur = U * 0.8;
    ctx.fillStyle = COL_BALL;
    ctx.beginPath(); ctx.arc(game.ball.x, game.ball.y, BALL_R, 0, 6.283); ctx.fill();
    ctx.restore();
  }
  for (i = 0; i < game.particles.length; i++) {
    var p = game.particles[i];
    if (p.active) { ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.283); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  for (i = 0; i < game.floats.length; i++) {
    var f = game.floats[i];
    if (f.active) { ctx.globalAlpha = Math.max(0, f.life / f.maxLife); drawText(f.text, f.x, f.y, U * 1.1, f.color); }
  }
  ctx.globalAlpha = 1;
  ctx.restore();
  if (game.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (game.flash * 0.5) + ')'; ctx.fillRect(0, 0, W, H); }
  drawPanel(U * 0.4, U * 0.3, W - U * 0.8, U * 1.6);
  drawText(game.score.player + '  -  ' + game.score.ai, W / 2, U * 1.1, U * 1.1, '#ffffff');
  drawText('BEST ' + game.best, U * 1.3, U * 1.1, U * 0.6, '#9fe8ff', 'left');
  drawText('LV ' + game.level, W - U * 1.3, U * 1.1, U * 0.6, '#ff9fd0', 'right');
  if (game.usedTouch && game.phase === 'play') drawButtons();
  if (game.phase === 'start') {
    drawPanel(W / 2 - U * 6, H / 2 - U * 4, U * 12, U * 8);
    drawText('NEON PONG', W / 2, H / 2 - U * 2.4, U * 1.4, COL_PLAYER);
    drawText('Arrows/WASD or drag to move', W / 2, H / 2 - U * 0.6, U * 0.55, '#dddddd');
    drawText('First to ' + WIN_SCORE + ' wins', W / 2, H / 2 + U * 0.4, U * 0.55, '#dddddd');
    drawText('Tap or click to start', W / 2, H / 2 + U * 2, U * 0.7, '#ffe27a');
  } else if (game.phase === 'paused') {
    drawPanel(W / 2 - U * 5, H / 2 - U * 2, U * 10, U * 4);
    drawText('Tap or click to continue', W / 2, H / 2, U * 0.8, '#ffe27a');
  } else if (game.phase === 'over') {
    drawPanel(W / 2 - U * 6, H / 2 - U * 3.5, U * 12, U * 7);
    var win = game.winner === 'player';
    drawText(win ? 'YOU WIN!' : 'AI WINS', W / 2, H / 2 - U * 1.6, U * 1.4, win ? COL_PLAYER : COL_AI);
    drawText('Score  ' + game.score.player + ' - ' + game.score.ai, W / 2, H / 2 - U * 0.2, U * 0.7, '#ffffff');
    drawText('Best ' + game.best, W / 2, H / 2 + U * 0.7, U * 0.6, '#9fe8ff');
    drawText('Tap or press Space to play again', W / 2, H / 2 + U * 2, U * 0.65, '#ffe27a');
  }
}
function getPos(e) { var rect = canvas.getBoundingClientRect(); var sx = canvas.width / rect.width, sy = canvas.height / rect.height; return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy }; }
function inBtn(pos, b) { return b && pos.x >= b.x && pos.x <= b.x + b.w && pos.y >= b.y && pos.y <= b.y + b.h; }
function dragValFromPos(pos) { return HORIZ ? pos.y : pos.x; }
canvas.addEventListener('pointerdown', function (e) {
  initAudio();
  var pos = getPos(e);
  if (e.pointerType === 'touch') game.usedTouch = true;
  if (game.phase === 'over') { game = newGame(game.best); game.usedTouch = true; }
  if (game.phase !== 'play') { game.phase = 'play'; return; }
  if (game.usedTouch && inBtn(pos, game._btnUp)) { game.touch.upId = e.pointerId; }
  else if (game.usedTouch && inBtn(pos, game._btnDown)) { game.touch.downId = e.pointerId; }
  else { game.touch.dragId = e.pointerId; game.touch.dragVal = dragValFromPos(pos); }
});
canvas.addEventListener('pointermove', function (e) {
  if (game.touch.dragId === e.pointerId) { game.touch.dragVal = dragValFromPos(getPos(e)); }
});
function releasePointer(e) {
  if (game.touch.dragId === e.pointerId) { game.touch.dragId = null; game.touch.dragVal = null; }
  if (game.touch.upId === e.pointerId) game.touch.upId = null;
  if (game.touch.downId === e.pointerId) game.touch.downId = null;
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
window.addEventListener('keydown', function (e) {
  var k = e.key;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D', ' '].indexOf(k) !== -1) e.preventDefault();
  initAudio();
  if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'w' || k === 'a' || k === 'W' || k === 'A') game.keys.up = true;
  if (k === 'ArrowDown' || k === 'ArrowRight' || k === 's' || k === 'd' || k === 'S' || k === 'D') game.keys.down = true;
  if (k === ' ') { if (game.phase === 'over') game = newGame(game.best); if (game.phase !== 'play') game.phase = 'play'; }
});
window.addEventListener('keyup', function (e) {
  var k = e.key;
  if (k === 'ArrowUp' || k === 'ArrowLeft' || k === 'w' || k === 'a' || k === 'W' || k === 'A') game.keys.up = false;
  if (k === 'ArrowDown' || k === 'ArrowRight' || k === 's' || k === 'd' || k === 'S' || k === 'D') game.keys.down = false;
});
var animFrameId = null, lastTime = 0;
function gameLoop(time) {
  var dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  update(dt);
  draw();
  animFrameId = requestAnimationFrame(gameLoop);
}
window.__gaimer_onMessage = function (msg) {
  switch (msg.type) {
    case 'saveState': __gaimer_sendMessage('stateData', game); break;
    case 'restoreState':
      game = msg.data;
      if (!game.particles) game.particles = makeParticlePool(50);
      if (!game.floats) game.floats = makeFloatPool(8);
      if (!game.touch) game.touch = { dragId: null, dragVal: null, upId: null, downId: null };
      if (game.phase === 'play') game.phase = 'paused';
      break;
    case 'pause': if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; } break;
    case 'resume': if (!animFrameId) { lastTime = performance.now(); animFrameId = requestAnimationFrame(gameLoop); } break;
  }
};
animFrameId = requestAnimationFrame(gameLoop);