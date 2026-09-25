var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');

var W = canvas.width, H = canvas.height;

var paddleWidth = 12, paddleHeight = 90;
var paddleSpeed = 7;

var playerY = H/2 - paddleHeight/2;
var aiY = H/2 - paddleHeight/2;

var playerX = 20;
var aiX = W - 20 - paddleWidth;

var ballSize = 12;
var ballX = W/2, ballY = H/2;
var baseSpeed = 5;
var ballVX = baseSpeed, ballVY = baseSpeed * 0.6;

var playerScore = 0, aiScore = 0;
var maxScore = 7;

var upPressed = false, downPressed = false;
var touchActive = false, touchY = null;

var gameState = 'playing';
var winner = null;

var animFrameId = null;

function resetBall(direction) {
  ballX = W/2; ballY = H/2;
  var angle = (Math.random() * 0.6 - 0.3);
  var speed = baseSpeed;
  var dir = direction || (Math.random() < 0.5 ? 1 : -1);
  ballVX = Math.cos(angle) * speed * dir;
  ballVY = Math.sin(angle) * speed;
  if (Math.abs(ballVX) < 2) ballVX = ballVX < 0 ? -2 : 2;
}

function resetGame() {
  playerScore = 0; aiScore = 0;
  playerY = H/2 - paddleHeight/2;
  aiY = H/2 - paddleHeight/2;
  gameState = 'playing';
  winner = null;
  resetBall();
}

window.addEventListener('keydown', function(e){
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { upPressed = true; e.preventDefault(); }
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { downPressed = true; e.preventDefault(); }
  if ((e.key === 'Enter' || e.key === ' ') && gameState === 'gameover') { resetGame(); }
});
window.addEventListener('keyup', function(e){
  if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') upPressed = false;
  if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') downPressed = false;
});

function getTouchPos(touch) {
  var rect = canvas.getBoundingClientRect();
  var scaleY = canvas.height / rect.height;
  return (touch.clientY - rect.top) * scaleY;
}

canvas.addEventListener('touchstart', function(e){
  e.preventDefault();
  if (gameState === 'gameover') { resetGame(); return; }
  touchActive = true;
  touchY = getTouchPos(e.touches[0]);
}, {passive:false});

canvas.addEventListener('touchmove', function(e){
  e.preventDefault();
  if (e.touches.length > 0) {
    touchY = getTouchPos(e.touches[0]);
  }
}, {passive:false});

canvas.addEventListener('touchend', function(e){
  e.preventDefault();
  touchActive = false;
}, {passive:false});

function update() {
  if (gameState !== 'playing') return;

  if (touchActive && touchY !== null) {
    var target = touchY - paddleHeight/2;
    if (playerY < target) playerY += Math.min(paddleSpeed*1.5, target-playerY);
    else if (playerY > target) playerY -= Math.min(paddleSpeed*1.5, playerY-target);
  } else {
    if (upPressed) playerY -= paddleSpeed;
    if (downPressed) playerY += paddleSpeed;
  }
  playerY = Math.max(0, Math.min(H - paddleHeight, playerY));

  var aiCenter = aiY + paddleHeight/2;
  var aiTarget = ballY;
  var aiSpeed = paddleSpeed * 0.72;
  if (aiCenter < aiTarget - 10) aiY += aiSpeed;
  else if (aiCenter > aiTarget + 10) aiY -= aiSpeed;
  aiY = Math.max(0, Math.min(H - paddleHeight, aiY));

  ballX += ballVX;
  ballY += ballVY;

  if (ballY - ballSize/2 <= 0) { ballY = ballSize/2; ballVY *= -1; }
  if (ballY + ballSize/2 >= H) { ballY = H - ballSize/2; ballVY *= -1; }

  if (ballVX < 0 && ballX - ballSize/2 <= playerX + paddleWidth && ballX - ballSize/2 >= playerX &&
      ballY + ballSize/2 >= playerY && ballY - ballSize/2 <= playerY + paddleHeight) {
    ballX = playerX + paddleWidth + ballSize/2;
    var relativeIntersect = (ballY - (playerY + paddleHeight/2)) / (paddleHeight/2);
    var bounceAngle = relativeIntersect * (Math.PI/3);
    var speed = Math.min(Math.hypot(ballVX, ballVY) * 1.05, 14);
    ballVX = Math.cos(bounceAngle) * speed;
    ballVY = Math.sin(bounceAngle) * speed;
    if (ballVX < 0) ballVX *= -1;
  }

  if (ballVX > 0 && ballX + ballSize/2 >= aiX && ballX + ballSize/2 <= aiX + paddleWidth &&
      ballY + ballSize/2 >= aiY && ballY - ballSize/2 <= aiY + paddleHeight) {
    ballX = aiX - ballSize/2;
    var relativeIntersect2 = (ballY - (aiY + paddleHeight/2)) / (paddleHeight/2);
    var bounceAngle2 = relativeIntersect2 * (Math.PI/3);
    var speed2 = Math.min(Math.hypot(ballVX, ballVY) * 1.05, 14);
    ballVX = -Math.cos(bounceAngle2) * speed2;
    ballVY = Math.sin(bounceAngle2) * speed2;
    if (ballVX > 0) ballVX *= -1;
  }

  if (ballX < -ballSize) {
    aiScore++;
    if (aiScore >= maxScore) { gameState = 'gameover'; winner = 'AI'; }
    else resetBall(1);
  }
  if (ballX > W + ballSize) {
    playerScore++;
    if (playerScore >= maxScore) { gameState = 'gameover'; winner = 'Player'; }
    else resetBall(-1);
  }
}

function draw() {
  ctx.fillStyle = '#0a0a12';
  ctx.fillRect(0,0,W,H);

  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.setLineDash([8,10]);
  ctx.beginPath();
  ctx.moveTo(W/2, 0);
  ctx.lineTo(W/2, H);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#4fd1ff';
  ctx.fillRect(playerX, playerY, paddleWidth, paddleHeight);
  ctx.fillStyle = '#ff6b6b';
  ctx.fillRect(aiX, aiY, paddleWidth, paddleHeight);

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(ballX, ballY, ballSize/2, 0, Math.PI*2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(playerScore, W/2 - 60, 55);
  ctx.fillText(aiScore, W/2 + 60, 55);

  if (gameState === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, H/2 - 60, W, 120);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText((winner === 'Player' ? 'You Win!' : 'AI Wins!'), W/2, H/2 - 10);
    ctx.font = '18px sans-serif';
    ctx.fillText('Tap or press Enter to play again', W/2, H/2 + 25);
  }
  ctx.textAlign = 'left';
}

function gameLoop() {
  update();
  draw();
  animFrameId = requestAnimationFrame(gameLoop);
}

resetBall();
animFrameId = requestAnimationFrame(gameLoop);

window.__gaimer_onMessage = function(msg) {
  switch (msg.type) {
    case 'saveState':
      var state = {
        playerY: playerY, aiY: aiY, ballX: ballX, ballY: ballY,
        ballVX: ballVX, ballVY: ballVY, playerScore: playerScore, aiScore: aiScore,
        gameState: gameState, winner: winner, upPressed: upPressed, downPressed: downPressed,
        touchActive: touchActive, touchY: touchY
      };
      __gaimer_sendMessage('stateData', state);
      break;
    case 'restoreState':
      var d = msg.data;
      playerY = d.playerY; aiY = d.aiY; ballX = d.ballX; ballY = d.ballY;
      ballVX = d.ballVX; ballVY = d.ballVY; playerScore = d.playerScore; aiScore = d.aiScore;
      gameState = d.gameState; winner = d.winner; upPressed = d.upPressed; downPressed = d.downPressed;
      touchActive = d.touchActive; touchY = d.touchY;
      break;
    case 'pause':
      if (animFrameId) { cancelAnimationFrame(animFrameId); animFrameId = null; }
      break;
    case 'resume':
      if (!animFrameId) { animFrameId = requestAnimationFrame(gameLoop); }
      break;
  }
};
