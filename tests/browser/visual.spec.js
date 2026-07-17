const { expect, test } = require("@playwright/test");
const { openGame } = require("./helpers.js");

test("canonical level geometry remains visually stable screen by screen", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await openGame(page);
  await page.evaluate(() => {
    window.__careerGameDebug.dismissMessage();
  });

  const anchors = [0, 16, 32, 48, 64, 80, 96, 112, 128, 144, 160, 176, 186];
  for (const tileX of anchors) {
    await page.evaluate((x) => window.__careerGameDebug.setCamera(x), tileX);
    await expect(page.locator("#career-game")).toHaveScreenshot(`level-screen-${String(tileX).padStart(3, "0")}.png`, {
      animations: "disabled",
      maxDiffPixels: 100,
    });
  }
});

test("desktop HUD and message overlay remain legible", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1050 });
  await openGame(page);
  await expect(page.locator(".v12-controls")).toBeHidden();
  await expect(page.locator(".v12-stage")).toHaveScreenshot("desktop-stage.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});

test("touch controls remain available on a wide phone in landscape", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 932, height: 430 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await openGame(page);
  await expect(page.locator(".v12-controls")).toBeVisible();
  await context.close();
});

test("mobile HUD, message, canvas, and touch controls do not overlap", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openGame(page);
  await expect(page.locator(".v12-controls")).toBeVisible();

  const boxes = await page.evaluate(() => {
    const selectors = [".v12-hud", "#career-game", ".v12-message", ".v12-controls"];
    return selectors.map((selector) => {
      const box = document.querySelector(selector).getBoundingClientRect();
      return { selector, top: box.top, bottom: box.bottom, left: box.left, right: box.right };
    });
  });
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].top).toBeGreaterThanOrEqual(boxes[index - 1].bottom - 1);
  }
  await expect(page.locator(".v12-stage")).toHaveScreenshot("mobile-stage.png", {
    animations: "disabled",
    maxDiffPixelRatio: 0.001,
  });
});
