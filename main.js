// Flappy Bird Style Game - Production Ready
// Original character and art - Professional quality

"use strict";

// =============================================================================
// CANVAS SETUP
// =============================================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d", { alpha: false });

const LOGICAL_W = 400;
const LOGICAL_H = 712;
const ASPECT_RATIO = LOGICAL_W / LOGICAL_H;

let canvasScale = 1;

function fitCanvas() {
  canvas.width = LOGICAL_W;
  canvas.height = LOGICAL_H;

  const padding = 12;
  const availableW = window.innerWidth - padding * 2;
  const availableH = window.innerHeight - padding * 2;
  const screenAspect = availableW / availableH;

  let displayWidth, displayHeight;
  
  if (screenAspect > ASPECT_RATIO) {
    displayHeight = availableH;
    displayWidth = displayHeight * ASPECT_RATIO;
  } else {
    displayWidth = availableW;
    displayHeight = displayWidth / ASPECT_RATIO;
  }

  const maxWidth = 500;
  if (displayWidth > maxWidth) {
    displayWidth = maxWidth;
    displayHeight = maxWidth / ASPECT_RATIO;
  }

  canvasScale = displayWidth / LOGICAL_W;
  canvas.style.width = `${displayWidth}px`;
  canvas.style.height = `${displayHeight}px`;
}

fitCanvas();
window.addEventListener("resize", fitCanvas);
window.addEventListener("orientationchange", () => setTimeout(fitCanvas, 100));

// =============================================================================
// GAME CONSTANTS
// =============================================================================
const GROUND_H = 112;
const GROUND_Y = LOGICAL_H - GROUND_H;
const SKY_H = GROUND_Y;

const PI2 = Math.PI * 2;

// Physics
const GRAVITY = 1800;
const JUMP_VELOCITY = -420;
const MAX_FALL_SPEED = 650;

// Pipes
const PIPE_W = 72;
const PIPE_GAP = 160;
const PIPE_SPEED = 160;
const PIPE_SPAWN_INTERVAL = 1.6;
const PIPE_POOL_SIZE = 8;

// Bird
const BIRD_W = 40;
const BIRD_H = 30;

// Animation
const WING_FLAP_SPEED = 12; // Flaps per second
const GROUND_SCROLL_SPEED = 160;

// =============================================================================
// COLORS - Futuristic Neon Cyberpunk palette
// =============================================================================
const Colors = {
  // Sky gradient (dark cyberpunk)
  SKY_TOP: "#0a0a1a",
  SKY_MID: "#1a1a3a",
  SKY_BOTTOM: "#2a1a4a",
  
  // Neon accents
  NEON_CYAN: "#00f5ff",
  NEON_PINK: "#ff00aa",
  NEON_PURPLE: "#aa00ff",
  NEON_BLUE: "#4488ff",
  NEON_ORANGE: "#ff6600",
  
  // Pipes (neon style)
  PIPE_BODY: "#1a3a4a",
  PIPE_BODY_DARK: "#0a2030",
  PIPE_BODY_LIGHT: "#2a5a6a",
  PIPE_GLOW: "#00f5ff",
  PIPE_GLOW_INNER: "#88ffff",
  PIPE_LIP: "#0a2a3a",
  
  // Ground (tech platform)
  GROUND_TOP: "#1a2a3a",
  GROUND_BODY: "#0a1520",
  GROUND_LINE: "#00f5ff",
  GROUND_GRID: "#00f5ff",
  
  // Bird (glowing phoenix/cyber bird)
  BIRD_BODY: "#ff8800",
  BIRD_BODY_LIGHT: "#ffaa33",
  BIRD_BODY_DARK: "#cc5500",
  BIRD_WING: "#ff4400",
  BIRD_WING_DARK: "#cc2200",
  BIRD_GLOW: "#ff6600",
  BIRD_BELLY: "#ffdd88",
  BIRD_BEAK: "#ffcc00",
  BIRD_BEAK_DARK: "#dd9900",
  BIRD_EYE_WHITE: "#ffffff",
  BIRD_EYE_PUPIL: "#000000",
  BIRD_EYE_GLOW: "#00f5ff",
  
  // UI
  TEXT_WHITE: "#ffffff",
  TEXT_SHADOW: "#000022",
  TEXT_GOLD: "#ffcc00",
  TEXT_CYAN: "#00f5ff",
  OVERLAY: "rgba(0,0,20,0.7)",
  
  // Particles
  STAR: "#ffffff",
  PARTICLE: "#00f5ff",
};

// =============================================================================
// TIMING
// =============================================================================
const TARGET_FPS = 60;
const TARGET_DT = 1 / TARGET_FPS;
const MAX_DT = TARGET_DT * 3;
const MIN_DT = TARGET_DT * 0.5;

let lastTime = 0;
let deltaTime = TARGET_DT;
let frameCount = 0;
let gameTime = 0;
let isPaused = false;

function updateTiming(timestamp) {
  if (lastTime === 0 || isPaused) {
    lastTime = timestamp;
    deltaTime = TARGET_DT;
    isPaused = false;
    return;
  }
  const rawDt = (timestamp - lastTime) * 0.001;
  lastTime = timestamp;
  deltaTime = Math.min(MAX_DT, Math.max(MIN_DT, rawDt));
  gameTime += deltaTime;
}

// =============================================================================
// AUDIO SYSTEM
// =============================================================================
const AUDIO_STORAGE_KEY = "flappybird_muted";

const Audio = {
  ctx: null,
  unlocked: false,
  muted: false,
  masterGain: null,

  init() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.loadMutePreference();
      this.updateMasterGain();
    } catch (e) {}
  },

  unlock() {
    if (this.unlocked || !this.ctx) return;
    if (this.ctx.state === "suspended") {
      this.ctx.resume().then(() => { this.unlocked = true; }).catch(() => {});
    } else {
      this.unlocked = true;
    }
    const buffer = this.ctx.createBuffer(1, 1, 22050);
    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.ctx.destination);
    source.start(0);
  },

  isReady() {
    return this.ctx && this.unlocked && this.ctx.state === "running";
  },

  loadMutePreference() {
    try { this.muted = localStorage.getItem(AUDIO_STORAGE_KEY) === "true"; } catch (e) {}
  },

  saveMutePreference() {
    try { localStorage.setItem(AUDIO_STORAGE_KEY, String(this.muted)); } catch (e) {}
  },

  toggleMute() {
    this.muted = !this.muted;
    this.updateMasterGain();
    this.saveMutePreference();
  },

  updateMasterGain() {
    if (this.masterGain) this.masterGain.gain.value = this.muted ? 0 : 1;
  },

  // Wing flap sound
  playFlap() {
    if (!this.isReady()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(420, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.05);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.1);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.12);
  },

  // Point scored
  playScore() {
    if (!this.isReady()) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.setValueAtTime(880, now + 0.08);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.setValueAtTime(0.08, now + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.2);
  },

  // Hit pipe or ground - impactful crash sound
  playHit() {
    if (!this.isReady()) return;
    const now = this.ctx.currentTime;
    
    // Heavy impact thud
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  },
  
  // Crash sound for pipe collision - more dramatic
  playCrash() {
    if (!this.isReady()) return;
    const now = this.ctx.currentTime;
    
    // Metallic clang
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "square";
    osc1.frequency.setValueAtTime(300, now);
    osc1.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(now);
    osc1.stop(now + 0.12);
    
    // Low thump layered
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(100, now);
    osc2.frequency.exponentialRampToValueAtTime(30, now + 0.2);
    gain2.gain.setValueAtTime(0.5, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(now);
    osc2.stop(now + 0.2);
  },

  // Death / fall - descending sad tone
  playDie() {
    if (!this.isReady()) return;
    const now = this.ctx.currentTime;
    
    // Descending womp womp sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.5);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.4);
  },

  // Swoosh for transitions
  playSwoosh() {
    if (!this.isReady()) return;
    const now = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.15 | 0;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.15);
    filter.Q.value = 3;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(now);
  },
};

// =============================================================================
// SCORING SYSTEM
// =============================================================================
const STORAGE_KEY = "flappybird_highscore";

const Medals = {
  NONE: { name: "", color: null, threshold: 0 },
  BRONZE: { name: "Bronze", color: "#cd7f32", threshold: 10 },
  SILVER: { name: "Silver", color: "#c0c0c0", threshold: 20 },
  GOLD: { name: "Gold", color: "#ffd700", threshold: 30 },
  PLATINUM: { name: "Platinum", color: "#e5e4e2", threshold: 40 },
};

const ScoreSystem = {
  highScore: 0,
  isNewHighScore: false,

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const val = parseInt(stored, 10);
        if (!isNaN(val) && val >= 0) this.highScore = val;
      }
    } catch (e) {}
  },

  save() {
    try { localStorage.setItem(STORAGE_KEY, String(this.highScore)); } catch (e) {}
  },

  check(score) {
    if (score > this.highScore) {
      this.highScore = score;
      this.isNewHighScore = true;
      this.save();
      return true;
    }
    return false;
  },

  getMedal(score) {
    if (score >= 40) return Medals.PLATINUM;
    if (score >= 30) return Medals.GOLD;
    if (score >= 20) return Medals.SILVER;
    if (score >= 10) return Medals.BRONZE;
    return Medals.NONE;
  },

  reset() {
    this.isNewHighScore = false;
  },
};

// =============================================================================
// STATE MACHINE
// =============================================================================
const STATE_READY = 0;
const STATE_PLAYING = 1;
const STATE_FALLING = 2;  // After hitting pipe, before hitting ground
const STATE_GAMEOVER = 3;
const STATE_PAUSED = 4;

let currentState = STATE_READY;
let stateTime = 0;

function setState(newState) {
  currentState = newState;
  stateTime = 0;
}

// =============================================================================
// GAME DATA
// =============================================================================
let score = 0;
let groundOffset = 0;
let bgOffset = 0;

// Bird
const bird = {
  x: 80,
  y: 300,
  vy: 0,
  rotation: 0,
  wingPhase: 0,
};

// Pipes pool
const pipes = [];
for (let i = 0; i < PIPE_POOL_SIZE; i++) {
  pipes.push({ x: 0, gapY: 0, active: false, scored: false });
}

let pipeTimer = 0;

// Visual effects
const VFX = {
  flash: 0,
  shake: 0,
  shakeX: 0,
  shakeY: 0,

  update(dt) {
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5);
    
    if (this.shake > 0) {
      this.shake = Math.max(0, this.shake - dt * 6);
      // Pre-calculate shake offset for consistent frame
      const intensity = this.shake * 18;
      this.shakeX = (Math.random() - 0.5) * intensity;
      this.shakeY = (Math.random() - 0.5) * intensity;
    } else {
      this.shakeX = 0;
      this.shakeY = 0;
    }
  },

  getShakeOffset() {
    return { x: this.shakeX, y: this.shakeY };
  },
  
  triggerShake(intensity = 1) {
    this.shake = Math.max(this.shake, intensity);
  },
  
  triggerFlash(intensity = 1) {
    this.flash = Math.max(this.flash, intensity);
  },
};

// Stars for background (reduced count for performance)
const stars = [];
for (let i = 0; i < 50; i++) {
  stars.push({
    x: Math.random() * LOGICAL_W,
    y: Math.random() * (SKY_H - 100),
    size: 0.5 + Math.random() * 1.5,
    twinkleOffset: Math.random() * PI2,
    brightness: 0.3 + Math.random() * 0.5,
  });
}

// Floating particles - ambient dust/data particles
const particles = [];
for (let i = 0; i < 40; i++) {
  particles.push({
    x: Math.random() * LOGICAL_W,
    y: 30 + Math.random() * (SKY_H - 80),
    size: 1 + Math.random() * 2.5,
    speedX: 8 + Math.random() * 15,
    speedY: -3 + Math.random() * 6, // Slight vertical drift
    alpha: 0.2 + Math.random() * 0.5,
    type: Math.random() > 0.7 ? 1 : 0, // 0 = dot, 1 = streak
  });
}

// Additional sparkle particles (smaller, faster)
const sparkles = [];
for (let i = 0; i < 25; i++) {
  sparkles.push({
    x: Math.random() * LOGICAL_W,
    y: 50 + Math.random() * (SKY_H - 100),
    speed: 20 + Math.random() * 30,
    phase: Math.random() * PI2,
    size: 0.5 + Math.random() * 1.5,
  });
}

// Slow floating orbs (atmospheric glow)
const orbs = [];
for (let i = 0; i < 8; i++) {
  orbs.push({
    x: Math.random() * LOGICAL_W,
    y: 100 + Math.random() * (SKY_H - 200),
    baseY: 0,
    speed: 5 + Math.random() * 10,
    size: 3 + Math.random() * 5,
    phase: Math.random() * PI2,
    color: Math.random() > 0.5 ? 0 : 1, // 0 = cyan, 1 = pink
  });
}
// Store base Y after creation
for (const orb of orbs) orb.baseY = orb.y;

// City buildings for silhouette - each building tracks its own position
const buildings = [];
const BUILDING_COUNT = 10;
const BUILDING_SPACING = (LOGICAL_W + 100) / BUILDING_COUNT;

function createBuildingWindows(bw, bh) {
  const windowRows = Math.floor(bh / 20);
  const windowCols = Math.floor(bw / 12);
  const windows = [];
  for (let r = 0; r < windowRows; r++) {
    for (let c = 0; c < windowCols; c++) {
      if (Math.random() > 0.5) {
        windows.push({
          row: r,
          col: c,
          color: Math.floor(Math.random() * 3),
          brightness: 0.5 + Math.random() * 0.4,
        });
      }
    }
  }
  return windows;
}

// Initialize buildings spread across the screen
for (let i = 0; i < BUILDING_COUNT; i++) {
  const bw = 30 + Math.random() * 35;
  const bh = 80 + Math.random() * 150;
  buildings.push({
    x: i * BUILDING_SPACING + Math.random() * 20,
    w: bw,
    h: bh,
    windows: createBuildingWindows(bw, bh),
    hasAntenna: bh > 150 && Math.random() > 0.6,
  });
}

// =============================================================================
// GAME LOGIC
// =============================================================================
function resetGame() {
  score = 0;
  pipeTimer = 0;
  
  bird.x = 80;
  bird.y = 280;
  bird.vy = 0;
  bird.rotation = 0;
  bird.wingPhase = 0;
  
  for (let i = 0; i < PIPE_POOL_SIZE; i++) {
    pipes[i].active = false;
    pipes[i].scored = false;
  }
  
  ScoreSystem.reset();
  VFX.flash = 0;
  VFX.shake = 0;
}

function flap() {
  bird.vy = JUMP_VELOCITY;
  bird.wingPhase = 0;
  Audio.playFlap();
}

function spawnPipe() {
  for (let i = 0; i < PIPE_POOL_SIZE; i++) {
    if (!pipes[i].active) {
      const minGapY = 100 + PIPE_GAP / 2;
      const maxGapY = GROUND_Y - 80 - PIPE_GAP / 2;
      pipes[i].x = LOGICAL_W + 20;
      pipes[i].gapY = minGapY + Math.random() * (maxGapY - minGapY);
      pipes[i].active = true;
      pipes[i].scored = false;
      return;
    }
  }
}

function checkCollision() {
  // Ground collision
  if (bird.y + BIRD_H / 2 >= GROUND_Y) {
    bird.y = GROUND_Y - BIRD_H / 2;
    return "ground";
  }
  
  // Ceiling
  if (bird.y - BIRD_H / 2 < 0) {
    bird.y = BIRD_H / 2;
    bird.vy = 0;
  }
  
  // Pipe collision - use slightly smaller hitbox for fairness
  const hitboxShrink = 4;
  const bx = bird.x - BIRD_W / 2 + hitboxShrink;
  const by = bird.y - BIRD_H / 2 + hitboxShrink;
  const bw = BIRD_W - hitboxShrink * 2;
  const bh = BIRD_H - hitboxShrink * 2;
  
  for (let i = 0; i < PIPE_POOL_SIZE; i++) {
    const p = pipes[i];
    if (!p.active) continue;
    
    const px = p.x;
    const pw = PIPE_W;
    const gapTop = p.gapY - PIPE_GAP / 2;
    const gapBottom = p.gapY + PIPE_GAP / 2;
    
    // Check horizontal overlap
    if (bx < px + pw && bx + bw > px) {
      // Check top pipe
      if (by < gapTop) return "pipe";
      // Check bottom pipe
      if (by + bh > gapBottom) return "pipe";
    }
  }
  
  return null;
}

function updateGame() {
  const dt = deltaTime;
  
  VFX.update(dt);
  
  // Always update ground scroll
  if (currentState !== STATE_GAMEOVER && currentState !== STATE_PAUSED) {
    groundOffset = (groundOffset + GROUND_SCROLL_SPEED * dt) % 24;
  }
  
  // Particle movement
  for (const p of particles) {
    p.x -= p.speedX * dt;
    p.y += p.speedY * dt;
    if (p.x < -10) {
      p.x = LOGICAL_W + 10;
      p.y = 30 + Math.random() * (SKY_H - 80);
    }
    // Keep in bounds vertically
    if (p.y < 20 || p.y > SKY_H - 30) {
      p.speedY = -p.speedY;
    }
  }
  
  // Building movement - each building moves independently (only when playing)
  if (currentState !== STATE_GAMEOVER && currentState !== STATE_PAUSED) {
    const buildingSpeed = 20 * dt; // Smooth parallax speed
    for (const b of buildings) {
      b.x -= buildingSpeed;
      // When building goes off left side, wrap to right
      if (b.x < -b.w - 10) {
        b.x = LOGICAL_W + 20 + Math.random() * 30;
        // Regenerate building properties for variety
        b.h = 80 + Math.random() * 150;
        b.w = 30 + Math.random() * 35;
        b.windows = createBuildingWindows(b.w, b.h);
        b.hasAntenna = b.h > 150 && Math.random() > 0.6;
      }
    }
  }
  
  // Sparkle movement
  for (const s of sparkles) {
    s.x -= s.speed * dt;
    s.phase += dt * 8;
    if (s.x < -5) {
      s.x = LOGICAL_W + 5;
      s.y = 50 + Math.random() * (SKY_H - 100);
    }
  }
  
  // Orb movement (slow drift with gentle bobbing)
  for (const orb of orbs) {
    orb.x -= orb.speed * dt;
    orb.phase += dt * 1.5;
    orb.y = orb.baseY + Math.sin(orb.phase) * 15; // Gentle vertical bob
    if (orb.x < -orb.size * 2) {
      orb.x = LOGICAL_W + orb.size * 2;
      orb.baseY = 100 + Math.random() * (SKY_H - 200);
    }
  }
  
  // State-specific updates
  if (currentState === STATE_READY) {
    // Bird hovers
    bird.y = 280 + Math.sin(gameTime * 3) * 12;
    bird.wingPhase += dt * WING_FLAP_SPEED;
    bird.rotation = 0;
    
  } else if (currentState === STATE_PLAYING) {
    // Physics
    bird.vy += GRAVITY * dt;
    if (bird.vy > MAX_FALL_SPEED) bird.vy = MAX_FALL_SPEED;
    bird.y += bird.vy * dt;
    
    // Wing animation (faster when going up)
    bird.wingPhase += dt * WING_FLAP_SPEED * (bird.vy < 0 ? 2 : 1);
    
    // Rotation based on velocity
    const targetRot = bird.vy < 0 ? -0.4 : Math.min(bird.vy / 400, 1.4);
    bird.rotation += (targetRot - bird.rotation) * dt * (bird.vy < 0 ? 15 : 5);
    
    // Spawn pipes
    pipeTimer += dt;
    if (pipeTimer >= PIPE_SPAWN_INTERVAL) {
      pipeTimer -= PIPE_SPAWN_INTERVAL;
      spawnPipe();
    }
    
    // Update pipes
    for (let i = 0; i < PIPE_POOL_SIZE; i++) {
      const p = pipes[i];
      if (!p.active) continue;
      
      p.x -= PIPE_SPEED * dt;
      
      // Score when passing
      if (!p.scored && p.x + PIPE_W < bird.x) {
        p.scored = true;
        score++;
        Audio.playScore();
      }
      
      // Deactivate offscreen
      if (p.x + PIPE_W < -10) {
        p.active = false;
      }
    }
    
    // Collision
    const collision = checkCollision();
    if (collision === "pipe") {
      Audio.playCrash(); // Dramatic crash sound for pipe hit
      VFX.triggerFlash(1);
      VFX.triggerShake(1.5); // Strong shake on pipe hit
      setState(STATE_FALLING);
    } else if (collision === "ground") {
      Audio.playHit();
      Audio.playDie();
      VFX.triggerFlash(0.8);
      VFX.triggerShake(1.2);
      ScoreSystem.check(score);
      setState(STATE_GAMEOVER);
    }
    
  } else if (currentState === STATE_FALLING) {
    // Bird falls after hitting pipe
    bird.vy += GRAVITY * dt;
    if (bird.vy > MAX_FALL_SPEED) bird.vy = MAX_FALL_SPEED;
    bird.y += bird.vy * dt;
    bird.rotation = Math.min(bird.rotation + dt * 8, Math.PI / 2);
    
    // Hit ground
    if (bird.y + BIRD_H / 2 >= GROUND_Y) {
      bird.y = GROUND_Y - BIRD_H / 2;
      Audio.playHit(); // Ground impact sound
      Audio.playDie();
      VFX.triggerShake(1.0); // Shake on ground impact
      VFX.triggerFlash(0.5);
      ScoreSystem.check(score);
      setState(STATE_GAMEOVER);
    }
    
  } else if (currentState === STATE_GAMEOVER) {
    stateTime += dt;
  }
}

// =============================================================================
// INPUT
// =============================================================================
let inputLockUntil = 0;

function handleInput() {
  const now = performance.now();
  if (now < inputLockUntil) return;
  
  Audio.unlock();
  
  if (currentState === STATE_READY) {
    setState(STATE_PLAYING);
    flap();
    inputLockUntil = now + 100;
  } else if (currentState === STATE_PLAYING) {
    flap();
  } else if (currentState === STATE_GAMEOVER && stateTime > 0.5) {
    Audio.playSwoosh();
    resetGame();
    setState(STATE_READY);
    inputLockUntil = now + 300;
  } else if (currentState === STATE_PAUSED) {
    setState(STATE_PLAYING);
    isPaused = true;
  }
}

canvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  handleInput();
}, { passive: false });

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  
  if (e.code === "Space") {
    e.preventDefault();
    handleInput();
  } else if (e.code === "KeyP" || e.code === "Escape") {
    if (currentState === STATE_PLAYING) {
      setState(STATE_PAUSED);
      isPaused = true;
    } else if (currentState === STATE_PAUSED) {
      setState(STATE_PLAYING);
      isPaused = true;
    }
  } else if (e.code === "KeyM") {
    Audio.toggleMute();
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && currentState === STATE_PLAYING) {
    setState(STATE_PAUSED);
    isPaused = true;
  }
});

// =============================================================================
// DRAWING
// =============================================================================
// Pre-create sky gradient (cached)
let skyGradient = null;

function createSkyGradient() {
  skyGradient = ctx.createLinearGradient(0, 0, 0, SKY_H);
  skyGradient.addColorStop(0, Colors.SKY_TOP);
  skyGradient.addColorStop(0.5, Colors.SKY_MID);
  skyGradient.addColorStop(1, Colors.SKY_BOTTOM);
}

function drawSky() {
  if (!skyGradient) createSkyGradient();
  ctx.fillStyle = skyGradient;
  ctx.fillRect(0, 0, LOGICAL_W, SKY_H);
  
  // Simple aurora bands (no gradient creation)
  ctx.fillStyle = "rgba(0, 245, 255, 0.025)";
  ctx.fillRect(0, 80, LOGICAL_W, 120);
  ctx.fillStyle = "rgba(170, 0, 255, 0.02)";
  ctx.fillRect(0, 150, LOGICAL_W, 100);
}

function drawStars() {
  // Batch all stars with same color
  ctx.fillStyle = "#ffffff";
  const time = gameTime * 2;
  
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    // Simple twinkle using pre-calculated offset
    const twinkle = Math.sin(time + star.twinkleOffset);
    ctx.globalAlpha = star.brightness + twinkle * 0.2;
    ctx.fillRect(star.x - star.size * 0.5, star.y - star.size * 0.5, star.size, star.size);
  }
  ctx.globalAlpha = 1;
}

function drawParticles() {
  // Slow floating orbs (draw first, behind other particles)
  for (let i = 0; i < orbs.length; i++) {
    const orb = orbs[i];
    const pulse = 0.4 + Math.sin(orb.phase * 2) * 0.2;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = orb.color === 0 ? Colors.NEON_CYAN : Colors.NEON_PINK;
    
    // Outer glow
    ctx.globalAlpha = pulse * 0.3;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size * 2, 0, PI2);
    ctx.fill();
    
    // Inner core
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, PI2);
    ctx.fill();
  }
  
  // Main floating particles
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    ctx.globalAlpha = p.alpha;
    
    if (p.type === 1) {
      // Streak particle
      ctx.fillStyle = Colors.NEON_CYAN;
      ctx.fillRect(p.x - p.size * 2, p.y - 0.5, p.size * 4, 1);
    } else {
      // Dot particle
      ctx.fillStyle = i % 3 === 0 ? Colors.NEON_PINK : Colors.NEON_CYAN;
      ctx.fillRect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size);
    }
  }
  
  // Sparkles (twinkling)
  ctx.fillStyle = "#ffffff";
  for (let i = 0; i < sparkles.length; i++) {
    const s = sparkles[i];
    const twinkle = 0.3 + Math.sin(s.phase) * 0.4;
    ctx.globalAlpha = twinkle;
    ctx.fillRect(s.x - s.size * 0.5, s.y - s.size * 0.5, s.size, s.size);
  }
  
  ctx.globalAlpha = 1;
}

function drawCityscape() {
  const windowColors = [Colors.NEON_CYAN, Colors.NEON_PINK, "#ffaa00"];
  
  // Draw all building bodies first (batch same color)
  ctx.fillStyle = "#0a0a12";
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    // Only draw if visible on screen
    if (b.x > -b.w && b.x < LOGICAL_W + 10) {
      ctx.fillRect(b.x, GROUND_Y - b.h, b.w, b.h);
    }
  }
  
  // Draw windows in second pass
  for (let i = 0; i < buildings.length; i++) {
    const b = buildings[i];
    if (b.x > -b.w && b.x < LOGICAL_W + 10) {
      const by = GROUND_Y - b.h;
      
      // Draw windows
      for (let w = 0; w < b.windows.length; w++) {
        const win = b.windows[w];
        ctx.fillStyle = windowColors[win.color];
        ctx.globalAlpha = win.brightness;
        ctx.fillRect(b.x + 4 + win.col * 12, by + 10 + win.row * 20, 4, 5);
      }
      
      // Antenna blink
      if (b.hasAntenna) {
        ctx.fillStyle = Colors.NEON_PINK;
        ctx.globalAlpha = 0.5 + Math.sin(gameTime * 4 + i) * 0.5;
        ctx.fillRect(b.x + b.w * 0.5 - 2, by - 6, 4, 4);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawGridFloor() {
  // Simplified perspective grid
  const horizonY = GROUND_Y - 40;
  
  ctx.strokeStyle = Colors.NEON_CYAN;
  ctx.lineWidth = 1;
  
  // Just a few horizontal lines
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 6; i++) {
    const y = horizonY + i * 8;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(LOGICAL_W, y);
    ctx.stroke();
  }
  
  ctx.globalAlpha = 1;
}

function drawPipe(x, gapY) {
  const lipW = 8;
  const lipH = 26;
  const gapTop = gapY - PIPE_GAP / 2;
  const gapBottom = gapY + PIPE_GAP / 2;
  
  // Top pipe
  if (gapTop > 0) {
    // Body with simple shading (no gradient)
    ctx.fillStyle = Colors.PIPE_BODY_DARK;
    ctx.fillRect(x, 0, 8, gapTop - lipH);
    ctx.fillStyle = Colors.PIPE_BODY;
    ctx.fillRect(x + 8, 0, PIPE_W - 16, gapTop - lipH);
    ctx.fillStyle = Colors.PIPE_BODY_LIGHT;
    ctx.fillRect(x + PIPE_W - 12, 0, 8, gapTop - lipH);
    ctx.fillStyle = Colors.PIPE_BODY_DARK;
    ctx.fillRect(x + PIPE_W - 4, 0, 4, gapTop - lipH);
    
    // Lip
    ctx.fillStyle = Colors.PIPE_LIP;
    ctx.fillRect(x - lipW, gapTop - lipH, PIPE_W + lipW * 2, lipH);
    
    // Neon edges (simplified)
    ctx.fillStyle = Colors.PIPE_GLOW;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x - lipW, gapTop - lipH, 2, lipH); // Left
    ctx.fillRect(x + PIPE_W + lipW - 2, gapTop - lipH, 2, lipH); // Right
    ctx.fillRect(x - lipW, gapTop - 2, PIPE_W + lipW * 2, 2); // Bottom
    ctx.fillRect(x, 0, 2, gapTop - lipH); // Body left
    ctx.fillRect(x + PIPE_W - 2, 0, 2, gapTop - lipH); // Body right
    ctx.globalAlpha = 1;
  }
  
  // Bottom pipe
  const bottomY = gapBottom;
  const bottomH = GROUND_Y - bottomY;
  if (bottomH > 0) {
    // Body with simple shading
    ctx.fillStyle = Colors.PIPE_BODY_DARK;
    ctx.fillRect(x, bottomY + lipH, 8, bottomH - lipH);
    ctx.fillStyle = Colors.PIPE_BODY;
    ctx.fillRect(x + 8, bottomY + lipH, PIPE_W - 16, bottomH - lipH);
    ctx.fillStyle = Colors.PIPE_BODY_LIGHT;
    ctx.fillRect(x + PIPE_W - 12, bottomY + lipH, 8, bottomH - lipH);
    ctx.fillStyle = Colors.PIPE_BODY_DARK;
    ctx.fillRect(x + PIPE_W - 4, bottomY + lipH, 4, bottomH - lipH);
    
    // Lip
    ctx.fillStyle = Colors.PIPE_LIP;
    ctx.fillRect(x - lipW, bottomY, PIPE_W + lipW * 2, lipH);
    
    // Neon edges
    ctx.fillStyle = Colors.PIPE_GLOW;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x - lipW, bottomY, 2, lipH); // Left
    ctx.fillRect(x + PIPE_W + lipW - 2, bottomY, 2, lipH); // Right  
    ctx.fillRect(x - lipW, bottomY, PIPE_W + lipW * 2, 2); // Top
    ctx.fillRect(x, bottomY + lipH, 2, bottomH - lipH); // Body left
    ctx.fillRect(x + PIPE_W - 2, bottomY + lipH, 2, bottomH - lipH); // Body right
    ctx.globalAlpha = 1;
  }
}

function drawPipes() {
  for (let i = 0; i < PIPE_POOL_SIZE; i++) {
    const p = pipes[i];
    if (p.active) {
      drawPipe(p.x, p.gapY);
    }
  }
}

function drawGround() {
  // Main ground body
  ctx.fillStyle = Colors.GROUND_BODY;
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, GROUND_H);
  
  // Top edge glow (no shadow for performance)
  ctx.fillStyle = Colors.NEON_CYAN;
  ctx.fillRect(0, GROUND_Y, LOGICAL_W, 2);
  
  // Glow gradient below edge
  ctx.globalAlpha = 0.15;
  ctx.fillRect(0, GROUND_Y + 2, LOGICAL_W, 20);
  ctx.globalAlpha = 0.08;
  ctx.fillRect(0, GROUND_Y + 22, LOGICAL_W, 15);
  ctx.globalAlpha = 1;
  
  // Scrolling vertical grid lines
  ctx.fillStyle = Colors.NEON_CYAN;
  ctx.globalAlpha = 0.2;
  const gridSpacing = 50;
  for (let x = -groundOffset % gridSpacing; x < LOGICAL_W + gridSpacing; x += gridSpacing) {
    ctx.fillRect(x, GROUND_Y + 5, 1, GROUND_H - 5);
  }
  
  // Horizontal lines (static)
  ctx.fillRect(0, GROUND_Y + 30, LOGICAL_W, 1);
  ctx.fillRect(0, GROUND_Y + 60, LOGICAL_W, 1);
  ctx.fillRect(0, GROUND_Y + 90, LOGICAL_W, 1);
  
  ctx.globalAlpha = 1;
  
  // Moving data dots (simplified)
  ctx.fillStyle = Colors.NEON_PINK;
  ctx.globalAlpha = 0.7;
  const dotX1 = (groundOffset * 2.5) % LOGICAL_W;
  const dotX2 = (groundOffset * 2.5 + LOGICAL_W * 0.5) % LOGICAL_W;
  ctx.fillRect(dotX1, GROUND_Y + 45, 12, 2);
  ctx.fillRect(dotX2, GROUND_Y + 75, 10, 2);
  ctx.globalAlpha = 1;
}

function drawBird() {
  const cx = bird.x;
  const cy = bird.y;
  
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(bird.rotation);
  
  // Wing position based on phase
  const wingY = Math.sin(bird.wingPhase * PI2) * 4;
  const wingAngle = Math.sin(bird.wingPhase * PI2) * 0.3;
  
  // Body (ellipse) - solid colors for performance
  ctx.fillStyle = Colors.BIRD_BODY;
  ctx.beginPath();
  ctx.ellipse(0, 0, BIRD_W / 2, BIRD_H / 2, 0, 0, PI2);
  ctx.fill();
  
  // Body highlight
  ctx.fillStyle = Colors.BIRD_BODY_LIGHT;
  ctx.beginPath();
  ctx.ellipse(-4, -4, BIRD_W / 3, BIRD_H / 3, -0.2, 0, PI2);
  ctx.fill();
  
  // Belly
  ctx.fillStyle = Colors.BIRD_BELLY;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.ellipse(4, 4, 10, 7, 0.3, 0, PI2);
  ctx.fill();
  ctx.globalAlpha = 1;
  
  // Wing
  ctx.save();
  ctx.translate(-4, wingY);
  ctx.rotate(wingAngle);
  
  ctx.fillStyle = Colors.BIRD_WING;
  ctx.beginPath();
  ctx.ellipse(0, 4, 12, 8, 0.5, 0, PI2);
  ctx.fill();
  
  ctx.fillStyle = Colors.BIRD_WING_DARK;
  ctx.beginPath();
  ctx.ellipse(2, 6, 8, 5, 0.5, 0, PI2);
  ctx.fill();
  ctx.restore();
  
  // Eye
  ctx.fillStyle = Colors.BIRD_EYE_WHITE;
  ctx.beginPath();
  ctx.ellipse(10, -4, 8, 9, 0, 0, PI2);
  ctx.fill();
  
  // Eye pupil
  ctx.fillStyle = Colors.BIRD_EYE_PUPIL;
  ctx.beginPath();
  ctx.ellipse(13, -3, 4, 5, 0, 0, PI2);
  ctx.fill();
  
  // Cyber eye ring
  ctx.strokeStyle = Colors.BIRD_EYE_GLOW;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.arc(10, -4, 9, 0, PI2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  
  // Eye highlight
  ctx.fillStyle = Colors.BIRD_EYE_WHITE;
  ctx.beginPath();
  ctx.arc(8, -7, 2.5, 0, PI2);
  ctx.fill();
  
  // Beak
  ctx.fillStyle = Colors.BIRD_BEAK;
  ctx.beginPath();
  ctx.moveTo(16, 0);
  ctx.lineTo(30, 3);
  ctx.lineTo(16, 8);
  ctx.closePath();
  ctx.fill();
  
  // Beak line
  ctx.fillStyle = Colors.BIRD_BEAK_DARK;
  ctx.beginPath();
  ctx.moveTo(16, 3);
  ctx.lineTo(28, 4);
  ctx.lineTo(16, 5);
  ctx.closePath();
  ctx.fill();
  
  // Thruster effect when rising
  if (bird.vy < -100 && currentState === STATE_PLAYING) {
    const thrustLen = Math.min(25, Math.abs(bird.vy) / 18);
    ctx.fillStyle = Colors.NEON_ORANGE;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(-BIRD_W / 2 - 2, -4);
    ctx.lineTo(-BIRD_W / 2 - thrustLen, 0);
    ctx.lineTo(-BIRD_W / 2 - 2, 4);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  
  ctx.restore();
}

function drawScore() {
  if (currentState === STATE_PLAYING || currentState === STATE_FALLING) {
    const text = String(score);
    ctx.font = "bold 60px Arial, sans-serif";
    ctx.textAlign = "center";
    
    // Glow effect
    ctx.shadowColor = Colors.NEON_CYAN;
    ctx.shadowBlur = 20;
    
    // Main text
    ctx.fillStyle = Colors.TEXT_WHITE;
    ctx.fillText(text, LOGICAL_W / 2, 80);
    
    ctx.shadowBlur = 0;
    ctx.textAlign = "left";
  }
}

function drawGetReady() {
  if (currentState !== STATE_READY) return;
  
  ctx.textAlign = "center";
  
  // Title with neon glow
  ctx.shadowColor = Colors.NEON_CYAN;
  ctx.shadowBlur = 30;
  ctx.font = "bold 44px Arial, sans-serif";
  ctx.fillStyle = Colors.NEON_CYAN;
  ctx.fillText("GET READY", LOGICAL_W / 2, 170);
  ctx.shadowBlur = 0;
  
  // Subtitle
  ctx.font = "22px Arial, sans-serif";
  ctx.fillStyle = Colors.TEXT_WHITE;
  ctx.globalAlpha = 0.6 + Math.sin(gameTime * 3) * 0.2;
  ctx.fillText("TAP TO FLY", LOGICAL_W / 2, 440);
  ctx.globalAlpha = 1;
  
  // High score with glow
  if (ScoreSystem.highScore > 0) {
    ctx.font = "18px Arial, sans-serif";
    ctx.shadowColor = Colors.NEON_PINK;
    ctx.shadowBlur = 10;
    ctx.fillStyle = Colors.NEON_PINK;
    ctx.fillText("BEST: " + ScoreSystem.highScore, LOGICAL_W / 2, 480);
    ctx.shadowBlur = 0;
  }
  
  ctx.textAlign = "left";
}

function drawGameOver() {
  if (currentState !== STATE_GAMEOVER) return;
  
  const alpha = Math.min(1, stateTime * 3);
  ctx.globalAlpha = alpha;
  
  // Overlay
  ctx.fillStyle = Colors.OVERLAY;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  
  // Panel with border glow
  const panelW = 300;
  const panelH = 240;
  const panelX = (LOGICAL_W - panelW) / 2;
  const panelY = 170;
  
  // Panel background
  ctx.fillStyle = "rgba(10, 15, 30, 0.95)";
  ctx.fillRect(panelX, panelY, panelW, panelH);
  
  // Neon border
  ctx.strokeStyle = Colors.NEON_CYAN;
  ctx.lineWidth = 2;
  ctx.shadowColor = Colors.NEON_CYAN;
  ctx.shadowBlur = 15;
  ctx.strokeRect(panelX, panelY, panelW, panelH);
  ctx.shadowBlur = 0;
  
  // Corner accents
  const cornerSize = 15;
  ctx.fillStyle = Colors.NEON_CYAN;
  ctx.fillRect(panelX - 2, panelY - 2, cornerSize, 4);
  ctx.fillRect(panelX - 2, panelY - 2, 4, cornerSize);
  ctx.fillRect(panelX + panelW - cornerSize + 2, panelY - 2, cornerSize, 4);
  ctx.fillRect(panelX + panelW - 2, panelY - 2, 4, cornerSize);
  ctx.fillRect(panelX - 2, panelY + panelH - 2, cornerSize, 4);
  ctx.fillRect(panelX - 2, panelY + panelH - cornerSize + 2, 4, cornerSize);
  ctx.fillRect(panelX + panelW - cornerSize + 2, panelY + panelH - 2, cornerSize, 4);
  ctx.fillRect(panelX + panelW - 2, panelY + panelH - cornerSize + 2, 4, cornerSize);
  
  ctx.textAlign = "center";
  
  // Game Over text with glow
  ctx.shadowColor = Colors.NEON_PINK;
  ctx.shadowBlur = 20;
  ctx.font = "bold 38px Arial, sans-serif";
  ctx.fillStyle = Colors.NEON_PINK;
  ctx.fillText("GAME OVER", LOGICAL_W / 2, panelY + 50);
  ctx.shadowBlur = 0;
  
  // Score labels
  ctx.font = "16px Arial, sans-serif";
  ctx.fillStyle = Colors.TEXT_WHITE;
  ctx.globalAlpha = alpha * 0.6;
  ctx.fillText("SCORE", LOGICAL_W / 2 - 65, panelY + 90);
  ctx.fillText("BEST", LOGICAL_W / 2 + 65, panelY + 90);
  ctx.globalAlpha = alpha;
  
  // Score values with glow
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.shadowColor = Colors.NEON_CYAN;
  ctx.shadowBlur = 10;
  ctx.fillStyle = Colors.NEON_CYAN;
  ctx.fillText(String(score), LOGICAL_W / 2 - 65, panelY + 130);
  
  ctx.fillStyle = ScoreSystem.isNewHighScore ? Colors.NEON_PINK : Colors.TEXT_WHITE;
  ctx.shadowColor = ScoreSystem.isNewHighScore ? Colors.NEON_PINK : Colors.TEXT_WHITE;
  ctx.fillText(String(ScoreSystem.highScore), LOGICAL_W / 2 + 65, panelY + 130);
  ctx.shadowBlur = 0;
  
  // New high score
  if (ScoreSystem.isNewHighScore) {
    ctx.font = "bold 12px Arial, sans-serif";
    ctx.fillStyle = Colors.NEON_PINK;
    ctx.globalAlpha = alpha * (0.6 + Math.sin(gameTime * 6) * 0.4);
    ctx.fillText("★ NEW RECORD ★", LOGICAL_W / 2 + 65, panelY + 150);
    ctx.globalAlpha = alpha;
  }
  
  // Medal
  const medal = ScoreSystem.getMedal(score);
  if (medal.color) {
    const medalX = LOGICAL_W / 2;
    const medalY = panelY + 190;
    
    // Medal glow
    ctx.shadowColor = medal.color;
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(medalX, medalY, 25, 0, PI2);
    ctx.fillStyle = medal.color;
    ctx.fill();
    ctx.shadowBlur = 0;
    
    // Medal ring
    ctx.strokeStyle = Colors.TEXT_WHITE;
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Medal shine
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.arc(medalX - 8, medalY - 8, 6, 0, PI2);
    ctx.fill();
    
    ctx.font = "bold 14px Arial, sans-serif";
    ctx.fillStyle = medal.color;
    ctx.fillText(medal.name.toUpperCase(), medalX, medalY + 45);
  }
  
  // Tap to continue
  if (stateTime > 0.5) {
    ctx.font = "18px Arial, sans-serif";
    ctx.fillStyle = Colors.TEXT_WHITE;
    ctx.globalAlpha = alpha * (0.5 + Math.sin(gameTime * 4) * 0.3);
    ctx.fillText("TAP TO CONTINUE", LOGICAL_W / 2, panelY + panelH + 45);
    ctx.globalAlpha = alpha;
  }
  
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function drawPaused() {
  if (currentState !== STATE_PAUSED) return;
  
  ctx.fillStyle = Colors.OVERLAY;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  
  ctx.textAlign = "center";
  
  // Neon PAUSED text
  ctx.shadowColor = Colors.NEON_CYAN;
  ctx.shadowBlur = 30;
  ctx.font = "bold 52px Arial, sans-serif";
  ctx.fillStyle = Colors.NEON_CYAN;
  ctx.fillText("PAUSED", LOGICAL_W / 2, LOGICAL_H / 2);
  ctx.shadowBlur = 0;
  
  ctx.font = "20px Arial, sans-serif";
  ctx.fillStyle = Colors.TEXT_WHITE;
  ctx.globalAlpha = 0.6 + Math.sin(gameTime * 3) * 0.2;
  ctx.fillText("Tap to Continue", LOGICAL_W / 2, LOGICAL_H / 2 + 50);
  ctx.globalAlpha = 1;
  
  ctx.textAlign = "left";
}

function drawMuteIcon() {
  const x = LOGICAL_W - 45;
  const y = 35;
  const s = 20;
  
  ctx.save();
  ctx.translate(x, y);
  
  const color = Audio.muted ? "#666" : Colors.NEON_CYAN;
  ctx.fillStyle = color;
  
  if (!Audio.muted) {
    ctx.shadowColor = Colors.NEON_CYAN;
    ctx.shadowBlur = 8;
  }
  
  // Speaker body
  ctx.beginPath();
  ctx.moveTo(-s * 0.3, -s * 0.2);
  ctx.lineTo(-s * 0.1, -s * 0.2);
  ctx.lineTo(s * 0.15, -s * 0.4);
  ctx.lineTo(s * 0.15, s * 0.4);
  ctx.lineTo(-s * 0.1, s * 0.2);
  ctx.lineTo(-s * 0.3, s * 0.2);
  ctx.closePath();
  ctx.fill();
  
  ctx.shadowBlur = 0;
  
  if (Audio.muted) {
    ctx.strokeStyle = Colors.NEON_PINK;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s * 0.25, -s * 0.25);
    ctx.lineTo(s * 0.55, s * 0.25);
    ctx.moveTo(s * 0.55, -s * 0.25);
    ctx.lineTo(s * 0.25, s * 0.25);
    ctx.stroke();
  } else {
    ctx.strokeStyle = Colors.NEON_CYAN;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s * 0.1, 0, s * 0.25, -0.6, 0.6);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(s * 0.1, 0, s * 0.4, -0.5, 0.5);
    ctx.stroke();
  }
  
  ctx.restore();
}

function drawFlash() {
  if (VFX.flash > 0) {
    // Red flash for hit impact
    ctx.fillStyle = `rgba(255,80,80,${VFX.flash * 0.6})`;
    ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  }
}

function render() {
  const shake = VFX.getShakeOffset();
  
  // Clear with sky color to avoid artifacts during shake
  ctx.fillStyle = Colors.SKY_TOP;
  ctx.fillRect(0, 0, LOGICAL_W, LOGICAL_H);
  
  ctx.save();
  ctx.translate(shake.x, shake.y);
  
  // Background layers
  drawSky();
  drawStars();
  drawCityscape();
  drawGridFloor();
  drawParticles();
  
  // Game objects
  drawPipes();
  drawGround();
  drawBird();
  
  ctx.restore();
  
  // UI
  drawScore();
  drawGetReady();
  drawGameOver();
  drawPaused();
  drawMuteIcon();
  drawFlash();
}

// =============================================================================
// MAIN LOOP
// =============================================================================
function loop(timestamp) {
  frameCount++;
  updateTiming(timestamp);
  updateGame();
  render();
  requestAnimationFrame(loop);
}

// =============================================================================
// INIT
// =============================================================================
function init() {
  Audio.init();
  ScoreSystem.load();
  resetGame();
  requestAnimationFrame(loop);
}

init();
