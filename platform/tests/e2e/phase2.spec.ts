import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 2: Google Ads CSV import and the agency dashboard.
 * Runs after phase1.spec.ts (same database): it reuses the admin, viewer and
 * the WeatherGuard / DriveLab clients created there.
 */
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "owner@leadpath.test", password: "correct horse battery" };
const VIEWER = { email: "viewer@leadpath.test", password: "viewer password 1" };
const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "ZAR", currencyDisplay: "narrowSymbol", minimumFractionDigits: 2 }).format(n);

/** 60 days of daily data ending yesterday (Johannesburg time), oldest first. */
function buildReport() {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
  const day = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10);
  const lines = ["Campaign report", `"${day(60)} - ${day(1)}"`, "Day,Campaign,Campaign status,Currency code,Budget,Cost,Impr.,Clicks,Conversions,Search impr. share"];
  for (let i = 0; i < 60; i++) {
    const d = day(60 - i);
    lines.push(`${d},Waterproofing - Johannesburg,Enabled,ZAR,200.00,${(100 + i).toFixed(2)},1000,40,${i % 3},50.00%`);
    lines.push(`${d},Roof Repairs - Brand,Enabled,ZAR,80.00,50.00,400,20,1,< 10%`);
  }
  lines.push(`Total: Account,,,,,"9,000.00",84000,3600,120,`);
  return Buffer.from(lines.join("\n"));
}
// Last 30 days = i 30..59: (130+…+159) + 30×50 = 4,335 + 1,500
const LAST_30_SPEND = 5835;
const LAST_30_CONV = 30 + 30; // i%3 over 30 days sums to 30, plus 1/day for Brand

async function login(page: Page, who = ADMIN) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  // Each test has a fresh browser, so pick the client the Ads pages should show.
  await page.getByLabel("Active client").selectOption({ label: "WeatherGuard Waterproofing SA" });
  await page.waitForLoadState("networkidle");
}

test("Google Ads page is honest when there's no data", async ({ page }) => {
  await login(page);
  await page.goto("/ads");
  await expect(page.getByText("No Google Ads data yet")).toBeVisible();
  await expect(page.getByText("Not connected — Phase 3")).toBeVisible();
});

test("a bad file is explained, not imported", async ({ page }) => {
  await login(page);
  await page.goto("/ads/import");
  await page.getByLabel("Google Ads report (.csv)").setInputFiles({ name: "contacts.csv", mimeType: "text/csv", buffer: Buffer.from("name,email\nBob,bob@x.com\n") });
  await page.getByRole("button", { name: "Import report" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Couldn't find the column headings" })).toBeVisible();
});

test("import a 60-day daily report", async ({ page }) => {
  await login(page);
  await page.goto("/ads/import");
  await expect(page.getByText("Into WeatherGuard Waterproofing SA")).toBeVisible();
  await page.getByLabel("Google Ads report (.csv)").setInputFiles({ name: "weatherguard-campaigns.csv", mimeType: "text/csv", buffer: buildReport() });
  await page.getByRole("button", { name: "Import report" }).click();
  await expect(page.getByText(/Imported 2 campaigns for .* \(daily\)/)).toBeVisible();
  await expect(page.getByText(/search impression share reported as a range/)).toBeVisible();
  await shot(page, "10-ads-import");
});

test("report shows exact figures, fair comparison, charts and campaigns", async ({ page }) => {
  await login(page);
  await page.goto("/ads?range=last_30");
  const tile = (label: string) => page.locator("div.rounded-xl").filter({ has: page.getByText(label, { exact: true }) }).first();

  await expect(tile("Spend")).toContainText(money(LAST_30_SPEND));
  await expect(tile("Spend")).toContainText("Up 18% vs previous 30 days"); // 5,835 vs 4,935
  await expect(tile("Conversions")).toContainText(String(LAST_30_CONV));
  await expect(tile("Cost / conversion")).toContainText(money(LAST_30_SPEND / LAST_30_CONV));
  await expect(tile("Clicks")).toContainText("1,800");

  const table = page.getByRole("table").last();
  await expect(table.getByRole("row")).toHaveCount(3);
  const wp = table.getByRole("row", { name: /Waterproofing - Johannesburg/ });
  await expect(wp).toContainText(money(4335));
  await expect(wp).toContainText("50.0%");
  // "< 10%" values are unknown, so impression share is blank rather than guessed.
  await expect(table.getByRole("row", { name: /Roof Repairs - Brand/ }).getByRole("cell").last()).toHaveText("—");

  // Chart hover and its table view.
  const chart = page.getByRole("img", { name: /Spend per day/ });
  const box = (await chart.boundingBox())!;
  await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2);
  await expect(page.getByRole("status").filter({ hasText: money(209).replace(".00", "") })).toBeVisible();
  await page.getByText("Show as table").first().click();
  await expect(page.getByRole("table").first().getByRole("row")).toHaveCount(31);
  await shot(page, "11-ads-report");
});

test("a range only partly covered says so and hides comparisons", async ({ page }) => {
  await login(page);
  await page.goto("/ads?range=last_90");
  await expect(page.getByText("Imported data covers only part of this range")).toBeVisible();
  await expect(page.getByText(/vs previous 90 days/)).toHaveCount(0);
});

test("re-importing the same file doesn't double count", async ({ page }) => {
  await login(page);
  await page.goto("/ads/import");
  await page.getByLabel("Google Ads report (.csv)").setInputFiles({ name: "weatherguard-campaigns.csv", mimeType: "text/csv", buffer: buildReport() });
  await page.getByRole("button", { name: "Import report" }).click();
  await expect(page.getByText(/Imported 2 campaigns/)).toBeVisible();
  await page.goto("/ads?range=last_30");
  await expect(page.locator("div.rounded-xl").filter({ has: page.getByText("Spend", { exact: true }) }).first()).toContainText(money(LAST_30_SPEND));
  await expect(page.getByRole("listitem").filter({ hasText: "weatherguard-campaigns.csv" })).toHaveCount(1);
});

test("dashboard shows real totals per client and for the agency", async ({ page }) => {
  await login(page);
  await page.goto("/?range=last_30");
  const totals = page.getByRole("region", { name: "Agency totals" });
  await expect(totals).toContainText(money(LAST_30_SPEND));
  await expect(totals).toContainText("1 with Google Ads data in range");

  const wg = page.locator("div.rounded-xl").filter({ has: page.getByRole("link", { name: "WeatherGuard Waterproofing SA" }) });
  await expect(wg).toContainText(money(LAST_30_SPEND));
  await expect(wg).toContainText("Up 18% vs previous 30 days");
  await expect(wg.getByRole("img", { name: /daily spend/ })).toBeVisible();

  const dl = page.locator("div.rounded-xl").filter({ has: page.getByRole("link", { name: "DriveLab" }) });
  await expect(dl).toContainText("Google Ads not connected");
  await expect(dl).toContainText("No Google Ads data yet");
  await shot(page, "12-dashboard");
});

test("viewers see the report but can't import", async ({ page }) => {
  await login(page, VIEWER);
  await page.goto("/ads?range=last_30");
  await expect(page.getByText(money(LAST_30_SPEND)).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Import CSV" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Remove import/ })).toHaveCount(0);
  await page.goto("/ads/import");
  await expect(page).toHaveURL(/\/ads$/);
});

test("removing the import removes its data", async ({ page }) => {
  await login(page);
  await page.goto("/ads?range=last_30");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Remove import weatherguard-campaigns.csv" }).click();
  await expect(page.getByText("No Google Ads data yet")).toBeVisible();
});

test("mobile: dashboard and Ads page fit the screen", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page);
  await page.goto("/ads/import");
  await page.getByLabel("Google Ads report (.csv)").setInputFiles({ name: "weatherguard-campaigns.csv", mimeType: "text/csv", buffer: buildReport() });
  await page.getByRole("button", { name: "Import report" }).click();
  await expect(page.getByText(/Imported 2 campaigns/)).toBeVisible();
  for (const path of ["/?range=last_30", "/ads?range=last_30"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  }
  await shot(page, "13-mobile-ads");
});
