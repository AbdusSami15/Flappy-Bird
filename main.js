// Flappy Bird Clone (Canvas)
// Controls: Click / Tap / Space to flap. On Game Over: Tap/Click or Enter to restart.

"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

// ---------------------------
// Canvas sizing (mobile-friendly)
// ---------------------------
const LOGICAL_W = 360;
const LOGICAL_H = 640;

function fitCanvas() {
  canvas.width = LOGICAL_W;
  canvas.height = LOGICAL_H;

  // Scale canvas visually to fit the screen while keeping gameplay stable
  const maxW = Math.min(window.innerWidth - 24, 420);
  const scale = maxW / LOGICAL_W;
  canvas.style.width = `${LOGICAL_W * scale}px`;
  canvas.style.height = `${LOGICAL_H * scale}px`;
}
fitCanvas();
window.addEventListener("resize", fitCanvas);

// ---------------------------
// Game constants (tune feel)
// ---------------------------
const GROUND_H = 90;
const GROUND_Y = LOGICAL_H - GROUND_H;

const GRAVITY = 0.45;
const JUMP_VELOCITY = -7.5;
const MAX_FALL = 10;

const PIPE_W = 64;
const PIPE_GAP = 155;
const PIPE_SPEED = 2.7;
const SPAWN_EVERY_FRAMES = 95;

const BG_SPEED = 1.15;

// ---------------------------
// State
// ---------------------------
let gameState = "READY"; // READY, PLAYING, GAMEOVER
let score = 0;

let bgOffset = 0;
let spawnTimer = 0;
const pipes = [];

// ---------------------------
// Bird
// ---------------------------
const bird = {
  x: 95,
  y: LOGICAL_H * 0.5,
  w: 34,
  h: 24,
  vy: 0,
  rotation: 0,
};

function resetGame() {
  gameState = "READY";
  score = 0;

  bird.x = 95;
  bird.y = LOGICAL_H * 0.5;
  bird.vy = 0;
  bird.rotation = 0;

  pipes.length = 0;
  spawnTimer = 0;
  bgOffset = 0;
}

function gameOver() {
  gameState = "GAMEOVER";
}

// ---------------------------
// Input (mobile + desktop)
// ---------------------------
function flap() {
  if (gameState === "GAMEOVER") {
    resetGame();
    return;
  }

  if (gameState === "READY") {
    gameState = "PLAYING";
  }

  bird.vy = JUMP_VELOCITY;
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  flap();
}, { passive: false });

window.addEventListener("keydown", (e) => {
  if (e.code === "Space") flap();
  if (e.code === "Enter" && gameState === "GAMEOVER") resetGame();
});

// ---------------------------
// Pipes
// ---------------------------
function spawnPipe() {
  // Keep pipes away from top/ground
  const marginTop = 60;
  const marginBottom = 120;

  const minTopH = marginTop + 40;
  const maxTopH = GROUND_Y - marginBottom - PIPE_GAP;

  const topH = Math.floor(Math.random() * (maxTopH - minTopH + 1) + minTopH);

  pipes.push({
    x: LOGICAL_W + 20,
    topH,
    passed: false,
  });
}

function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw &&
    ax + aw > bx &&
    ay < by + bh &&
    ay + ah > by;
}

function checkPipeCollision(p) {
  const bx = bird.x, by = bird.y, bw = bird.w, bh = bird.h;

  // Top pipe rect
  const topX = p.x, topY = 0, topW = PIPE_W, topH = p.topH;

  // Bottom pipe rect
  const botX = p.x;
  const botY = p.topH + PIPE_GAP;
  const botW = PIPE_W;
  const botH = GROUND_Y - botY;

  return rectsOverlap(bx, by, bw, bh, topX, topY, topW, topH) ||
    rectsOverlap(bx, by, bw, bh, botX, botY, botW, botH);
}

function updatePipes() {
  if (gameState !== "PLAYING") return;

  spawnTimer++;
  if (spawnTimer >= SPAWN_EVERY_FRAMES) {
    spawnTimer = 0;
    spawnPipe();
  }

  for (let i = pipes.length - 1; i >= 0; i--) {
    const p = pipes[i];
    p.x -= PIPE_SPEED;

    // Score when bird passes the pipe
    if (!p.passed && (p.x + PIPE_W) < bird.x) {
      p.passed = true;
      score += 1;
    }

    // Remove offscreen
    if (p.x + PIPE_W < -30) {
      pipes.splice(i, 1);
      continue;
    }

    // Collision
    if (checkPipeCollision(p)) {
      gameOver();
    }
  }
}

// ---------------------------
// Bird physics
// ---------------------------
function updateBird() {
  if (gameState !== "PLAYING") return;

  bird.vy += GRAVITY;
  if (bird.vy > MAX_FALL) bird.vy = MAX_FALL;

  bird.y += bird.vy;

  // Rotation smoothing
  const targetRot = bird.vy < 0 ? -0.35 : 0.9;
  bird.rotation += (targetRot - bird.rotation) * 0.15;

  // Ceiling clamp
  if (bird.y < 0) {
    bird.y = 0;
    bird.vy = 0;
  }

  // Ground collision
  if (bird.y + bird.h >= GROUND_Y) {
    bird.y = GROUND_Y - bird.h;
    gameOver();
  }
}

// ---------------------------
// Background
// ---------------------------
function updateBackground() {
  if (gameState !== "PLAYING") return;
  bgOffset -= BG_SPEED;
  if (bgOffset <= -LOGICAL_W) bgOffset = 0;
}

// ---------------------------
// Drawing
// ---------------------------
function clear() {
  ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
}

function drawBackground() {
  // Sky
  ctx.fillStyle = "#7ad7ff";
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

  // Simple moving clouds/stripes (visible scrolling without images)
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  const stripeW = 60;
  for (let x = (bgOffset % stripeW) - stripeW; x < LOGICAL_W + stripeW; x += stripeW) {
    ctx.fillRect(x, 50, 18, 10);
    ctx.fillRect(x + 20, 120, 12, 8);
    ctx.fillRect(x + 10, 200, 22, 10);
  }
}

function drawGround() {
  // Ground
  ctx.fillStyle = "#5cc35c";
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, GROUND_H);

  // Dirt strip
  ctx.fillStyle = "#3b8f3b";
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, 18);
}

function drawPipes() {
  for (const p of pipes) {
    const topX = p.x;
    const topH = p.topH;

    const bottomY = topH + PIPE_GAP;
    const bottomH = GROUND_Y - bottomY;

    // Pipe body
    ctx.fillStyle = "#2ecc71";

    // top pipe
    ctx.fillRect(topX, 0, PIPE_W, topH);

    // bottom pipe
    ctx.fillRect(topX, bottomY, PIPE_W, bottomH);

    // Pipe rim
    ctx.fillStyle = "#27ae60";
    ctx.fillRect(topX - 2, topH - 14, PIPE_W + 4, 14);
    ctx.fillRect(topX - 2, bottomY, PIPE_W + 4, 14);
  }
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
  ctx.rotate(bird.rotation);

  // Bird body
  ctx.fillStyle = "#ffcc00";
  ctx.fillRect(-bird.w / 2, -bird.h / 2, bird.w, bird.h);

  // Eye
  ctx.fillStyle = "#111";
  ctx.fillRect(6, -6, 4, 4);

  ctx.restore();
}

function drawUI() {
  // Score
  ctx.fillStyle = "#111";
  ctx.font = "bold 28px Arial";
  ctx.fillText(`${score}`, 20, 42);

  if (gameState === "READY") {
    ctx.font = "bold 22px Arial";
    ctx.fillText("Tap / Click / Space", 75, LOGICAL_H * 0.45);
    ctx.font = "18px Arial";
    ctx.fillText("to start", 155, LOGICAL_H * 0.50);
  }

  if (gameState === "GAMEOVER") {
    // Dark overlay
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 32px Arial";
    ctx.fillText("Game Over", 95, LOGICAL_H * 0.40);

    ctx.font = "bold 22px Arial";
    ctx.fillText(`Score: ${score}`, 120, LOGICAL_H * 0.47);

    ctx.font = "18px Arial";
    ctx.fillText("Tap to Restart", 122, LOGICAL_H * 0.54);
    ctx.fillText("or Press Enter", 122, LOGICAL_H * 0.58);
  }
}

// ---------------------------
// Game loop
// ---------------------------
function update() {
  updateBackground();
  updateBird();
  updatePipes();
}

function render() {
  clear();
  drawBackground();
  drawPipes();
  drawGround();
  drawBird();
  drawUI();
}

function loop() {
  update();
  render();
  requestAnimationFrame(loop);
}

// Start
resetGame();
loop();
