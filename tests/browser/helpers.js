const { expect } = require("@playwright/test");

async function openGame(page) {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  await page.goto("/index_v_mario.html?debugCareerGame=1");
  await page.waitForFunction(() => Boolean(window.__careerGameDebug));
  await page.evaluate(() => window.__careerGameDebug.pause());
  await page.waitForFunction(() => window.__careerGameDebug.assetsReady());
  await page.evaluate(() => {
    window.__careerGameDebug.restart();
    window.__careerGameDebug.pause();
  });
  await expect(page.locator("#career-game")).toBeVisible();
  return runtimeErrors;
}

module.exports = { openGame };
