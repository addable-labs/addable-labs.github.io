(function(){
  var canvas = document.getElementById('game-canvas');
  var ctx = canvas.getContext('2d');

  var W = canvas.width, H = canvas.height;

  var PLAYER_W = 40, PLAYER_H = 20;
  var BULLET_W = 4, BULLET_H = 12;
  var ENEMY_W = 30, ENEMY_H = 20;
  var ENEMY_ROWS = 5, ENEMY_COLS = 8;
  var ENEMY_PAD_X = 15, ENEMY_PAD_Y = 15;
  var BARRIER_COUNT = 4;

  var score = 0;
  var lives = 3;
  var level = 1;
  var gameState = 'start';
  var levelMessageTimer = 0;

  var player = { x: W/2 - PLAYER_W/2, y: H - 50, w: PLAYER_W, h: PLAYER_H, speed: 6 };
  var moveLeft = false, moveRight = false;
  var shootCooldownTimer = 0;
  var shootCooldownBase = 20;

  var bullets = [];
  var enemyBullets = [];

  var enemies = [];
  var formationX = 60, formationY = 60;
  var enemyDirection = 1;
  var enemySpeedBase = 1;
  var enemyDropAmount = 20;

  var barriers = [];

  var powerups = [];
  var activePowerups = { rapid: 0, multi: 0, shield: 0 };

  var frameCount = 0;

  var touchActive = false;
  var touchX = 0;

  var animFrameId = null;

  function initEnemies(){
    enemies = [];
    for(var r=0;r<ENEMY_ROWS;r++){
      for(var c=0;c<ENEMY_COLS;c++){
        enemies.push({row:r,col:c,alive:true});
      }
    }
    formationX = 60;
    formationY = 60;
    enemyDirection = 1;
  }

  function initBarriers(){
    barriers = [];
    var barrierW = 60, barrierH = 40;
    var gap = (W - BARRIER_COUNT*barrierW) / (BARRIER_COUNT+1);
    for(var i=0;i<BARRIER_COUNT;i++){
      var bx = gap + i*(barrierW+gap);
      var by = H - 140;
      var blocks = [];
      var cols = 6, rows = 4;
      var bw = barrierW/cols, bh = barrierH/rows;
      for(var rr=0; rr<rows; rr++){
        for(var cc=0; cc<cols; cc++){
          if(rr===rows-1 && (cc===2||cc===3)) continue;
          blocks.push({dx:cc*bw, dy:rr*bh, w:bw, h:bh, hp:4});
        }
      }
      barriers.push({x:bx, y:by, blocks:blocks});
    }
  }

  function resetGame(){
    score = 0; lives = 3; level = 1;
    player.x = W/2 - PLAYER_W/2;
    bullets = []; enemyBullets = []; powerups = [];
    activePowerups = {rapid:0,multi:0,shield:0};
    shootCooldownTimer = 0;
    initEnemies();
    initBarriers();
    gameState = 'playing';
    levelMessageTimer = 0;
  }

  function nextLevel(){
    level++;
    bullets = []; enemyBullets = []; powerups=[];
    initEnemies();
    initBarriers();
    gameState = 'levelup';
    levelMessageTimer = 90;
  }

  function aliveEnemies(){
    return enemies.filter(function(e){return e.alive;});
  }

  function enemyPixelPos(e){
    return { x: formationX + e.col*(ENEMY_W+ENEMY_PAD_X), y: formationY + e.row*(ENEMY_H+ENEMY_PAD_Y) };
  }

  function keyDown(e){
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') moveLeft = true;
    if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') moveRight = true;
    if(e.key===' '||e.key==='Spacebar'){
      e.preventDefault();
      if(gameState==='start'||gameState==='gameover'){ resetGame(); }
      else if(gameState==='playing'){ tryShoot(); }
    }
    if(e.key==='p'||e.key==='P'){
      if(gameState==='playing') gameState='paused';
      else if(gameState==='paused') gameState='playing';
    }
  }
  function keyUp(e){
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A') moveLeft = false;
    if(e.key==='ArrowRight'||e.key==='d'||e.key==='D') moveRight = false;
  }
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);

  function handleTouchStart(e){
    e.preventDefault();
    if(gameState==='start'||gameState==='gameover'){ resetGame(); return; }
    touchActive = true;
    var t = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    touchX = (t.clientX - rect.left) * (canvas.width/rect.width);
    updateTouchMove();
  }
  function handleTouchMove(e){
    e.preventDefault();
    if(!touchActive) return;
    var t = e.touches[0];
    var rect = canvas.getBoundingClientRect();
    touchX = (t.clientX - rect.left) * (canvas.width/rect.width);
    updateTouchMove();
  }
  function handleTouchEnd(e){
    e.preventDefault();
    touchActive = false;
    moveLeft = false; moveRight = false;
  }
  function updateTouchMove(){
    var third = W/3;
    if(touchX < third){ moveLeft = true; moveRight = false; }
    else if(touchX > third*2){ moveRight = true; moveLeft = false; }
    else { moveLeft = false; moveRight = false; tryShoot(); }
  }
  canvas.addEventListener('touchstart', handleTouchStart, {passive:false});
  canvas.addEventListener('touchmove', handleTouchMove, {passive:false});
  canvas.addEventListener('touchend', handleTouchEnd, {passive:false});

  function tryShoot(){
    if(shootCooldownTimer>0) return;
    var cd = activePowerups.rapid>0 ? Math.floor(shootCooldownBase/2.5) : shootCooldownBase;
    shootCooldownTimer = cd;
    if(activePowerups.multi>0){
      bullets.push({x:player.x+player.w/2-BULLET_W/2-10,y:player.y});
      bullets.push({x:player.x+player.w/2-BULLET_W/2,y:player.y});
      bullets.push({x:player.x+player.w/2-BULLET_W/2+10,y:player.y});
    } else {
      bullets.push({x:player.x+player.w/2-BULLET_W/2,y:player.y});
    }
  }

  function update(){
    frameCount++;
    if(gameState==='levelup'){
      levelMessageTimer--;
      if(levelMessageTimer<=0) gameState='playing';
      return;
    }
    if(gameState!=='playing') return;

    if(touchActive){
      var third=W/3;
      if(touchX>=third && touchX<=third*2){
        tryShoot();
      }
    }

    if(moveLeft) player.x -= player.speed;
    if(moveRight) player.x += player.speed;
    if(player.x<0) player.x=0;
    if(player.x>W-player.w) player.x=W-player.w;

    if(shootCooldownTimer>0) shootCooldownTimer--;

    if(activePowerups.rapid>0) activePowerups.rapid--;
    if(activePowerups.multi>0) activePowerups.multi--;
    if(activePowerups.shield>0) activePowerups.shield--;

    var i;
    for(i=bullets.length-1;i>=0;i--){
      bullets[i].y -= 9;
      if(bullets[i].y < -BULLET_H) bullets.splice(i,1);
    }
    for(i=enemyBullets.length-1;i>=0;i--){
      enemyBullets[i].y += enemyBullets[i].speed;
      if(enemyBullets[i].y>H) enemyBullets.splice(i,1);
    }

    for(i=powerups.length-1;i>=0;i--){
      powerups[i].y += 2;
      if(powerups[i].y>H) powerups.splice(i,1);
    }

    var alive = aliveEnemies();
    if(alive.length===0){
      nextLevel();
      return;
    }
    var speedFactor = 1 + (ENEMY_ROWS*ENEMY_COLS - alive.length)/(ENEMY_ROWS*ENEMY_COLS) * 3;
    var speed = (enemySpeedBase + level*0.3) * speedFactor;
    var minCol=Infinity, maxCol=-Infinity, minRow=Infinity, maxRow=-Infinity;
    alive.forEach(function(e){
      if(e.col<minCol) minCol=e.col;
      if(e.col>maxCol) maxCol=e.col;
      if(e.row<minRow) minRow=e.row;
      if(e.row>maxRow) maxRow=e.row;
    });
    var willHitEdge = false;
    var nextX = formationX + enemyDirection*speed;
    var nextLeft = nextX + minCol*(ENEMY_W+ENEMY_PAD_X);
    var nextRight = nextX + maxCol*(ENEMY_W+ENEMY_PAD_X) + ENEMY_W;
    if(nextLeft<0 || nextRight>W){
      willHitEdge = true;
    }
    if(willHitEdge){
      enemyDirection *= -1;
      formationY += enemyDropAmount;
    } else {
      formationX = nextX;
    }

    var bottomY = formationY + maxRow*(ENEMY_H+ENEMY_PAD_Y) + ENEMY_H;
    if(bottomY >= player.y){
      loseLife(true);
    }

    if(Math.random() < 0.02 + level*0.002){
      var cols = {};
      alive.forEach(function(e){
        if(!cols[e.col] || e.row>cols[e.col].row) cols[e.col]=e;
      });
      var colKeys = Object.keys(cols);
      if(colKeys.length>0){
        var pick = cols[colKeys[Math.floor(Math.random()*colKeys.length)]];
        var pos = enemyPixelPos(pick);
        enemyBullets.push({x:pos.x+ENEMY_W/2-BULLET_W/2, y:pos.y+ENEMY_H, speed:4+level*0.3});
      }
    }

    for(i=bullets.length-1;i>=0;i--){
      var b = bullets[i];
      var hit=false;
      for(var j=0;j<enemies.length;j++){
        var e = enemies[j];
        if(!e.alive) continue;
        var pos2 = enemyPixelPos(e);
        if(b.x < pos2.x+ENEMY_W && b.x+BULLET_W>pos2.x && b.y<pos2.y+ENEMY_H && b.y+BULLET_H>pos2.y){
          e.alive=false;
          hit=true;
          var pts = (ENEMY_ROWS-1-e.row)*10 + 10;
          score += pts;
          if(Math.random()<0.12){
            var types=['rapid','multi','shield','life'];
            var type=types[Math.floor(Math.random()*types.length)];
            powerups.push({x:pos2.x+ENEMY_W/2-8, y:pos2.y, type:type, w:16,h:16});
          }
          break;
        }
      }
      if(hit){ bullets.splice(i,1); continue; }
      for(var bi=0;bi<barriers.length;bi++){
        var barr = barriers[bi];
        var brk=false;
        for(var bl=barr.blocks.length-1;bl>=0;bl--){
          var block = barr.blocks[bl];
          var bx = barr.x+block.dx, by=barr.y+block.dy;
          if(b.x<bx+block.w && b.x+BULLET_W>bx && b.y<by+block.h && b.y+BULLET_H>by){
            block.hp--;
            if(block.hp<=0) barr.blocks.splice(bl,1);
            bullets.splice(i,1);
            hit=true;
            brk=true;
            break;
          }
        }
        if(brk) break;
      }
    }

    for(i=enemyBullets.length-1;i>=0;i--){
      var eb = enemyBullets[i];
      var removed=false;
      for(var bi2=0;bi2<barriers.length;bi2++){
        var barr2 = barriers[bi2];
        var brk2=false;
        for(var bl2=barr2.blocks.length-1;bl2>=0;bl2--){
          var block2 = barr2.blocks[bl2];
          var bx2=barr2.x+block2.dx, by2=barr2.y+block2.dy;
          if(eb.x<bx2+block2.w && eb.x+BULLET_W>bx2 && eb.y<by2+block2.h && eb.y+BULLET_H>by2){
            block2.hp--;
            if(block2.hp<=0) barr2.blocks.splice(bl2,1);
            enemyBullets.splice(i,1);
            removed=true;
            brk2=true;
            break;
          }
        }
        if(brk2) break;
      }
      if(removed) continue;
      if(eb.x<player.x+player.w && eb.x+BULLET_W>player.x && eb.y<player.y+player.h && eb.y+BULLET_H>player.y){
        enemyBullets.splice(i,1);
        loseLife(false);
      }
    }

    for(i=powerups.length-1;i>=0;i--){
      var p = powerups[i];
      if(p.x<player.x+player.w && p.x+p.w>player.x && p.y<player.y+player.h && p.y+p.h>player.y){
        applyPowerup(p.type);
        powerups.splice(i,1);
      }
    }
  }

  function applyPowerup(type){
    if(type==='rapid') activePowerups.rapid = 480;
    else if(type==='multi') activePowerups.multi = 480;
    else if(type==='shield') activePowerups.shield = 300;
    else if(type==='life') lives++;
  }

  function loseLife(fromInvasion){
    if(activePowerups.shield>0 && !fromInvasion){
      return;
    }
    lives--;
    enemyBullets=[];
    if(lives<=0){
      gameState='gameover';
    } else if(fromInvasion){
      initEnemies();
      player.x = W/2-PLAYER_W/2;
    } else {
      player.x = W/2-PLAYER_W/2;
    }
  }

  function draw(){
    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,W,H);

    ctx.fillStyle='#222';
    for(var s=0;s<40;s++){
      var sx=(s*47)%W;
      var sy=(s*89+frameCount*0.2)%H;
      ctx.fillRect(sx,sy,2,2);
    }

    if(gameState==='start'){
      drawCenterText('SPACE INVADERS', H/2-40, 36, '#0f0');
      drawCenterText('Press SPACE or TAP to start', H/2+10, 18, '#fff');
      drawCenterText('Arrows/A-D move, Space shoot, P pause', H/2+40, 14, '#aaa');
      return;
    }

    drawPlayer();
    ctx.fillStyle='#0ff';
    bullets.forEach(function(b){ ctx.fillRect(b.x,b.y,BULLET_W,BULLET_H); });
    ctx.fillStyle='#f55';
    enemyBullets.forEach(function(b){ ctx.fillRect(b.x,b.y,BULLET_W,BULLET_H); });

    enemies.forEach(function(e){
      if(!e.alive) return;
      var pos = enemyPixelPos(e);
      drawEnemy(pos.x,pos.y,e.row);
    });

    barriers.forEach(function(barr){
      barr.blocks.forEach(function(block){
        var alpha = block.hp/4;
        ctx.fillStyle = 'rgba(0,200,0,'+alpha+')';
        ctx.fillRect(barr.x+block.dx, barr.y+block.dy, block.w-1, block.h-1);
      });
    });

    powerups.forEach(function(p){
      ctx.fillStyle = p.type==='rapid'?'#ff0':p.type==='multi'?'#0ff':p.type==='shield'?'#0af':'#f0f';
      ctx.beginPath();
      ctx.arc(p.x+p.w/2,p.y+p.h/2,p.w/2,0,Math.PI*2);
      ctx.fill();
      ctx.fillStyle='#000';
      ctx.font='10px sans-serif';
      ctx.textAlign='center';
      var letter = p.type==='rapid'?'R':p.type==='multi'?'M':p.type==='shield'?'S':'+';
      ctx.fillText(letter,p.x+p.w/2,p.y+p.h/2+3);
    });

    ctx.fillStyle='#fff';
    ctx.font='16px sans-serif';
    ctx.textAlign='left';
    ctx.fillText('Score: '+score, 10, 20);
    ctx.fillText('Level: '+level, W/2-30, 20);
    ctx.textAlign='right';
    ctx.fillText('Lives: '+lives, W-10, 20);

    if(activePowerups.rapid>0 || activePowerups.multi>0 || activePowerups.shield>0){
      ctx.textAlign='left';
      var yy = 40;
      if(activePowerups.rapid>0){ ctx.fillStyle='#ff0'; ctx.fillText('Rapid Fire',10,yy); yy+=18; }
      if(activePowerups.multi>0){ ctx.fillStyle='#0ff'; ctx.fillText('Multi Shot',10,yy); yy+=18; }
      if(activePowerups.shield>0){ ctx.fillStyle='#0af'; ctx.fillText('Shield',10,yy); yy+=18; }
    }

    if(gameState==='levelup'){
      drawCenterText('LEVEL '+level, H/2, 32, '#0f0');
    }
    if(gameState==='paused'){
      drawCenterText('PAUSED', H/2, 32, '#fff');
    }
    if(gameState==='gameover'){
      drawCenterText('GAME OVER', H/2-20, 36, '#f00');
      drawCenterText('Score: '+score, H/2+20, 20, '#fff');
      drawCenterText('Press SPACE or TAP to restart', H/2+50, 16, '#aaa');
    }
  }

  function drawCenterText(text,y,size,color){
    ctx.fillStyle=color;
    ctx.font=size+'px sans-serif';
    ctx.textAlign='center';
    ctx.fillText(text, W/2, y);
  }

  function drawPlayer(){
    ctx.fillStyle = activePowerups.shield>0 ? '#0af' : '#0f0';
    ctx.fillRect(player.x, player.y+8, player.w, player.h-8);
    ctx.beginPath();
    ctx.moveTo(player.x+player.w/2, player.y);
    ctx.lineTo(player.x+player.w-6, player.y+10);
    ctx.lineTo(player.x+6, player.y+10);
    ctx.closePath();
    ctx.fill();
    if(activePowerups.shield>0){
      ctx.strokeStyle='rgba(0,170,255,0.6)';
      ctx.lineWidth=2;
      ctx.beginPath();
      ctx.arc(player.x+player.w/2, player.y+player.h/2, player.w*0.8,0,Math.PI*2);
      ctx.stroke();
    }
  }

  function drawEnemy(x,y,row){
    var colors=['#f0f','#f55','#ff0','#0f0','#0ff'];
    ctx.fillStyle = colors[row%colors.length];
    ctx.fillRect(x,y,ENEMY_W,ENEMY_H);
    ctx.fillStyle='#000';
    var eyeOffset = (frameCount%60<30)?0:2;
    ctx.fillRect(x+6,y+6+eyeOffset,4,4);
    ctx.fillRect(x+ENEMY_W-10,y+6+eyeOffset,4,4);
  }

  function gameLoop(){
    update();
    draw();
    animFrameId = requestAnimationFrame(gameLoop);
  }
  animFrameId = requestAnimationFrame(gameLoop);

  window.__gaimer_onMessage = function(msg){
    switch(msg.type){
      case 'saveState':
        var state = {
          score:score, lives:lives, level:level, gameState:gameState,
          levelMessageTimer:levelMessageTimer,
          player:{x:player.x,y:player.y,w:player.w,h:player.h,speed:player.speed},
          moveLeft:moveLeft, moveRight:moveRight,
          shootCooldownTimer:shootCooldownTimer,
          bullets:bullets, enemyBullets:enemyBullets,
          enemies:enemies, formationX:formationX, formationY:formationY,
          enemyDirection:enemyDirection,
          barriers:barriers,
          powerups:powerups,
          activePowerups:activePowerups,
          frameCount:frameCount,
          touchActive:touchActive, touchX:touchX
        };
        __gaimer_sendMessage('stateData', state);
        break;
      case 'restoreState':
        var d = msg.data;
        if(!d) return;
        score=d.score; lives=d.lives; level=d.level; gameState=d.gameState;
        levelMessageTimer=d.levelMessageTimer;
        player.x=d.player.x; player.y=d.player.y; player.w=d.player.w; player.h=d.player.h; player.speed=d.player.speed;
        moveLeft=d.moveLeft; moveRight=d.moveRight;
        shootCooldownTimer=d.shootCooldownTimer;
        bullets=d.bullets||[]; enemyBullets=d.enemyBullets||[];
        enemies=d.enemies||[]; formationX=d.formationX; formationY=d.formationY;
        enemyDirection=d.enemyDirection;
        barriers=d.barriers||[];
        powerups=d.powerups||[];
        activePowerups=d.activePowerups||{rapid:0,multi:0,shield:0};
        frameCount=d.frameCount||0;
        touchActive=d.touchActive||false; touchX=d.touchX||0;
        break;
      case 'pause':
        if(animFrameId){ cancelAnimationFrame(animFrameId); animFrameId=null; }
        break;
      case 'resume':
        if(!animFrameId){ animFrameId = requestAnimationFrame(gameLoop); }
        break;
    }
  };

})();