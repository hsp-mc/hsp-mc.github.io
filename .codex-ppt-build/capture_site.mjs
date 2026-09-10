import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = "/Users/mandinu/Downloads/project/.codex-ppt-build/site-shots";
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Users/mandinu/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell",
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto("http://127.0.0.1:8000/index.html", { waitUntil: "networkidle" });

async function openSection(target) {
  await page.locator(`[data-target="${target}"]`).first().click();
  await page.locator(`#${target}`).waitFor({ state: "visible" });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
}

async function snap(name) {
  await page.screenshot({ path: path.join(outDir, name), fullPage: false });
}

await openSection("briefing");
await snap("01-overview.png");

await openSection("assembly");
await snap("02-assembly.png");

await openSection("simulator");
await page.locator("#insulation-select").selectOption("mli");
await page.locator("#sim-t0").fill("80");
await page.locator("#sim-tenv").fill("0");
await page.locator("#sim-time").fill("15");
await page.locator("#btn-run-simulation").click();
await page.waitForTimeout(500);
await snap("03-simulator-mli.png");

await openSection("telemetry");
const fullMli = [77.6, 76.6, 76.1, 75.6, 75.1, 74.5, 73.9, 73.5, 72.1, 70.6, 69.7, 68.5, 67.4, 65.8, 64.1, 62.7];
for (let minute = 0; minute < fullMli.length; minute += 1) {
  await page.locator("#log-time").fill(String(minute));
  await page.locator("#log-temp").fill(String(fullMli[minute]));
  await page.locator("#btn-log-telemetry").click();
}
await page.waitForTimeout(500);
await snap("04-telemetry-mli.png");

await openSection("questions");
await snap("05-question-sheet.png");

await openSection("study");
await snap("06-study-hub.png");

await browser.close();
console.log(`Captured website screenshots in ${outDir}`);
