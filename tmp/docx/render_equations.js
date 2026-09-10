"use strict";
const sharp = require("sharp");
const { mathjax } = require("mathjax-full/js/mathjax.js");
const { TeX } = require("mathjax-full/js/input/tex.js");
const { SVG } = require("mathjax-full/js/output/svg.js");
const { liteAdaptor } = require("mathjax-full/js/adaptors/liteAdaptor.js");
const { RegisterHTMLHandler } = require("mathjax-full/js/handlers/html.js");
const { AllPackages } = require("mathjax-full/js/input/tex/AllPackages.js");

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const html = mathjax.document("", {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: "local" }),
});

async function render(latex, outputPath) {
  let markup = adaptor.outerHTML(html.convert(latex, { display: true }));
  markup = markup.slice(markup.indexOf("<svg"), markup.indexOf("</svg>") + 6)
    .replace(/<\?xml[^>]*>/g, "")
    .replace(/<svg /, '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/currentColor/g, "#000000");
  await sharp(Buffer.from(markup), { density: 300 }).png().toFile(outputPath);
}

render(
  String.raw`\begin{aligned}T_{\mathrm{model}}(t)&=T_{\mathrm{env}}+(T_0-T_{\mathrm{env}})e^{-kt}\\r_i&=T_{\mathrm{obs},i}-T_{\mathrm{model},i}\\\mathrm{MAE}&=\frac{1}{n}\sum_{i=1}^{n}|r_i|\\k_{\mathrm{est}}&=-\frac{1}{t}\ln\!\left(\frac{T(t)-T_{\mathrm{env}}}{T_0-T_{\mathrm{env}}}\right)\end{aligned}`,
  "/Users/mandinu/Downloads/project/tmp/docx/equations.png"
).catch((error) => { console.error(error); process.exit(1); });
