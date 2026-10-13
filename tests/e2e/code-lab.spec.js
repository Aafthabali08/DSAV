import { test, expect } from "@playwright/test";
test("editable structures generate real operations", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-mode="structures"]').click();
  await page.locator("#ds-values").fill("9, 4, 8");
  await page.locator("#ds-value").fill("-3");
  await page.locator("#ds-index").fill("1");
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  expect(await page.locator(".data-node").allTextContents()).toEqual([
    "9",
    "-3",
    "4",
    "8",
  ]);
  await page.locator('[data-structure="Graph"]').click();
  await page.locator("#ds-edges").fill("0-1");
  await page.locator("#ds-index").fill("0");
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  await expect(page.locator("#ds-scene .action")).toContainText(
    "Reached 2 of 3",
  );
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("custom Python code executes, rewinds, replays and invalidates stale traces", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator('[data-mode="code"]').click();
  await expect(page.locator("#runtime-check")).toContainText(
    "Runtime connected",
    { timeout: 15000 },
  );
  await page
    .locator("#source-code")
    .fill(
      "values = list(map(int, input().split()))\ntotal = 0\nfor value in values:\n    total += value\nprint(total)\n",
    );
  await page.locator("#program-input").fill("8 2 -3");
  await page.locator("#run-code").click();
  await expect(page.locator("#output-text")).toHaveText("7\n", {
    timeout: 30000,
  });
  await page.locator("#code-next").click();
  const state = await page.locator(".memory-view").innerText();
  await page.locator("#code-next").click();
  await page.locator("#code-prev").click();
  expect(await page.locator(".memory-view").innerText()).toBe(state);
  await page
    .locator("#code-scrub")
    .fill(await page.locator("#code-scrub").getAttribute("max"));
  await expect(page.locator("#run-state")).toHaveText("Complete");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: `screenshots/${info.project.name}-code-lab.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `screenshots/${info.project.name}-code-mobile.png`,
    fullPage: true,
  });
  await page.locator("#program-input").fill("1 2");
  await expect(page.locator("#code-next")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("all language selectors run real programs and show time and memory", async ({
  page,
}) => {
  test.setTimeout(120000);
  await page.goto("/#code");
  await expect(page.locator("#runtime-check")).toContainText(
    "Runtime connected",
    { timeout: 15000 },
  );
  for (const language of ["c", "cpp", "python", "java", "javascript"]) {
    await page.locator("#code-language").selectOption(language);
    await page.locator("#program-input").fill("9 2 -1 5");
    await page.locator("#run-code").click();
    await expect(page.locator("#output-text")).toContainText("-1", {
      timeout: 30000,
    });
    await expect(page.locator("#compiler-error")).toBeHidden();
    await expect(page.locator(".run-metric-grid strong").nth(0)).toContainText(
      "ms",
    );
    await expect(page.locator(".run-metric-grid strong").nth(1)).toContainText(
      "MiB",
    );
    await page
      .locator("#code-scrub")
      .fill(await page.locator("#code-scrub").getAttribute("max"));
    await expect(page.locator("#run-state")).toHaveText("Complete");
  }
  await page.locator("#source-code").fill("const x = ;");
  await page.locator("#run-code").click();
  await expect(page.locator("#compiler-error")).toBeVisible();
  await expect(page.locator("#run-state")).toHaveText("Needs attention");
});

test("runtime reconnects automatically after temporary connection failure", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/runtime", async (route) => {
    calls++;
    if (calls === 1)
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: "{}",
      });
    else await route.continue();
  });
  await page.goto("/#code");
  await expect(page.locator("#runtime-check")).toContainText(
    "Reconnecting automatically",
  );
  await expect(page.locator("#runtime-check")).toContainText(
    "Runtime connected",
    { timeout: 15000 },
  );
  await page.locator("#source-code").fill("print(6 * 7)");
  await page.locator("#run-code").click();
  await expect(page.locator("#output-text")).toHaveText("42\n", {
    timeout: 30000,
  });
  expect(calls).toBeGreaterThanOrEqual(3);
});

test("pseudocode and programming code follow the current algorithm", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".source-logic")).toBeVisible();
  await page.locator('[data-logic="pseudo"]').click();
  await expect(page.locator(".source-logic")).toHaveCount(0);
  await page.locator('[data-logic="source"]').click();
  await expect(page.locator(".source-logic")).toContainText("swapped = false");
  await page.locator("#next").click();
  await expect(page.locator(".source-logic .current").first()).toContainText(
    "for (let j",
  );
  await page.locator("#algorithm").selectOption("merge");
  await expect(page.locator(".source-logic")).toContainText("mergeSort");
  await page.locator('[data-logic="both"]').click();
  await expect(page.locator(".logic-scroll")).toHaveCount(2);
});
