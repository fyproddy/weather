import { expect, test, type Page } from "@playwright/test";

/**
 * One story through Phase 1, in order: first-run setup → add a client →
 * fill in its profile → roles → archive. Tests share state and run serially.
 */
test.describe.configure({ mode: "serial" });

const ADMIN = { email: "owner@leadpath.test", password: "correct horse battery" };
const VIEWER = { email: "viewer@leadpath.test", password: "viewer password 1" };
const SHOTS = process.env.SCREENSHOT_DIR;

async function shot(page: Page, name: string) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(who.email);
  await page.getByLabel("Password").fill(who.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("signed-out visitors are sent to setup on a fresh install", async ({ page }) => {
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/setup$/);
});

test("first-run setup creates the agency and signs in", async ({ page }) => {
  await page.goto("/setup");
  await shot(page, "01-setup");
  await page.getByLabel("Agency name").fill("LeadPath Digital");
  await page.getByLabel("Your name").fill("Roddy");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Create agency" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("No clients yet")).toBeVisible();

  // Setup can't be run a second time.
  await page.goto("/setup");
  await expect(page).not.toHaveURL(/\/setup$/);
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill("not the password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Email or password is incorrect." })).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue(ADMIN.email);
});

test("add a client, with validation", async ({ page }) => {
  await login(page, ADMIN);
  await page.getByRole("link", { name: "Add client" }).first().click();
  await page.getByLabel("Business name *").fill("WeatherGuard Waterproofing SA");
  await page.getByLabel("Email").fill("not-an-email");
  // Bypass the browser's own email check so we exercise the server validation.
  await page.locator("form", { has: page.getByLabel("Business name *") }).evaluate((f) => f.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByText("Enter a valid email address")).toBeVisible();
  // What the user typed must survive a failed submit.
  await expect(page.getByLabel("Business name *")).toHaveValue("WeatherGuard Waterproofing SA");

  await page.getByLabel("Email").fill("");
  await page.getByLabel("Industry").fill("Waterproofing & roofing");
  await page.getByLabel("Website").fill("weatherguard.co.za");
  await page.getByLabel("Phone").fill("078 937 9763");
  await page.getByLabel("WhatsApp").fill("078 937 9763");
  await page.getByLabel("City / town").fill("Johannesburg");
  await page.getByLabel("Province / region").fill("Gauteng");
  await shot(page, "02-add-client");
  await page.getByRole("button", { name: "Add client" }).click();

  await expect(page.getByRole("heading", { name: /WeatherGuard Waterproofing SA/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "weatherguard.co.za" })).toHaveAttribute("href", "https://weatherguard.co.za");
  await expect(page.getByRole("link", { name: "078 937 9763" }).last()).toHaveAttribute("href", "https://wa.me/27789379763");
});

test("fill in services, locations, competitors and verified facts", async ({ page }) => {
  await login(page, ADMIN);
  await page.getByRole("link", { name: "WeatherGuard Waterproofing SA" }).click();

  for (const s of ["Liquid rubber waterproofing", "Roof repairs & restoration", "Damp proofing"]) {
    await page.getByLabel("Service name").fill(s);
    await page.getByLabel("Service name").press("Enter");
    await expect(page.getByText(s, { exact: true })).toBeVisible();
  }
  await expect(page.getByLabel("Service name")).toHaveValue("");

  await page.getByLabel("Target location").fill("Johannesburg");
  await page.getByLabel("Radius in km").fill("40");
  await page.getByLabel("Target location").press("Enter");
  await expect(page.getByText("40 km radius")).toBeVisible();

  await page.getByLabel("Competitor name").fill("Example Roofing Co");
  await page.getByLabel("Competitor name").press("Enter");
  await expect(page.getByText("Example Roofing Co")).toBeVisible();

  await page.getByLabel("Fact", { exact: true }).fill("Free on-site inspection and quote");
  await page.getByLabel("Where does this come from?").fill("Client website");
  await page.getByRole("button", { name: "Add fact" }).click();
  const fact = page.getByRole("listitem").filter({ hasText: "Free on-site inspection and quote" });
  await expect(fact.getByText("Not verified")).toBeVisible();
  await expect(page.getByText("0 of 1 verified")).toBeVisible();

  await fact.getByRole("button", { name: "Mark verified" }).click();
  await expect(fact.getByText("Verified", { exact: true })).toBeVisible();
  await expect(page.getByText("1 of 1 verified")).toBeVisible();

  // Remove works and survives reload.
  await page.getByRole("button", { name: "Remove Damp proofing" }).click();
  await expect(page.getByText("Damp proofing", { exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByText("Damp proofing", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Liquid rubber waterproofing")).toBeVisible();
  await shot(page, "03-client-profile");
});

test("dashboard and section pages show honest empty states", async ({ page }) => {
  await login(page, ADMIN);
  const card = page.locator("div.rounded-xl").filter({ hasText: "WeatherGuard Waterproofing SA" }).first();
  await expect(card.getByText("0/4 connected")).toBeVisible();
  await expect(card.getByText("No data yet")).toBeVisible();
  await shot(page, "04-dashboard");

  await page.getByRole("link", { name: /^Google Ads/ }).click();
  await expect(page.getByRole("heading", { name: "Google Ads" })).toBeVisible();
  await expect(page.getByText("Showing WeatherGuard Waterproofing SA")).toBeVisible();
  await expect(page.getByText("Not connected")).toBeVisible();
  await shot(page, "05-google-ads-section");

  await page.goto("/not-a-real-section");
  await expect(page.getByText("Page not found")).toBeVisible();
});

test("client switcher changes which client section pages show", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/clients/new");
  await page.getByLabel("Business name *").fill("DriveLab");
  await page.getByLabel("Industry").fill("Driving school");
  await page.getByRole("button", { name: "Add client" }).click();
  await expect(page.getByRole("heading", { name: "DriveLab" })).toBeVisible();

  await page.goto("/seo");
  await page.getByLabel("Active client").selectOption({ label: "DriveLab" });
  await expect(page.getByText("Showing DriveLab")).toBeVisible();
  await page.reload();
  await expect(page.getByText("Showing DriveLab")).toBeVisible();
});

test("admin adds a viewer; viewer can read but not change", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/settings");
  await page.getByLabel("Name", { exact: true }).fill("Assistant");
  await page.getByLabel("Email").fill(VIEWER.email);
  await page.getByLabel("Temporary password").fill(VIEWER.password);
  await page.getByLabel("Role").selectOption("viewer");
  await page.getByRole("button", { name: "Add user" }).click();
  await expect(page.getByText(`Added ${VIEWER.email}.`)).toBeVisible();
  await shot(page, "06-settings");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await login(page, VIEWER);
  await expect(page.getByRole("link", { name: "Add client" })).toHaveCount(0);
  await page.getByRole("link", { name: "WeatherGuard Waterproofing SA" }).first().click();
  await expect(page.getByText("Liquid rubber waterproofing")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit details" })).toHaveCount(0);
  await expect(page.getByLabel("Service name")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Mark verified" })).toHaveCount(0);
  await page.goto("/clients/new");
  await expect(page).toHaveURL(/\/clients$/);
});

test("archive hides a client and restore brings it back", async ({ page }) => {
  await login(page, ADMIN);
  await page.goto("/clients");
  await page.getByRole("link", { name: /DriveLab/ }).click();
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Archive" }).click();
  await expect(page.getByText("This client is archived.")).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("link", { name: "DriveLab" })).toHaveCount(0);
  await expect(page.getByLabel("Active client").locator("option", { hasText: "DriveLab" })).toHaveCount(0);
  await page.goto("/clients?status=archived");
  await page.getByRole("link", { name: /DriveLab/ }).click();
  await page.getByRole("button", { name: "Restore client" }).click();
  await expect(page.getByText("This client is archived.")).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "DriveLab" })).toBeVisible();
});

test("a signed-out visitor can't reach app pages", async ({ page }) => {
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login$/);
  await page.context().addCookies([{ name: "session", value: "forged", domain: "localhost", path: "/" }]);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login$/);
});

test("mobile layout", async ({ browser }) => {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await login(page, ADMIN);
  await page.getByRole("button", { name: "Menu" }).click();
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await shot(page, "07-mobile-menu");
  await page.getByRole("link", { name: "Clients" }).click();
  await page.getByRole("link", { name: /WeatherGuard/ }).click();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await shot(page, "08-mobile-client");
});
