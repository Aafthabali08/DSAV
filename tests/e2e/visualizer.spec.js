import { test, expect } from "@playwright/test";
test("sorting, rewind, playback, custom input and comparison", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("#play")).toContainText("Play algorithm");
  await page.locator("#next").click();
  const snapshot = await page.locator(".visual-card").innerText();
  await page.locator("#next").click();
  await page.locator("#prev").click();
  expect(await page.locator(".visual-card").innerText()).toBe(snapshot);
  await page.locator("#play").click();
  await page.waitForTimeout(600);
  await page.locator("#play").click();
  const pos = await page.locator("#progress").inputValue();
  await page.waitForTimeout(500);
  expect(await page.locator("#progress").inputValue()).toBe(pos);
  await page.locator("#reset").click();
  await expect(page.locator("#progress")).toHaveValue("0");
  await page.locator("#custom-toggle").click();
  await page.locator("#custom-input").fill("2, -1, 0, 2");
  await page.locator("#apply").click();
  await page.locator("#custom-input").fill("2x, 3");
  await page.locator("#apply").click();
  await expect(page.locator("#error")).toContainText("whole numbers");
  await page
    .locator("#progress")
    .fill(await page.locator("#progress").getAttribute("max"));
  await expect(
    page.locator(".pill").filter({ hasText: "Completed" }),
  ).toBeVisible();
  expect(await page.locator(".bar-value").allTextContents()).toEqual([
    "-1",
    "0",
    "2",
    "2",
  ]);
  await page.locator('[data-mode="compare"]').click();
  await expect(page.locator(".visual-card")).toHaveCount(2);
  await page
    .locator("#progress")
    .fill(await page.locator("#progress").getAttribute("max"));
  await expect(
    page.locator(".pill").filter({ hasText: "Completed" }),
  ).toHaveCount(2);
  expect(errors).toEqual([]);
});
test("structures, keyboard, desktop and mobile", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.locator(".workspace").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#progress")).toHaveValue("1");
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#progress")).toHaveValue("0");
  await page.locator(".workspace").blur();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-desktop.png`,
    fullPage: true,
  });
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
    for (
      let i = 0;
      i < 100 && !(await page.locator("#ds-next").isDisabled());
      i++
    )
      await page.locator("#ds-next").click();
    await expect(page.locator("#ds-next")).toBeDisabled();
    await page.locator("#ds-reset").click();
    await expect(page.locator("#ds-prev")).toBeDisabled();
  }
  await page.setViewportSize({ width: 360, height: 800 });
  await page.locator('[data-mode="learn"]').click();
  await page.locator("#size").fill("64");
  await page.locator("#generate").click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const mode of ["compare", "structures", "code", "learn"]) {
    await page.locator(`[data-mode="${mode}"]`).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${mode} fits a 360px viewport`,
    ).toBe(true);
  }
  await page.screenshot({
    path: `screenshots/${testInfo.project.name}-mobile.png`,
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".bar")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
  ).toBe("0s");
});
