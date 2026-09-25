var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');

var COLS = 10, ROWS = 20;

var COLORS = { I:'#00e5e5', O:'#e5e500', T:'#a000e0', S:'#00c000', Z:'#e00000', J:'#0040e0', L:'#e08000' };
var BASE_SHAPES = {
  I: { N:4, cells:[[1,0],[1,1],[1,2],[1,3]] },
  O: { N:2, cells:[[0,0],[0,1],[1,0],[1,1]] },
  T: { N:3, cells:[[0,1],[1,0],[1,1],[1,2]] },
  S: { N:3, cells:[[0,1],[0,2],[1,0],[1,1]] },
  Z: { N:3, cells:[[0,0],[0,1],[1,1],[1,2]] },
  J: { N:3, cells:[[0,0],[1,0],[1,1],[1,2]] },
  L: { N:3, cells:[[0,2],[1,0],[1,1],[1,2]] }
};

var board, current, nextType, bag, score, level, linesClearedTotal, dropInterval, dropTimer, gameOver, isPaused;
var touchStartX=0, touchStartY=0, touchLastX=0, touchLastY=0, touchStartTime=0, touchMoved=false, touchButtonActive=null;
var animFrameId = null;
var lastTime = null;

function refillBag(){
  var types=['I','O','T','S','Z','J','L'];
  for(var i=types.length-1;i>0;i--){
    var j=Math.floor(Math.random()*(i+1));
    var tmp=types[i]; types[i]=types[j]; types[j]=tmp;
  }
  bag = bag.concat(types);
}
function getNextType(){
  if(bag.length===0){ refillBag(); }
  return bag.shift();
}
function createPiece(type){
  var base = BASE_SHAPES[type];
  var cellsCopy = base.cells.map(function(c){ return [c[0], c[1]]; });
  return { type:type, N:base.N, cells:cellsCopy, x: Math.floor((COLS-base.N)/2), y:0, color: COLORS[type] };
}

function isValidPosition(cells, N, x, y){
  for(var i=0;i<cells.length;i++){
    var r = y + cells[i][0];
    var c = x + cells[i][1];
    if(c<0 || c>=COLS || r>=ROWS) return false;
    if(r>=0 && board[r][c]) return false;
  }
  return true;
}

function tryMove(dx,dy){
  if(gameOver || isPaused) return false;
  var nx = current.x+dx, ny = current.y+dy;
  if(isValidPosition(current.cells, current.N, nx, ny)){
    current.x=nx; current.y=ny; return true;
  }
  return false;
}

function softDrop(){
  if(gameOver || isPaused) return;
  if(tryMove(0,1)){ score += 1; dropTimer=0; }
  else { lockPiece(); }
}

function hardDrop(){
  if(gameOver || isPaused) return;
  var dist=0;
  while(isValidPosition(current.cells, current.N, current.x, current.y+1)){ current.y++; dist++; }
  score += dist*2;
  lockPiece();
  dropTimer=0;
}

function rotatePiece(dir){
  if(gameOver || isPaused) return false;
  var N = current.N;
  var newCells = current.cells.map(function(c){
    return dir===1 ? [c[1], N-1-c[0]] : [N-1-c[1], c[0]];
  });
  var kicks=[0,-1,1,-2,2];
  for(var i=0;i<kicks.length;i++){
    var nx = current.x+kicks[i];
    if(isValidPosition(newCells, N, nx, current.y)){
      current.cells=newCells; current.x=nx; return true;
    }
  }
  return false;
}

function lockPiece(){
  var topOut=false;
  current.cells.forEach(function(cell){
    var r = current.y+cell[0], c = current.x+cell[1];
    if(r<0){ topOut=true; return; }
    if(r>=0 && r<ROWS && c>=0 && c<COLS){ board[r][c]=current.color; }
  });
  if(topOut){ gameOver=true; return; }
  clearLines();
  spawnPiece();
  if(!isValidPosition(current.cells, current.N, current.x, current.y)){
    gameOver=true;
  }
}

function clearLines(){
  var cleared=0;
  for(var r=ROWS-1;r>=0;r--){
    var full=true;
    for(var c=0;c<COLS;c++){ if(!board[r][c]){ full=false; break; } }
    if(full){
      board.splice(r,1);
      board.unshift(new Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  if(cleared>0){
    var lineScores=[0,100,300,500,800];
    score += lineScores[cleared] * level;
    linesClearedTotal += cleared;
    var newLevel = Math.floor(linesClearedTotal/10)+1;
    if(newLevel !== level){
      level = newLevel;
      dropInterval = Math.max(1000 - (level-1)*70, 100);
    }
  }
}

function spawnPiece(){
  current = createPiece(nextType);
  nextType = getNextType();
  dropTimer = 0;
}

function resetGame(){ initGame(); }

function initGame(){
  board = [];
  for(var r=0;r<ROWS;r++){ board.push(new Array(COLS).fill(null)); }
  bag = [];
  refillBag();
  current = createPiece(getNextType());
  nextType = getNextType();
  score = 0; level = 1; linesClearedTotal = 0;
  dropInterval = 1000; dropTimer = 0;
  gameOver = false; isPaused = false; lastTime = null;
  touchStartX=0; touchStartY=0; touchLastX=0; touchLastY=0; touchStartTime=0; touchMoved=false; touchButtonActive=null;
}

function update(dt){
  if(gameOver || isPaused) return;
  dropTimer += dt;
  if(dropTimer >= dropInterval){
    dropTimer = 0;
    if(!tryMove(0,1)){
      lockPiece();
    }
  }
}

function getLayout(){
  var w = canvas.width, h = canvas.height;
  var controlBarH = Math.max(50, Math.floor(h*0.1));
  var playH = h - controlBarH;
  var bs = Math.floor(Math.min((w*0.62)/COLS, (playH-20)/ROWS));
  if(bs<8) bs=8;
  var boardW = bs*COLS, boardH = bs*ROWS;
  var boardX = 10;
  var boardY = Math.floor((playH-boardH)/2);
  if(boardY<10) boardY=10;
  var sidebarX = boardX+boardW+15;
  var sidebarW = w - sidebarX - 10;
  if(sidebarW<0) sidebarW=0;
  var labels=[{label:'\u25C0',action:'left'},{label:'\u27F3',action:'rotate'},{label:'\u25B6',action:'right'},{label:'\u25BC',action:'down'},{label:'\u2913',action:'drop'}];
  var btnCount = labels.length;
  var btnW = w/btnCount;
  var buttons=[];
  for(var i=0;i<btnCount;i++){
    buttons.push({ x:i*btnW, y:playH, w:btnW, h:controlBarH, label:labels[i].label, action:labels[i].action });
  }
  return { bs:bs, boardX:boardX, boardY:boardY, boardW:boardW, boardH:boardH, sidebarX:sidebarX, sidebarW:sidebarW, playH:playH, controlBarH:controlBarH, buttons:buttons };
}

function hitButton(layout,x,y){
  for(var i=0;i<layout.buttons.length;i++){
    var b=layout.buttons[i];
    if(x>=b.x && x<=b.x+b.w && y>=b.y && y<=b.y+b.h) return b;
  }
  return null;
}

function drawBlock(x,y,size,color){
  ctx.fillStyle = color;
  ctx.fillRect(x+1, y+1, size-2, size-2);
  ctx.strokeStyle = 'rgba(0,0,0,0.4)';
  ctx.strokeRect(x+1, y+1, size-2, size-2);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.fillRect(x+1, y+1, size-2, Math.max(2, size*0.2));
}
function drawGhostBlock(x,y,size,color){
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x+2, y+2, size-4, size-4);
}

function draw(){
  var layout = getLayout();
  ctx.fillStyle = '#111';
  ctx.fillRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle = '#000';
  ctx.fillRect(layout.boardX, layout.boardY, layout.boardW, layout.boardH);

  for(var r=0;r<ROWS;r++){
    for(var c=0;c<COLS;c++){
      var cellColor = board[r][c];
      var px = layout.boardX + c*layout.bs;
      var py = layout.boardY + r*layout.bs;
      if(cellColor){
        drawBlock(px, py, layout.bs, cellColor);
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.05)';
        ctx.strokeRect(px, py, layout.bs, layout.bs);
      }
    }
  }

  if(!gameOver){
    var gy = current.y;
    while(isValidPosition(current.cells, current.N, current.x, gy+1)) gy++;
    current.cells.forEach(function(cell){
      var r = gy+cell[0], c = current.x+cell[1];
      if(r>=0){
        var px = layout.boardX + c*layout.bs;
        var py = layout.boardY + r*layout.bs;
        drawGhostBlock(px, py, layout.bs, current.color);
      }
    });
    current.cells.forEach(function(cell){
      var r = current.y+cell[0], c = current.x+cell[1];
      if(r>=0){
        var px = layout.boardX + c*layout.bs;
        var py = layout.boardY + r*layout.bs;
        drawBlock(px, py, layout.bs, current.color);
      }
    });
  }

  ctx.strokeStyle = '#555';
  ctx.lineWidth = 2;
  ctx.strokeRect(layout.boardX, layout.boardY, layout.boardW, layout.boardH);

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  var sy = layout.boardY + 10;
  ctx.font = '16px sans-serif';
  ctx.fillText('Score', layout.sidebarX, sy); sy += 22;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(String(score), layout.sidebarX, sy); sy += 34;
  ctx.font = '16px sans-serif';
  ctx.fillText('Level', layout.sidebarX, sy); sy += 22;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(String(level), layout.sidebarX, sy); sy += 34;
  ctx.font = '16px sans-serif';
  ctx.fillText('Lines', layout.sidebarX, sy); sy += 22;
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(String(linesClearedTotal), layout.sidebarX, sy); sy += 40;
  ctx.font = '16px sans-serif';
  ctx.fillText('Next', layout.sidebarX, sy); sy += 10;

  var previewBS = Math.max(10, Math.floor(layout.bs*0.7));
  var nextBase = BASE_SHAPES[nextType];
  var boxSize = previewBS*4;
  var boxW = Math.min(boxSize, Math.max(boxSize, layout.sidebarW));
  ctx.strokeStyle = '#444';
  ctx.strokeRect(layout.sidebarX, sy, boxSize, boxSize);
  nextBase.cells.forEach(function(cell){
    var offset = (4-nextBase.N)*previewBS/2;
    var px = layout.sidebarX + cell[1]*previewBS + offset;
    var py = sy + cell[0]*previewBS + offset;
    drawBlock(px, py, previewBS, COLORS[nextType]);
  });

  ctx.fillStyle = '#222';
  ctx.fillRect(0, layout.playH, canvas.width, layout.controlBarH);
  layout.buttons.forEach(function(b){
    ctx.strokeStyle = '#444';
    ctx.strokeRect(b.x+2, b.y+2, b.w-4, b.h-4);
    ctx.fillStyle = '#eee';
    ctx.font = Math.floor(layout.controlBarH*0.5) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.label, b.x+b.w/2, b.y+b.h/2);
  });
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  if(isPaused && !gameOver){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0,0,canvas.width,layout.playH);
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width/2, layout.playH/2);
    ctx.font = '14px sans-serif';
    ctx.fillText('Press P to resume', canvas.width/2, layout.playH/2+28);
    ctx.textAlign = 'left';
  }

  if(gameOver){
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0,0,canvas.width,layout.playH);
    ctx.fillStyle = '#fff';
    ctx.font = '28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, layout.playH/2-20);
    ctx.font = '18px sans-serif';
    ctx.fillText('Score: ' + score, canvas.width/2, layout.playH/2+10);
    ctx.fillText('Tap or press R to restart', canvas.width/2, layout.playH/2+36);
    ctx.textAlign = 'left';
  }
}

function handleButtonAction(action){
  if(gameOver){ resetGame(); return; }
  if(isPaused) return;
  switch(action){
    case 'left': tryMove(-1,0); break;
    case 'right': tryMove(1,0); break;
    case 'rotate': rotatePiece(1); break;
    case 'down': softDrop(); break;
    case 'drop': hardDrop(); break;
  }
}

function getTouchPos(t){
  var rect = canvas.getBoundingClientRect();
  var scaleX = canvas.width/rect.width;
  var scaleY = canvas.height/rect.height;
  return { x: (t.clientX-rect.left)*scaleX, y: (t.clientY-rect.top)*scaleY };
}

canvas.addEventListener('touchstart', function(e){
  e.preventDefault();
  var t = e.touches[0];
  var pos = getTouchPos(t);
  touchStartX = pos.x; touchStartY = pos.y;
  touchLastX = pos.x; touchLastY = pos.y;
  touchStartTime = Date.now();
  touchMoved = false;
  touchButtonActive = null;
  var layout = getLayout();
  var btn = hitButton(layout, pos.x, pos.y);
  if(btn){
    touchButtonActive = btn.action;
    handleButtonAction(btn.action);
  } else if(gameOver){
    resetGame();
  }
}, { passive:false });

canvas.addEventListener('touchmove', function(e){
  e.preventDefault();
  if(touchButtonActive) return;
  if(gameOver || isPaused) return;
  var t = e.touches[0];
  var pos = getTouchPos(t);
  var layout = getLayout();
  var dx = pos.x - touchLastX;
  var dy = pos.y - touchLastY;
  if(Math.abs(dx) >= layout.bs*0.7){
    tryMove(dx>0?1:-1, 0);
    touchLastX = pos.x;
    touchMoved = true;
  }
  if(dy >= layout.bs*0.7){
    softDrop();
    touchLastY = pos.y;
    touchMoved = true;
  } else if(dy <= -layout.bs*0.7){
    touchLastY = pos.y;
  }
}, { passive:false });

canvas.addEventListener('touchend', function(e){
  e.preventDefault();
  if(!touchButtonActive && !touchMoved){
    if(gameOver){ resetGame(); }
    else if(!isPaused){ rotatePiece(1); }
  }
  touchButtonActive = null;
}, { passive:false });

document.addEventListener('keydown', function(e){
  if(e.key==='ArrowLeft' || e.key==='ArrowRight' || e.key==='ArrowDown' || e.key==='ArrowUp' || e.key===' '){
    e.preventDefault();
  }
  if(gameOver){
    if(e.key==='r' || e.key==='R'){ resetGame(); }
    return;
  }
  if(isPaused){
    if(e.key==='p' || e.key==='P'){ isPaused=false; }
    return;
  }
  switch(e.key){
    case 'ArrowLeft': tryMove(-1,0); break;
    case 'ArrowRight': tryMove(1,0); break;
    case 'ArrowDown': softDrop(); break;
    case 'ArrowUp': rotatePiece(1); break;
    case 'x': case 'X': rotatePiece(1); break;
    case 'z': case 'Z': rotatePiece(-1); break;
    case ' ': hardDrop(); break;
    case 'p': case 'P': isPaused=true; break;
  }
});

function gameLoop(timestamp){
  if(lastTime===null) lastTime=timestamp;
  var dt = timestamp - lastTime;
  lastTime = timestamp;
  if(dt>100) dt=100;
  update(dt);
  draw();
  animFrameId = requestAnimationFrame(gameLoop);
}

window.__gaimer_onMessage = function(msg){
  switch(msg.type){
    case 'saveState':
      var state = {
        board: board,
        current: current,
        nextType: nextType,
        bag: bag,
        score: score,
        level: level,
        linesClearedTotal: linesClearedTotal,
        dropInterval: dropInterval,
        dropTimer: dropTimer,
        gameOver: gameOver,
        isPaused: isPaused,
        touchStartX: touchStartX,
        touchStartY: touchStartY,
        touchLastX: touchLastX,
        touchLastY: touchLastY,
        touchStartTime: touchStartTime,
        touchMoved: touchMoved,
        touchButtonActive: touchButtonActive
      };
      __gaimer_sendMessage('stateData', state);
      break;
    case 'restoreState':
      var d = msg.data;
      if(d){
        board = d.board; current = d.current; nextType = d.nextType; bag = d.bag;
        score = d.score; level = d.level; linesClearedTotal = d.linesClearedTotal;
        dropInterval = d.dropInterval; dropTimer = d.dropTimer;
        gameOver = d.gameOver; isPaused = d.isPaused;
        touchStartX = d.touchStartX||0; touchStartY = d.touchStartY||0;
        touchLastX = d.touchLastX||0; touchLastY = d.touchLastY||0;
        touchStartTime = d.touchStartTime||0; touchMoved = !!d.touchMoved;
        touchButtonActive = d.touchButtonActive||null;
        lastTime = null;
      }
      break;
    case 'pause':
      if(animFrameId){ cancelAnimationFrame(animFrameId); animFrameId=null; }
      break;
    case 'resume':
      if(!animFrameId){ lastTime=null; animFrameId=requestAnimationFrame(gameLoop); }
      break;
  }
};

initGame();
animFrameId = requestAnimationFrame(gameLoop);
