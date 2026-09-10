import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const root='/Users/mandinu/Downloads/project';
const outDir=path.join(root,'tmp/report_build/katex_equations');
fs.mkdirSync(outDir,{recursive:true});
const equations={
  heat_capacity:String.raw`Q = m c_p \Delta T`,
  energy_balance:String.raw`m c_p\frac{dT}{dt}=-hA\left(T-T_{\mathrm{env}}\right)`,
  cooling_solution:String.raw`T(t)=T_{\mathrm{env}}+\left(T_0-T_{\mathrm{env}}\right)e^{-kt}`,
  cooling_constant:String.raw`k=\frac{hA}{m c_p}`,
  conduction:String.raw`R_{\mathrm{cond}}=\frac{L}{\lambda A}`,
  radiation:String.raw`\dot Q_{\mathrm{rad}}=\varepsilon\sigma A\left(T_s^4-T_{\mathrm{sur}}^4\right)`,
  normalised:String.raw`\theta(t)=\frac{T(t)-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}`,
  fitted_k:String.raw`k=-\frac{1}{t}\ln\!\left(\frac{T(t)-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}\right)`,
  residual:String.raw`r_i=T_{\mathrm{measured},i}-T_{\mathrm{model},i}`,
  mae:String.raw`\mathrm{MAE}=\frac{1}{n}\sum_{i=1}^{n}\left|r_i\right|`,
  retained:String.raw`\eta_T=\frac{T_{15}-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}\times100\%`
};
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1800,height:600},deviceScaleFactor:2});
for(const [name,tex] of Object.entries(equations)){
  await page.setContent(`<!doctype html><html><head><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script><style>html,body{margin:0;background:transparent}.eq{display:inline-block;padding:14px 24px;color:#111;font-size:34px}</style></head><body><div id="eq" class="eq"></div><script>katex.render(${JSON.stringify(tex)},document.getElementById('eq'),{displayMode:true,throwOnError:true});</script></body></html>`,{waitUntil:'networkidle'});
  const el=page.locator('#eq');
  await el.screenshot({path:path.join(outDir,name+'.png'),omitBackground:true});
}
await browser.close();
console.log(outDir);
