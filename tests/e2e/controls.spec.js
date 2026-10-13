import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("presets, every sorting selector, replay, speed and comparison export", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#size").fill("5");
  for (const preset of ["sorted", "reverse", "nearly", "random"]) {
    await page.locator("#preset").selectOption(preset);
    await page.locator("#generate").click();
    const a = (await page.locator(".bar-value").allTextContents()).map(Number);
    expect(a).toHaveLength(5);
    if (preset === "sorted") expect(a).toEqual([...a].sort((a, b) => a - b));
    if (preset === "reverse") expect(a).toEqual([...a].sort((a, b) => b - a));
  }
  await page.locator("#custom-toggle").click();
  await page.locator("#custom-input").fill("3, -1, 0, 3");
  await page.locator("#apply").click();
  for (const algorithm of [
    "bubble",
    "selection",
    "insertion",
    "merge",
    "quick",
  ]) {
    await page.locator("#algorithm").selectOption(algorithm);
    await page
      .locator("#progress")
      .fill(await page.locator("#progress").getAttribute("max"));
    expect(await page.locator(".bar-value").allTextContents()).toEqual([
      "-1",
      "0",
      "3",
      "3",
    ]);
  }
  await page.locator("#speed").selectOption("4");
  await page.locator("#play").click();
  await expect
    .poll(async () => Number(await page.locator("#progress").inputValue()))
    .toBeGreaterThan(0);
  await page.locator("#reset").click();
  await page.waitForTimeout(300);
  await expect(page.locator("#progress")).toHaveValue("0");
  await page.locator('[data-mode="compare"]').click();
  await page.locator(".compare-select").nth(0).selectOption("insertion");
  await page.locator(".compare-select").nth(1).selectOption("insertion");
  await page
    .locator("#progress")
    .fill(await page.locator("#progress").getAttribute("max"));
  const panels = await page.locator(".visual-card .metrics").allTextContents();
  expect(panels[0]).toBe(panels[1]);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.locator("#download").click(),
  ]);
  const data = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(data.input).toEqual([3, -1, 0, 3]);
  expect(data.algorithms[0]).toEqual(data.algorithms[1]);
});

test("structure operation controls, result chaining, buckets, play and error recovery", async ({
  page,
}) => {
  await page.goto("/#structures");
  await page.locator("#ds-values").fill("3, 7");
  await page.locator("#ds-value").fill("5");
  await page.locator("#ds-index").fill("1");
  await page.locator("#ds-apply").click();
  await page.locator("#ds-play").click();
  await expect
    .poll(async () => Number(await page.locator("#ds-scrub").inputValue()))
    .toBeGreaterThan(0);
  await page.locator("#ds-reset").click();
  await page.waitForTimeout(850);
  await expect(page.locator("#ds-scrub")).toHaveValue("0");
  await page.locator("#ds-use-result").click();
  await expect(page.locator("#ds-values")).toHaveValue("3, 5, 7");
  await page.locator("#ds-operation").selectOption("Remove");
  await page.locator("#ds-index").fill("1");
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  expect(await page.locator(".data-node").allTextContents()).toEqual([
    "3",
    "7",
  ]);
  await page.locator("#ds-values").fill("bad");
  await page.locator("#ds-apply").click();
  await expect(page.locator("#ds-error")).toContainText("whole numbers");
  await page.locator("#ds-generate").click();
  await expect(page.locator("#ds-error")).toBeEmpty();
  await page.locator('[data-structure="Hash table"]').click();
  await page.locator("#ds-values").fill("-1, 3");
  await page.locator("#ds-value").fill("7");
  await page.locator("#ds-buckets").fill("4");
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  await expect(page.locator(".selected-bucket")).toContainText("-1→3→7");
});

test("code replay, speed, memory views, sample reload, language drafts and runtime errors", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/#code");
  await expect(page.locator("#runtime-check")).toContainText(
    "Runtime connected",
    { timeout: 20000 },
  );
  const code = "a = [3, 1, 2]\nx = 0\nfor v in a:\n    x += v\nprint(x)";
  await page.locator("#source-code").fill(code);
  await page.locator("#code-language").selectOption("javascript");
  await page.locator("#code-language").selectOption("python");
  await expect(page.locator("#source-code")).toHaveValue(code);
  await page.locator("#run-code").click();
  await expect(page.locator("#output-text")).toHaveText("6\n", {
    timeout: 30000,
  });
  await page.locator("#code-speed").selectOption("125");
  await page.locator("#code-play").click();
  await expect
    .poll(async () => Number(await page.locator("#code-scrub").inputValue()))
    .toBeGreaterThan(1);
  await page.locator("#code-play").click();
  const position = await page.locator("#code-scrub").inputValue();
  await page.waitForTimeout(400);
  await expect(page.locator("#code-scrub")).toHaveValue(position);
  await page.locator('[data-memory="bars"]').click();
  await expect(page.locator(".runtime-bar")).toHaveCount(3);
  await page.locator('[data-memory="cells"]').click();
  await expect(page.locator(".memory-cell")).toHaveCount(3);
  await page.locator("#code-reset").click();
  await expect(page.locator("#code-scrub")).toHaveValue("0");
  await page.locator("#random-input").click();
  await expect(page.locator("#code-scrub")).toHaveCount(0);
  await page.locator("#load-example").click();
  await expect(page.locator("#source-code")).toHaveValue(/swapped = False/);
  await page.locator("#source-code").fill("print(1 / 0)");
  await page.locator("#run-code").click();
  await expect(page.locator("#compiler-error")).toContainText(
    "ZeroDivisionError",
    { timeout: 30000 },
  );
  await expect(page.locator("#run-state")).toHaveText("Paused");
  await page.locator("#source-code").fill("print(42)");
  await page.locator("#run-code").click();
  await expect(page.locator("#output-text")).toHaveText("42\n", {
    timeout: 30000,
  });
  await expect(page.locator("#compiler-error")).toBeHidden();
});
