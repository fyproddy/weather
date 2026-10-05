import { expect, test, type Page } from "@playwright/test";

/**
 * AI ad writer, against the stand-in Anthropic API (tests/e2e/mock-anthropic.mjs).
 * Runs after the earlier phases: WeatherGuard has services, areas
 * (Johannesburg, Gauteng) and one verified fact ("Free on-site inspection and quote").
 */
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "owner@leadpath.test", password: "reset from page 1" };
const VIEWER = { email: "viewer@leadpath.test", password: "viewer password 1" };
const SHOTS = process.env.SCREENSHOT_DIR;
const shot = async (page: Page, name: string) => {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
};

async function login(page: Page, who = ADMIN) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await page.getByLabel("Active client").selectOption({ label: "WeatherGuard Waterproofing SA" });
  await page.waitForLoadState("networkidle");
}

const line = (page: Page, text: string) => page.getByRole("listitem", { name: new RegExp(`: ${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) });

test("ad writer page shows the facts the AI may use", async ({ page }) => {
  await login(page);
  await page.goto("/ads");
  await page.getByRole("navigation", { name: "Google Ads" }).getByRole("link", { name: "Ad writer" }).click();
  await expect(page.getByText("Nothing is published to Google Ads.")).toBeVisible();
  await expect(page.getByText("Verified facts the AI may use (1)")).toBeVisible();
  await expect(page.getByText("Free on-site inspection and quote")).toBeVisible();
});

test("an API problem is explained, not shown as a crash", async ({ page }) => {
  await login(page);
  await page.goto("/ads/creative");
  await page.getByLabel("Anything else? (optional)").fill("trigger-auth-error");
  await page.getByRole("button", { name: "Write ads" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "The Anthropic API key was rejected" })).toBeVisible();
  await expect(page.getByLabel("Anything else? (optional)")).toHaveValue("trigger-auth-error");
});

test("generate ads: only verified facts are sent; every line is checked", async ({ page, request }) => {
  await login(page);
  await page.goto("/ads/creative");
  await page.getByLabel("What is this ad about?").selectOption({ label: "Roof repairs & restoration" });
  await page.getByLabel("Anything else? (optional)").fill("Homeowners, friendly tone");
  await page.getByRole("button", { name: "Write ads" }).click();
  await expect(page.getByRole("heading", { name: "Ads: Roof repairs & restoration" })).toBeVisible();

  // What was sent to the AI.
  const sent = await (await request.get("http://localhost:3199/last")).json();
  expect(sent.body.model).toBe("claude-opus-5-5");
  expect(sent.body.fallbacks).toBe("default");
  expect(sent.headers["anthropic-beta"]).toContain("server-side-fallback-2026-07-01");
  expect(sent.body.output_config.format.type).toBe("json_schema");
  const prompt = sent.body.messages[0].content as string;
  expect(prompt).toContain("F1: Free on-site inspection and quote");
  expect(prompt).toContain("Focus for this ad: Roof repairs & restoration");
  expect(prompt).toContain("Homeowners, friendly tone");

  await expect(page.getByText("Notes from the AI:")).toBeVisible();
  await expect(line(page, "Roof Repairs Johannesburg")).toContainText("Ready to approve");
  await expect(line(page, "Free Roof Inspection")).toContainText("Ready to approve");
  await expect(line(page, "Best Roofers in Pretoria")).toContainText("superlative claim");
  await expect(line(page, "Best Roofers in Pretoria")).toContainText(`"Pretoria" isn't one of the client's areas`);
  await expect(line(page, "Waterproofing Specialists Johannesburg")).toContainText("Too long: 38/30");
  const priceLine = line(page, "Roof repairs from R999 with a 10 year guarantee.");
  await expect(priceLine).toContainText(`Number "999" isn't in the verified facts`);
  await expect(priceLine).toContainText("guarantee claim");
  await expect(priceLine.getByRole("button", { name: "Approve" })).toBeDisabled();
  await shot(page, "40-ad-writer-review");
});

test("edit, approve, reject and copy", async ({ page }) => {
  await login(page);
  await page.goto("/ads/creative");
  await page.getByRole("link", { name: /Roof repairs & restoration/ }).first().click();

  await line(page, "Roof Repairs Johannesburg").getByRole("button", { name: "Approve" }).click();
  await expect(line(page, "Roof Repairs Johannesburg")).toContainText("Approved");
  await line(page, "Free Roof Inspection").getByRole("button", { name: "Approve" }).click();
  await expect(line(page, "Free Roof Inspection")).toContainText("Approved");

  // Fix a flagged line by editing it.
  const best = line(page, "Best Roofers in Pretoria");
  await best.getByLabel("Edit headline").fill("Roof Repairs in Gauteng");
  await best.getByRole("button", { name: "Save edit" }).click();
  const fixed = line(page, "Roof Repairs in Gauteng");
  await expect(fixed).toContainText("Ready to approve");
  await expect(fixed).toContainText("AI wrote: Best Roofers in Pretoria");
  await fixed.getByRole("button", { name: "Approve" }).click();
  await expect(fixed).toContainText("Approved");

  await line(page, "Waterproofing Specialists Johannesburg").getByRole("button", { name: "Reject" }).click();
  await expect(line(page, "Waterproofing Specialists Johannesburg")).toContainText("Rejected");

  await expect(page.getByRole("heading", { name: "Headlines (3 approved of 4)" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy 3 approved" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("heading", { name: "Headlines (3 approved of 4)" })).toBeVisible();
  await shot(page, "41-ad-writer-approved");
});

test("verifying a fact on the profile lets a flagged line through", async ({ page }) => {
  await login(page);
  // "Gauteng Wide" is fine; make a callout that needs a new fact.
  await page.goto("/ads/creative");
  await page.getByRole("link", { name: /Roof repairs & restoration/ }).first().click();
  const callout = line(page, "Free Inspection");
  await expect(callout).toContainText("Ready to approve");
  const gw = line(page, "Gauteng Wide");
  await gw.getByLabel("Edit callout").fill("Same-Day Quotes");
  await gw.getByRole("button", { name: "Save edit" }).click();
  await expect(line(page, "Same-Day Quotes")).toContainText("speed / availability claim");

  // Add and verify the fact on the client profile, then come back.
  const draftUrl = page.url();
  await page.goto("/clients");
  await page.getByRole("link", { name: /WeatherGuard/ }).click();
  await page.getByLabel("Fact", { exact: true }).fill("Same-day quotes in Johannesburg");
  await page.getByRole("button", { name: "Add fact" }).click();
  await page.getByRole("listitem").filter({ hasText: "Same-day quotes in Johannesburg" }).getByRole("button", { name: "Mark verified" }).click();
  await expect(page.getByRole("listitem").filter({ hasText: "Same-day quotes in Johannesburg" }).getByText("Verified", { exact: true })).toBeVisible();

  await page.goto(draftUrl);
  await expect(line(page, "Same-Day Quotes")).toContainText("Ready to approve");
});

test("viewers can read drafts but not write or approve", async ({ page }) => {
  await login(page, VIEWER);
  await page.goto("/ads/creative");
  await expect(page.getByRole("button", { name: "Write ads" })).toHaveCount(0);
  await page.getByRole("link", { name: /Roof repairs & restoration/ }).first().click();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0);
  await expect(page.getByLabel("Edit headline")).toHaveCount(0);
});

test("mobile: review page fits the screen", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page);
  await page.goto("/ads/creative");
  await page.getByRole("link", { name: /Roof repairs & restoration/ }).first().click();
  await expect(page.getByRole("heading", { name: /Headlines/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(false);
  await shot(page, "42-mobile-ad-writer");
});
