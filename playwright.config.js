import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  // The isolated local compiler intentionally runs one program at a time.
  workers: 1,
  use: { baseURL: "http://127.0.0.1:7000", headless: true },
  projects: [
    { name: "chromium", use: { browserName: "chromium", channel: "chrome" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
