const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  retries: 0,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: "chromium",
    channel: "chrome",
    headless: true,
    launchOptions: {
      args: ["--disable-gpu"],
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "python3 -m http.server 4173",
    url: "http://127.0.0.1:4173/index_v_mario.html",
    reuseExistingServer: true,
    stdout: "ignore",
    stderr: "ignore",
  },
});
