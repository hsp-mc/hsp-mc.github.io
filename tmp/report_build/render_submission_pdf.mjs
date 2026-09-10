import { chromium } from 'playwright';
import path from 'node:path';
const root='/Users/mandinu/Downloads/project';
const browser=await chromium.launch({headless:true});
const page=await browser.newPage();
await page.goto('file://'+path.join(root,'tmp/report_build/submission.html'),{waitUntil:'networkidle'});
await page.emulateMedia({media:'print'});
await page.pdf({path:path.join(root,'output/pdf/SPHERE_Thermal_Insulation_Project_Report_Updated.pdf'),format:'A4',printBackground:true,preferCSSPageSize:true});
await browser.close();
