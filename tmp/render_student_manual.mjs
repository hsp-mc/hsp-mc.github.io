import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = '/Users/mandinu/Downloads/project';
const manuals = [
  ['student_manual.html', 'SPHERE_Mission_Control_Student_Manual.pdf'],
  ['teacher_manual.html', 'SPHERE_Mission_Control_Teacher_Manual.pdf'],
];

const browser = await chromium.launch({
  headless: true,
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
});
for (const [inputName, outputName] of manuals) {
  const input = path.join(root, 'resources/manuals', inputName);
  const output = path.join(root, 'resources/manuals', outputName);
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(pathToFileURL(input).href, { waitUntil: 'networkidle' });
  await page.emulateMedia({ media: 'print' });
  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    await new Promise((resolve) => setTimeout(resolve, 600));
  });
  await page.pdf({
    path: output,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    displayHeaderFooter: false,
  });
  await page.close();
}
await browser.close();
