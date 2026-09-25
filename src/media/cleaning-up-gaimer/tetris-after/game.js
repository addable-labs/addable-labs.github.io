var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, U = Math.min(W, H) / 20;

var COLS = 10, ROWS = 20;
var HUD_H = U * 2.6;
var pad = U * 0.5;
var bs = Math.max(48, U * 2.2);
var boardAreaTop = HUD_H;
var boardAreaBottom = H - (bs + pad * 2);
var boardAreaHeight = Math.max(boardAreaBottom - boardAreaTop, ROWS * 8);
var boardAreaWidth = W - U;
var cell = Math.floor(Math.min(boardAreaWidth / COLS, boardAreaHeight / ROWS));
if (cell < 8) cell = 8;
var boardWidth = cell * COLS, boardHeight = cell * ROWS;
var boardX = Math.floor((W - boardWidth) / 2);
var boardY = Math.floor(boardAreaTop + Math.max(0, (boardAreaHeight - boardHeight) / 2));

var btnY = H - pad - bs;
var buttons = {
  left: { x: pad, y: btnY, w: bs, h: bs },
  right: { x: pad * 2 + bs, y: btnY, w: bs, h: bs },
  down: { x: pad * 3 + bs * 2, y: btnY, w: bs, h: bs },
  drop: { x: W - pad - bs, y: btnY, w: bs, h: bs },
  rotate: { x: W - pad * 2 - bs * 2, y: btnY, w: bs, h: bs }
};

var PALETTE = { 1: '#4dd8e6', 2: '#ffd93d', 3: '#c77dff', 4: '#4ade80', 5: '#ff5c7a', 6: '#5c8cff', 7: '#ff9f43' };

var TETROMINOES = {
  I: { color: 1, rot: [[[0,1],[1,1],[2,1],[3,1]],[[2,0],[2,1],[2,2],[2,3]],[[0,2],[1,2],[2,2],[3,2]],[[1,0],[1,1],[1,2],[1,3]]] },
  O: { color: 2, rot: [[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]],[[1,0],[2,0],[1,1],[2,1]]] },
  T: { color: 3, rot: [[[1,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[2,1],[1,2]],[[1,0],[0,1],[1,1],[1,2]]] },
  S: { color: 4, rot: [[[1,0],[2,0],[0,1],[1,1]],[[1,0],[1,1],[2,1],[2,2]],[[1,1],[2,1],[0,2],[1,2]],[[0,0],[0,1],[1,1],[1,2]]] },
  Z: { color: 5, rot: [[[0,0],[1,0],[1,1],[2,1]],[[2,0],[1,1],[2,1],[1,2]],[[0,1],[1,1],[1,2],[2,2]],[[1,0],[0,1],[1,1],[0,2]]] },
  J: { color: 6, rot: [[[0,0],[0,1],[1,1],[2,1]],[[1,0],[2,0],[1,1],[1,2]],[[0,1],[1,1],[2,1],[2,2]],[[1,0],[1,1],[0,2],[1,2]]] },
  L: { color: 7, rot: [[[2,0],[0,1],[1,1],[2,1]],[[1,0],[1,1],[1,2],[2,2]],[[0,1],[1,1],[2,1],[0,2]],[[0,0],[1,0],[1,1],[1,2]]] }
};

var PARTICLE_POOL = 60, FLOAT_POOL = 8;
var DAS = 0.18, ARR = 0.05, LOCK_DELAY = 0.4;

var bgGradient = ctx.createLinearGradient(0, 0, 0, H);
bgGradient.addColorStop(0, '#0b0f2a');
bgGradient.addColorStop(1, '#04050f');

var audioCtx = null;
var activeTouches = {};
var clearedRowsScratch = [0, 0, 0, 0];

function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
  }
}
function beep(freq, dur, type, vol) {
  if (!audioCtx) return;
  try {
    var t = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t); osc.stop(t + dur);
  } catch (e) {}
}
function playMove() { beep(220, 0.05, 'square', 0.03); }
function playRotate() { beep(340, 0.06, 'square', 0.04); }
function playLock() { beep(140, 0.09, 'triangle', 0.06); }
function playClear(n) { beep(480 + n * 90, 0.18, 'sawtooth', 0.08); }
function playGameOver() { beep(180, 0.4, 'sawtooth', 0.08); }

function roundRectPath(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function emptyGrid() {
  var g = [];
  for (var r = 0; r < ROWS; r++) { var row = []; for (var c = 0; c < COLS; c++) row.push(0); g.push(row); }
  return g;
}
function makeBag() {
  var t = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  for (var i = t.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = t[i]; t[i] = t[j]; t[j] = tmp; }
  return t;
}

function newGame(best) {
  var bag = makeBag();
  var firstType = bag.pop();
  var g = {
    phase: 'start', score: 0, best: best || 0, level: 1, lines: 0,
    grid: emptyGrid(), bag: bag,
    current: { type: firstType, rotation: 0, x: 3, y: -1 },
    next: null, dropTimer: 0, dropInterval: 1.0, lockTimer: 0,
    input: { left: false, right: false, down: false, leftTimer: 0, rightTimer: 0 },
    touchUsed: false, shakeTime: 0, shakeMag: 0,
    particles: [], floats: []
  };
  if (g.bag.length === 0) g.bag = makeBag();
  g.next = g.bag.pop();
  for (var i = 0; i < PARTICLE_POOL; i++) g.particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: '#fff', size: 2 });
  for (var k = 0; k < FLOAT_POOL; k++) g.floats.push({ active: false, x: 0, y: 0, text: '', life: 0, vy: 0 });
  return g;
}

var game = newGame(0);

function collides(type, rotation, ox, oy, grid) {
  var shape = TETROMINOES[type].rot[rotation];
  for (var i = 0; i < 4; i++) {
    var cx = ox + shape[i][0], cy = oy + shape[i][1];
    if (cx < 0 || cx >= COLS || cy >= ROWS) return true;
    if (cy >= 0 && grid[cy][cx] !== 0) return true;
  }
  return false;
}
function tryMove(dx, dy) {
  var p = game.current;
  if (!collides(p.type, p.rotation, p.x + dx, p.y + dy, game.grid)) { p.x += dx; p.y += dy; return true; }
  return false;
}
function doRotate() {
  var p = game.current;
  var newRot = (p.rotation + 1) % 4;
  var kicks = [0, -1, 1, -2, 2];
  for (var i = 0; i < kicks.length; i++) {
    var kx = kicks[i];
    if (!collides(p.type, newRot, p.x + kx, p.y, game.grid)) { p.rotation = newRot; p.x += kx; playRotate(); return; }
  }
}
function doHardDrop() {
  var p = game.current;
  var dist = 0;
  while (!collides(p.type, p.rotation, p.x, p.y + 1, game.grid)) { p.y++; dist++; }
  game.score += dist * 2;
  lockPieceAndSpawn();
  triggerShake(4, 0.15);
}
function triggerShake(mag, time) { game.shakeMag = mag; game.shakeTime = time; }

function spawnParticle(x, y, color) {
  var arr = game.particles;
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i].active) {
      var p = arr[i];
      p.active = true; p.x = x; p.y = y;
      var ang = Math.random() * Math.PI * 2, spd = 50 + Math.random() * 110;
      p.vx = Math.cos(ang) * spd; p.vy = Math.sin(ang) * spd - 60;
      p.life = 0.5 + Math.random() * 0.3; p.maxLife = p.life;
      p.color = color; p.size = 2 + Math.random() * 3;
      return;
    }
  }
}
function spawnFloat(x, y, text) {
  var arr = game.floats;
  for (var i = 0; i < arr.length; i++) {
    if (!arr[i].active) { arr[i].active = true; arr[i].x = x; arr[i].y = y; arr[i].text = text; arr[i].life = 1.1; arr[i].vy = -35; return; }
  }
}

function clearLines() {
  var count = 0;
  for (var r = ROWS - 1; r >= 0; r--) {
    var full = true;
    for (var c = 0; c < COLS; c++) { if (game.grid[r][c] === 0) { full = false; break; } }
    if (full) {
      if (count < 4) clearedRowsScratch[count] = r;
      game.grid.splice(r, 1);
      var newRow = [];
      for (var c2 = 0; c2 < COLS; c2++) newRow.push(0);
      game.grid.unshift(newRow);
      count++;
      r++;
    }
  }
  return count;
}

function lockPieceAndSpawn() {
  var p = game.current;
  var shape = TETROMINOES[p.type].rot[p.rotation];
  var color = TETROMINOES[p.type].color;
  var overflow = false;
  for (var i = 0; i < 4; i++) {
    var cx = p.x + shape[i][0], cy = p.y + shape[i][1];
    if (cy < 0) overflow = true; else game.grid[cy][cx] = color;
  }
  playLock();
  var cleared = clearLines();
  if (cleared > 0) {
    var pts = [0, 100, 300, 500, 800][cleared] * game.level;
    game.score += pts;
    game.lines += cleared;
    var newLevel = Math.floor(game.lines / 10) + 1;
    if (newLevel !== game.level) game.level = newLevel;
    game.dropInterval = Math.max(0.12, 1.0 - (game.level - 1) * 0.07);
    for (var k = 0; k < cleared; k++) {
      var ry = clearedRowsScratch[k];
      var py = boardY + ry * cell + cell / 2;
      for (var j = 0; j < 6; j++) spawnParticle(boardX + Math.random() * boardWidth, py, PALETTE[1 + ((Math.random() * 7) | 0)]);
    }
    spawnFloat(boardX + boardWidth / 2, boardY + boardHeight * 0.3, '+' + pts);
    playClear(cleared);
    triggerShake(3 + cleared, 0.2);
  }
  if (game.score > game.best) game.best = game.score;
  if (overflow) { game.phase = 'over'; playGameOver(); return; }
  game.current = { type: game.next, rotation: 0, x: 3, y: -1 };
  if (game.bag.length === 0) game.bag = makeBag();
  game.next = game.bag.pop();
  if (collides(game.current.type, game.current.rotation, game.current.x, game.current.y, game.grid)) {
    game.phase = 'over'; playGameOver();
  }
}

function hitButton(x, y) {
  for (var name in buttons) {
    var b = buttons[name];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return name;
  }
  return null;
}
function buttonDown(btn) {
  if (btn === 'left') { game.input.left = true; game.input.leftTimer = 0; if (tryMove(-1, 0)) playMove(); }
  else if (btn === 'right') { game.input.right = true; game.input.rightTimer = 0; if (tryMove(1, 0)) playMove(); }
  else if (btn === 'down') { game.input.down = true; }
  else if (btn === 'rotate') { doRotate(); }
  else if (btn === 'drop') { doHardDrop(); }
}
function buttonUp(btn) {
  if (btn === 'left') game.input.left = false;
  else if (btn === 'right') game.input.right = false;
  else if (btn === 'down') game.input.down = false;
}

canvas.addEventListener('pointerdown', function (e) {
  e.preventDefault();
  if (e.pointerType === 'touch') game.touchUsed = true;
  ensureAudio();
  var x = e.clientX, y = e.clientY;
  if (game.phase === 'over') game = newGame(game.best);
  if (game.phase !== 'play') { game.phase = 'play'; return; }
  var btn = hitButton(x, y);
  if (btn) { activeTouches[e.pointerId] = btn; buttonDown(btn); }
});
canvas.addEventListener('pointerup', function (e) {
  var b = activeTouches[e.pointerId];
  if (b) { buttonUp(b); delete activeTouches[e.pointerId]; }
});
canvas.addEventListener('pointercancel', function (e) {
  var b = activeTouches[e.pointerId];
  if (b) { buttonUp(b); delete activeTouches[e.pointerId]; }
});
canvas.addEventListener('pointermove', function (e) {});

window.addEventListener('keydown', function (e) {
  var k = e.key;
  var used = ['ArrowLeft', 'ArrowRight', 'ArrowDown', 'ArrowUp', ' ', 'a', 'A', 'd', 'D', 's', 'S', 'w', 'W'];
  if (used.indexOf(k) !== -1) e.preventDefault();
  ensureAudio();
  if (game.phase === 'over') { if (k === ' ') { game = newGame(game.best); game.phase = 'play'; } return; }
  if (game.phase !== 'play') { game.phase = 'play'; return; }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') { if (!game.input.left) { game.input.left = true; game.input.leftTimer = 0; if (tryMove(-1, 0)) playMove(); } }
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') { if (!game.input.right) { game.input.right = true; game.input.rightTimer = 0; if (tryMove(1, 0)) playMove(); } }
  else if (k === 'ArrowDown' || k === 's' || k === 'S') { game.input.down = true; }
  else if (k === 'ArrowUp' || k === 'w' || k === 'W') { doRotate(); }
  else if (k === ' ') { doHardDrop(); }
});
window.addEventListener('keyup', function (e) {
  var k = e.key;
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') game.input.left = false;
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') game.input.right = false;
  else if (k === 'ArrowDown' || k === 's' || k === 'S') game.input.down = false;
});

function updateParticles(dt) {
  var arr = game.particles;
  for (var i = 0; i < arr.length; i++) {
    var p = arr[i];
    if (!p.active) continue;
    p.life -= dt;
    if (p.life <= 0) { p.active = false; continue; }
    p.vy += 260 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
}
function updateFloats(dt) {
  var arr = game.floats;
  for (var i = 0; i < arr.length; i++) {
    var f = arr[i];
    if (!f.active) continue;
    f.life -= dt * 0.9;
    if (f.life <= 0) { f.active = false; continue; }
    f.y += f.vy * dt;
  }
}

function update(dt) {
  updateParticles(dt);
  updateFloats(dt);
  if (game.shakeTime > 0) { game.shakeTime -= dt; if (game.shakeTime < 0) game.shakeTime = 0; }
  if (game.phase !== 'play') return;
  var inp = game.input;
  if (inp.left) { inp.leftTimer += dt; if (inp.leftTimer >= DAS) { tryMove(-1, 0); inp.leftTimer = DAS - ARR; } }
  if (inp.right) { inp.rightTimer += dt; if (inp.rightTimer >= DAS) { tryMove(1, 0); inp.rightTimer = DAS - ARR; } }
  var interval = inp.down ? game.dropInterval / 12 : game.dropInterval;
  game.dropTimer += dt;
  var iterations = 0;
  while (game.dropTimer >= interval && iterations < 20) {
    game.dropTimer -= interval;
    iterations++;
    if (tryMove(0, 1)) { game.lockTimer = 0; if (inp.down) game.score += 1; }
    else {
      game.lockTimer += interval;
      if (game.lockTimer >= LOCK_DELAY) { lockPieceAndSpawn(); game.lockTimer = 0; game.dropTimer = 0; break; }
    }
  }
}

function drawCell(x, y, colorIdx, alpha) {
  ctx.globalAlpha = alpha === undefined ? 1 : alpha;
  ctx.fillStyle = PALETTE[colorIdx];
  var r = Math.max(2, cell * 0.15);
  roundRectPath(x + 1, y + 1, cell - 2, cell - 2, r);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  roundRectPath(x + 2, y + 2, cell - 4, Math.max(2, (cell - 4) * 0.35), r * 0.6);
  ctx.fill();
  ctx.globalAlpha = 1;
}
function drawBoard() {
  ctx.fillStyle = 'rgba(8,10,30,0.85)';
  roundRectPath(boardX - U * 0.3, boardY - U * 0.3, boardWidth + U * 0.6, boardHeight + U * 0.6, U * 0.4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,160,255,0.4)';
  ctx.lineWidth = 2;
  roundRectPath(boardX - U * 0.3, boardY - U * 0.3, boardWidth + U * 0.6, boardHeight + U * 0.6, U * 0.4);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (var c = 1; c < COLS; c++) { var x = boardX + c * cell; ctx.moveTo(x, boardY); ctx.lineTo(x, boardY + boardHeight); }
  for (var r = 1; r < ROWS; r++) { var y = boardY + r * cell; ctx.moveTo(boardX, y); ctx.lineTo(boardX + boardWidth, y); }
  ctx.stroke();
  for (var rr = 0; rr < ROWS; rr++) {
    for (var cc = 0; cc < COLS; cc++) {
      var v = game.grid[rr][cc];
      if (v) drawCell(boardX + cc * cell, boardY + rr * cell, v);
    }
  }
}
function drawGhost() {
  var p = game.current;
  var gy = p.y;
  while (!collides(p.type, p.rotation, p.x, gy + 1, game.grid)) gy++;
  var shape = TETROMINOES[p.type].rot[p.rotation];
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  for (var i = 0; i < 4; i++) {
    var cx = p.x + shape[i][0], cy = gy + shape[i][1];
    if (cy < 0) continue;
    roundRectPath(boardX + cx * cell + 2, boardY + cy * cell + 2, cell - 4, cell - 4, 3);
    ctx.stroke();
  }
}
function drawCurrentPiece() {
  var p = game.current;
  var shape = TETROMINOES[p.type].rot[p.rotation];
  for (var i = 0; i < 4; i++) {
    var cx = p.x + shape[i][0], cy = p.y + shape[i][1];
    if (cy < 0) continue;
    drawCell(boardX + cx * cell, boardY + cy * cell, TETROMINOES[p.type].color);
  }
}
function drawParticles() {
  var arr = game.particles;
  for (var i = 0; i < arr.length; i++) {
    var p = arr[i];
    if (!p.active) continue;
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
function drawFloats() {
  var arr = game.floats;
  ctx.font = 'bold ' + Math.max(16, Math.floor(U * 0.7)) + 'px sans-serif';
  ctx.textAlign = 'center';
  for (var i = 0; i < arr.length; i++) {
    var f = arr[i];
    if (!f.active) continue;
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
    ctx.strokeStyle = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 3;
    ctx.strokeText(f.text, f.x, f.y);
    ctx.fillStyle = '#ffe066';
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
function drawOutlinedText(text, x, y, align, size, color) {
  ctx.textAlign = align || 'left';
  ctx.font = 'bold ' + Math.max(16, size || Math.floor(U * 0.75)) + 'px sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color || '#e8f0ff';
  ctx.fillText(text, x, y);
}
function drawHUD() {
  ctx.fillStyle = 'rgba(5,7,20,0.75)';
  ctx.fillRect(0, 0, W, HUD_H);
  ctx.textBaseline = 'middle';
  drawOutlinedText('SCORE ' + game.score, U * 0.4, HUD_H * 0.32, 'left');
  drawOutlinedText('BEST ' + game.best, U * 0.4, HUD_H * 0.72, 'left', Math.floor(U * 0.55), '#a9c4ff');
  drawOutlinedText('LV ' + game.level + '  LN ' + game.lines, W * 0.4, HUD_H * 0.5, 'left', Math.floor(U * 0.6));
  ctx.textBaseline = 'alphabetic';
}
function drawNextPreview() {
  var boxSize = HUD_H * 0.85;
  var bx = W - boxSize - U * 0.4, by2 = HUD_H * 0.08;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  roundRectPath(bx, by2, boxSize, boxSize, 6);
  ctx.fill();
  var shape = TETROMINOES[game.next].rot[0];
  var pc = boxSize / 4;
  ctx.fillStyle = PALETTE[TETROMINOES[game.next].color];
  for (var i = 0; i < 4; i++) {
    var cx = shape[i][0], cy = shape[i][1];
    ctx.fillRect(bx + cx * pc + 2, by2 + cy * pc + 2, pc - 4, pc - 4);
  }
}
function drawButton(b, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  roundRectPath(b.x, b.y, b.w, b.h, 10);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 2;
  roundRectPath(b.x, b.y, b.w, b.h, 10);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  var fs = label.length > 1 ? b.h * 0.32 : b.h * 0.5;
  ctx.font = 'bold ' + Math.floor(fs) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2);
  ctx.textBaseline = 'alphabetic';
}
function drawTouchControls() {
  drawButton(buttons.left, '<');
  drawButton(buttons.right, '>');
  drawButton(buttons.down, 'v');
  drawButton(buttons.rotate, 'R');
  drawButton(buttons.drop, 'HD');
}
function drawStartOverlay() {
  ctx.fillStyle = 'rgba(3,5,15,0.85)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#4dd8e6';
  ctx.font = 'bold ' + Math.max(16, Math.floor(U * 1.6)) + 'px sans-serif';
  ctx.fillText('T E T R I S', W / 2, H * 0.26);
  ctx.font = Math.max(16, Math.floor(U * 0.55)) + 'px sans-serif';
  ctx.fillStyle = '#e8f0ff';
  ctx.fillText('Arrows/WASD move, Up rotates, Space drops', W / 2, H * 0.4);
  ctx.fillText('Touch: buttons move, rotate and drop', W / 2, H * 0.46);
  var blink = Math.sin(performance.now() / 300) > 0;
  if (blink) { ctx.fillStyle = '#ffd93d'; ctx.font = 'bold ' + Math.max(16, Math.floor(U * 0.7)) + 'px sans-serif'; ctx.fillText('Tap or click to start', W / 2, H * 0.58); }
}
function drawGameOverOverlay() {
  ctx.fillStyle = 'rgba(3,5,15,0.87)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff5c7a';
  ctx.font = 'bold ' + Math.max(16, Math.floor(U * 1.4)) + 'px sans-serif';
  ctx.fillText('GAME OVER', W / 2, H * 0.34);
  ctx.fillStyle = '#e8f0ff';
  ctx.font = 'bold ' + Math.max(16, Math.floor(U * 0.75)) + 'px sans-serif';
  ctx.fillText('Score ' + game.score, W / 2, H * 0.45);
  ctx.fillText('Best ' + game.best, W / 2, H * 0.52);
  var blink = Math.sin(performance.now() / 300) > 0;
  if (blink) { ctx.fillStyle = '#ffd93d'; ctx.fillText('Tap or press Space to play again', W / 2, H * 0.62); }
}
function drawPausedOverlay() {
  ctx.fillStyle = 'rgba(3,5,15,0.7)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8f0ff';
  ctx.textAlign = 'center';
  ctx.font = 'bold ' + Math.max(16, Math.floor(U * 0.85)) + 'px sans-serif';
  ctx.fillText('Tap or click to continue', W / 2, H / 2);
}

function draw() {
  ctx.save();
  var sx = 0, sy = 0;
  if (game.shakeTime > 0) { sx = (Math.random() * 2 - 1) * game.shakeMag; sy = (Math.random() * 2 - 1) * game.shakeMag; }
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, W, H);
  ctx.translate(sx, sy);
  drawBoard();
  drawGhost();
  drawCurrentPiece();
  drawParticles();
  drawHUD();
  drawNextPreview();
  drawFloats();
  if (game.touchUsed && game.phase === 'play') drawTouchControls();
  ctx.restore();
  if (game.phase === 'start') drawStartOverlay();
  else if (game.phase === 'over') drawGameOverOverlay();
  else if (game.phase === 'paused') drawPausedOverlay();
}

var animFrameId = null, lastTime = 0;
function gameLoop(time) {
  if (!lastTime) lastTime = time;
  var dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  update(dt);
  draw();
  animFrameId = requestAnimationFrame(gameLoop);
}

window.__gaimer_onMessage = function (msg) {
  switch (msg.type) {
    case 'saveState': __gaimer_sendMessage('stateData', game); break;
    case 'restoreState': game = msg.data; if (game.phase === 'play') game.phase = 'paused'; lastTime = 0; break;
    case 'pause': if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; } break;
    case 'resume': if (!animFrameId) { lastTime = 0; animFrameId = requestAnimationFrame(gameLoop); } break;
  }
};

animFrameId = requestAnimationFrame(gameLoop);