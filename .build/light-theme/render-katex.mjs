import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const outputDir = "/Users/mandinu/Downloads/project/.build/light-theme/katex";
await fs.mkdir(outputDir, { recursive: true });

const formulas = [
  {
    name: "residual",
    tex: String.raw`\mathrm{Residual}_i = T_{\mathrm{meas},i} - T_{\mathrm{model},i}`,
    width: 1166,
    height: 280,
    fontSize: 54,
  },
  {
    name: "mae",
    tex: String.raw`\mathrm{MAE} = \frac{1}{n}\sum_{i=1}^{n}\left|\mathrm{Residual}_i\right|`,
    width: 808,
    height: 352,
    fontSize: 52,
  },
  {
    name: "cooling-constant",
    tex: String.raw`k = -\frac{1}{t}\ln\!\left(\frac{T(t)-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}\right)`,
    width: 901,
    height: 352,
    fontSize: 50,
  },
  {
    name: "heat-retained",
    tex: String.raw`\mathrm{Heat\ retained} = \frac{T_t-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}\times 100\%`,
    width: 1194,
    height: 328,
    fontSize: 50,
  },
];

const browser = await chromium.launch({
  headless: true,
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
const page = await browser.newPage({ viewport: { width: 1400, height: 500 }, deviceScaleFactor: 1 });
await page.setContent("<!doctype html><html><head></head><body></body></html>");
await page.addStyleTag({ url: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" });
await page.addScriptTag({ url: "https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" });

for (const formula of formulas) {
  await page.evaluate(({ tex, width, height, fontSize }) => {
    document.body.innerHTML = "";
    document.body.style.margin = "0";
    document.body.style.background = "transparent";
    const canvas = document.createElement("div");
    canvas.id = "formula";
    Object.assign(canvas.style, {
      width: `${width}px`,
      height: `${height}px`,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#10253F",
      fontSize: `${fontSize}px`,
      background: "transparent",
      boxSizing: "border-box",
      padding: "18px",
    });
    document.body.appendChild(canvas);
    window.katex.render(tex, canvas, { displayMode: true, throwOnError: true, strict: "error" });
  }, formula);
  await page.locator("#formula").screenshot({
    path: path.join(outputDir, `${formula.name}.png`),
    omitBackground: true,
  });
}

await browser.close();
console.log(formulas.map(({ name }) => path.join(outputDir, `${name}.png`)).join("\n"));
