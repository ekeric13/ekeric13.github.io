const { expect, test } = require("@playwright/test");
const spec = require("../../js/mario-level-spec.js");
const { openGame } = require("./helpers.js");

test("loads every sprite and renders a nonblank canvas without runtime errors", async ({ page }) => {
  const runtimeErrors = await openGame(page);
  const pixels = await page.locator("#career-game").evaluate((canvas) => {
    const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
    const colors = new Set();
    for (let index = 0; index < data.length; index += 1600) {
      colors.add(`${data[index]},${data[index + 1]},${data[index + 2]},${data[index + 3]}`);
    }
    return { sampledColors: colors.size, width: canvas.width, height: canvas.height };
  });
  expect(runtimeErrors).toEqual([]);
  expect(pixels).toEqual({ sampledColors: expect.any(Number), width: 1024, height: 960 });
  expect(pixels.sampledColors).toBeGreaterThan(4);
});

test("HUD and block messages follow the explicit career ranges", async ({ page }) => {
  await openGame(page);

  for (const section of spec.careerSections) {
    const world = await page.evaluate(({ x }) => {
      window.__careerGameDebug.jumpTo(x, 12);
      window.__careerGameDebug.step(1);
      return window.__careerGameDebug.getState().world;
    }, { x: section.start });
    expect(world).toBe(section.label);
  }

  for (const [coordinate, noteKey] of Object.entries(spec.questionNotes)) {
    const [x, y] = coordinate.split(",").map(Number);
    const section = spec.careerSections.find((candidate) => x >= candidate.start && x < candidate.end);
    const result = await page.evaluate(({ tileX, tileY }) => {
      window.__careerGameDebug.restart();
      window.__careerGameDebug.pause();
      return window.__careerGameDebug.hitBlock(tileX, tileY);
    }, { tileX: x, tileY: y });
    expect(section.noteKeys).toContain(noteKey);
    expect(result.kicker).toBe(section.label);
    expect(result.visible).toBe(true);
  }
});

test("a physical jump hits the first hiQ question block", async ({ page }) => {
  await openGame(page);
  const state = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.clearEnemies();
    debug.jumpTo(16, 12);
    debug.step(1);
    debug.step(24, ["Space"]);
    return debug.getState();
  });
  const block = state.blocks.find(({ tileX, tileY }) => tileX === 16 && tileY === 9);
  expect(block.used).toBe(true);
  expect(state.message.kicker).toBe("hiQ Labs");
});

test("hitting a block spawns a coin animation", async ({ page }) => {
  await openGame(page);
  const state = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.hitBlock(16, 9);
    debug.step(1);
    return debug.getState();
  });

  expect(state.coinBurstCount).toBe(1);
  expect(state.coins).toBe(1);
});

test("falling into the first gap resets to the latest checkpoint", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.clearEnemies();
    debug.jumpTo(69, 12);
    debug.step(90);
    return debug.getState();
  });
  expect(result.player.x).toBe(result.checkpointX);
  expect(result.message.title).toBe("Try again");
});

test("touching a pipe side cannot create a false standing state", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.clearEnemies();
    debug.jumpTo(57 - 13 / 16, 8);
    const besideBefore = debug.getState();
    debug.step(15);
    const besideAfter = debug.getState();
    debug.jumpTo(57.25, 8);
    debug.step(2);
    const onTop = debug.getState();
    return { besideBefore, besideAfter, onTop };
  });
  expect(result.besideAfter.player.y).toBeGreaterThan(result.besideBefore.player.y + 10);
  expect(result.besideAfter.player.grounded).toBe(false);
  expect(result.onTop.player.y).toBe(128);
  expect(result.onTop.player.grounded).toBe(true);
});

test("an idle player is hit and the enemy resets away from the checkpoint", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    let collisionFrame = null;
    for (let frame = 0; frame < 600; frame += 1) {
      debug.step(1);
      if (debug.getState().message.title === "Try again") {
        collisionFrame = frame;
        break;
      }
    }
    return { collisionFrame, state: debug.getState() };
  });
  expect(result.collisionFrame).not.toBeNull();
  expect(result.state.player.x).toBe(result.state.checkpointX);
  expect(result.state.lastReset.reason).toBe("enemy");
  expect(result.state.enemies[0].x).toBe(21 * 16);
  expect(result.state.enemies[0].x).toBeGreaterThan(result.state.player.x + 16);
});

test("stomping a Goomba draws a career achievement", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.jumpTo(21, 10);
    let state = debug.getState();
    for (let frame = 0; frame < 60 && state.score === 0; frame += 1) {
      debug.step(1);
      state = debug.getState();
    }
    return state;
  });
  expect(result.score).toBe(800);
  expect(result.stompDeck.cycle).toBe(1);
  expect(result.stompDeck.remaining).toBe(result.stompDeck.total - 1);
  expect(["Intuit", "AnimePics", "Ethos"]).toContain(result.message.kicker);
  expect(result.message.title).not.toBe("Cleared a production bug");
});

test("stomping between adjacent enemies resolves once without rewinding", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.jumpTo(124.5, 10);
    const startX = debug.getState().player.x;
    let state = debug.getState();
    for (let frame = 0; frame < 60 && state.score === 0; frame += 1) {
      debug.step(1);
      state = debug.getState();
    }
    const afterStomp = state;
    debug.step(8);
    return { startX, afterStomp, state: debug.getState() };
  });

  expect(result.afterStomp.score).toBeGreaterThanOrEqual(800);
  expect(result.afterStomp.message.title).not.toBe("Try again");
  expect(result.state.score).toBeGreaterThanOrEqual(800);
  expect(result.state.message.title).not.toBe("Try again");
  expect(result.state.player.x).toBe(result.startX);
  expect(result.state.player.vy).toBeLessThan(0);
});

test("a delayed frame while reversing in midair still lands as a stomp", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.setPlayerState({
      x: 124.5 * 16,
      y: 177,
      vx: 168,
      vy: 500,
      grounded: false,
    });
    return debug.stepDelta(1 / 30, ["ArrowLeft"]);
  });

  expect(result.score).toBeGreaterThanOrEqual(800);
  expect(result.message.title).not.toBe("Try again");
  expect(result.player.vy).toBeLessThan(0);
});

test("reversing from right to left in midair has a continuous landing", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.clearEnemies();
    debug.jumpTo(120, 12);
    debug.step(1);
    debug.clearMovementTrace();

    let previous = debug.getState();
    let sawAirborne = false;
    let landingDelta = null;
    let smallestDelta = 0;
    let smallestTransition = null;
    for (let frame = 0; frame < 90; frame += 1) {
      const codes = frame < 12 ? ["ArrowRight", "Space"] : ["ArrowLeft"];
      const state = debug.step(1, codes);
      const delta = state.player.x - previous.player.x;
      if (delta < smallestDelta) {
        smallestDelta = delta;
        smallestTransition = { frame, before: previous.player, after: state.player };
      }
      if (!state.player.grounded) sawAirborne = true;
      if (sawAirborne && state.player.grounded) {
        landingDelta = delta;
        return { landingDelta, smallestDelta, smallestTransition, anomalies: debug.getMovementAnomalies(), state };
      }
      previous = state;
    }
    return {
      landingDelta,
      smallestDelta,
      smallestTransition,
      anomalies: debug.getMovementAnomalies(),
      state: debug.getState(),
    };
  });

  expect(result.landingDelta).not.toBeNull();
  expect(result.landingDelta).toBeGreaterThanOrEqual(-2.81);
  expect(result.smallestDelta, JSON.stringify(result.smallestTransition)).toBeGreaterThanOrEqual(-2.81);
  expect(result.anomalies).toEqual([]);
  expect(result.state.message.title).not.toBe("Try again");
  expect(result.state.resetCount).toBe(0);
});

test("movement telemetry captures an unexpected horizontal tile correction", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.clearEnemies();
    debug.jumpTo(140, 12);
    debug.step(1);
    debug.clearMovementTrace();
    debug.step(1, ["ArrowRight", "Space"]);
    return {
      anomalies: debug.getMovementAnomalies(),
      trace: debug.dumpMovementTrace(2),
    };
  });

  expect(result.anomalies).toHaveLength(1);
  expect(result.anomalies[0].tileCollisions[0]).toMatchObject({ axis: "x", tileX: 140, tileY: 11 });
  expect(result.trace).toHaveLength(1);
});

test("a fractional landing cannot turn the floor into a horizontal wall", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.clearEnemies();
    debug.setPlayerState({
      x: 998.4,
      y: 187.03333333333336,
      vx: 168,
      vy: 322,
      grounded: false,
    });
    debug.clearMovementTrace();
    const landing = debug.step(1, ["ArrowRight"]);
    const next = debug.step(1, ["ArrowRight"]);
    return {
      landing,
      next,
      trace: debug.dumpMovementTrace(2),
      anomalies: debug.getMovementAnomalies(),
    };
  });

  expect(result.landing.player).toMatchObject({ y: 192, grounded: true });
  expect(result.next.player.x - result.landing.player.x).toBeCloseTo(2.8, 5);
  expect(result.trace[1].tileCollisions).toEqual([]);
  expect(result.anomalies).toEqual([]);
});

test("stomp achievements exhaust a shuffled cycle before repeating", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    const total = debug.getState().stompDeck.total;
    const draws = [];
    let fits = true;
    for (let index = 0; index < total; index += 1) {
      const draw = debug.showNextStompAchievement();
      draws.push(draw.achievement.id);
      const panel = document.querySelector(".v12-message").getBoundingClientRect();
      const stage = document.querySelector(".v12-stage").getBoundingClientRect();
      fits = fits && panel.left >= stage.left && panel.right <= stage.right && panel.top >= stage.top && panel.bottom <= stage.bottom;
    }
    const lastId = draws.at(-1);
    debug.restart();
    const afterRestart = debug.getState().stompDeck;
    const nextCycle = debug.showNextStompAchievement();
    return { total, draws, fits, lastId, afterRestart, nextCycle };
  });

  expect(new Set(result.draws).size).toBe(result.total);
  expect(result.fits).toBe(true);
  expect(result.afterRestart).toMatchObject({ cycle: 1, remaining: 0, lastId: result.lastId });
  expect(result.nextCycle.deck).toMatchObject({ cycle: 2, remaining: result.total - 1 });
  expect(result.nextCycle.achievement.id).not.toBe(result.lastId);
});

test("real keyboard input moves and jumps the player", async ({ page }) => {
  await openGame(page);
  await page.evaluate(() => window.__careerGameDebug.resume());
  const startX = await page.evaluate(() => window.__careerGameDebug.getState().player.x);
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(250);
  await page.keyboard.down("Space");
  await page.waitForTimeout(180);
  await page.keyboard.up("Space");
  await page.waitForTimeout(180);
  await page.keyboard.up("ArrowRight");
  const end = await page.evaluate(() => window.__careerGameDebug.getState());
  expect(end.player.x).toBeGreaterThan(startX + 20);
  expect(end.player.y).toBeLessThan(192);
});

test("keyboard input is not delayed after a throttled frame", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(async () => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.clearEnemies();
    debug.dismissMessage();
    debug.jumpTo(22, 12);
    debug.clearMovementTrace();
    debug.resume();
    await new Promise((resolve) => setTimeout(resolve, 300));

    const stalledAt = performance.now();
    while (performance.now() - stalledAt < 1500) {}

    window.dispatchEvent(new KeyboardEvent("keydown", { code: "ArrowRight", key: "ArrowRight", bubbles: true }));
    const before = debug.getState().player;
    await new Promise((resolve) => setTimeout(resolve, 250));
    const after = debug.getState().player;
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowRight", key: "ArrowRight", bubbles: true }));

    return {
      deltaX: after.x - before.x,
      vx: after.vx,
      trace: debug.dumpMovementTrace(20),
    };
  });

  expect(result.deltaX).toBeGreaterThan(20);
  expect(result.vx).toBeGreaterThan(100);
  expect(result.trace.some((frame) => frame.input.includes("ArrowRight"))).toBe(true);
});

test("holding a pointer control moves the player", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page);
  await page.evaluate(() => window.__careerGameDebug.resume());
  const startX = await page.evaluate(() => window.__careerGameDebug.getState().player.x);
  const right = page.locator('[data-control="right"]');
  await right.scrollIntoViewIfNeeded();
  const box = await right.boundingBox();

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();

  const endX = await page.evaluate(() => window.__careerGameDebug.getState().player.x);
  expect(endX).toBeGreaterThan(startX + 10);
});

test("render slowdowns do not reduce the simulation below real time", async ({ page }) => {
  await openGame(page);
  const performance = await page.evaluate(async () => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    debug.clearEnemies();
    debug.setMaxCatchUpSteps(4);
    debug.resume();
    await new Promise((resolve) => setTimeout(resolve, 2600));
    debug.pause();
    return debug.getState().performance;
  });

  expect(performance.updatesPerSecond).toBeGreaterThanOrEqual(55);
  expect(performance.updatesPerSecond).toBeLessThanOrEqual(65);
  expect(performance.droppedMs).toBeLessThan(50);
});

test("deterministic autoplayer traverses the complete level with enemies active", async ({ page }) => {
  await openGame(page);
  const result = await page.evaluate(() => {
    const debug = window.__careerGameDebug;
    debug.restart();
    debug.pause();
    let jumpFrames = 0;
    let stalledFrames = 0;
    let previousX = debug.getState().player.x;
    let deaths = 0;
    let previousTitle = "";

    for (let frame = 0; frame < 7200; frame += 1) {
      const state = debug.getState();
      if (state.levelCleared) return { state, frames: frame, deaths };

      const player = state.player;
      const rightTile = Math.floor((player.x + 15) / 16);
      const topTile = Math.floor((player.y + 2) / 16);
      const bottomTile = Math.floor((player.y + 15) / 16);
      const footTile = Math.floor((player.y + 17) / 16);
      let obstacleAhead = false;
      let gapAhead = false;

      for (let distance = 1; distance <= 3; distance += 1) {
        for (let tileY = topTile; tileY <= bottomTile; tileY += 1) {
          if (debug.tileAt(rightTile + distance, tileY)) obstacleAhead = true;
        }
        if (!debug.tileAt(rightTile + distance, footTile)) gapAhead = true;
      }

      const enemyAhead = state.enemies.some((enemy) => {
        const distance = enemy.x - player.x;
        return distance > -4 && distance < 58 && Math.abs(enemy.y - player.y) < 48;
      });

      if (player.grounded && (obstacleAhead || gapAhead || enemyAhead || stalledFrames > 8)) jumpFrames = 18;
      const codes = ["ArrowRight"];
      if (jumpFrames > 0) {
        codes.push("Space");
        jumpFrames -= 1;
      }
      debug.step(1, codes);

      const nextState = debug.getState();
      stalledFrames = nextState.player.x <= previousX + 0.05 ? stalledFrames + 1 : 0;
      previousX = nextState.player.x;
      if (nextState.message.title === "Try again" && previousTitle !== "Try again") deaths += 1;
      previousTitle = nextState.message.title;
    }
    return { state: debug.getState(), frames: 7200, deaths };
  });

  expect(result.state.levelCleared).toBe(true);
  expect(result.state.player.x).toBeGreaterThan(spec.flagTileX * 16 - 20);
  expect(result.deaths).toBeLessThanOrEqual(2);
});
