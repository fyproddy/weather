import { expect, test, type Page } from "@playwright/test";

/**
 * Leads tracker. Runs after phase1/2/4 (same database): WeatherGuard has
 * 60 days of Google Ads data ending yesterday (R5,835 spend in the last 30),
 * and the admin password was last reset to "reset from page 1" in phase 4.
 */
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "owner@leadpath.test", password: "reset from page 1" };
const VIEWER = { email: "viewer@leadpath.test", password: "viewer password 1" };
const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};
const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Johannesburg" }).format(new Date());
const yesterday = new Date(Date.parse(`${today}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);

async function login(page: Page, who = ADMIN) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("Active client").selectOption({ label: "WeatherGuard Waterproofing SA" });
  await page.waitForLoadState("networkidle");
}

async function addLead(page: Page, l: { name: string; phone?: string; channel: string; source: string; service?: string; date?: string; status?: string; value?: string }) {
  await page.goto("/leads/new");
  await page.getByLabel("Name *").fill(l.name);
  if (l.date) await page.getByLabel("Date received").fill(l.date);
  if (l.phone) await page.getByLabel("Phone").fill(l.phone);
  await page.getByLabel("How did they contact you?").selectOption({ label: l.channel });
  await page.getByLabel("Where did they find the business?").selectOption({ label: l.source });
  if (l.service) await page.getByLabel("Service wanted").fill(l.service);
  if (l.status) await page.getByLabel("Status", { exact: true }).selectOption({ label: l.status });
  if (l.value) await page.getByLabel("Job value (R)").fill(l.value);
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByText("Lead added.")).toBeVisible();
}

test("empty leads page explains what to do", async ({ page }) => {
  await login(page);
  await page.getByRole("link", { name: "Leads", exact: true }).click();
  await expect(page.getByText("No leads in this period")).toBeVisible();
});

test("log leads and see them, including one received today", async ({ page }) => {
  await login(page);
  await addLead(page, { name: "Thabo Mokoena", phone: "082 555 1234", channel: "Phone call", source: "Google Ads", service: "Roof repairs & restoration", date: yesterday });
  await addLead(page, { name: "Lerato Dlamini", phone: "071 222 3333", channel: "WhatsApp", source: "Google Maps", date: yesterday });
  await addLead(page, { name: "Sipho Nkosi", channel: "Website form", source: "Google Ads", status: "Won", value: "4500", date: yesterday });
  await addLead(page, { name: "Today Caller", channel: "Phone call", source: "Referral / word of mouth" });

  const list = page.getByRole("list", { name: "Leads" });
  await expect(list.getByRole("listitem")).toHaveCount(4); // default range includes today
  const thabo = list.getByRole("listitem").filter({ hasText: "Thabo Mokoena" });
  await expect(thabo.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:0825551234");
  await expect(thabo.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/27825551234");
  await expect(thabo).toContainText("Roof repairs & restoration");
  await shot(page, "30-leads");
});

test("validation keeps what was typed", async ({ page }) => {
  await login(page);
  await page.goto("/leads/new");
  await page.getByLabel("Phone").fill("not a phone");
  await page.getByLabel("Name *").fill("Keep Me");
  await page.locator("form", { has: page.getByLabel("Name *") }).evaluate((f) => f.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: "Add lead" }).click();
  await expect(page.getByText("Enter a valid phone number")).toBeVisible();
  await expect(page.getByLabel("Name *")).toHaveValue("Keep Me");
});

test("stats and Google Ads cost per lead over a fully covered range", async ({ page }) => {
  await login(page);
  await page.goto("/leads?range=last_30");
  const tile = (label: string) => page.locator("div.rounded-xl").filter({ has: page.getByText(label, { exact: true }) }).first();
  await expect(tile("Leads")).toContainText("3");
  await expect(tile("Won")).toContainText("1");
  await expect(tile("Revenue won")).toContainText("R4,500.00");
  await expect(tile("Leads from Google Ads")).toContainText("2");
  await expect(tile("Google Ads cost per lead")).toContainText("R2,917.50"); // R5,835 ÷ 2
  await expect(tile("Google Ads cost per lead")).toContainText("R5,835.00 spend ÷ 2 leads");

  // The default range includes today, which ad data never covers — so no cost per lead there.
  await page.goto("/leads");
  await expect(tile("Google Ads cost per lead")).toContainText("Google Ads data never covers today");
});

test("change status inline, filter, and edit", async ({ page }) => {
  await login(page);
  await page.goto("/leads");
  const thabo = page.getByRole("listitem").filter({ hasText: "Thabo Mokoena" });
  await thabo.getByLabel("Lead status").selectOption({ label: "Quoted" });
  await page.waitForLoadState("networkidle");
  await page.getByRole("group", { name: "Filter by status" }).getByRole("link", { name: "Quoted" }).click();
  await expect(page.getByRole("list", { name: "Leads" }).getByRole("listitem")).toHaveCount(1);

  await page.getByRole("link", { name: "Edit Thabo Mokoena" }).click();
  await expect(page.getByRole("heading", { name: "Edit lead: Thabo Mokoena" })).toBeVisible();
  await page.getByLabel("Status", { exact: true }).selectOption({ label: "Won" });
  await page.getByLabel("Job value (R)").fill("12000");
  await page.getByRole("button", { name: "Save lead" }).click();
  await expect(page.getByRole("heading", { name: "Leads", exact: true })).toBeVisible();
  await page.goto("/leads?range=last_30");
  await expect(page.locator("div.rounded-xl").filter({ has: page.getByText("Revenue won", { exact: true }) }).first()).toContainText("R16,500.00");
});

test("dashboard shows leads per client", async ({ page }) => {
  await login(page);
  await page.goto("/?range=last_30");
  const wg = page.locator("div.rounded-xl").filter({ has: page.getByRole("link", { name: "WeatherGuard Waterproofing SA" }) });
  await expect(wg).toContainText("Ads cost per lead");
  await expect(wg).toContainText("R2,917.50");
  await shot(page, "31-dashboard-leads");
});

test("viewers can see leads but not add or change them", async ({ page }) => {
  await login(page, VIEWER);
  await page.goto("/leads");
  await expect(page.getByText("Lerato Dlamini")).toBeVisible();
  await expect(page.getByRole("link", { name: "Add lead" })).toHaveCount(0);
  await expect(page.getByLabel("Lead status").first()).toBeDisabled();
  await page.goto("/leads/new");
  await expect(page).toHaveURL(/\/leads$/);
});

test("delete a lead", async ({ page }) => {
  await login(page);
  await page.goto("/leads");
  await page.getByRole("link", { name: "Edit Today Caller" }).click();
  await expect(page.getByRole("heading", { name: "Edit lead: Today Caller" })).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete lead" }).click();
  await expect(page.getByRole("heading", { name: "Leads", exact: true })).toBeVisible();
  await expect(page.getByText("Today Caller")).toHaveCount(0);
});

test("mobile: leads pages fit the screen", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page);
  for (const path of ["/leads", "/leads/new"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), path).toBe(false);
  }
  await page.goto("/leads");
  await shot(page, "32-mobile-leads");
});
