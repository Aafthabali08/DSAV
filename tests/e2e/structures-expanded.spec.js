import { test, expect } from "@playwright/test";
test("expanded structure operations and graph edits replay current state", async ({
  page,
}) => {
  await page.goto("/#structures");
  await page.locator('[data-structure="Queue"]').click();
  await page.locator("#ds-values").fill("9,4,2");
  await page.locator("#ds-operation").selectOption("Front");
  await expect(page.locator("#ds-value")).toBeHidden();
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  await expect(page.locator("#ds-scene .action")).toContainText("Front: 9");
  await page.locator('[data-structure="Binary tree"]').click();
  await page.locator("#ds-values").fill("8,3,12,1,6,10,14");
  await page.locator("#ds-operation").selectOption("Remove");
  await page.locator("#ds-value").fill("8");
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  await expect(page.locator("#ds-scene .action")).toContainText("Removed 8");
  await expect(page.locator("#ds-scene svg line")).toHaveCount(5);
  await page.locator('[data-structure="Graph"]').click();
  await page.locator("#ds-values").fill("1,2,3");
  await page.locator("#ds-edges").fill("0-1");
  await page.locator("#ds-operation").selectOption("Add edge");
  await page.locator("#ds-index").fill("1");
  await page.locator("#ds-target").fill("2");
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  await expect(page.locator("#ds-scene svg line")).toHaveCount(2);
  await page.locator("#ds-use-result").click();
  await expect(page.locator("#ds-edges")).toHaveValue("0-1, 1-2");
  await page.locator("#ds-operation").selectOption("Depth-first search");
  await page.locator("#ds-index").fill("0");
  await page.locator("#ds-apply").click();
  await page
    .locator("#ds-scrub")
    .fill(await page.locator("#ds-scrub").getAttribute("max"));
  await expect(page.locator("#ds-scene .action")).toContainText(
    "Reached 3 of 3",
  );
});
test("Python tree edges, graph, stack and queue follow captured code", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  await page.goto("/#code");
  await expect(page.locator("#runtime-check")).toContainText(
    "Runtime connected",
    { timeout: 15000 },
  );
  await page
    .locator("#source-code")
    .fill(
      'values = list(map(int, input().split()))\nroot = {"data": values[0], "left": None, "right": None}\nroot["left"] = {"data":values[1], "left":None, "right":None}\nroot["right"] = {"data":values[2], "left":None, "right":None}\nstack = values.copy()\nqueue = values.copy()\ngraph = {"A":["B"], "B":["A","C"], "C":[]}\nstack.pop()\nqueue.pop(0)\nprint("done")',
    );
  await page.locator("#program-input").fill("8 3 12");
  await page.locator("#run-code").click();
  await expect(page.locator("#output-text")).toHaveText("done\n", {
    timeout: 30000,
  });
  await page
    .locator("#code-scrub")
    .fill(await page.locator("#code-scrub").getAttribute("max"));
  await expect(page.locator(".tree-edge")).toHaveCount(2);
  await expect(page.locator(".stack-diagram")).toContainText("TOP");
  await expect(page.locator(".stack-diagram .diagram-node")).toHaveCount(2);
  await expect(page.locator(".queue-diagram .diagram-node")).toHaveCount(2);
  await expect(page.locator(".graph-edge")).toHaveCount(3);
  await page.locator('[data-diagram="stack"]').selectOption("array");
  await expect(page.locator(".stack-diagram")).toHaveCount(0);
  await page.locator("#focus-variable").selectOption("root");
  await expect(page.locator(".tree-edge")).toHaveCount(2);
  await page.locator("#theme-toggle").click();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: `screenshots/${info.project.name}-connected-code.png`,
    fullPage: true,
  });
  await page.setViewportSize({ width: 360, height: 800 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
