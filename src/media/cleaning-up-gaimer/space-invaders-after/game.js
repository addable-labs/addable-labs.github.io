var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var W = canvas.width, H = canvas.height, U = Math.min(W, H) / 20;

var COL_BG_TOP = '#060318';
var COL_BG_BOT = '#1a0b3d';
var COL_ACCENT = '#39ffcf';
var COL_P1 = '#8b5cf6';
var COL_P2 = '#ff4d94';
var COL_P3 = '#ffd93d';

var keys = { left:false, right:false, fire:false };
var touchActive = false;
var touchMap = {};
var audioCtx = null;

function ensureAudio(){
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext||window.webkitAudioContext)(); } catch(e){}
}
function playTone(freq, dur, type, vol, slide){
  if (!audioCtx) return;
  try {
    var t0 = audioCtx.currentTime;
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide), t0+dur);
    gain.gain.setValueAtTime(vol||0.05, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  } catch(e){}
}
function sndShoot(){ ensureAudio(); playTone(760,0.09,'square',0.05,-300); }
function sndEnemyShoot(){ ensureAudio(); playTone(220,0.1,'sawtooth',0.03,-80); }
function sndExplosion(){ ensureAudio(); playTone(180,0.25,'sawtooth',0.07,-140); }
function sndHit(){ ensureAudio(); playTone(140,0.3,'square',0.08,-90); }
function sndPowerup(){ ensureAudio(); playTone(500,0.18,'sine',0.06,400); }
function sndGameOver(){ ensureAudio(); playTone(300,0.5,'sawtooth',0.08,-250); }
function sndWave(){ ensureAudio(); playTone(440,0.15,'sine',0.05,220); }

function makePool(n, tmpl){
  var arr = [];
  for (var i=0;i<n;i++){ var o={}; for (var k in tmpl) o[k]=tmpl[k]; o.active=false; arr.push(o); }
  return arr;
}
function getFree(pool){
  for (var i=0;i<pool.length;i++) if (!pool[i].active) return pool[i];
  return null;
}
function rectsOverlap(ax,ay,aw,ah,bx,by,bw,bh){
  return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
}
function colorForRow(row){
  var c=[COL_P2,COL_P3,COL_P1,COL_P2,COL_P3,COL_P1];
  return c[row%c.length];
}
function dist(x1,y1,x2,y2){ var dx=x1-x2,dy=y1-y2; return Math.sqrt(dx*dx+dy*dy); }

function createBarriers(g){
  g.barriers = [];
  var count=4;
  var bw=U*2.4, bh=U*1.5;
  var gap=(W-count*bw)/(count+1);
  var pattern = [[1,1,1,1,1],[1,1,1,1,1],[1,1,0,1,1]];
  for (var b=0;b<count;b++){
    var bx = gap+b*(bw+gap);
    var by = H-U*5.2;
    var cw=bw/5, ch=bh/3;
    for (var r=0;r<3;r++){
      for (var c=0;c<5;c++){
        if (pattern[r][c]) g.barriers.push({x:bx+c*cw,y:by+r*ch,w:cw,h:ch,hp:3});
      }
    }
  }
}
function spawnWave(g){
  var rows = Math.min(5+Math.floor((g.level-1)/2),6);
  var cols = 8;
  var marginX = U*1.8;
  var gridW = W-marginX*2;
  var gapX = gridW/cols;
  var ew = gapX*0.6, eh = ew*0.7;
  var gapY = U*1.5;
  var startY = U*2.2;
  g.enemies = [];
  for (var r=0;r<rows;r++){
    for (var c=0;c<cols;c++){
      g.enemies.push({ x: marginX+c*gapX+gapX/2, y: startY+r*gapY, w: ew, h: eh, alive: true, row: r, col: c });
    }
  }
  g.enemyDir = 1;
  g.enemySpeed = U*(2+g.level*0.35);
  g.enemyShootTimer = Math.max(0.4, 1.1-g.level*0.06);
  g.enemyAnim = 0;
  g.waveTimer = 0;
}
function newGame(best){
  var g = {
    phase: 'start', score: 0, best: best||0, lives: 3, level: 1,
    player: { x: W/2, y: H-U*2, w:U*1.5, h:U*1.1, vx:0, cooldown:0, invuln:1.5, rapid:0, multi:0, shield:0 },
    bullets: makePool(16, {active:false,x:0,y:0,vx:0,w:U*0.18,h:U*0.6}),
    ebullets: makePool(16, {active:false,x:0,y:0,w:U*0.18,h:U*0.55}),
    particles: makePool(100, {active:false,x:0,y:0,vx:0,vy:0,life:0,maxLife:0,color:'#fff',size:2}),
    texts: makePool(10, {active:false,x:0,y:0,vy:0,life:0,text:'',color:'#fff'}),
    powerups: makePool(4, {active:false,x:0,y:0,vy:0,type:'rapid'}),
    enemies: [], enemyDir: 1, enemySpeed: U*2.2, enemyShootTimer: 1, enemyAnim: 0,
    barriers: [], shakeTime:0, shakeMag:0, waveTimer:0, stars1: [], stars2: []
  };
  for (var i=0;i<40;i++) g.stars1.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.2+0.5});
  for (var j=0;j<25;j++) g.stars2.push({x:Math.random()*W,y:Math.random()*H,r:Math.random()*1.6+1});
  spawnWave(g);
  createBarriers(g);
  return g;
}
var game = newGame(0);

var BTN_R = Math.max(U*1.3, 26);
var BTN_LEFT = {x:U*2.2, y:H-U*2.6};
var BTN_RIGHT = {x:U*4.8, y:H-U*2.6};
var BTN_FIRE = {x:W-U*2.4, y:H-U*2.6};

function triggerShake(g,mag,time){ g.shakeMag=mag; g.shakeTime=time; }
function spawnParticles(g,x,y,color,count){
  for (var i=0;i<count;i++){
    var p = getFree(g.particles);
    if (!p) return;
    var ang = Math.random()*Math.PI*2;
    var spd = Math.random()*U*3+U*1;
    p.active=true; p.x=x; p.y=y; p.vx=Math.cos(ang)*spd; p.vy=Math.sin(ang)*spd;
    p.life=p.maxLife=0.4+Math.random()*0.4; p.color=color; p.size=Math.random()*2.5+1.5;
  }
}
function addText(g,x,y,text,color){
  var t=getFree(g.texts);
  if (!t) return;
  t.active=true; t.x=x; t.y=y; t.vy=-U*1.6; t.life=1.0; t.text=text; t.color=color;
}
function spawnBullet(g,x,y,vxOffset){
  var b=getFree(g.bullets); if(!b) return;
  b.active=true; b.x=x; b.y=y; b.vx=(vxOffset||0)*U*3;
}
function fireBullets(g){
  var p=g.player;
  if (p.multi>0){
    spawnBullet(g,p.x,p.y-p.h/2,-0.6); spawnBullet(g,p.x,p.y-p.h/2,0); spawnBullet(g,p.x,p.y-p.h/2,0.6);
  } else { spawnBullet(g,p.x,p.y-p.h/2,0); }
  sndShoot();
}
function shootFromRandomEnemy(g){
  var candidates=[];
  for (var i=0;i<g.enemies.length;i++) if (g.enemies[i].alive) candidates.push(g.enemies[i]);
  if (!candidates.length) return;
  var e = candidates[Math.floor(Math.random()*candidates.length)];
  var eb=getFree(g.ebullets); if(!eb) return;
  eb.active=true; eb.x=e.x; eb.y=e.y+e.h/2;
  sndEnemyShoot();
}
function spawnPowerup(g,x,y){
  var pu=getFree(g.powerups); if(!pu) return;
  var types=['rapid','multi','shield'];
  pu.active=true; pu.x=x; pu.y=y; pu.vy=0; pu.type=types[Math.floor(Math.random()*types.length)];
}
function applyPowerup(g,type){
  var p=g.player;
  if (type==='rapid') p.rapid=8; else if (type==='multi') p.multi=8; else if (type==='shield') p.shield=6;
  addText(g,p.x,p.y-U*1.5,type.toUpperCase()+'!',COL_ACCENT);
  sndPowerup();
}
function checkBulletBarrier(g,arr){
  for (var i=0;i<arr.length;i++){
    var b=arr[i]; if(!b.active) continue;
    for (var j=0;j<g.barriers.length;j++){
      var bl=g.barriers[j]; if(bl.hp<=0) continue;
      if (rectsOverlap(b.x-b.w/2,b.y-b.h/2,b.w,b.h, bl.x,bl.y,bl.w,bl.h)){
        bl.hp--; b.active=false; spawnParticles(g,b.x,b.y,COL_P1,6); break;
      }
    }
  }
}
function loseLife(g, fromInvasion){
  g.lives--; triggerShake(g,U*0.5,0.3); sndHit();
  spawnParticles(g,g.player.x,g.player.y,COL_ACCENT,20);
  for (var i=0;i<g.ebullets.length;i++) g.ebullets[i].active=false;
  if (g.lives<=0){ g.phase='over'; sndGameOver(); }
  else {
    g.player.invuln=2.2; g.player.x=W/2;
    if (fromInvasion){ for (var j=0;j<g.enemies.length;j++) if(g.enemies[j].alive) g.enemies[j].y -= U*2; }
  }
}
function updateStars(dt){
  for (var i=0;i<game.stars1.length;i++){ var s=game.stars1[i]; s.y+=U*1.2*dt; if (s.y>H) s.y=0; }
  for (var j=0;j<game.stars2.length;j++){ var s2=game.stars2[j]; s2.y+=U*2.4*dt; if (s2.y>H) s2.y=0; }
}
function update(dt){
  updateStars(dt);
  if (game.phase!=='play') return;
  var g = game;
  var p = g.player;
  var speed = U*9;
  p.vx = (keys.left?-1:0)+(keys.right?1:0);
  p.x += p.vx*speed*dt;
  var half=p.w/2;
  if (p.x<half) p.x=half;
  if (p.x>W-half) p.x=W-half;
  if (p.cooldown>0) p.cooldown-=dt;
  if (p.invuln>0) p.invuln-=dt;
  if (p.rapid>0) p.rapid-=dt;
  if (p.multi>0) p.multi-=dt;
  if (p.shield>0) p.shield-=dt;
  if (keys.fire && p.cooldown<=0){ fireBullets(g); p.cooldown = p.rapid>0? 0.14:0.36; }
  var i,j;
  for (i=0;i<g.bullets.length;i++){ var b=g.bullets[i]; if(!b.active) continue; b.x+=b.vx*dt; b.y -= U*16*dt; if (b.y< -b.h) b.active=false; }
  for (i=0;i<g.ebullets.length;i++){ var eb=g.ebullets[i]; if(!eb.active) continue; eb.y += U*7*dt; if (eb.y>H+eb.h) eb.active=false; }
  var aliveCount=0, minX=1e9,maxX=-1e9,maxY=-1e9;
  for (i=0;i<g.enemies.length;i++){ var e=g.enemies[i]; if(!e.alive) continue; aliveCount++; if (e.x-e.w/2<minX) minX=e.x-e.w/2; if (e.x+e.w/2>maxX) maxX=e.x+e.w/2; if (e.y+e.h/2>maxY) maxY=e.y+e.h/2; }
  if (aliveCount===0){
    g.waveTimer += dt;
    if (g.waveTimer>1.6){ g.level++; addText(g, W/2, H/2, 'WAVE '+g.level, COL_ACCENT); spawnWave(g); createBarriers(g); sndWave(); }
  } else {
    var speedMul = 1+ (1-aliveCount/g.enemies.length)*1.6;
    var dx = g.enemyDir*g.enemySpeed*speedMul*dt;
    var hitEdge=false;
    if (minX+dx<U*0.5 || maxX+dx>W-U*0.5) hitEdge=true;
    for (i=0;i<g.enemies.length;i++){ var e2=g.enemies[i]; if(!e2.alive) continue; if(hitEdge){ e2.y += U*0.7; } else { e2.x += dx; } }
    if (hitEdge) g.enemyDir*=-1;
    g.enemyAnim += dt;
    g.enemyShootTimer -= dt;
    if (g.enemyShootTimer<=0){ g.enemyShootTimer = Math.max(0.3, 1.0-g.level*0.05) * (0.6+Math.random()*0.8); shootFromRandomEnemy(g); }
    if (maxY > p.y-U*1.3){ loseLife(g, true); }
  }
  for (i=0;i<g.powerups.length;i++){
    var pu=g.powerups[i]; if(!pu.active) continue;
    pu.y += U*3.5*dt;
    if (pu.y>H+U){ pu.active=false; continue; }
    if (rectsOverlap(pu.x-U*0.5,pu.y-U*0.5,U,U, p.x-p.w/2,p.y-p.h/2,p.w,p.h)){ applyPowerup(g,pu.type); pu.active=false; }
  }
  for (i=0;i<g.bullets.length;i++){
    var bb=g.bullets[i]; if(!bb.active) continue;
    for (j=0;j<g.enemies.length;j++){
      var en=g.enemies[j]; if(!en.alive) continue;
      if (rectsOverlap(bb.x-bb.w/2,bb.y-bb.h/2,bb.w,bb.h, en.x-en.w/2,en.y-en.h/2,en.w,en.h)){
        en.alive=false; bb.active=false;
        var pts=[50,40,30,20,10][en.row]||10;
        g.score+=pts;
        addText(g,en.x,en.y,'+'+pts, colorForRow(en.row));
        spawnParticles(g,en.x,en.y,colorForRow(en.row),14);
        triggerShake(g,U*0.15,0.1);
        sndExplosion();
        if (Math.random()<0.14) spawnPowerup(g,en.x,en.y);
        break;
      }
    }
  }
  checkBulletBarrier(g, g.bullets);
  checkBulletBarrier(g, g.ebullets);
  if (p.invuln<=0){
    for (i=0;i<g.ebullets.length;i++){
      var eb2=g.ebullets[i]; if(!eb2.active) continue;
      if (rectsOverlap(eb2.x-eb2.w/2,eb2.y-eb2.h/2,eb2.w,eb2.h, p.x-p.w/2,p.y-p.h/2,p.w,p.h)){
        eb2.active=false;
        if (p.shield>0){ spawnParticles(g,p.x,p.y,COL_ACCENT,10); sndHit(); }
        else loseLife(g,false);
      }
    }
  }
  for (i=0;i<g.particles.length;i++){ var pt=g.particles[i]; if(!pt.active) continue; pt.x+=pt.vx*dt; pt.y+=pt.vy*dt; pt.vy+=U*2*dt; pt.life-=dt; if (pt.life<=0) pt.active=false; }
  for (i=0;i<g.texts.length;i++){ var tx=g.texts[i]; if(!tx.active) continue; tx.y+=tx.vy*dt; tx.life-=dt*0.9; if (tx.life<=0) tx.active=false; }
  if (g.shakeTime>0){ g.shakeTime-=dt; if (g.shakeTime<0) g.shakeTime=0; }
  g.best = Math.max(g.best,g.score);
}
function drawBackground(g){
  var grad=ctx.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,COL_BG_TOP); grad.addColorStop(1,COL_BG_BOT);
  ctx.fillStyle=grad; ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#ffffff';
  var i;
  ctx.globalAlpha=0.35;
  for (i=0;i<g.stars1.length;i++){ var s=g.stars1[i]; ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=0.7;
  for (i=0;i<g.stars2.length;i++){ var s2=g.stars2[i]; ctx.beginPath(); ctx.arc(s2.x,s2.y,s2.r,0,Math.PI*2); ctx.fill(); }
  ctx.globalAlpha=1;
}
function drawPlayer(g){
  var p=g.player;
  if (p.invuln>0 && Math.floor(p.invuln*10)%2===0) return;
  ctx.save();
  ctx.translate(p.x,p.y);
  if (p.shield>0){ ctx.strokeStyle='rgba(57,255,207,0.6)'; ctx.lineWidth=U*0.15; ctx.beginPath(); ctx.arc(0,0,p.w*0.9,0,Math.PI*2); ctx.stroke(); }
  ctx.fillStyle=COL_ACCENT;
  ctx.beginPath();
  ctx.moveTo(0,-p.h*0.7); ctx.lineTo(p.w*0.5,p.h*0.6); ctx.lineTo(p.w*0.2,p.h*0.4); ctx.lineTo(-p.w*0.2,p.h*0.4); ctx.lineTo(-p.w*0.5,p.h*0.6);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle='#ffffff'; ctx.lineWidth=U*0.06; ctx.stroke();
  ctx.fillStyle='#0a2a2a'; ctx.beginPath(); ctx.arc(0,-p.h*0.1,p.w*0.15,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='rgba(57,255,207,0.5)'; ctx.beginPath(); ctx.ellipse(0,p.h*0.65,p.w*0.18,p.h*0.2,0,0,Math.PI*2); ctx.fill();
  ctx.restore();
}
function drawEnemies(g){
  var frame = Math.floor(g.enemyAnim*4)%2;
  for (var i=0;i<g.enemies.length;i++){
    var e=g.enemies[i]; if(!e.alive) continue;
    ctx.save(); ctx.translate(e.x,e.y);
    ctx.fillStyle=colorForRow(e.row);
    var w=e.w,h=e.h;
    ctx.beginPath();
    ctx.moveTo(-w*0.5,0); ctx.lineTo(-w*0.3,-h*0.5); ctx.lineTo(w*0.3,-h*0.5); ctx.lineTo(w*0.5,0);
    ctx.lineTo(w*(frame?0.35:0.5),h*0.5); ctx.lineTo(-w*(frame?0.35:0.5),h*0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle='#060318';
    ctx.beginPath(); ctx.arc(-w*0.18,-h*0.05,w*0.09,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w*0.18,-h*0.05,w*0.09,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
}
function drawBullets(g){
  ctx.fillStyle=COL_ACCENT;
  for (var i=0;i<g.bullets.length;i++){ var b=g.bullets[i]; if(!b.active) continue; ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h); }
  ctx.fillStyle=COL_P2;
  for (var j=0;j<g.ebullets.length;j++){ var e=g.ebullets[j]; if(!e.active) continue; ctx.fillRect(e.x-e.w/2,e.y-e.h/2,e.w,e.h); }
}
function drawBarriers(g){
  for (var i=0;i<g.barriers.length;i++){
    var bl=g.barriers[i]; if(bl.hp<=0) continue;
    var alpha = 0.35+0.2*bl.hp;
    ctx.fillStyle = 'rgba(139,92,246,'+alpha+')';
    ctx.fillRect(bl.x,bl.y,bl.w,bl.h);
  }
}
function drawPowerups(g){
  for (var i=0;i<g.powerups.length;i++){
    var pu=g.powerups[i]; if(!pu.active) continue;
    ctx.save(); ctx.translate(pu.x,pu.y); ctx.rotate(pu.y*0.02);
    ctx.fillStyle = pu.type==='rapid'?COL_P3: pu.type==='multi'?COL_P2:COL_ACCENT;
    ctx.beginPath();
    for (var k=0;k<5;k++){
      var ang=k*Math.PI*2/5 - Math.PI/2;
      var r = k%2===0? U*0.5:U*0.22;
      var xx=Math.cos(ang)*r, yy=Math.sin(ang)*r;
      if (k===0) ctx.moveTo(xx,yy); else ctx.lineTo(xx,yy);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
}
function drawParticles(g){
  for (var i=0;i<g.particles.length;i++){
    var p=g.particles[i]; if(!p.active) continue;
    ctx.globalAlpha=Math.max(0,p.life/p.maxLife);
    ctx.fillStyle=p.color;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha=1;
}
function drawTexts(g){
  ctx.textAlign='center';
  ctx.font='bold '+Math.round(U*0.9)+'px sans-serif';
  for (var i=0;i<g.texts.length;i++){
    var t=g.texts[i]; if(!t.active) continue;
    ctx.globalAlpha=Math.max(0,t.life);
    ctx.fillStyle=t.color;
    ctx.fillText(t.text,t.x,t.y);
  }
  ctx.globalAlpha=1;
}
function drawHUD(g){
  ctx.textAlign='left';
  ctx.font='bold '+Math.round(U*0.8)+'px sans-serif';
  ctx.fillStyle='rgba(0,0,0,0.4)';
  ctx.fillRect(0,0,W,U*1.6);
  ctx.fillStyle='#ffffff';
  ctx.fillText('SCORE '+g.score, U*0.5, U*1.1);
  ctx.textAlign='right';
  ctx.fillText('BEST '+Math.max(g.best,g.score), W-U*0.5, U*1.1);
  ctx.textAlign='center';
  ctx.fillText('LEVEL '+g.level, W/2, U*1.1);
  for (var i=0;i<g.lives;i++){
    ctx.fillStyle=COL_ACCENT;
    ctx.beginPath();
    var lx=W-U*1.2-i*U*1.0, ly=U*2.4;
    ctx.moveTo(lx,ly-U*0.35); ctx.lineTo(lx+U*0.3,ly+U*0.3); ctx.lineTo(lx-U*0.3,ly+U*0.3);
    ctx.closePath(); ctx.fill();
  }
}
function drawTouchControls(){
  ctx.globalAlpha=0.35;
  ctx.fillStyle='#ffffff';
  ctx.beginPath(); ctx.arc(BTN_LEFT.x,BTN_LEFT.y,BTN_R,0,Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(BTN_RIGHT.x,BTN_RIGHT.y,BTN_R,0,Math.PI*2); ctx.fill();
  ctx.fillStyle=COL_ACCENT;
  ctx.beginPath(); ctx.arc(BTN_FIRE.x,BTN_FIRE.y,BTN_R,0,Math.PI*2); ctx.fill();
  ctx.globalAlpha=0.9;
  ctx.fillStyle='#060318';
  ctx.font='bold '+Math.round(BTN_R)+'px sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('<',BTN_LEFT.x,BTN_LEFT.y);
  ctx.fillText('>',BTN_RIGHT.x,BTN_RIGHT.y);
  ctx.fillText('*',BTN_FIRE.x,BTN_FIRE.y);
  ctx.textBaseline='alphabetic';
  ctx.globalAlpha=1;
}
function drawOverlay(g){
  ctx.fillStyle='rgba(6,3,24,0.72)';
  ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle='#ffffff';
  if (g.phase==='start'){
    ctx.font='bold '+Math.round(U*1.5)+'px sans-serif';
    ctx.fillStyle=COL_ACCENT;
    ctx.fillText('NEBULA INVADERS', W/2, H*0.3);
    ctx.font=Math.round(U*0.65)+'px sans-serif';
    ctx.fillStyle='#ffffff';
    ctx.fillText('Arrows/A-D to move, Space to fire', W/2, H*0.44);
    ctx.fillText('Touch: use the on-screen buttons', W/2, H*0.51);
    ctx.font='bold '+Math.round(U*0.85)+'px sans-serif';
    ctx.fillStyle=COL_P3;
    ctx.fillText('Tap or click to start', W/2, H*0.64);
  } else if (g.phase==='paused'){
    ctx.font='bold '+Math.round(U*1.0)+'px sans-serif';
    ctx.fillText('Tap or click to continue', W/2, H*0.5);
  } else if (g.phase==='over'){
    ctx.font='bold '+Math.round(U*1.4)+'px sans-serif';
    ctx.fillStyle=COL_P2;
    ctx.fillText('GAME OVER', W/2, H*0.36);
    ctx.font=Math.round(U*0.75)+'px sans-serif';
    ctx.fillStyle='#ffffff';
    ctx.fillText('Score '+g.score+'   Best '+g.best, W/2, H*0.46);
    ctx.font='bold '+Math.round(U*0.85)+'px sans-serif';
    ctx.fillStyle=COL_P3;
    ctx.fillText('Tap or press Space to play again', W/2, H*0.58);
  }
  if (touchActive) drawTouchControls();
}
function draw(){
  var g=game;
  drawBackground(g);
  ctx.save();
  var sx=0, sy=0;
  if (g.shakeTime>0){ sx=(Math.random()*2-1)*g.shakeMag; sy=(Math.random()*2-1)*g.shakeMag; }
  ctx.translate(sx,sy);
  drawBarriers(g);
  drawEnemies(g);
  drawBullets(g);
  drawPowerups(g);
  drawPlayer(g);
  drawParticles(g);
  drawTexts(g);
  ctx.restore();
  drawHUD(g);
  if (g.phase!=='play') drawOverlay(g);
}
window.addEventListener('keydown', function(e){
  var k=e.key;
  if (k==='ArrowLeft'||k==='ArrowRight'||k==='a'||k==='A'||k==='d'||k==='D'||k===' '||k==='Spacebar'||k==='Enter') e.preventDefault();
  ensureAudio();
  if (k==='ArrowLeft'||k==='a'||k==='A') keys.left=true;
  if (k==='ArrowRight'||k==='d'||k==='D') keys.right=true;
  if (k===' '||k==='Spacebar'||k==='Enter'){
    keys.fire=true;
    if (game.phase==='over'){ game=newGame(game.best); }
    else if (game.phase!=='play'){ game.phase='play'; }
  }
});
window.addEventListener('keyup', function(e){
  var k=e.key;
  if (k==='ArrowLeft'||k==='a'||k==='A') keys.left=false;
  if (k==='ArrowRight'||k==='d'||k==='D') keys.right=false;
  if (k===' '||k==='Spacebar'||k==='Enter') keys.fire=false;
});
canvas.addEventListener('pointerdown', function(e){
  ensureAudio();
  var x=e.clientX,y=e.clientY;
  if (e.pointerType==='touch') touchActive=true;
  if (game.phase==='over'){ game=newGame(game.best); return; }
  if (game.phase!=='play'){ game.phase='play'; return; }
  var btn=null;
  if (dist(x,y,BTN_LEFT.x,BTN_LEFT.y)<=BTN_R) btn='left';
  else if (dist(x,y,BTN_RIGHT.x,BTN_RIGHT.y)<=BTN_R) btn='right';
  else if (dist(x,y,BTN_FIRE.x,BTN_FIRE.y)<=BTN_R) btn='fire';
  if (btn){ touchMap[e.pointerId]=btn; keys[btn]=true; }
});
function releasePointer(e){
  var btn=touchMap[e.pointerId];
  if (btn){ keys[btn]=false; delete touchMap[e.pointerId]; }
}
canvas.addEventListener('pointerup', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);

var animFrameId = null, lastTime = 0;
function gameLoop(time){
  var dt = Math.min((time-lastTime)/1000, 0.05);
  lastTime = time;
  update(dt);
  draw();
  animFrameId = requestAnimationFrame(gameLoop);
}
window.__gaimer_onMessage = function(msg){
  switch(msg.type){
    case 'saveState': __gaimer_sendMessage('stateData', game); break;
    case 'restoreState':
      game = msg.data;
      if (game.phase==='play') game.phase='paused';
      break;
    case 'pause': if (animFrameId){ cancelAnimationFrame(animFrameId); animFrameId=null; } break;
    case 'resume': if (!animFrameId){ lastTime=performance.now(); animFrameId=requestAnimationFrame(gameLoop); } break;
  }
};
animFrameId = requestAnimationFrame(gameLoop);