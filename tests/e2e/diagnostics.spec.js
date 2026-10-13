import { test, expect } from "@playwright/test";
test("compiler errors in all languages, source navigation and recovery", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("/#code");
  await expect(page.locator("#runtime-check")).toContainText(
    "Runtime connected",
    { timeout: 20000 },
  );
  const programs = {
    c: "int main(void) {\n    int x = ;\n    return 0;\n}",
    cpp: "int main() {\n    int x = ;\n    return 0;\n}",
    java: "public class Main {\n public static void main(String[] args) {\n int x = ;\n }\n}",
    javascript: "const x = ;",
    python: "if True\n    print(1)",
  };
  for (const [language, code] of Object.entries(programs)) {
    await page.locator("#code-language").selectOption(language);
    await page.locator("#source-code").fill(code);
    await page.locator("#run-code").click();
    await expect(page.locator("#diagnostic-summary")).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("#diagnostic-summary strong")).toHaveText(
      ["javascript", "python"].includes(language)
        ? "Syntax error"
        : "Compilation failed",
    );
    await expect(page.locator("#compiler-error")).toContainText(/error/i);
    await expect(page.locator("#error-line")).toBeVisible();
    await page.locator("#error-line").click();
    await expect(page.locator("#source-code")).toBeFocused();
    expect(
      await page
        .locator("#source-code")
        .evaluate((e) => e.selectionEnd > e.selectionStart),
    ).toBe(true);
  }
  await page.locator("#source-code").fill("x = 0\nprint(3 / x)");
  await expect(page.locator("#diagnostic-summary")).toBeHidden();
  await page.locator("#run-code").click();
  await expect(page.locator("#diagnostic-summary")).toContainText(
    "ZeroDivisionError",
    { timeout: 30000 },
  );
  await expect(page.locator("#error-line")).toContainText("line 2");
  await expect(page.locator("#compiler-error")).toContainText("print(3 / x)");
  await page.locator("#source-code").fill("print(42)");
  await page.locator("#run-code").click();
  await expect(page.locator("#output-text")).toHaveText("42\n", {
    timeout: 30000,
  });
  await expect(page.locator("#diagnostic-summary")).toBeHidden();
  await expect(page.locator("#compiler-error")).toBeHidden();
});
