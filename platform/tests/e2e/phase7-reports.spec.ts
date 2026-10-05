import { expect, test, type Page } from "@playwright/test";

/**
 * Client reports. Runs after earlier phases: WeatherGuard has 60 days of
 * Google Ads data ending yesterday (R5,835 in the last 30) and three leads
 * from yesterday — two won (R12,000 + R4,500), two from Google Ads.
 */
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "owner@leadpath.test", password: "reset from page 1" };
const VIEWER = { email: "viewer@leadpath.test", password: "viewer password 1" };
const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};
let shareUrl = "";

async function login(page: Page, who = ADMIN) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("Active client").selectOption({ label: "WeatherGuard Waterproofing SA" });
  await page.waitForLoadState("networkidle");
}
const tile = (page: Page, label: string) => page.locator("div.rounded-xl").filter({ has: page.getByText(label, { exact: true }) }).first();

test("create a report with the period's real numbers", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Reports", exact: true }).click();
  await expect(page.getByText("No reports yet.")).toBeVisible();
  await page.getByLabel("Period").selectOption({ label: "Last 30 days" });
  await page.getByRole("button", { name: "Create report" }).click();

  const report = page.getByRole("article");
  await expect(report.getByRole("heading", { name: "WeatherGuard Waterproofing SA" })).toBeVisible();
  await expect(tile(page, "Enquiries (leads)")).toContainText("3");
  await expect(tile(page, "Jobs won")).toContainText("2");
  await expect(tile(page, "Value of jobs won")).toContainText("R16,500.00");
  await expect(tile(page, "Google Ads spend")).toContainText("R5,835.00");
  await expect(tile(page, "Google Ads spend")).toContainText("Up 18% vs previous 30 days");
  await expect(tile(page, "Cost per lead (Google Ads)")).toContainText("R2,917.50");
  await expect(report.getByRole("table")).toContainText("Waterproofing - Johannesburg");
  // Never personal details.
  await expect(report).not.toContainText("Thabo");
  await expect(report).not.toContainText("082");
});

test("summary, share link without login, and turning the link off", async ({ page, browser }) => {
  await login(page);
  await page.goto("/reports");
  await page.getByRole("link", { name: /–/ }).first().click();
  await page.getByLabel("Your summary for the client").fill("A strong month: two jobs won from Google Ads.\nNext: more budget for Johannesburg.");
  await page.getByRole("button", { name: "Save summary" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await expect(page.getByRole("region", { name: "Summary" })).toContainText("A strong month");

  await page.getByRole("button", { name: "Create share link" }).click();
  shareUrl = (await page.getByLabel("Share link").textContent())!.trim();
  expect(shareUrl).toMatch(/\/r\/[A-Za-z0-9_-]{30,}$/);
  await expect(page.getByRole("button", { name: "Save as PDF / print" })).toBeVisible();
  await shot(page, "50-report-agency");

  // A fresh browser with no login can read it.
  const guest = await browser.newPage();
  await guest.goto(new URL(shareUrl).pathname);
  await expect(guest.getByRole("heading", { name: "WeatherGuard Waterproofing SA" })).toBeVisible();
  await expect(guest.getByRole("region", { name: "Summary" })).toContainText("two jobs won");
  await expect(guest.getByRole("button", { name: "Create share link" })).toHaveCount(0);
  await expect(guest.getByText("Sign out")).toHaveCount(0);
  await shot(guest, "51-report-shared");

  await page.getByRole("button", { name: "Turn off share link" }).click();
  await expect(page.getByRole("button", { name: "Create share link" })).toBeVisible();
  await guest.reload();
  await expect(guest.getByText("This report isn't available")).toBeVisible();
  await guest.close();
});

test("the reports list stays private", async ({ browser }) => {
  const guest = await browser.newPage();
  await guest.goto("/reports");
  await expect(guest).toHaveURL(/\/login$/);
  await guest.goto("/r/not-a-real-token-at-all-xxxxxxxx");
  await expect(guest.getByText("This report isn't available")).toBeVisible();
  await guest.close();
});

test("viewers can read reports but not create or share", async ({ page }) => {
  await login(page, VIEWER);
  await page.goto("/reports");
  await expect(page.getByRole("button", { name: "Create report" })).toHaveCount(0);
  await page.getByRole("link", { name: /–/ }).first().click();
  await expect(page.getByRole("article")).toContainText("R16,500.00");
  await expect(page.getByRole("button", { name: "Create share link" })).toHaveCount(0);
});

test("print view hides the app around the report", async ({ page }) => {
  await login(page);
  await page.goto("/reports");
  await page.getByRole("link", { name: /–/ }).first().click();
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("navigation", { name: "Main" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Refresh numbers" })).toBeHidden();
  await expect(page.getByRole("article")).toBeVisible();
});

test("mobile: report fits the screen", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page);
  await page.goto("/reports");
  await page.getByRole("link", { name: /–/ }).first().click();
  await expect(page.getByRole("article")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await shot(page, "52-mobile-report");
});
