import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import JSZip from "jszip";
import { FileBlob, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "/Users/mandinu/Downloads/project";
const skillDir = "/Users/mandinu/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.22227/skills/presentations";
const pythonExecutable = "/Users/mandinu/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3";
const stagingDir = path.join(workspaceDir, ".build/name-standardization/presentation-finalizer");
const outputDir = path.join(workspaceDir, "output/standardized_name/presentations");
const officialName = "SPACESUIT THERMAL SHIELDING KIT";

const sources = [
  "output/presentation/SPHERE_Final_Day_Presentation_KaTeX.pptx",
  "output/presentation/SPHERE_Final_Day_Presentation_Light.pptx",
  "output/presentation/SPHERE_Final_Day_Presentation_Light_KaTeX.pptx",
];

const variants = [
  "SPHERE THERMAL INSULATION LABORATORY",
  "SPHERE Thermal Insulation Laboratory",
  "SPHERE Thermal Insulation Kit",
  "Thermal Insulation Laboratory",
];

function replaceInText(text) {
  if (!text) return 0;
  let changes = 0;
  for (const variant of variants) {
    const before = text.toString();
    if (!before.includes(variant)) continue;
    text.replace(variant, officialName);
    changes += before.split(variant).length - 1;
  }
  return changes;
}

async function sha256(filePath) {
  const data = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(data).digest("hex");
}

await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });
const workbookReference = await JSZip.loadAsync(await fs.readFile(path.join(workspaceDir, sources[0])));

const results = [];
for (const relativeSource of sources) {
  const sourcePath = path.join(workspaceDir, relativeSource);
  const outputPath = path.join(outputDir, path.basename(sourcePath));
  const receiptPath = path.join(stagingDir, `${path.basename(outputPath)}.validation.json`);
  try {
    await Promise.all([fs.access(outputPath), fs.access(receiptPath)]);
    results.push({ sourcePath, outputPath, status: "already_finalized" });
    continue;
  } catch {
    // Build the missing validated deliverable.
  }
  const presentation = await PresentationFile.importPptx(await FileBlob.load(sourcePath));
  let changes = 0;

  for (const slide of presentation.slides.items) {
    for (const shape of slide.shapes.items) changes += replaceInText(shape.text);
    for (const table of slide.tables.items) {
      for (let row = 0; row < table.rowCount; row += 1) {
        for (let column = 0; column < table.columnCount; column += 1) {
          changes += replaceInText(table.getCell(row, column).text);
        }
      }
    }
  }

  if (changes < 18) {
    throw new Error(`Expected at least 18 official-name replacements in ${relativeSource}; found ${changes}`);
  }

  const candidatePath = path.join(stagingDir, `candidate-${path.basename(sourcePath)}`);
  const zip = await JSZip.loadAsync(await fs.readFile(sourcePath));
  let packageChanges = 0;
  for (const [partName, part] of Object.entries(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/u.test(partName)) continue;
    let xml = await part.async("string");
    for (const variant of variants) {
      const count = xml.split(variant).length - 1;
      if (count) {
        xml = xml.split(variant).join(officialName);
        packageChanges += count;
      }
    }
    zip.file(partName, xml);
  }
  const embeddedWorkbooks = Object.keys(zip.files).filter((name) => /^ppt\/embeddings\/.*\.xlsx$/u.test(name));
  if (embeddedWorkbooks.length === 0) {
    for (const number of [1, 2]) {
      const workbookName = `Microsoft_Excel_Sheet${number}.xlsx`;
      const workbookPart = workbookReference.file(`ppt/embeddings/${workbookName}`);
      if (!workbookPart) throw new Error(`Workbook reference missing ${workbookName}`);
      zip.file(`ppt/embeddings/${workbookName}`, await workbookPart.async("nodebuffer"));

      const chartPartName = Object.keys(zip.files).find((name) =>
        new RegExp(`^ppt/(?:slides/)?charts/chart${number}\\.xml$`, "u").test(name));
      if (!chartPartName) throw new Error(`Chart ${number} not found in ${relativeSource}`);
      let chartXml = await zip.file(chartPartName).async("string");
      if (!chartXml.includes("<c:externalData")) {
        if (!chartXml.includes("xmlns:r=")) {
          chartXml = chartXml.replace(
            "<c:chartSpace ",
            '<c:chartSpace xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" ',
          );
        }
        chartXml = chartXml.replace(
          "</c:chartSpace>",
          '<c:externalData r:id="rIdChartSnapshot1"><c:autoUpdate val="0"/></c:externalData></c:chartSpace>',
        );
        zip.file(chartPartName, chartXml);
      }
      const chartDirectory = path.posix.dirname(chartPartName);
      const relsPath = `${chartDirectory}/_rels/chart${number}.xml.rels`;
      const target = chartDirectory === "ppt/charts"
        ? `../embeddings/${workbookName}`
        : `../../embeddings/${workbookName}`;
      zip.file(relsPath,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="rIdChartSnapshot1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/package" Target="${target}"/>` +
        `</Relationships>`);
    }
    let contentTypes = await zip.file("[Content_Types].xml").async("string");
    if (!contentTypes.includes('Extension="xlsx"')) {
      contentTypes = contentTypes.replace(
        "</Types>",
        '<Default ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" Extension="xlsx"/></Types>',
      );
      zip.file("[Content_Types].xml", contentTypes);
    }
  }
  if (packageChanges !== changes) {
    throw new Error(`Artifact inspection found ${changes} replacements but package edit found ${packageChanges}`);
  }
  await fs.writeFile(candidatePath, await zip.generateAsync({ type: "nodebuffer" }));

  const { finalizePresentation } = await import(pathToFileURL(
    path.join(skillDir, "container_tools/artifact_tool_utils.mjs"),
  ).href);

  const result = await finalizePresentation({
    explicitTotalSlideCount: 19,
    requiredNativeTableOwnerSlides: [15, 17],
    requiredNativeChartOwnerSlides: [11, 12],
    nativeChartTargetApplication: "powerpoint",
    workspaceDir,
    candidatePath,
    finalPath: outputPath,
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
    verifyArtifactToolImport: true,
    receiptPath,
  });

  results.push({ sourcePath, outputPath, changes, result });
}

console.log(JSON.stringify(results, null, 2));
