(function () {
  const canvas = document.getElementById("career-game");
  const ctx = canvas.getContext("2d");
  const coinEl = document.getElementById("v12-coins");
  const scoreEl = document.getElementById("v12-score");
  const worldEl = document.getElementById("v12-world");
  const message = document.getElementById("v12-message");
  const kickerEl = message.querySelector(".v12-message__kicker");
  const messageTitle = document.getElementById("v12-message-title");
  const messageBody = document.getElementById("v12-message-body");
  const levelSpec = window.CareerLevelSpec;
  const stompMessageApi = window.CareerStompMessages;

  if (!levelSpec) throw new Error("CareerLevelSpec must load before mario-career-game.js");
  if (!stompMessageApi) throw new Error("CareerStompMessages must load before mario-career-game.js");

  const TILE = 16;
  const VIEW_W = 256;
  const VIEW_H = 240;
  const SCALE = 4;
  const FIXED_DT = 1 / 60;
  const COLLISION_EPSILON = 0.001;
  const PERF_LOG_INTERVAL_MS = 2000;
  const GRAVITY = 920;
  const LEVEL_TILES = levelSpec.width;
  const LEVEL_W = LEVEL_TILES * TILE;
  const FLOOR_Y = 208;

  canvas.width = VIEW_W * SCALE;
  canvas.height = VIEW_H * SCALE;
  ctx.scale(SCALE, SCALE);
  ctx.imageSmoothingEnabled = false;

  const sheets = {
    player: image("assets/sprites/mario/player.png"),
    playerL: image("assets/sprites/mario/playerl.png"),
    enemy: image("assets/sprites/mario/enemy.png"),
    enemyR: image("assets/sprites/mario/enemyr.png"),
    tiles: image("assets/sprites/mario/tiles.png"),
    items: image("assets/sprites/mario/items.png"),
  };

  const input = new Set();
  const liveInput = new Set();
  const pendingInputEvents = [];
  const touchMap = { left: "ArrowLeft", right: "ArrowRight", jump: "Space" };
  let lastTime = performance.now();
  let simulationTime = lastTime;
  let cameraX = 0;
  let coins = 0;
  let score = 0;
  let messageTimer = 5;
  let checkpointX = 48;
  let levelCleared = false;
  let clearRestartTimer = 0;
  let animationTime = 0;
  let simulationPaused = false;
  let updateAccumulator = 0;
  let simulationFrame = 0;
  let resetCount = 0;
  let lastReset = null;
  let maxCatchUpSteps = 4;
  let perfWindowStartedAt = performance.now();
  let perfRafFrames = 0;
  let perfSimulationSteps = 0;
  let perfCatchUpFrames = 0;
  let perfDroppedMs = 0;
  let perfMaxFrameMs = 0;
  let perfMaxRenderMs = 0;
  const coinBursts = [];
  let performanceStats = {
    fps: 0,
    updatesPerSecond: 0,
    catchUpFrames: 0,
    droppedMs: 0,
    maxFrameMs: 0,
    maxRenderMs: 0,
  };
  const movementTrace = [];
  const movementAnomalies = [];
  let frameTileCollisions = [];
  let frameEnemyContacts = [];
  let frameInputEvents = [];
  const stompDeck = stompMessageApi.createDeck();
  const debugEnabled = ["localhost", "127.0.0.1", ""].includes(window.location.hostname) || window.location.search.includes("debugCareerGame=1");

  const notes = {
    hiq: {
      label: "hiQ Labs",
      title: "Lead frontend engineer",
      body: "Built employee directory, AWS upload/download, and KPI dashboard pages; improved builds with Webpack, Babel, PostCSS, minification, and gzip.",
    },
    curology: {
      label: "Curology",
      title: "Fullstack product engineering",
      body: "Built an in-browser photo editor with canvas, D3, RxJS, and mobile drag and drop; created photo metadata APIs for product and analytics.",
    },
    ethos: {
      label: "Ethos",
      title: "Ethos engineer #3",
      body: "Joined pre-launch and built frontend and backend systems that helped scale Ethos from stealth to $159.8M revenue and 100+ engineers.",
    },
    ethosPlatform: {
      label: "Ethos",
      title: "Platform and event systems",
      body: "Migrated ECS to Kubernetes with 100% uptime, cut deploys from about 5 hours to 5 minutes, and built an event platform handling 50,000+ events per day.",
      href: "projects/event-bus/",
      linkText: "Read the event bus deep dive",
    },
    anime: {
      label: "AnimePics",
      title: "Founder-led GenAI product",
      body: "Created a photo-to-anime product with diffusion models, custom training, Next.js, Postgres, S3, Redis, Kafka, Stripe, OAuth, and PyTorch GPU workers.",
      href: "projects/anime-pics/",
      linkText: "Open the AnimePics deep dive",
    },
    intuit: {
      label: "Intuit",
      title: "Virtual Expert Platform",
      body: "Built AI-powered marketplace, recommendation, and real-time workforce optimization systems serving TurboTax Live, QuickBooks Live, and related expert products.",
    },
    intuitMatching: {
      label: "Intuit",
      title: "AI contact center matching",
      body: "Led AI co-pilot matching with transcript analysis, embeddings, and agentic workflows; scaled from 0.2% to 36% of traffic across 1M+ yearly interactions.",
      href: "projects/ai-contact-center-matching-redacted/",
      linkText: "Open the matching deep dive",
    },
    intuitGateway: {
      label: "Intuit",
      title: "AI agent gateway",
      body: "Led a hosted gateway with 20+ domain agents across web UI, Slack, Claude Code, and service APIs, eliminating thousands of hours of manual ops work.",
      href: "projects/ai-agent-gateway-redacted/",
      linkText: "Open the agent gateway deep dive",
    },
    current: {
      label: "Current lane",
      title: "Product, platform, applied AI",
      body: "Product-minded engineering across applied AI systems, distributed systems, backend infrastructure, reliability, and measurable outcomes.",
    },
    next: {
      label: "Finish",
      title: "Applied AI systems at scale",
      body: "Current work focuses on agent platforms, AI matching, real-time optimization, observability as code, and reliable production systems.",
    },
  };

  function image(src) {
    const img = new Image();
    img.src = src;
    return img;
  }

  function drawSheet(ctx, img, sx, sy, sw, sh, dx, dy, dw, dh, fallback) {
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
      return;
    }
    if (fallback) fallback();
    else {
      ctx.fillStyle = "#20392b";
      ctx.fillRect(dx, dy, dw, dh);
    }
  }

  class Entity {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.previousX = x;
      this.previousY = y;
      this.previousVy = 0;
      this.w = w;
      this.h = h;
      this.vx = 0;
      this.vy = 0;
      this.dead = false;
      this.grounded = false;
    }

    get rect() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
  }

  class Player extends Entity {
    constructor(x, y) {
      super(x, y, 16, 16);
      this.collisionInsetX = 3;
      this.face = 1;
      this.jumpHeld = false;
      this.hurtCooldown = 0;
      this.runTime = 0;
    }

    update(dt, level) {
      this.previousX = this.x;
      this.previousY = this.y;
      this.previousVy = this.vy;
      const left = input.has("ArrowLeft") || input.has("KeyA");
      const right = input.has("ArrowRight") || input.has("KeyD");
      const jump = input.has("Space") || input.has("ArrowUp") || input.has("KeyW");
      const running = input.has("ShiftLeft") || input.has("ShiftRight") || input.has("KeyZ") || input.has("KeyX");
      const accel = this.grounded ? 980 : 560;
      const maxSpeed = running ? 196 : 168;

      if (left) {
        this.vx -= accel * dt;
        this.face = -1;
      }
      if (right) {
        this.vx += accel * dt;
        this.face = 1;
      }
      if (!left && !right && this.grounded) {
        const friction = 700 * dt;
        if (Math.abs(this.vx) <= friction) this.vx = 0;
        else this.vx -= Math.sign(this.vx) * friction;
      }
      this.vx = clamp(this.vx, -maxSpeed, maxSpeed);

      if (jump && !this.jumpHeld && this.grounded) {
        this.vy = -375;
        this.grounded = false;
      }
      if (!jump && this.vy < -135) this.vy = -135;
      this.jumpHeld = jump;

      this.vy = Math.min(520, this.vy + GRAVITY * dt);
      moveWithTiles(this, level, dt);
      this.x = clamp(this.x, cameraX + 2, LEVEL_W - 32);
      this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
      this.runTime += Math.abs(this.vx) > 10 ? dt : 0;
    }

    bounce() {
      this.vy = -220;
      this.grounded = false;
    }

    damage() {
      if (this.hurtCooldown > 0) return;
      this.hurtCooldown = 1;
      resetPlayer("Try again", "Enemy collisions reset the level like a missed gap. Back to the last checkpoint.", "Ouch", "enemy");
    }

    draw(ctx, vx) {
      const x = Math.round(this.x - vx);
      const y = Math.round(this.y);
      const walk = Math.floor(this.runTime * 14) % 2;
      let sx = 80;
      if (!this.grounded) sx = 160;
      else if (Math.abs(this.vx) > 12) sx = 96 + walk * 16;
      drawSheet(ctx, this.face < 0 ? sheets.playerL : sheets.player, sx, 32, 16, 16, x, y, 16, 16);
    }
  }

  class Goomba extends Entity {
    constructor(tileX, tileY) {
      super(tileX * TILE, tileY * TILE + 2, 16, 14);
      this.vx = -34;
      this.deathTimer = 0;
    }

    update(dt, level) {
      this.previousX = this.x;
      this.previousY = this.y;
      if (this.deathTimer > 0) {
        this.deathTimer -= dt;
        if (this.deathTimer <= 0) this.dead = true;
        return;
      }
      this.vy = Math.min(420, this.vy + GRAVITY * dt);
      moveWithTiles(this, level, dt, { turnOnWall: true });
      if (this.x < cameraX - 48) this.dead = true;
    }

    stomp(player) {
      this.deathTimer = 0.32;
      this.vx = 0;
      player.y = this.y - player.h;
      player.bounce();
      score += 800;
      showNextStompAchievement();
    }

    draw(ctx, vx) {
      const x = Math.round(this.x - vx);
      const y = Math.round(this.y);
      if (this.deathTimer > 0) {
        drawSheet(ctx, sheets.enemy, 32, 16, 16, 16, x, y, 16, 16);
        return;
      }
      const frame = Math.floor(animationTime / 0.15) % 2;
      drawSheet(ctx, sheets.enemy, frame * 16, 16, 16, 16, x, y - 2, 16, 16);
    }
  }

  class Turtle extends Entity {
    constructor(tileX, tileY, minTile, maxTile) {
      super(tileX * TILE, tileY * TILE, 16, 32);
      this.vx = -32;
      this.minX = minTile * TILE;
      this.maxX = maxTile * TILE;
      this.shellTimer = 0;
    }

    update(dt, level) {
      this.previousX = this.x;
      this.previousY = this.y;
      this.vy = Math.min(420, this.vy + GRAVITY * dt);
      moveWithTiles(this, level, dt, { turnOnWall: true });
      if (this.x < this.minX || this.x > this.maxX) {
        this.x = clamp(this.x, this.minX, this.maxX);
        this.vx *= -1;
      }
      if (this.shellTimer > 0) this.shellTimer -= dt;
    }

    stomp(player) {
      this.dead = true;
      player.y = this.y - player.h;
      player.bounce();
      score += 1000;
      showNextStompAchievement();
    }

    draw(ctx, vx) {
      const x = Math.round(this.x - vx);
      const y = Math.round(this.y);
      if (this.shellTimer > 0 && this.vx === 0) {
        drawSheet(ctx, this.vx < 0 ? sheets.enemy : sheets.enemyR, 160, 0, 16, 16, x, y + 16, 16, 16);
        return;
      }
      const frame = Math.floor(animationTime / 0.18) % 2;
      drawSheet(ctx, this.vx < 0 ? sheets.enemy : sheets.enemyR, 96 + frame * 16, 0, 16, 32, x, y, 16, 32);
    }
  }

  class Block {
    constructor(tileX, tileY, noteKey, kind) {
      this.x = tileX * TILE;
      this.y = tileY * TILE;
      this.w = TILE;
      this.h = TILE;
      this.noteKey = noteKey;
      this.kind = kind || "question";
      this.used = false;
      this.bump = 0;
    }

    hit() {
      if (this.used) return;
      this.used = true;
      this.bump = 1;
      coins += 1;
      score += 1200;
      spawnCoinBurst(this.x, this.y);
      if (!this.noteKey) {
        message.classList.remove("is-visible");
        messageTimer = 0;
        return;
      }
      const note = notes[this.noteKey];
      showMessage(note.title, note.body, note.label, note.href, note.linkText);
    }

    update(dt) {
      this.bump = Math.max(0, this.bump - dt * 5);
    }

    draw(ctx, vx) {
      const y = Math.round(this.y - Math.sin(this.bump * Math.PI) * 7);
      const x = Math.round(this.x - vx);
      if (this.used) {
        drawSheet(ctx, sheets.tiles, 48, 0, 16, 16, x, y, 16, 16);
      } else if (this.kind === "brick") {
        drawSheet(ctx, sheets.tiles, 16, 0, 16, 16, x, y, 16, 16);
      } else {
        const frame = Math.floor(animationTime / 0.14) % 4;
        const sx = [384, 400, 416, 400][frame];
        drawSheet(ctx, sheets.tiles, sx, 0, 16, 16, x, y, 16, 16);
      }
    }
  }

  class Level {
    constructor() {
      this.tiles = new Map();
      this.blocks = [];
      this.enemies = [];
      this.signs = [];
      this.pipes = [];
      this.milestones = [];
      this.flagX = levelSpec.flagTileX * TILE;
      this.playerStart = { x: levelSpec.playerStart.x * TILE, y: levelSpec.playerStart.y * TILE };
    }

    key(tx, ty) {
      return `${tx},${ty}`;
    }

    putTile(tx, ty, type) {
      this.tiles.set(this.key(tx, ty), type);
    }

    tileAt(tx, ty) {
      return this.tiles.get(this.key(tx, ty));
    }

    isSolidAt(tx, ty) {
      return this.tiles.has(this.key(tx, ty));
    }

    putFloor(start, end) {
      for (let x = start; x < end; x += 1) {
        this.putTile(x, 13, "ground-top");
        this.putTile(x, 14, "ground");
      }
    }

    putWall(tx, bottomTy, height) {
      for (let y = bottomTy - height; y < bottomTy; y += 1) this.putTile(tx, y, "stone");
    }

    putPipe(tx, bottomTy, height, label) {
      this.pipes.push({ x: tx * TILE, y: (bottomTy - height) * TILE, h: height * TILE, label });
      for (let y = bottomTy - height; y < bottomTy; y += 1) {
        this.putTile(tx, y, y === bottomTy - height ? "pipe-top-left" : "pipe-left");
        this.putTile(tx + 1, y, y === bottomTy - height ? "pipe-top-right" : "pipe-right");
      }
    }

    putQBlock(tx, ty, noteKey) {
      const block = new Block(tx, ty, noteKey, "question");
      this.blocks.push(block);
      this.putTile(tx, ty, "block");
    }

    putBrick(tx, ty) {
      const block = new Block(tx, ty, null, "brick");
      this.blocks.push(block);
      this.putTile(tx, ty, "block");
    }

    putGoomba(tx, ty) {
      this.enemies.push(new Goomba(tx, ty));
    }

    putTurtle(tx, ty, minTx, maxTx) {
      this.enemies.push(new Turtle(tx, ty, minTx, maxTx));
    }

    putSign(tx, label) {
      this.signs.push({ x: tx * TILE, label });
    }

    draw(ctx, vx) {
      drawScenery(ctx, vx);
      const startTile = Math.max(0, Math.floor(vx / TILE) - 1);
      const endTile = Math.min(LEVEL_TILES, Math.ceil((vx + VIEW_W) / TILE) + 1);
      for (let y = 0; y < 15; y += 1) {
        for (let x = startTile; x < endTile; x += 1) {
          const type = this.tileAt(x, y);
          if (type && type !== "block") drawTile(ctx, x * TILE - vx, y * TILE, type);
        }
      }
      this.blocks.forEach((block) => {
        if (block.x > vx - 32 && block.x < vx + VIEW_W + 32) block.draw(ctx, vx);
      });
      drawFlag(ctx, vx, this.flagX);
      this.pipes.forEach((pipe) => drawPipeLabel(ctx, vx, pipe));
      this.milestones.forEach((milestone) => drawMilestoneLabel(ctx, vx, milestone));
      this.signs.forEach((sign) => drawSign(ctx, vx, sign));
    }
  }

  let level = buildLevel();
  const player = new Player(level.playerStart.x, level.playerStart.y);

  function buildLevel() {
    const lvl = new Level();
    levelSpec.rows.forEach((row, y) => {
      [...row].forEach((tile, x) => {
        if (tile === "X") {
          lvl.putTile(x, y, y === 13 ? "ground-top" : "stone");
          if (y === 13) lvl.putTile(x, 14, "ground");
        } else if (tile === "S") {
          lvl.putBrick(x, y);
        } else if (tile === "?" || tile === "Q") {
          lvl.putQBlock(x, y, levelSpec.questionNotes[`${x},${y}`] || null);
        } else if (tile === "<") {
          lvl.putTile(x, y, "pipe-top-left");
        } else if (tile === ">") {
          lvl.putTile(x, y, "pipe-top-right");
        } else if (tile === "[") {
          lvl.putTile(x, y, "pipe-left");
        } else if (tile === "]") {
          lvl.putTile(x, y, "pipe-right");
        }
      });
    });

    lvl.pipes = levelSpec.pipes.map((pipe) => ({
      x: pipe.x * TILE,
      y: pipe.topY * TILE,
      h: pipe.height * TILE,
      label: pipe.label,
    }));
    levelSpec.careerSections.forEach((section) => lvl.putSign(section.signX, section.label));
    lvl.milestones = levelSpec.milestones.map((milestone) => ({
      x: milestone.x * TILE,
      y: milestone.y * TILE,
      label: milestone.label,
    }));
    populateEnemies(lvl);
    return lvl;
  }

  function populateEnemies(lvl) {
    lvl.enemies = [];
    levelSpec.enemies.forEach((enemy) => {
      if (enemy.type === "turtle") lvl.putTurtle(enemy.x, enemy.y - 1, enemy.x - 4, enemy.x + 8);
      else lvl.putGoomba(enemy.x, enemy.y);
    });
  }

  function moveWithTiles(ent, lvl, dt, options = {}) {
    ent.x += ent.vx * dt;
    collideAxis(ent, lvl, "x", options);
    ent.y += ent.vy * dt;
    ent.grounded = false;
    collideAxis(ent, lvl, "y", options);
    if (!ent.grounded && ent.vy >= 0 && standingOnSolid(ent, lvl)) {
      ent.y = Math.round(ent.y);
      ent.vy = 0;
      ent.grounded = true;
    }
  }

  function standingOnSolid(ent, lvl) {
    const insetX = ent.collisionInsetX || 0;
    const leftFoot = Math.floor((ent.x + insetX) / TILE);
    const rightFoot = Math.floor((ent.x + ent.w - insetX - 1) / TILE);
    const footTileY = Math.floor((ent.y + ent.h + 1) / TILE);
    const tileTop = footTileY * TILE;
    if (ent.y + ent.h > tileTop + 1.5) return false;
    if (!lvl.isSolidAt(leftFoot, footTileY) && !lvl.isSolidAt(rightFoot, footTileY)) return false;
    ent.y = tileTop - ent.h;
    return true;
  }

  function collideAxis(ent, lvl, axis, options) {
    const minX = Math.floor(ent.x / TILE);
    const maxX = Math.floor((ent.x + ent.w - COLLISION_EPSILON) / TILE);
    const minY = Math.floor(ent.y / TILE);
    const maxY = Math.floor((ent.y + ent.h - COLLISION_EPSILON) / TILE);
    for (let ty = minY; ty <= maxY; ty += 1) {
      for (let tx = minX; tx <= maxX; tx += 1) {
        if (!lvl.isSolidAt(tx, ty)) continue;
        const tile = { x: tx * TILE, y: ty * TILE, w: TILE, h: TILE };
        if (!overlaps(collisionRect(ent), tile)) continue;

        if (axis === "x") {
          if (options.ignoreHorizontal) continue;
          const insetX = ent.collisionInsetX || 0;
          const beforeX = ent.x;
          const incomingVx = ent.vx;
          if (ent.vx > 0) ent.x = tile.x - ent.w + insetX;
          if (ent.vx < 0) ent.x = tile.x + tile.w - insetX;
          if (ent instanceof Player && Math.abs(ent.x - beforeX) > 0.01) {
            frameTileCollisions.push({
              axis: "x",
              tileX: tx,
              tileY: ty,
              beforeX,
              afterX: ent.x,
              correctionX: ent.x - beforeX,
              incomingVx,
              playerY: ent.y,
            });
          }
          if (options.turnOnWall) ent.vx *= -1;
          else if (ent instanceof Player) ent.vx = 0;
        } else {
          if (ent.vy > 0) {
            ent.y = tile.y - ent.h;
            ent.vy = 0;
            ent.grounded = true;
          } else if (ent.vy < 0) {
            ent.y = tile.y + tile.h;
            ent.vy = 0;
            if (ent instanceof Player) hitBlockAt(tx, ty);
          }
        }
      }
    }
  }

  function hitBlockAt(tx, ty) {
    const block = level.blocks.find((item) => item.x === tx * TILE && item.y === ty * TILE);
    if (block) block.hit();
  }

  function update(dt) {
    simulationFrame += 1;
    const resetCountBeforeUpdate = resetCount;
    const playerBeforeUpdate = {
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      grounded: player.grounded,
    };
    frameTileCollisions = [];
    frameEnemyContacts = [];
    animationTime += dt;
    player.update(dt, level);
    level.blocks.forEach((block) => block.update(dt));
    updateCoinBursts(dt);
    level.enemies.forEach((enemy) => {
      if (enemy.x > cameraX - 96 && enemy.x < cameraX + VIEW_W + 128) enemy.update(dt, level);
    });
    level.enemies = level.enemies.filter((enemy) => !enemy.dead);
    checkEnemyCollisions();
    updateCareerHud();
    if (clearRestartTimer > 0) {
      clearRestartTimer -= dt;
      if (clearRestartTimer <= 0) restartLevel();
    }
    if (!levelCleared && player.x + player.w >= level.flagX) {
      levelCleared = true;
      score += 2;
      showMessage("Score: " + String(score).padStart(6, "0"), "Restarting the career map in 5 seconds.", "Level clear");
      messageTimer = 5;
      clearRestartTimer = 5;
    }
    if (player.y > VIEW_H + 32) resetPlayer("Try again", "You fell below the level. Back to the last checkpoint.", null, "gap");
    const nextCameraX = Math.round(clamp(player.x - 86, 0, LEVEL_W - VIEW_W));
    cameraX = Math.max(cameraX, nextCameraX);
    messageTimer = Math.max(0, messageTimer - dt);
    if (messageTimer === 0) message.classList.remove("is-visible");
    coinEl.textContent = String(coins).padStart(2, "0");
    scoreEl.textContent = String(score).padStart(6, "0").slice(-6);
    recordMovementFrame(playerBeforeUpdate, resetCountBeforeUpdate, dt);
  }

  function checkEnemyCollisions() {
    const collisions = level.enemies.filter((enemy) => {
      if (enemy.dead || enemy.deathTimer > 0) return false;
      return overlaps(collisionRect(player), collisionRect(enemy));
    });
    if (!collisions.length) return;

    frameEnemyContacts = collisions.map((enemy) => ({
      type: enemy instanceof Turtle ? "turtle" : "goomba",
      x: enemy.x,
      y: enemy.y,
      deathTimer: enemy.deathTimer || 0,
    }));

    const stompTarget = collisions.find((enemy) => {
      const previousBottom = player.previousY + player.h;
      const currentBottom = player.y + player.h;
      const wasDescending = player.previousVy > 0 || player.vy > 0;
      return wasDescending && previousBottom <= enemy.y + 2 && currentBottom >= enemy.y;
    });
    if (stompTarget) {
      frameEnemyContacts.forEach((contact) => {
        contact.resolution = contact.x === stompTarget.x && contact.y === stompTarget.y ? "stomp" : "ignored-after-stomp";
      });
      stompTarget.stomp(player);
      return;
    }

    // Damage replaces the enemy array and resets the player, so no stale contacts
    // from this frame should be processed afterward.
    frameEnemyContacts.forEach((contact) => {
      contact.resolution = "damage";
    });
    player.damage();
  }

  function updateCareerHud() {
    let current = notes.hiq.label;
    for (const section of levelSpec.careerSections) {
      const sectionX = section.start * TILE;
      if (player.x + 20 >= sectionX) {
        current = section.label;
        checkpointX = Math.max(checkpointX, sectionX - 20);
      }
    }
    worldEl.textContent = current;
  }

  function render() {
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = "#6ec6e7";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    level.draw(ctx, cameraX);
    drawCoinBursts(ctx, cameraX);
    level.enemies.forEach((enemy) => {
      if (enemy.x > cameraX - 32 && enemy.x < cameraX + VIEW_W + 32) enemy.draw(ctx, cameraX);
    });
    player.draw(ctx, cameraX);
    ctx.strokeStyle = "rgba(32, 57, 43, 0.28)";
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, VIEW_W - 3, VIEW_H - 3);
  }

  function drawScenery(ctx, vx) {
    ctx.fillStyle = "#ffffff";
    [[12, 4], [54, 3], [90, 5], [132, 3], [174, 4], [214, 3]].forEach(([tx, ty]) => {
      drawCloud(ctx, tx * TILE - vx, ty * TILE);
    });
    ctx.fillStyle = "#78c65b";
    for (let x = -80; x < LEVEL_W; x += 360) {
      ctx.beginPath();
      ctx.ellipse(x - vx + 110, FLOOR_Y + 4, 120, 42, 0, Math.PI, 0);
      ctx.fill();
    }
    ctx.fillStyle = "#4f944c";
    for (let x = 140; x < LEVEL_W; x += 460) {
      ctx.beginPath();
      ctx.ellipse(x - vx + 110, FLOOR_Y + 5, 98, 32, 0, Math.PI, 0);
      ctx.fill();
    }
  }

  function drawCloud(ctx, x, y) {
    drawSheet(ctx, sheets.tiles, 0, 320, 48, 32, x, y, 48, 32, () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y + 9, 32, 7);
      ctx.fillRect(x + 10, y, 18, 16);
      ctx.fillRect(x + 28, y + 8, 24, 8);
    });
  }

  function drawTile(ctx, x, y, type) {
    if (type.startsWith("pipe")) {
      const source = {
        "pipe-top-left": [0, 128],
        "pipe-top-right": [16, 128],
        "pipe-left": [0, 144],
        "pipe-right": [16, 144],
      }[type];
      drawSheet(ctx, sheets.tiles, source[0], source[1], 16, 16, x, y, 16, 16, () => {
        ctx.fillStyle = type.includes("top") ? "#31a85d" : "#1f7a41";
        ctx.fillRect(x, y, TILE, TILE);
      });
      return;
    }
    if (type === "stone") {
      drawSheet(ctx, sheets.tiles, 0, 16, 16, 16, x, y, 16, 16);
      return;
    }
    drawSheet(ctx, sheets.tiles, 0, 0, 16, 16, x, y, 16, 16, () => {
      ctx.fillStyle = type === "ground-top" ? "#d98a3c" : "#a95d2c";
      ctx.fillRect(x, y, TILE, TILE);
    });
  }

  function drawSign(ctx, vx, sign) {
    const x = sign.x - vx;
    if (x < -90 || x > VIEW_W + 40) return;
    ctx.fillStyle = "#7b4a28";
    ctx.fillRect(x, FLOOR_Y - 44, 5, 44);
    ctx.fillStyle = "#f6df88";
    ctx.fillRect(x - 34, FLOOR_Y - 58, 74, 22);
    ctx.strokeStyle = "#7b4a28";
    ctx.strokeRect(x - 34, FLOOR_Y - 58, 74, 22);
    ctx.fillStyle = "#20392b";
    ctx.font = "bold 7px monospace";
    ctx.fillText(sign.label, x - 28, FLOOR_Y - 44);
  }

  function drawPipeLabel(ctx, vx, pipe) {
    if (!pipe.label) return;
    const x = pipe.x - vx;
    if (x < -60 || x > VIEW_W + 20) return;
    ctx.fillStyle = "#fff4c1";
    ctx.font = "7px monospace";
    ctx.fillText(pipe.label, x - 3, pipe.y - 4);
  }

  function drawMilestoneLabel(ctx, vx, milestone) {
    const x = milestone.x - vx;
    if (x < -40 || x > VIEW_W + 40) return;
    ctx.save();
    ctx.fillStyle = "#fff4c1";
    ctx.font = "7px monospace";
    ctx.textAlign = "center";
    ctx.fillText(milestone.label, x + TILE / 2, milestone.y - 5);
    ctx.restore();
  }

  function drawFlag(ctx, vx, x) {
    const sx = x - vx;
    ctx.fillStyle = "#fff1c4";
    ctx.fillRect(sx, 48, 5, 160);
    ctx.fillStyle = "#d33e35";
    ctx.fillRect(sx + 5, 62, 58, 28);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 9px monospace";
    ctx.fillText("FINISH", sx + 11, 80);
  }

  function resetPlayer(title, body, kicker, reason) {
    lastReset = {
      reason: reason || "unknown",
      frame: simulationFrame,
      fromX: player.x,
      fromY: player.y,
      toX: checkpointX,
    };
    resetCount += 1;
    if (debugEnabled) console.warn("[career-game:reset]", lastReset);
    populateEnemies(level);
    player.x = checkpointX;
    player.y = FLOOR_Y - player.h;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.jumpHeld = false;
    levelCleared = false;
    clearRestartTimer = 0;
    updateAccumulator = 0;
    animationTime = 0;
    cameraX = Math.round(clamp(player.x - 86, 0, LEVEL_W - VIEW_W));
    showMessage(title, body, kicker || "Restart");
    coinBursts.length = 0;
  }

  function restartLevel() {
    level = buildLevel();
    coins = 0;
    score = 0;
    checkpointX = 48;
    levelCleared = false;
    clearRestartTimer = 0;
    simulationFrame = 0;
    resetCount = 0;
    lastReset = null;
    player.x = level.playerStart.x;
    player.y = level.playerStart.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.jumpHeld = false;
    cameraX = 0;
    coinBursts.length = 0;
    showMessage(
      "I build products from 0 to 1 and systems from 1 to millions.",
      "Run right, hit question blocks, stomp mushroom bugs, dodge patrolling turtles, and play through the career map.",
      "Career 1-1"
    );
  }

  function showMessage(title, body, kicker, href, linkText) {
    kickerEl.textContent = kicker || "Block found";
    messageTitle.textContent = title;
    messageBody.textContent = "";
    messageBody.append(document.createTextNode(body));
    if (href) {
      messageBody.append(" ");
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = linkText || "Open deep dive";
      messageBody.append(link);
    }
    message.classList.add("is-visible");
    messageTimer = 4.6;
  }

  function showNextStompAchievement() {
    const achievement = stompDeck.next();
    showMessage(achievement.title, achievement.body, achievement.kicker);
    return achievement;
  }

  function spawnCoinBurst(blockX, blockY) {
    coinBursts.push({
      x: blockX,
      y: blockY - TILE,
      vy: -106,
      age: 0,
      duration: 0.72,
    });
  }

  function updateCoinBursts(dt) {
    for (let index = coinBursts.length - 1; index >= 0; index -= 1) {
      const coin = coinBursts[index];
      coin.age += dt;
      coin.vy += 300 * dt;
      coin.y += coin.vy * dt;
      if (coin.age >= coin.duration) coinBursts.splice(index, 1);
    }
  }

  function drawCoinBursts(ctx, vx) {
    coinBursts.forEach((coin) => {
      const frame = Math.floor(coin.age / 0.08) % 4;
      const sx = [0, 16, 32, 16][frame];
      const fade = clamp((coin.duration - coin.age) / 0.16, 0, 1);
      ctx.save();
      ctx.globalAlpha = fade;
      drawSheet(ctx, sheets.items, sx, 96, 16, 16, Math.round(coin.x - vx), Math.round(coin.y), 16, 16, () => {
        ctx.fillStyle = "#ffcf24";
        ctx.beginPath();
        ctx.ellipse(Math.round(coin.x - vx) + 8, Math.round(coin.y) + 8, 4, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#a85b00";
        ctx.stroke();
      });
      ctx.restore();
    });
  }

  function exposeDebugState() {
    if (!debugEnabled) return;
    window.__careerGameDebug = {
      getState() {
        return {
          player: { x: player.x, y: player.y, vx: player.vx, vy: player.vy, grounded: player.grounded },
          cameraX,
          checkpointX,
          coins,
          score,
          levelCleared,
          paused: simulationPaused,
          resetCount,
          lastReset,
          movementTraceSize: movementTrace.length,
          movementAnomalyCount: movementAnomalies.length,
          coinBurstCount: coinBursts.length,
          performance: { ...performanceStats, maxCatchUpSteps },
          stompDeck: stompDeck.getState(),
          world: worldEl.textContent,
          message: {
            visible: message.classList.contains("is-visible"),
            kicker: kickerEl.textContent,
            title: messageTitle.textContent,
            body: messageBody.textContent,
          },
          blocks: level.blocks.map((block) => ({
            tileX: block.x / TILE,
            tileY: block.y / TILE,
            noteKey: block.noteKey,
            kind: block.kind,
            used: block.used,
          })),
          signs: level.signs.map((sign) => ({ tileX: sign.x / TILE, label: sign.label })),
          pipes: level.pipes.map((pipe) => ({ tileX: pipe.x / TILE, tileY: pipe.y / TILE, label: pipe.label })),
          milestones: level.milestones.map((milestone) => ({
            tileX: milestone.x / TILE,
            tileY: milestone.y / TILE,
            label: milestone.label,
          })),
          enemies: level.enemies.map((enemy) => ({
            type: enemy instanceof Turtle ? "turtle" : "goomba",
            x: enemy.x,
            y: enemy.y,
            dead: enemy.dead,
          })),
        };
      },
      jumpTo(tileX, tileY) {
        player.x = tileX * TILE;
        player.y = tileY * TILE;
        player.vx = 0;
        player.vy = 0;
        player.grounded = false;
        cameraX = Math.round(clamp(player.x - 86, 0, LEVEL_W - VIEW_W));
        updateCareerHud();
        render();
        return this.getState();
      },
      setPlayerState(state) {
        if (Number.isFinite(state.x)) player.x = state.x;
        if (Number.isFinite(state.y)) player.y = state.y;
        if (Number.isFinite(state.vx)) player.vx = state.vx;
        if (Number.isFinite(state.vy)) player.vy = state.vy;
        if (typeof state.grounded === "boolean") player.grounded = state.grounded;
        render();
        return this.getState();
      },
      hitBlock(tileX, tileY) {
        hitBlockAt(tileX, tileY);
        return this.getState().message;
      },
      clearEnemies() {
        level.enemies = [];
        render();
      },
      pause() {
        simulationPaused = true;
        render();
        return this.getState();
      },
      resume() {
        simulationPaused = false;
        updateAccumulator = 0;
        lastTime = performance.now();
        synchronizeSimulationInput(lastTime);
        resetPerformanceWindow(lastTime);
        return this.getState();
      },
      step(frames, codes) {
        simulationPaused = true;
        input.clear();
        (codes || []).forEach((code) => input.add(code));
        const frameCount = Math.max(1, Math.min(3600, Math.floor(frames || 1)));
        for (let frame = 0; frame < frameCount; frame += 1) update(1 / 60);
        input.clear();
        render();
        return this.getState();
      },
      stepDelta(seconds, codes) {
        simulationPaused = true;
        input.clear();
        (codes || []).forEach((code) => input.add(code));
        update(clamp(seconds, 1 / 240, 0.1));
        input.clear();
        render();
        return this.getState();
      },
      setMaxCatchUpSteps(steps) {
        maxCatchUpSteps = Math.max(1, Math.min(8, Math.floor(steps || 1)));
        updateAccumulator = 0;
        resetPerformanceWindow(performance.now());
        return maxCatchUpSteps;
      },
      dumpMovementTrace(limit) {
        const count = Math.max(1, Math.min(600, Math.floor(limit || 120)));
        return movementTrace.slice(-count);
      },
      getMovementAnomalies() {
        return movementAnomalies.slice();
      },
      clearMovementTrace() {
        movementTrace.length = 0;
        movementAnomalies.length = 0;
        return true;
      },
      setCamera(tileX) {
        simulationPaused = true;
        cameraX = Math.round(clamp(tileX * TILE, 0, LEVEL_W - VIEW_W));
        render();
        return this.getState();
      },
      tileAt(tileX, tileY) {
        return level.tileAt(tileX, tileY) || null;
      },
      dismissMessage() {
        message.classList.remove("is-visible");
        messageTimer = 0;
      },
      assetsReady() {
        return Object.values(sheets).every((sheet) => sheet.complete && sheet.naturalWidth > 0);
      },
      showNextStompAchievement() {
        const achievement = showNextStompAchievement();
        return { achievement, deck: stompDeck.getState(), message: this.getState().message };
      },
      restart: restartLevel,
    };
  }

  function overlaps(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function collisionRect(ent) {
    const insetX = ent.collisionInsetX || 0;
    return {
      x: ent.x + insetX,
      y: ent.y,
      w: ent.w - insetX * 2,
      h: ent.h,
    };
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function resetPerformanceWindow(now) {
    perfWindowStartedAt = now;
    perfRafFrames = 0;
    perfSimulationSteps = 0;
    perfCatchUpFrames = 0;
    perfDroppedMs = 0;
    perfMaxFrameMs = 0;
    perfMaxRenderMs = 0;
  }

  function queueInputChange(code, pressed) {
    if (pressed === liveInput.has(code)) return;
    if (pressed) liveInput.add(code);
    else liveInput.delete(code);
    pendingInputEvents.push({ time: performance.now(), code, pressed });
  }

  function applyInputEventsThrough(time) {
    while (pendingInputEvents.length && pendingInputEvents[0].time <= time) {
      const event = pendingInputEvents.shift();
      if (event.pressed) input.add(event.code);
      else input.delete(event.code);
      frameInputEvents.push({
        code: event.code,
        pressed: event.pressed,
        queuedAt: Math.round(event.time * 10) / 10,
        appliedAt: Math.round(time * 10) / 10,
        lagMs: Math.round((time - event.time) * 10) / 10,
      });
    }
  }

  function synchronizeSimulationInput(now) {
    simulationTime = now;
    pendingInputEvents.length = 0;
    frameInputEvents = [];
    input.clear();
    liveInput.forEach((code) => input.add(code));
  }

  function recordMovementFrame(before, resetCountBeforeUpdate, dt) {
    const after = {
      x: player.x,
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      grounded: player.grounded,
    };
    const entry = {
      frame: simulationFrame,
      dt,
      input: [...input].sort(),
      inputEvents: frameInputEvents,
      before,
      after,
      deltaX: after.x - before.x,
      deltaY: after.y - before.y,
      tileCollisions: frameTileCollisions,
      enemyContacts: frameEnemyContacts,
      reset: resetCount !== resetCountBeforeUpdate ? lastReset : null,
    };
    frameInputEvents = [];
    movementTrace.push(entry);
    if (movementTrace.length > 600) movementTrace.shift();

    const expectedDeltaX = Math.max(Math.abs(before.vx), Math.abs(after.vx)) * dt + 0.4;
    if (!entry.reset && Math.abs(entry.deltaX) > expectedDeltaX) {
      const anomaly = {
        ...entry,
        performance: { ...performanceStats, maxCatchUpSteps },
        recentFrames: movementTrace.slice(-6),
      };
      movementAnomalies.push(anomaly);
      if (movementAnomalies.length > 50) movementAnomalies.shift();
      if (debugEnabled) console.warn("[career-game:movement-anomaly]", anomaly);
    }
  }

  function recordPerformance(now, elapsedMs, simulationSteps, droppedMs, renderMs) {
    perfRafFrames += 1;
    perfSimulationSteps += simulationSteps;
    if (simulationSteps > 1) perfCatchUpFrames += 1;
    perfDroppedMs += droppedMs;
    perfMaxFrameMs = Math.max(perfMaxFrameMs, elapsedMs);
    perfMaxRenderMs = Math.max(perfMaxRenderMs, renderMs);

    const windowMs = now - perfWindowStartedAt;
    if (windowMs < PERF_LOG_INTERVAL_MS) return;
    performanceStats = {
      fps: Math.round((perfRafFrames * 10000) / windowMs) / 10,
      updatesPerSecond: Math.round((perfSimulationSteps * 10000) / windowMs) / 10,
      catchUpFrames: perfCatchUpFrames,
      droppedMs: Math.round(perfDroppedMs * 10) / 10,
      maxFrameMs: Math.round(perfMaxFrameMs * 10) / 10,
      maxRenderMs: Math.round(perfMaxRenderMs * 10) / 10,
    };
    if (debugEnabled) {
      console.info("[career-game:perf]", {
        ...performanceStats,
        maxCatchUpSteps,
        playerTile: Math.round((player.x / TILE) * 10) / 10,
        activeEnemies: level.enemies.length,
      });
    }
    resetPerformanceWindow(now);
  }

  function loop(now) {
    const rawElapsedMs = Math.max(0, now - lastTime);
    const elapsedMs = Math.min(100, rawElapsedMs);
    const elapsed = elapsedMs / 1000;
    lastTime = now;
    let simulationSteps = 0;
    let droppedMs = rawElapsedMs - elapsedMs;
    if (simulationPaused) {
      updateAccumulator = 0;
      synchronizeSimulationInput(now);
    } else {
      const availableTime = updateAccumulator + elapsed;
      const maxBacklog = FIXED_DT * maxCatchUpSteps;
      droppedMs += Math.max(0, availableTime - maxBacklog) * 1000;
      updateAccumulator = Math.min(availableTime, maxBacklog);
      simulationTime += droppedMs;
      const resetCountBeforeFrame = resetCount;
      while (updateAccumulator >= FIXED_DT && simulationSteps < maxCatchUpSteps) {
        updateAccumulator -= FIXED_DT;
        simulationTime += FIXED_DT * 1000;
        applyInputEventsThrough(simulationTime);
        update(FIXED_DT);
        simulationSteps += 1;
        if (resetCount !== resetCountBeforeFrame) {
          updateAccumulator = 0;
          break;
        }
      }
    }
    const renderStartedAt = performance.now();
    render();
    recordPerformance(now, elapsedMs, simulationSteps, droppedMs, performance.now() - renderStartedAt);
    requestAnimationFrame(loop);
  }

  window.addEventListener("keydown", (event) => {
    const playKeys = ["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "ShiftLeft", "ShiftRight", "KeyA", "KeyD", "KeyW", "KeyZ", "KeyX"];
    if (playKeys.includes(event.code)) event.preventDefault();
    queueInputChange(event.code, true);
  });

  window.addEventListener("keyup", (event) => queueInputChange(event.code, false));
  window.addEventListener("blur", () => {
    [...liveInput].forEach((code) => queueInputChange(code, false));
  });

  canvas.tabIndex = 0;
  canvas.addEventListener("pointerdown", () => canvas.focus());
  canvas.focus();

  document.querySelectorAll("[data-control]").forEach((button) => {
    const code = touchMap[button.dataset.control];
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      queueInputChange(code, true);
      button.setPointerCapture(event.pointerId);
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((type) => {
      button.addEventListener(type, () => queueInputChange(code, false));
    });
  });

  showMessage(
    "I build products from 0 to 1 and systems from 1 to millions.",
    "Run right, hit question blocks, stomp mushroom bugs, dodge patrolling turtles, and play through the career map.",
    "Career 1-1"
  );
  exposeDebugState();
  requestAnimationFrame(loop);
})();
