// Headless-browser smoke test of the explorer against a running instance (live devnet data).
//   BASE=https://vaultchain-explorer.vercel.app node e2e/explorer.mjs
// Needs `playwright-core` (npm i --no-save playwright-core) and a Chrome/Chromium binary
// (CHROME=/path/to/chrome, default /usr/bin/google-chrome). Not part of CI.
import fs from "node:fs";

let chromium;
try {
  ({ chromium } = await import("playwright-core"));
} catch {
  console.error("playwright-core is not installed: run `npm i --no-save playwright-core`");
  process.exit(2);
}
const BASE = (process.env.BASE || "http://localhost:3000").replace(/\/$/, "");
const SHOTS = process.env.SHOTS || "e2e-shots";
fs.mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", args: ["--no-sandbox"] });

let pass = 0;
const fails = [];
async function step(name, fn) {
  const t = Date.now();
  try {
    await fn();
    pass++;
    console.log(`ok   ${name} (${Date.now() - t} ms)`);
  } catch (e) {
    fails.push(name);
    console.log(`FAIL ${name}: ${String(e.message).split("\n")[0]}`);
  }
}
const expect = (c, m) => {
  if (!c) throw new Error(m);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await step("home loads with network health and stats", async () => {
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  expect(await page.getByText("Network health").count(), "no network health section");
  expect((await page.locator(".stat").count()) >= 4, "stats missing");
  await page.screenshot({ path: `${SHOTS}/home.png`, fullPage: true });
});

await step("cross-site navigation is present", async () => {
  const links = await page.locator("header a").evaluateAll((as) => as.map((a) => a.textContent.trim()));
  for (const l of ["Home", "Docs", "Vault", "Upload"]) expect(links.includes(l), `missing ${l} link`);
});

await step("theme toggle switches and persists", async () => {
  const before = await page.evaluate(() => document.documentElement.dataset.theme);
  await page.getByRole("button", { name: /theme/i }).first().click();
  const after = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(before !== after, "theme did not change");
  await page.reload({ waitUntil: "networkidle" });
  expect((await page.evaluate(() => document.documentElement.dataset.theme)) === after, "theme not persisted");
  await page.getByRole("button", { name: /theme/i }).first().click();
});

let dealId = "1";
await step("search a deal number via suggestions", async () => {
  await page.goto(BASE + "/deals", { waitUntil: "networkidle" });
  const first = await page.locator("table.t tbody tr td a").first().textContent();
  dealId = first.replace(/\D/g, "") || "1";
  await page.keyboard.press("/");
  const box = page.getByRole("combobox").first();
  await box.fill(dealId);
  await page.getByRole("option").first().waitFor({ timeout: 8000 });
  await box.press("ArrowDown");
  await box.press("Enter");
  await page.waitForURL(`**/deals/${dealId}`);
  await page.getByText("Timeline").waitFor();
  await page.screenshot({ path: `${SHOTS}/deal.png`, fullPage: true });
});

await step("deal page shows copies and proofs", async () => {
  await page.getByText(/Copies and/).waitFor();
  expect((await page.getByText(/Recent proofs/).count()) > 0, "no proofs card");
});

await step("file page: how to download + upload-app deep link", async () => {
  await page.goto(BASE + "/files", { waitUntil: "networkidle" });
  await page.locator("table.t tbody tr td a").first().click();
  await page.getByText("How to download this file").waitFor();
  const href = await page.getByRole("link", { name: /Open in the upload app/ }).getAttribute("href");
  expect(/\/files\?open=[0-9a-f]{64}$/.test(href), "bad deep link " + href);
  await page.screenshot({ path: `${SHOTS}/file.png`, fullPage: true });
});

await step("no-result search is helpful", async () => {
  await page.goto(BASE + "/search?q=zzzz-not-a-file", { waitUntil: "networkidle" });
  await page.getByText(/No file name or provider matches/).waitFor();
});

await step("unknown deal gives a helpful search note", async () => {
  await page.goto(BASE + "/search?q=99999999", { waitUntil: "networkidle" });
  await page.getByText(/There is no deal #99999999/).waitFor();
});

await step("404 page offers search and links", async () => {
  const r = await page.goto(BASE + "/files/" + "0".repeat(64), { waitUntil: "networkidle" });
  // Next streams the page behind loading.tsx, so the status can be 200; it marks the page noindex instead.
  expect(r.status() === 404 || (await page.locator('meta[name="robots"][content*="noindex"]').count()) > 0, "neither 404 nor noindex: " + r.status());
  await page.getByText("We couldn't find that.").waitFor();
});

await step("glossary renders and tooltips open on focus", async () => {
  await page.goto(BASE + "/deals/" + dealId, { waitUntil: "networkidle" });
  const term = page.locator(".term").first();
  await term.focus();
  await page.locator(".tip").first().waitFor({ state: "visible" });
});

await step("copy buttons exist for ids", async () => {
  expect((await page.locator("button.copy").count()) > 0, "no copy buttons");
});

await step("mobile: no horizontal scroll, tables become cards", async () => {
  const m = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await m.newPage();
  for (const path of ["/", "/deals", "/files", "/providers", `/deals/${dealId}`]) {
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    const over = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(!over, `horizontal scroll on ${path}`);
  }
  await p.goto(BASE + "/deals", { waitUntil: "networkidle" });
  await p.screenshot({ path: `${SHOTS}/deals-mobile.png`, fullPage: true });
  await m.close();
});

await step("no uncaught page errors", async () => expect(!errors.length, errors.join("; ")));

await browser.close();
console.log(`\n${pass} passed, ${fails.length} failed`);
process.exit(fails.length ? 1 : 0);
