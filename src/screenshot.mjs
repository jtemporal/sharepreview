import fs from 'node:fs';
import path from 'node:path';

export async function capturePreviewScreenshot(previewUrl, outputPath) {
  let puppeteer;
  try {
    puppeteer = await import('puppeteer');
  } catch {
    throw new Error('Missing puppeteer. Install it with: npm install puppeteer');
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const browser = await puppeteer.default.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(previewUrl, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: outputPath, fullPage: true, type: 'png' });
  } finally {
    await browser.close();
  }

  return outputPath;
}