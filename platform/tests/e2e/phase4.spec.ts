import { expect, test, type Page } from "@playwright/test";

/**
 * Phase 4: Ads analysis, keywords, search terms and the approval workflow.
 * Runs after phase1/phase2 (same database) and uses the DriveLab client,
 * which has no Google Ads data until this file imports some.
 */
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "owner@leadpath.test", password: "correct horse battery" };
const VIEWER = { email: "viewer@leadpath.test", password: "viewer password 1" };
const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};

// Period reports covering "last 30 days" (ends yesterday, Johannesburg time).
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
const day = (offset: number) => new Date(Date.parse(`${today}T00:00:00Z`) - offset * 86_400_000).toISOString().slice(0, 10);
const period = `"${day(30)} - ${day(1)}"`;

const CAMPAIGNS = `Campaign report\n${period}\nCampaign,Campaign status,Currency code,Cost,Impr.,Clicks,Conversions
Lessons - Sandton,Enabled,ZAR,"2,520.00",7500,300,12
Lessons - Randburg,Enabled,ZAR,"1,780.00",3000,120,2
Truck licence,Enabled,ZAR,"1,500.00",2250,90,0
Total: Account,,,"5,800.00",12750,510,14\n`;

const KEYWORDS = `Search keyword report\n${period}\nSearch keyword,Match type,Status,Campaign,Ad group,Max. CPC,Quality Score,Cost,Impr.,Clicks,Conversions
driving lessons sandton,Exact match,Enabled,Lessons - Sandton,Sandton,12.00,8,900.00,2000,90,5
driving school,Broad match,Enabled,Lessons - Randburg,Randburg,10.00,4,700.00,3000,60,0\n`;

const SEARCH_TERMS = `Search terms report\n${period}\nSearch term,Match type,Added/Excluded,Campaign,Ad group,Keyword,Cost,Impr.,Clicks,Conversions
driving school jobs,Broad match,None,Lessons - Randburg,Randburg,driving school,250.00,300,12,0
driving lessons near me sandton,Phrase match,None,Lessons - Sandton,Sandton,driving lessons sandton,300.00,400,25,4
free driving lessons,Broad match,None,Lessons - Randburg,Randburg,driving school,150.00,200,9,0\n`;

async function login(page: Page, who = ADMIN) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("Active client").selectOption({ label: "DriveLab" });
  await page.waitForLoadState("networkidle");
}

async function upload(page: Page, name: string, csv: string, expected: RegExp) {
  await page.goto("/ads/import");
  await expect(page.getByText("Into DriveLab")).toBeVisible();
  await page.getByLabel("Google Ads report (.csv)").setInputFiles({ name, mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.getByRole("button", { name: "Import report" }).click();
  await expect(page.getByText(expected)).toBeVisible();
}

test("import campaigns, keywords and search terms reports", async ({ page }) => {
  await login(page);
  await upload(page, "drivelab-campaigns.csv", CAMPAIGNS, /Imported 3 campaigns/);
  await upload(page, "drivelab-keywords.csv", KEYWORDS, /Imported 2 keywords/);
  await upload(page, "drivelab-search-terms.csv", SEARCH_TERMS, /Imported 3 search terms/);
  await page.goto("/ads");
  await expect(page.getByText(/^Keywords · /)).toBeVisible();
  await expect(page.getByText(/^Search terms · /)).toBeVisible();
});

test("analysis explains each recommendation with real numbers", async ({ page }) => {
  await login(page);
  await page.goto("/ads/analysis");
  await expect(page.getByText("Nothing changes in Google Ads automatically.")).toBeVisible();

  const realloc = page.getByRole("article", { name: "Move budget: Lessons - Randburg → Lessons - Sandton" });
  await expect(realloc).toContainText(
    "Lessons - Sandton generated 12 conversions at R210.00 each while Lessons - Randburg generated 2 at R890.00 each. Consider reallocating budget from Lessons - Randburg to Lessons - Sandton.",
  );
  await expect(page.getByRole("article", { name: "Spend with no conversions: Truck licence" })).toContainText("Spent R1,500.00 on 90 clicks with no conversions");
  await expect(page.getByRole("article", { name: "Keyword spending with no conversions: driving school" })).toContainText("R700.00");
  await expect(page.getByRole("article", { name: "Strong campaign: Lessons - Sandton" })).toBeVisible();
  await expect(page.getByRole("article", { name: 'Negative keyword: "jobs"' })).toContainText("looking for work");
  await expect(page.getByRole("article", { name: 'Negative keyword: "free"' })).toBeVisible();
  await expect(page.getByRole("article", { name: "Add as keyword: driving lessons near me sandton" })).toContainText("converted 4 times");
  await shot(page, "20-ads-analysis");
});

test("approve, mark done, dismiss and undo", async ({ page }) => {
  await login(page);
  await page.goto("/ads/analysis");
  const jobs = page.getByRole("article", { name: 'Negative keyword: "jobs"' });
  await jobs.getByRole("button", { name: "Approve" }).first().click();
  const todo = page.locator("div.rounded-xl").filter({ has: page.getByRole("heading", { name: /^To do in Google Ads/ }) });
  await expect(todo.getByRole("article", { name: 'Negative keyword: "jobs"' })).toContainText("Approved — to do");

  await page.getByRole("article", { name: 'Negative keyword: "free"' }).getByRole("button", { name: "Approve" }).click();
  await expect(todo.getByRole("button", { name: "Copy 2 negative keywords" })).toBeVisible();

  await page.getByRole("article", { name: "Spend with no conversions: Truck licence" }).getByRole("button", { name: "Dismiss" }).click();
  await expect(page.getByText("Done (0) · Dismissed (1)")).toBeVisible();

  await todo.getByRole("article", { name: 'Negative keyword: "free"' }).getByRole("button", { name: "Mark done in Google Ads" }).click();
  await expect(page.getByText("Done (1) · Dismissed (1)")).toBeVisible();

  // Decisions survive a reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "To do in Google Ads (1)" })).toBeVisible();
  await shot(page, "21-ads-analysis-decided");

  // Undo the dismissal.
  await page.getByText("Done (1) · Dismissed (1)").click();
  await page.getByRole("article", { name: "Spend with no conversions: Truck licence" }).getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Done (1) · Dismissed (0)")).toBeVisible();
});

test("keywords page: table, match-type filter and negative keyword list", async ({ page }) => {
  await login(page);
  await page.goto("/ads/keywords");
  const table = page.getByRole("table");
  await expect(table.getByRole("row")).toHaveCount(3);
  await expect(table.getByRole("row", { name: /driving lessons sandton/ })).toContainText("Winner");
  await expect(table.getByRole("row", { name: /driving school/ }).first()).toContainText("Check");
  await page.getByRole("group", { name: "Match type" }).getByRole("link", { name: "exact" }).click();
  await expect(table.getByRole("row")).toHaveCount(2);

  const negs = page.getByRole("region", { name: "Negative keywords" });
  await expect(negs.getByText('"jobs"', { exact: true })).toBeVisible();
  await expect(negs.getByText("Approved — to add")).toBeVisible();
  await expect(negs.getByText("Added in Google Ads")).toBeVisible();
  await expect(negs.getByRole("button", { name: "Copy 2 approved" })).toBeVisible();
  await shot(page, "22-ads-keywords");
});

test("search terms page flags what to block and what to add", async ({ page }) => {
  await login(page);
  await page.goto("/ads/search-terms");
  const table = page.getByRole("table");
  await expect(table.getByRole("row", { name: /driving school jobs/ })).toContainText('Negative: "jobs"');
  await expect(table.getByRole("row", { name: /free driving lessons/ })).toContainText('Negative: "free"');
  await expect(table.getByRole("row", { name: /driving lessons near me sandton/ })).toContainText("Add as keyword");
  await shot(page, "23-ads-search-terms");
});

test("a range without keyword data points to the imported period", async ({ page }) => {
  await login(page);
  await page.goto("/ads/keywords?range=last_7");
  await expect(page.getByText("No keyword data falls inside this date range")).toBeVisible();
  await page.getByRole("note").getByRole("link").first().click();
  await expect(page.getByRole("table")).toBeVisible();
});

test("viewers see recommendations but can't approve", async ({ page }) => {
  await login(page, VIEWER);
  await page.goto("/ads/analysis");
  await expect(page.getByRole("article", { name: /Move budget/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Dismiss" })).toHaveCount(0);
});

test("mobile: analysis and keyword pages fit the screen", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page);
  for (const path of ["/ads/analysis", "/ads/keywords", "/ads/search-terms"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), path).toBe(false);
  }
  await page.goto("/ads/analysis");
  await shot(page, "24-mobile-analysis");
});
