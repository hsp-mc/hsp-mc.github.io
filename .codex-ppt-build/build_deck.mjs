import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/mandinu/Downloads/project";
const buildDir = path.join(workspaceDir, ".codex-ppt-build");
const outputDir = path.join(workspaceDir, "output/presentation");
const finalPath = path.join(outputDir, "SPHERE_Final_Day_Presentation_KaTeX.pptx");
const skillDir = "/Users/mandinu/.codex/plugins/cache/openai-primary-runtime/presentations/26.905.11957/skills/presentations";
const pythonExecutable = "/Users/mandinu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";

const { resolvePresentationFont, applyPresentationChartFont, finalizePresentation } = await import(
  pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href,
);
const font = resolvePresentationFont({ fontFamily: "Avenir Next" });

const W = 1280;
const H = 720;
const C = {
  bg: "#071225",
  bg2: "#0C1B33",
  panel: "#112744",
  panel2: "#153353",
  cyan: "#22B8F0",
  cyan2: "#79D8F7",
  orange: "#F59E0B",
  green: "#21C98A",
  red: "#F05252",
  white: "#F5F8FC",
  text: "#D8E4F2",
  muted: "#90A5BC",
  grid: "#294564",
};

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

async function bytes(rel) {
  return fs.readFile(path.join(workspaceDir, rel));
}

function mime(rel) {
  const e = path.extname(rel).toLowerCase();
  return e === ".jpg" || e === ".jpeg" ? "image/jpeg" : "image/png";
}

function rect(slide, x, y, w, h, fill, radius = 0, line = "none") {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left: x, top: y, width: w, height: h },
    fill: { type: "solid", color: fill },
    line: line === "none" ? { fill: "none", width: 0 } : { style: "solid", fill: line, width: 1 },
  });
}

function text(slide, value, x, y, w, h, opts = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { fill: "none", width: 0 },
  });
  shape.text = value;
  shape.text.style = {
    typeface: font,
    fontSize: opts.size ?? 22,
    bold: opts.bold ?? false,
    color: opts.color ?? C.text,
    autoFit: opts.autoFit ?? "shrinkText",
    ...(opts.italic ? { italic: true } : {}),
  };
  if (opts.align) shape.text.paragraphFormat = { alignment: opts.align };
  return shape;
}

function line(slide, x, y, w, color = C.grid, height = 2) {
  rect(slide, x, y, w, height, color);
}

function baseSlide(title, number, section = "FINAL PRESENTATION", footer = true) {
  const slide = presentation.slides.add();
  slide.background.fill = C.bg;
  text(slide, section, 52, 25, 320, 20, { size: 13, bold: true, color: C.cyan });
  text(slide, title, 52, 48, 1120, 58, { size: 38, bold: true, color: C.white });
  line(slide, 52, 112, 1176, C.grid, 1);
  if (footer) {
    text(slide, "SPHERE THERMAL INSULATION LABORATORY", 52, 690, 480, 16, { size: 11, color: C.muted });
    text(slide, String(number).padStart(2, "0"), 1180, 688, 48, 18, { size: 12, bold: true, color: C.cyan, align: "right" });
  }
  return slide;
}

async function image(slide, rel, x, y, w, h, fit = "cover", crop) {
  const cfg = {
    blob: await bytes(rel), contentType: mime(rel), alt: path.basename(rel), fit,
    position: { left: x, top: y, width: w, height: h }, geometry: "roundRect", borderRadius: 12,
  };
  if (crop) cfg.crop = crop;
  return slide.images.add(cfg);
}

function notes(slide, duration, body, sourceLines = []) {
  const noteText = [
    `Suggested timing: ${duration}`,
    "",
    body,
    "",
    "Handoff cue: Pause for the next speaker or section when the final point lands.",
    ...(sourceLines.length ? ["", "Sources:", ...sourceLines.map((s) => `- ${s}`)] : []),
  ].join("\n");
  slide.speakerNotes.textFrame.setText(noteText);
  slide.speakerNotes.setVisible(true);
}

function addBullets(slide, items, x, y, w, lineHeight = 52, size = 22, accent = C.cyan) {
  items.forEach((item, i) => {
    rect(slide, x, y + i * lineHeight + 8, 8, 8, accent, 4);
    text(slide, item, x + 24, y + i * lineHeight, w - 24, lineHeight - 4, { size, color: C.text });
  });
}

function styleTable(table, rows, cols, options = {}) {
  table.borders.assign({ style: "solid", fill: C.grid, width: 1 });
  table.cells.block({ row: 0, column: 0, rowCount: rows, columnCount: cols }).assign({
    fill: C.bg2,
    textStyle: { typeface: font, fontSize: options.size ?? 16, color: C.text },
    margins: { left: 8, right: 8, top: 5, bottom: 5 },
    anchor: "middle",
  });
  table.cells.block({ row: 0, column: 0, rowCount: 1, columnCount: cols }).assign({
    fill: C.panel2,
    textStyle: { typeface: font, fontSize: options.headerSize ?? 16, color: C.white, bold: true },
  });
}

// 1. Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = C.bg;
  await image(slide, "images/astronaut.png", 690, 0, 590, 720, "cover", { left: 0.06, top: 0, right: 0.03, bottom: 0 });
  rect(slide, 0, 0, 760, 720, C.bg);
  rect(slide, 690, 0, 85, 720, C.bg2);
  text(slide, "TUM HUMAN SPACEFLIGHT TECHNOLOGY", 62, 54, 500, 24, { size: 15, bold: true, color: C.cyan });
  text(slide, "SPHERE", 62, 132, 520, 72, { size: 58, bold: true, color: C.white });
  text(slide, "Thermal Insulation Laboratory", 62, 207, 580, 68, { size: 36, bold: true, color: C.cyan2 });
  text(slide, "A classroom experiment linking transient heat transfer, physical testing and model validation", 62, 302, 555, 88, { size: 24, color: C.text });
  line(slide, 62, 422, 500, C.orange, 4);
  text(slide, "FINAL PROJECT PRESENTATION", 62, 446, 480, 28, { size: 16, bold: true, color: C.orange });
  text(slide, "Piyath Vithanage  ·  Elio Krollpfeiffer\nDilan Fernando  ·  Nuhansee Migelhewage", 62, 495, 565, 68, { size: 20, color: C.white });
  text(slide, "9 September 2026", 62, 636, 240, 26, { size: 16, color: C.muted });
  notes(slide, "0:30", "Open with the project purpose: SPHERE turns a spacesuit thermal-control challenge into a measurable classroom experiment. Introduce the four-person team and preview the link between theory, the physical test, and Mission Control.", ["README.md", "output/pdf/SPHERE_Thermal_Insulation_Project_Report_Updated.pdf"]);
}

// 2. Mission
{
  const slide = baseSlide("From spacesuit thermal control to a classroom experiment", 2);
  await image(slide, "images/stage1-theory-safety.png", 52, 148, 555, 440, "cover");
  text(slide, "THE ENGINEERING QUESTION", 652, 155, 480, 22, { size: 14, bold: true, color: C.orange });
  text(slide, "How do layered materials change the transient cooling of a protected thermal mass?", 652, 188, 520, 100, { size: 31, bold: true, color: C.white });
  addBullets(slide, [
    "Warm water represents the protected thermal mass.",
    "An ice-water bath supplies a repeatable cold boundary.",
    "Four insulation builds create a controlled comparison.",
    "Prediction and observation meet in the same workflow.",
  ], 652, 320, 520, 58, 21);
  rect(slide, 652, 566, 520, 56, C.panel, 10, C.grid);
  text(slide, "Analogy to spacecraft thermal control, not a vacuum simulation", 674, 580, 480, 28, { size: 18, bold: true, color: C.cyan2 });
  notes(slide, "0:45", "Frame the laboratory as an engineering analogy. The ice bath emphasizes conduction and convection, while a real spacesuit in vacuum relies heavily on radiation control and active thermal management. Avoid claiming that the setup reproduces space.", ["Engineering Project Report, Sections 1 and 2", "SPHERE Mission Control overview"]);
}

// 3. Integrated system
{
  const slide = baseSlide("One project connects experiment, software and assessment", 3);
  await image(slide, ".codex-ppt-build/site-shots/01-overview.png", 52, 150, 700, 425, "cover", { left: 0, top: 0.04, right: 0, bottom: 0.08 });
  text(slide, "DELIVERABLE SUITE", 802, 155, 320, 22, { size: 14, bold: true, color: C.orange });
  addBullets(slide, [
    "Mission Control browser application",
    "Student and teacher manuals",
    "Illustrated experimental SOP",
    "Two-page task sheet",
    "Revision flashcards",
    "Unified ten-question assessment",
  ], 802, 194, 385, 59, 21);
  text(slide, "The same settings and terminology now appear across every learning resource.", 802, 566, 378, 64, { size: 20, bold: true, color: C.cyan2 });
  notes(slide, "0:45", "Explain that the strongest project outcome is integration. Students move from theory to assembly, prediction, measurement, analysis and assessment without changing tools or terminology.", ["README.md", "index.html", "student_manual.html", "teacher_manual.html"]);
}

// 4. Outcomes and constraints
{
  const slide = baseSlide("Learning objectives and classroom constraints", 4);
  const objectives = [
    ["01", "Heat-transfer mechanisms", "Distinguish conduction, convection and radiation in the test system."],
    ["02", "Newton cooling model", "Interpret the effective cooling constant and calculate a reference curve."],
    ["03", "Experimental evidence", "Collect a controlled 16-point temperature history and plot it."],
    ["04", "Model evaluation", "Use residuals and MAE to explain agreement and uncertainty."],
  ];
  objectives.forEach((o, i) => {
    const y = 154 + i * 103;
    text(slide, o[0], 60, y, 55, 46, { size: 28, bold: true, color: C.cyan });
    text(slide, o[1], 130, y, 335, 34, { size: 23, bold: true, color: C.white });
    text(slide, o[2], 470, y, 700, 54, { size: 20, color: C.text });
    line(slide, 60, y + 70, 1110, C.grid, 1);
  });
  rect(slide, 60, 575, 1110, 62, C.panel, 8);
  text(slide, "Class format", 82, 590, 150, 26, { size: 17, bold: true, color: C.orange });
  text(slide, "Four groups in parallel  ·  55–70 minutes  ·  15-minute measurement interval  ·  Reusable hardware", 230, 588, 910, 30, { size: 19, color: C.white });
  notes(slide, "0:40", "Connect each learning objective to an observable student action. The complete classroom run takes about 55 to 70 minutes, although the final presentation summarizes it in under 15 minutes.", ["README.md", "Engineering Project Report, Section 1"]);
}

// 5. Hardware
{
  const slide = baseSlide("Experimental hardware and boundary conditions", 5);
  await image(slide, "images/setup.jpg", 52, 150, 720, 440, "cover", { left: 0.04, top: 0.06, right: 0.03, bottom: 0.04 });
  text(slide, "VERIFIED SETTINGS", 820, 155, 340, 22, { size: 14, bold: true, color: C.orange });
  const facts = [
    ["100 mL", "wide-mouth glass thermal core"],
    ["≈80 °C", "initial water temperature; record actual T₀"],
    ["Measured", "ice-water bath temperature Tenv"],
    ["1 minute", "sampling from t = 0 through 15"],
  ];
  facts.forEach((f, i) => {
    const y = 196 + i * 86;
    text(slide, f[0], 820, y, 160, 34, { size: 27, bold: true, color: C.cyan2 });
    text(slide, f[1], 820, y + 38, 350, 38, { size: 18, color: C.text });
  });
  rect(slide, 820, 552, 350, 66, C.panel, 10);
  text(slide, "Four matched cores allow parallel classroom testing", 842, 568, 315, 36, { size: 19, bold: true, color: C.white });
  notes(slide, "0:45", "Point out the separate bath probe, the centered core probe and the need for consistent immersion depth. The apparatus is deliberately simple, reusable and browser-independent at the sensing stage.", ["Engineering Project Report, Sections 3 and 10", "Thermal_Insulation_SOP.docx"]);
}

// 6. Configurations
{
  const slide = baseSlide("Four controlled insulation configurations", 6);
  const configs = [
    ["images/barecapsule.jpeg", "Bare control", "k = 0.150 min⁻¹", "Reference heat loss"],
    ["images/bubblewrap-only.png", "Bubble wrap", "k = 0.040 min⁻¹", "Trapped air cells"],
    ["images/Onlymylar.jpg", "Mylar only", "k = 0.121 min⁻¹", "Reflective layer"],
    ["images/full-mli.png", "Full MLI", "k = 0.015 min⁻¹", "Cotton + bubble + Mylar"],
  ];
  for (let i = 0; i < configs.length; i += 1) {
    const x = 52 + i * 300;
    await image(slide, configs[i][0], x, 148, 270, 350, "cover", { left: 0, top: 0.03, right: 0, bottom: 0.05 });
    text(slide, configs[i][1], x, 514, 270, 32, { size: 23, bold: true, color: C.white, align: "center" });
    text(slide, configs[i][2], x, 551, 270, 26, { size: 17, bold: true, color: i === 3 ? C.green : C.cyan, align: "center" });
    text(slide, configs[i][3], x, 582, 270, 28, { size: 16, color: C.muted, align: "center" });
  }
  text(slide, "Reference coefficients are educational system settings, not material conductivities.", 52, 632, 1160, 28, { size: 18, italic: true, color: C.orange, align: "center" });
  notes(slide, "0:50", "Describe the physical construction and keep the distinction between effective system coefficient k and material thermal conductivity λ. The current verified Mylar setting is 0.121 min⁻¹.", ["app.js, modelConstants", "Student Manual, test configurations", "Engineering Project Report, Section 3"]);
}

// 7. Framework
{
  const slide = baseSlide("Thermodynamic framework", 7);
  await image(slide, "images/hardware-schematic.png", 52, 140, 700, 305, "contain");
  rect(slide, 790, 140, 428, 150, C.panel, 12);
  text(slide, "Newton cooling model", 816, 160, 370, 30, { size: 22, bold: true, color: C.cyan2 });
  await image(slide, ".codex-ppt-build/katex/newton.png", 808, 199, 390, 72, "contain");
  text(slide, "Smaller k means slower approach to the bath temperature", 816, 258, 370, 25, { size: 16, color: C.muted, align: "center" });
  const mech = [
    ["CONDUCTION", "Direct contact through glass, water and solid layers", "Cotton and interfaces add resistance"],
    ["CONVECTION", "Fluid movement in the bath and gaps", "Sealed bubble cells restrict circulation"],
    ["RADIATION", "Infrared exchange between surfaces", "Mylar reduces radiative exchange"],
  ];
  mech.forEach((m, i) => {
    const y = 470 + i * 62;
    text(slide, m[0], 52, y, 180, 26, { size: 16, bold: true, color: [C.orange, C.cyan, C.green][i] });
    text(slide, m[1], 235, y, 475, 38, { size: 17, color: C.text });
    text(slide, m[2], 750, y, 460, 38, { size: 17, color: C.muted });
  });
  notes(slide, "1:00", "Explain the model as a lumped-parameter approximation. The effective k captures geometry, thermal mass, the boundary and every heat-loss path. It must not be presented as the thermal conductivity of cotton, bubble wrap or Mylar.", ["Engineering Project Report, Section 2", "README.md, Engineering model"]);
}

// 8. Method and safety
{
  const slide = baseSlide("Controlled method and safety-critical checks", 8);
  const phases = [
    ["PREPARE", "Measure Tenv, label conditions, leak-test the cores"],
    ["CONDITION", "Fill 100 mL near 80 °C and record the actual T₀"],
    ["MEASURE", "Immerse consistently and log one reading each minute"],
    ["ANALYSE", "Compare curves, residuals, k and MAE"],
  ];
  phases.forEach((p, i) => {
    const x = 52 + i * 300;
    text(slide, String(i + 1).padStart(2, "0"), x, 155, 70, 50, { size: 32, bold: true, color: C.cyan });
    text(slide, p[0], x + 70, 159, 195, 28, { size: 19, bold: true, color: C.white });
    text(slide, p[1], x, 214, 260, 82, { size: 19, color: C.text });
    if (i < 3) line(slide, x + 270, 180, 25, C.orange, 3);
  });
  line(slide, 52, 320, 1160, C.grid, 1);
  text(slide, "FAIR-TEST CONTROLS", 52, 345, 300, 24, { size: 15, bold: true, color: C.orange });
  addBullets(slide, [
    "Same jar geometry, water volume, probe depth and immersion location",
    "Same sampling interval and documented starting-temperature tolerance",
    "Rank unequal starts by temperature drop, normalized retention or fitted k",
  ], 52, 380, 665, 58, 20);
  rect(slide, 770, 345, 440, 235, C.panel, 12, C.red);
  text(slide, "MANDATORY SAFETY", 798, 368, 360, 28, { size: 20, bold: true, color: C.red });
  addBullets(slide, [
    "Adult handling of water near 80 °C; never use boiling water",
    "Eye protection and heat-resistant gloves or tongs",
    "Stable bath below waist height; electronics stay dry",
    "Stop for leakage, probe movement or wet insulation",
  ], 798, 410, 382, 43, 17, C.red);
  notes(slide, "1:00", "Present safety as a design requirement. An adult handles hot water, every capsule is leak-tested, and only the metal probe enters water. Mention that the appendix contains the complete 12-step procedure.", ["Engineering Project Report, Sections 4 and 10", "Thermal Insulation SOP, Safety and Control Requirements"]);
}

// 9. Mission Control workflow
{
  const slide = baseSlide("Mission Control links prediction with measurement", 9);
  await image(slide, ".codex-ppt-build/site-shots/03-simulator-mli.png", 52, 150, 680, 425, "cover", { left: 0, top: 0.04, right: 0, bottom: 0.04 });
  const flow = [
    ["1", "Select a configuration", "Load its reference k value."],
    ["2", "Set the boundary", "Enter measured T₀ and Tenv."],
    ["3", "Generate the prediction", "Create a 0–15 minute cooling curve."],
    ["4", "Enter observations", "Overlay telemetry and calculate MAE."],
  ];
  flow.forEach((f, i) => {
    const y = 157 + i * 101;
    text(slide, f[0], 780, y, 40, 34, { size: 24, bold: true, color: C.orange });
    text(slide, f[1], 832, y, 355, 30, { size: 21, bold: true, color: C.white });
    text(slide, f[2], 832, y + 34, 350, 40, { size: 17, color: C.muted });
  });
  text(slide, "Manual entry keeps the student involved in the act of measurement.", 780, 583, 400, 56, { size: 20, bold: true, color: C.cyan2 });
  notes(slide, "0:50", "Explain the closed loop. The website calculates the model but does not automate the thermometer. Students still observe and enter every value, then receive immediate visual and numerical feedback.", ["index.html", "app.js", "Engineering Project Report, Section 6"]);
}

// 10. Demo
{
  const slide = baseSlide("Live demonstration: prediction to evaluation", 10);
  await image(slide, ".codex-ppt-build/site-shots/03-simulator-mli.png", 52, 150, 555, 350, "cover", { left: 0.02, top: 0.09, right: 0.02, bottom: 0.1 });
  await image(slide, ".codex-ppt-build/site-shots/04-telemetry-mli.png", 632, 150, 596, 350, "cover", { left: 0.25, top: 0, right: 0, bottom: 0.2 });
  const demo = [
    "Choose Full MLI and confirm k = 0.015 min⁻¹",
    "Run the 80 °C / 0 °C / 15 min prediction",
    "Open Measurements and show the worked telemetry overlay",
    "Read the 0.98 °C MAE and discuss one residual",
  ];
  demo.forEach((d, i) => {
    text(slide, `${i + 1}`, 62 + i * 292, 535, 32, 32, { size: 23, bold: true, color: C.orange });
    text(slide, d, 101 + i * 292, 530, 240, 80, { size: 17, color: C.text });
  });
  text(slide, "If the browser or CDN assets fail, present these two verified screenshots and continue.", 52, 631, 1150, 30, { size: 18, bold: true, color: C.cyan2, align: "center" });
  notes(slide, "2:00–3:00", "DEMO SCRIPT\n1. Open Simulator. Select Multilayer assembly. Confirm T₀ = 80 °C, Tenv = 0 °C and 15 minutes.\n2. Run the model and point to T(15) = 63.9 °C.\n3. Open Measurements. Load or show the supplied full-MLI series. Point to 16/16 points and MAE = 0.98 °C.\n4. Explain that residuals change sign because the measured curve does not follow one perfect exponential.\n\nFallback: remain on this slide if Chart.js, KaTeX or web fonts do not load. The screenshots preserve the exact demonstration state.", ["SPHERE Mission Control local website", "Worked telemetry from Engineering Project Report, Section 8"]);
}

// 11. Reference model chart
{
  const slide = baseSlide("Reference model separates the four expected cooling rates", 11);
  const times = Array.from({ length: 16 }, (_, i) => String(i));
  const ks = [0.150, 0.040, 0.121, 0.015];
  const names = ["Bare control", "Bubble wrap", "Mylar only", "Full MLI"];
  const colors = [C.red, C.cyan, C.orange, C.green];
  const series = ks.map((k, i) => ({
    name: names[i],
    values: times.map((t) => Number((80 * Math.exp(-k * Number(t))).toFixed(2))),
    line: { style: "solid", fill: colors[i], width: i === 3 ? 4 : 3 },
  }));
  const chart = slide.charts.add("line", {
    position: { left: 52, top: 145, width: 820, height: 470 },
    categories: times,
    series,
    legend: { position: "bottom", overlay: false, textStyle: { fill: C.text, fontSize: 14 } },
    xAxis: { title: { text: "Time (minutes)", textStyle: { fill: C.text, fontSize: 14 } }, textStyle: { fill: C.muted, fontSize: 12 }, majorGridlines: { style: "solid", fill: C.grid, width: 1 } },
    yAxis: { title: { text: "Temperature (°C)", textStyle: { fill: C.text, fontSize: 14 } }, textStyle: { fill: C.muted, fontSize: 12 }, majorGridlines: { style: "solid", fill: C.grid, width: 1 }, minimumScale: 0, maximumScale: 85 },
    hasLegend: true,
  });
  applyPresentationChartFont(chart, { fontFamily: font });
  text(slide, "MODEL T₁₅", 915, 155, 280, 22, { size: 14, bold: true, color: C.orange });
  const endpoints = [["Bare", "8.4 °C"], ["Bubble", "43.9 °C"], ["Mylar", "13.0 °C"], ["Full MLI", "63.9 °C"]];
  endpoints.forEach((e, i) => {
    const y = 195 + i * 87;
    text(slide, e[0], 915, y, 150, 26, { size: 19, bold: true, color: colors[i] });
    text(slide, e[1], 1080, y - 3, 115, 32, { size: 24, bold: true, color: C.white, align: "right" });
    line(slide, 915, y + 41, 280, C.grid, 1);
  });
  text(slide, "Assumptions: T₀ = 80 °C and Tenv = 0 °C", 915, 555, 280, 54, { size: 17, color: C.muted });
  notes(slide, "0:55", "Use the chart to establish the expected ranking under one common starting point and boundary. State clearly that the coefficients are teaching references that require calibration for a new geometry or build.", ["app.js, modelConstants", "Engineering Project Report, Section 7"]);
}

// 12. Observed results
{
  const slide = baseSlide("The worked example shows the full MLI retaining the most heat", 12);
  const times = Array.from({ length: 16 }, (_, i) => String(i));
  const data = {
    "Full MLI": [77.6,76.6,76.1,75.6,75.1,74.5,73.9,73.5,72.1,70.6,69.7,68.5,67.4,65.8,64.1,62.7],
    "Bubble wrap": [82.6,79.0,75.2,72.5,70.0,67.9,65.6,64.0,62.3,60.6,58.9,57.5,56.1,54.8,53.7,52.6],
    "Bare control": [80.1,73.9,66.0,59.9,54.5,50.1,47.1,44.6,42.5,40.9,39.5,38.2,37.3,36.5,35.8,35.2],
    "Mylar only": [80.5,68.6,61.8,55.8,51.3,47.8,44.9,42.5,40.6,38.9,38.1,36.3,35.5,34.6,33.9,33.3],
  };
  const colors = [C.green, C.cyan, C.white, C.orange];
  const chart = slide.charts.add("line", {
    position: { left: 52, top: 145, width: 790, height: 475 }, categories: times,
    series: Object.entries(data).map(([name, values], i) => ({ name, values, line: { style: "solid", fill: colors[i], width: i === 0 ? 4 : 3 } })),
    legend: { position: "bottom", overlay: false, textStyle: { fill: C.text, fontSize: 13 } },
    xAxis: { title: { text: "Time (minutes)", textStyle: { fill: C.text, fontSize: 14 } }, textStyle: { fill: C.muted, fontSize: 12 }, majorGridlines: { style: "solid", fill: C.grid, width: 1 } },
    yAxis: { title: { text: "Measured temperature (°C)", textStyle: { fill: C.text, fontSize: 14 } }, textStyle: { fill: C.muted, fontSize: 12 }, majorGridlines: { style: "solid", fill: C.grid, width: 1 }, minimumScale: 25, maximumScale: 85 },
    hasLegend: true,
  });
  applyPresentationChartFont(chart, { fontFamily: font });
  const summary = [
    ["Full MLI", "14.9 °C drop", "74.1% retained", C.green],
    ["Bubble", "30.0 °C drop", "52.1% retained", C.cyan],
    ["Bare", "44.9 °C drop", "25.3% retained", C.white],
    ["Mylar", "47.2 °C drop", "22.0% retained", C.orange],
  ];
  summary.forEach((s, i) => {
    const y = 162 + i * 92;
    text(slide, s[0], 885, y, 135, 26, { size: 20, bold: true, color: s[3] });
    text(slide, s[1], 1020, y, 190, 26, { size: 18, bold: true, color: C.white, align: "right" });
    text(slide, s[2], 885, y + 35, 325, 24, { size: 16, color: C.muted, align: "right" });
    line(slide, 885, y + 70, 325, C.grid, 1);
  });
  rect(slide, 885, 545, 325, 72, C.panel, 10);
  text(slide, "Worked example only. Repeated measurements are required for validation.", 905, 560, 285, 42, { size: 16, bold: true, color: C.orange, align: "center" });
  notes(slide, "1:10", "Compare temperature drop rather than final temperature alone because the four trials started at different values. The full MLI produced the smallest drop. Bubble wrap ranked second. The example is illustrative and does not replace repeated trials.", ["Engineering Project Report, Section 8", "Thermal Insulation SOP, complete observed series"]);
}

// 13. Interpretation
{
  const slide = baseSlide("Boundary conditions explain the weak Mylar-only result", 13);
  await image(slide, "images/full-mli-parts.png", 52, 150, 380, 400, "contain");
  text(slide, "WHAT THE DATA SUPPORT", 485, 154, 330, 22, { size: 14, bold: true, color: C.green });
  addBullets(slide, [
    "The layered package produced the smallest measured temperature drop.",
    "Bubble wrap provided useful resistance through intact air cells.",
    "The observed Mylar curve strongly disagreed with its reference model.",
  ], 485, 190, 680, 64, 21, C.green);
  text(slide, "WHY MYLAR CAN FAIL HERE", 485, 390, 330, 22, { size: 14, bold: true, color: C.orange });
  addBullets(slide, [
    "Reflective foil targets infrared exchange, which matters strongly in vacuum.",
    "Direct liquid contact and leakage can dominate the classroom water bath.",
    "One weak run does not prove reflective insulation is ineffective in space.",
  ], 485, 423, 680, 54, 20, C.orange);
  text(slide, "Main uncertainties: probe position, neck seal, thermal stratification, bath warming, immersion depth and layer compression", 52, 612, 1120, 38, { size: 17, italic: true, color: C.cyan2, align: "center" });
  notes(slide, "1:00", "Use the Mylar result to demonstrate engineering interpretation. The correct conclusion concerns the boundary and construction, not a universal property of reflective insulation. Name two or three uncertainty sources and explain their direction of influence.", ["Engineering Project Report, Section 9"]);
}

// 14. Outcome and contributions
{
  const slide = baseSlide("SPHERE delivers a complete theory-to-evidence learning loop", 14);
  await image(slide, "images/preflight-thermal-lab.png", 52, 148, 605, 338, "cover");
  text(slide, "PROJECT OUTCOME", 700, 154, 300, 22, { size: 14, bold: true, color: C.orange });
  text(slide, "Students predict, build, measure and critique the same thermal system.", 700, 190, 480, 82, { size: 29, bold: true, color: C.white });
  addBullets(slide, [
    "Aligned website, manuals, SOP, worksheet and assessment",
    "Reusable apparatus with no native software installation",
    "Clear separation between teaching models and measured evidence",
  ], 700, 300, 480, 60, 19);
  line(slide, 52, 520, 1160, C.grid, 1);
  text(slide, "CONTRIBUTIONS", 52, 544, 160, 22, { size: 14, bold: true, color: C.cyan });
  text(slide, "Piyath Vithanage", 52, 578, 240, 24, { size: 18, bold: true, color: C.white });
  text(slide, "Website, integration, model and telemetry graphs, data visualisation", 52, 608, 510, 38, { size: 16, color: C.muted });
  text(slide, "Dilan Fernando", 610, 578, 220, 24, { size: 18, bold: true, color: C.white });
  text(slide, "Thermodynamics, experiment, analysis, documentation and project integration", 610, 608, 540, 38, { size: 16, color: C.muted });
  text(slide, "Elio Krollpfeiffer and Nuhansee Migelhewage remain listed as project team members in the current repository and learning materials.", 52, 655, 1110, 28, { size: 14, color: C.muted });
  notes(slide, "0:50", "Close on the integration outcome. State the current contribution attribution exactly as documented. Invite questions on the experiment, model, website or classroom implementation.", ["Engineering Project Report, Sections 11 and 12", "README.md"]);
}

// 15. Appendix apparatus
{
  const slide = baseSlide("Appendix: complete apparatus list", 15, "APPENDIX");
  const values = [
    ["Quantity", "Item", "Function"],
    ["4", "100 mL glass thermal cores", "Comparable test vessels"],
    ["4 + 1", "Digital probe thermometers", "Core and bath measurements"],
    ["1", "Bucket or deep container", "Cold bath and secondary containment"],
    ["1 set", "Cotton, bubble wrap and Mylar", "Four insulation configurations"],
    ["As needed", "Tape or elastic bands", "Repeatable assembly without compression"],
    ["1 set", "Gloves or tongs, towels and timer", "Safe handling, cleanup and timing"],
    ["1", "Adult-controlled hot-water source", "Prepare water near 80 °C"],
    ["Per student", "Task sheet or laboratory report", "Hypothesis, raw data and evaluation"],
  ];
  const table = slide.tables.add({ rows: values.length, columns: 3, left: 52, top: 145, width: 1176, height: 475, columnWidths: [150, 390, 636], values });
  styleTable(table, values.length, 3, { size: 18, headerSize: 18 });
  text(slide, "Exact cost depends on local sourcing. The older €35.20 estimate remains an unverified draft procurement figure.", 52, 640, 1176, 30, { size: 16, italic: true, color: C.orange });
  notes(slide, "Backup", "Use this slide only if the audience asks about kit contents, reuse or feasibility.", ["Engineering Project Report, Section 10", "Thermal Insulation SOP, Hardware Checklist"]);
}

// 16. Appendix SOP
{
  const slide = baseSlide("Appendix: 12-step operating procedure", 16, "APPENDIX");
  const steps = [
    "Prepare a stable, dry work area.", "Measure and record the bath temperature.",
    "Label the four test conditions.", "Build each package without compressing its layers.",
    "Prepare water near 80 °C under adult supervision.", "Condition the thermal core to 80 ± 2 °C.",
    "Transfer with gloves or tongs; keep probe depth fixed.", "Start timing immediately and record T₀.",
    "Record one temperature every minute through t = 15.", "Repeat with the same geometry, mass and method.",
    "Calculate drop, residuals, MAE and fitted k as required.", "Cool, dry and store all equipment safely.",
  ];
  steps.forEach((s, i) => {
    const col = i < 6 ? 0 : 1;
    const row = i % 6;
    const x = 52 + col * 600;
    const y = 145 + row * 82;
    text(slide, String(i + 1).padStart(2, "0"), x, y, 50, 30, { size: 21, bold: true, color: i === 4 || i === 5 || i === 6 ? C.orange : C.cyan });
    text(slide, s, x + 58, y, 515, 55, { size: 18, color: C.text });
    line(slide, x, y + 62, 560, C.grid, 1);
  });
  notes(slide, "Backup", "This is the condensed presenter version of the complete SOP. Emphasize steps 5–7 when discussing hot-water handling.", ["Thermal_Insulation_SOP.docx", "Experimental_Toolkit_Thermal_Insulation_SOP_Illustrated.docx"]);
}

// 17. Appendix data table
{
  const slide = baseSlide("Appendix: complete observed temperature series", 17, "APPENDIX", false);
  const full = [77.6,76.6,76.1,75.6,75.1,74.5,73.9,73.5,72.1,70.6,69.7,68.5,67.4,65.8,64.1,62.7];
  const bubble = [82.6,79.0,75.2,72.5,70.0,67.9,65.6,64.0,62.3,60.6,58.9,57.5,56.1,54.8,53.7,52.6];
  const mylar = [80.5,68.6,61.8,55.8,51.3,47.8,44.9,42.5,40.6,38.9,38.1,36.3,35.5,34.6,33.9,33.3];
  const bare = [80.1,73.9,66.0,59.9,54.5,50.1,47.1,44.6,42.5,40.9,39.5,38.2,37.3,36.5,35.8,35.2];
  const values = [["Time (min)", "Full MLI (°C)", "Bubble (°C)", "Mylar (°C)", "Bare (°C)"]];
  for (let i = 0; i <= 15; i += 1) values.push([String(i), full[i].toFixed(1), bubble[i].toFixed(1), mylar[i].toFixed(1), bare[i].toFixed(1)]);
  const table = slide.tables.add({ rows: values.length, columns: 5, left: 90, top: 140, width: 1100, height: 492, columnWidths: [180, 230, 230, 230, 230], values });
  styleTable(table, values.length, 5, { size: 13, headerSize: 14 });
  notes(slide, "Backup", "Use this slide to answer questions about individual readings or to verify the plotted series.", ["Engineering Project Report, Section 8", "Thermal Insulation SOP, Table 7"]);
}

// 18. Appendix calculations
{
  const slide = baseSlide("Appendix: model agreement and fitted cooling constant", 18, "APPENDIX");
  const formulas = [
    ["Residual at point i", ".codex-ppt-build/katex/residual.png", "Shows the signed difference at one timestamp", 500, 70],
    ["Mean absolute error", ".codex-ppt-build/katex/mae.png", "Summarizes the typical absolute temperature error", 390, 88],
    ["Fitted cooling constant", ".codex-ppt-build/katex/fitted-k.png", "Valid only when the ratio is positive and the boundary is stable", 430, 88],
    ["Normalized heat retained", ".codex-ppt-build/katex/retained.png", "Supports comparison when starting temperatures differ", 450, 82],
  ];
  for (let i = 0; i < formulas.length; i += 1) {
    const f = formulas[i];
    const y = 150 + i * 112;
    text(slide, f[0], 52, y, 260, 30, { size: 19, bold: true, color: [C.cyan, C.orange, C.green, C.cyan2][i] });
    await image(slide, f[1], 325, y - 14, f[3], f[4], "contain");
    text(slide, f[2], 855, y, 355, 52, { size: 17, color: C.muted });
    line(slide, 52, y + 76, 1158, C.grid, 1);
  }
  rect(slide, 52, 615, 1158, 48, C.panel, 8);
  text(slide, "The Mission Control full-MLI screenshot uses the supplied 16-point series and reports MAE = 0.98 °C against the 80/0 °C reference curve.", 72, 626, 1115, 26, { size: 16, color: C.cyan2, align: "center" });
  notes(slide, "Backup", "Explain why MAE is easier to interpret than signed average error: positive and negative residuals cannot cancel. A fitted k is a system-level estimate for the tested boundary and geometry.", ["README.md", "Engineering Project Report, Section 9", "app.js, telemetry calculation"]);
}

// 19. Appendix assessment
{
  const slide = baseSlide("Appendix: unified assessment and classroom guidance", 19, "APPENDIX");
  await image(slide, ".codex-ppt-build/site-shots/05-question-sheet.png", 52, 145, 660, 410, "cover", { left: 0, top: 0.08, right: 0, bottom: 0.08 });
  text(slide, "TEN ALIGNED QUESTIONS", 760, 150, 350, 22, { size: 14, bold: true, color: C.orange });
  addBullets(slide, [
    "Student Task Sheet: Inquiries 1–10",
    "Mission Control: Questions 1–10",
    "Teacher Manual: complete solution key",
    "Nine multiple-choice items auto-score online",
    "Question 4 requires instructor review",
  ], 760, 190, 430, 59, 20);
  rect(slide, 760, 510, 430, 92, C.panel, 10);
  text(slide, "Assessment focuses on mechanism, modelling, fair testing, uncertainty and spacesuit engineering trade-offs.", 784, 528, 384, 58, { size: 18, bold: true, color: C.cyan2, align: "center" });
  text(slide, "Safety disclosure: the activity does not certify materials for aerospace, pressure-vessel, fire-protection or personal-protective use.", 52, 620, 1138, 44, { size: 16, italic: true, color: C.orange, align: "center" });
  notes(slide, "Backup", "Use this slide for questions about marking and learning verification. Question 4 remains open response because students must identify plausible physical causes of model deviation.", ["Teacher Manual, Assessment Guide", "index.html, Question Sheet", "README.md"]);
}

await fs.mkdir(outputDir, { recursive: true });
const stagingDir = path.join(buildDir, "finalizer");
await fs.mkdir(stagingDir, { recursive: true });
const candidatePath = path.join(stagingDir, "candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const result = await finalizePresentation({
  explicitTotalSlideCount: 19,
  requiredNativeTableOwnerSlides: [15, 17],
  requiredNativeChartOwnerSlides: [11, 12],
  materializeLiteralChartWorkbooks: true,
  workspaceDir,
  candidatePath,
  finalPath,
  pythonExecutable,
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    "--require-native-table-slide", "15",
    "--require-native-table-slide", "17",
  ],
  fontPolicy: { basis: "design", families: [font] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "SPHERE_Final_Day_Presentation_KaTeX.validation.json"),
});

console.log(JSON.stringify({ finalPath, result }, null, 2));
