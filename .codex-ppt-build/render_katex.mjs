import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const outDir = "/Users/mandinu/Downloads/project/.codex-ppt-build/katex";
await fs.mkdir(outDir, { recursive: true });

const formulas = [
  { name: "newton", tex: String.raw`T(t)=T_{\mathrm{env}}+\left(T_0-T_{\mathrm{env}}\right)e^{-kt}`, size: 36 },
  { name: "residual", tex: String.raw`\mathrm{Residual}_i=T_{\mathrm{measured},i}-T_{\mathrm{model},i}`, size: 30 },
  { name: "mae", tex: String.raw`\mathrm{MAE}=\frac{1}{n}\sum_{i=1}^{n}\left|\mathrm{Residual}_i\right|`, size: 30 },
  { name: "fitted-k", tex: String.raw`k=-\frac{1}{t}\ln\!\left(\frac{T(t)-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}\right)`, size: 29 },
  { name: "retained", tex: String.raw`\mathrm{Heat\ retained}=\frac{T_{15}-T_{\mathrm{ref}}}{T_0-T_{\mathrm{ref}}}\times100\%`, size: 27 },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Users/mandinu/Library/Caches/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-mac-arm64/chrome-headless-shell",
});
const page = await browser.newPage({ viewport: { width: 1200, height: 220 }, deviceScaleFactor: 2 });

for (const formula of formulas) {
  await page.setContent(`<!doctype html><html><head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
    <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
    <style>
      html,body{margin:0;padding:0;background:transparent;overflow:hidden}
      #eq{display:inline-block;color:#F5F8FC;font-size:${formula.size}px;line-height:1.1;padding:8px 12px}
    </style>
  </head><body><div id="eq"></div></body></html>`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.katex !== "undefined");
  await page.evaluate((tex) => window.katex.render(tex, document.getElementById("eq"), {
    displayMode: true,
    throwOnError: true,
    strict: false,
  }), formula.tex);
  await page.locator("#eq").screenshot({ path: path.join(outDir, `${formula.name}.png`), omitBackground: true });
}

await browser.close();
console.log(`Rendered ${formulas.length} KaTeX equations to ${outDir}`);
