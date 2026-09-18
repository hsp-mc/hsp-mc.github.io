import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/mandinu/Downloads/project";
const SKILL_DIR = "/Users/mandinu/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.22227/skills/presentations";
const RUNTIME_PYTHON = "/Users/mandinu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const sourcePath = path.join(workspaceDir, "output/presentation/SPHERE_Final_Day_Presentation_KaTeX.pptx");
const stagingDir = path.join(workspaceDir, ".build/light-theme/finalizer");
const candidatePath = path.join(stagingDir, "candidate-light-katex.pptx");
const FINAL_PPTX = path.join(workspaceDir, "output/presentation/SPHERE_Final_Day_Presentation_Light_KaTeX.pptx");

const palette = new Map(Object.entries({
  "071225": "F7FAFC", // canvas
  "0C1B33": "E8F1F8", // large dark panels
  "112744": "E4EEF7", // inset panels
  "153353": "DCEAF5", // table headers
  "294564": "C8D6E4", // separators and grid lines
  "F5F8FC": "10253F", // primary text
  "D8E4F2": "29455F", // body text
  "90A5BC": "61758A", // secondary text
  "22B8F0": "007FA8", // cyan accent
  "79D8F7": "167A9D", // pale cyan accent
  "F59E0B": "B66A00", // amber accent
  "21C98A": "0B8B61", // green accent
  "F05252": "C83A3A", // red accent
}));

function mappedHex(value) {
  if (typeof value !== "string") return undefined;
  const normalized = value.replace(/^#/, "").toUpperCase();
  const mapped = palette.get(normalized);
  return mapped ? `#${mapped}` : undefined;
}

function fillHex(fill) {
  if (!fill) return undefined;
  if (typeof fill === "string") return fill;
  const config = fill.toConfig?.();
  if (typeof config === "string") return config;
  return config?.proto?.color?.value ? `#${config.proto.color.value}` : undefined;
}

function mapFill(owner, property) {
  if (!owner) return 0;
  const mapped = mappedHex(fillHex(owner[property]));
  if (!mapped) return 0;
  owner[property] = mapped;
  return 1;
}

function mapTextStyle(style) {
  if (!style) return 0;
  const current = style.color?.value ?? fillHex(style.fill);
  const mapped = mappedHex(current);
  if (!mapped) return 0;
  style.color = mapped;
  return 1;
}

function mapTextRange(text) {
  if (!text?.paragraphs?.items) return 0;
  let changes = 0;
  for (const paragraph of text.paragraphs.items) {
    changes += mapTextStyle(paragraph.textStyle);
    for (const run of paragraph.runs?.items ?? []) changes += mapTextStyle(run.textStyle);
  }
  return changes;
}

function setTextColor(text, color) {
  if (!text?.paragraphs?.items) return;
  for (const paragraph of text.paragraphs.items) {
    paragraph.textStyle.color = color;
    for (const run of paragraph.runs?.items ?? []) run.textStyle.color = color;
  }
}

function mapLine(line) {
  return line ? mapFill(line, "fill") : 0;
}

await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });

const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
let changes = 0;

for (const slide of presentation.slides.items) {
  changes += mapFill(slide.background, "fill");

  for (const shape of slide.shapes.items) {
    changes += mapFill(shape, "fill");
    changes += mapLine(shape.line);
    changes += mapTextRange(shape.text);
  }

  for (const table of slide.tables.items) {
    changes += mapFill(table, "fill");
    for (let row = 0; row < table.rowCount; row += 1) {
      for (let column = 0; column < table.columnCount; column += 1) {
        const cell = table.getCell(row, column);
        changes += mapFill(cell, "fill");
        changes += mapTextRange(cell.text);
        for (const edge of ["left", "right", "top", "bottom", "diagonalDown", "diagonalUp"]) {
          changes += mapLine(cell.borders?.[edge]);
        }
      }
    }
  }

  for (const chart of slide.charts.items) {
    changes += mapFill(chart, "chartFill");
    changes += mapFill(chart, "plotAreaFill");
    changes += mapLine(chart.chartLine);
    changes += mapLine(chart.plotAreaLine);
    changes += mapTextStyle(chart.titleTextStyle);
    changes += mapTextStyle(chart.legend?.textStyle);
    changes += mapTextStyle(chart.dataLabels?.textStyle);

    for (const axis of [chart.xAxis, chart.yAxis]) {
      if (!axis) continue;
      changes += mapTextStyle(axis.textStyle);
      changes += mapTextStyle(axis.title?.textStyle);
      changes += mapLine(axis.line);
      changes += mapLine(axis.majorGridlines);
      changes += mapLine(axis.minorGridlines);
    }

    for (const series of chart.series.items) {
      changes += mapFill(series, "fill");
      changes += mapLine(series.stroke);
      changes += mapTextStyle(series.dataLabels?.textStyle);
    }
  }
}

// The equation graphics are transparent white PNGs in the supplied deck.
// Keep compact dark formula surfaces so those exact source equations remain legible.
const frameworkSlide = presentation.slides.getItem(6);
frameworkSlide.shapes.getItemAt(5).fill = "#112744";
setTextColor(frameworkSlide.shapes.getItemAt(6).text, "#79D8F7");
setTextColor(frameworkSlide.shapes.getItemAt(7).text, "#D8E4F2");

const formulasSlide = presentation.slides.getItem(17);
const formulaSpecs = [
  ["residual.png", "KaTeX residual formula"],
  ["mae.png", "KaTeX mean absolute error formula"],
  ["cooling-constant.png", "KaTeX fitted cooling constant formula"],
  ["heat-retained.png", "KaTeX normalized heat retained formula"],
];
for (const [index, [fileName, alt]] of formulaSpecs.entries()) {
  const formulaImage = formulasSlide.images.items[index];
  const oldFrame = formulaImage.frame;
  const oldCrop = formulaImage.crop;
  const oldGeometry = formulaImage.geometry;
  const oldBorderRadius = formulaImage.borderRadius;
  const oldRotation = formulaImage.rotation;
  const oldFlipHorizontal = formulaImage.flipHorizontal;
  const oldFlipVertical = formulaImage.flipVertical;
  const oldLockAspectRatio = formulaImage.lockAspectRatio;
  formulaImage.replace({
    blob: new Uint8Array(await fs.readFile(path.join(workspaceDir, ".build/light-theme/katex", fileName))),
    contentType: "image/png",
    alt,
    fit: "contain",
  });
  formulaImage.frame = oldFrame;
  formulaImage.crop = oldCrop;
  formulaImage.geometry = oldGeometry;
  formulaImage.borderRadius = oldBorderRadius;
  formulaImage.rotation = oldRotation;
  formulaImage.flipHorizontal = oldFlipHorizontal;
  formulaImage.flipVertical = oldFlipVertical;
  formulaImage.lockAspectRatio = oldLockAspectRatio;
}

if (changes < 100) throw new Error(`Unexpectedly low recolor count: ${changes}`);

await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const { finalizePresentation } = await import(pathToFileURL(
  path.join(SKILL_DIR, "container_tools/artifact_tool_utils.mjs"),
).href);

const requirements = {
  explicitTotalSlideCount: 19,
  requiredNativeTableOwnerSlides: [15, 17],
  requiredNativeChartOwnerSlides: [11, 12],
};

const result = await finalizePresentation({
  ...requirements,
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-bullet-geometry",
    "--validate-heading-fit",
    "--require-native-table-slide", "15",
    "--require-native-table-slide", "17",
  ],
  requiredNativeTableOwnerSlides: [15, 17],
  fontPolicy: {
    basis: "reference",
    families: ["Avenir Next"],
    referencePath: sourcePath,
    referenceSha256: "3384d753d9e179a44ea57810b2b3c4f0b151a41f657ae5ee17b30f5e792ac724",
  },
  materializeLiteralChartWorkbooks: true,
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "SPHERE_Final_Day_Presentation_Light_KaTeX.validation.json"),
});

console.log(JSON.stringify({ changes, finalPath: FINAL_PPTX, result }, null, 2));
