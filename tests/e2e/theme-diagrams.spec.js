import { test, expect } from "@playwright/test";
test("theme persists and complexity follows every learning view", async ({
  page,
}, info) => {
  await page.goto("/");
  await page.locator("#theme-toggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".performance-strip").first()).toContainText(
    "Auxiliary space",
  );
  await page.locator('[data-mode="compare"]').click();
  await expect(page.locator(".performance-strip")).toHaveCount(2);
  await page.locator("#custom-toggle").click();
  await page.locator("#custom-input").fill("4, 1, -2");
  await page.locator("#apply").click();
  await expect(
    page.locator(".visual-card").first().locator(".bar-value"),
  ).toHaveText(["4", "1", "-2"]);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator('[data-mode="structures"]').click();
  for (const name of [
    "Array",
    "Linked list",
    "Stack",
    "Queue",
    "Binary tree",
    "Graph",
    "Hash table",
  ]) {
    await page.locator(`[data-structure="${name}"]`).click();
    await expect(page.locator("#ds-scene .performance-strip")).toContainText(
      "Storage space",
    );
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: `screenshots/${info.project.name}-dark.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `screenshots/${info.project.name}-dark-mobile.png`,
    fullPage: true,
  });
});
test("custom JavaScript maps and nodes produce diagrams and sequence overrides", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/#code");
  await expect(page.locator("#runtime-check")).toContainText(
    "Runtime connected",
    { timeout: 15000 },
  );
  await page.locator("#code-language").selectOption("javascript");
  await page
    .locator("#source-code")
    .fill(
      'const values = input.trim().split(/\\s+/).map(Number);\nconst lookup = new Map([["first", values[0]]]);\nconst root = {value:values[0], left:{value:values[1],left:null,right:null},right:null};\nconst head = {value:values[0],next:{value:values[1],next:null}};\nconsole.log(values.length);',
    );
  await page.locator("#program-input").fill("8 3");
  await page.locator("#run-code").click();
  await expect(page.locator("#output-text")).toHaveText("2\n", {
    timeout: 30000,
  });
  await page
    .locator("#code-scrub")
    .fill(await page.locator("#code-scrub").getAttribute("max"));
  await expect(page.locator(".map-diagram")).toContainText("first");
  await expect(page.locator(".tree-diagram")).toContainText("8");
  await expect(page.locator(".linked-diagram")).toContainText("3");
  await page.locator('[data-diagram="values"]').selectOption("stack");
  await expect(page.locator(".stack-diagram")).toContainText("TOP");
  await page.locator('[data-diagram="values"]').selectOption("queue");
  await expect(page.locator(".queue-diagram")).toContainText("FRONT");
});
