import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const WIDTH = 1072;
const HEIGHT = 1448;
const TZ = process.env.DASH_TZ || 'Europe/Kyiv';
const CHANNEL = process.env.PW_CHANNEL || 'chrome';
const ROTATE = Number(process.env.DASH_ROTATE || 0);

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'out');
const pageUrl = pathToFileURL(path.join(root, 'dashboard', 'index.html')).href;

await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ channel: CHANNEL });
const page = await browser.newPage({
  viewport: { width: WIDTH, height: HEIGHT },
  deviceScaleFactor: 1,
  timezoneId: TZ,
  locale: 'uk-UA',
});
page.on('console', (m) => console.log(`[page] ${m.text()}`));
page.on('pageerror', (e) => console.error(`[page error] ${e.message}`));

await page.goto(pageUrl, { waitUntil: 'networkidle' });
await page
  .waitForFunction(() => window.dashReady === true, null, { timeout: 40000 })
  .catch(() => console.warn('dashReady not set after 40s, rendering anyway'));

// a failed run keeps the previous image on Pages instead of publishing an empty board
const dashError = await page.evaluate(() => window.dashError);
if (dashError && !process.env.DASH_ALLOW_ERRORS) {
  await browser.close();
  console.error(`Dashboard data failed: ${dashError}`);
  process.exit(1);
}
await page.evaluate(() => document.fonts.ready);

const raw = await page.screenshot({ type: 'png' });
await browser.close();

const gray = sharp(raw).grayscale().toColourspace('b-w');
await gray.clone().png({ compressionLevel: 9 }).toFile(path.join(outDir, 'preview.png'));
await gray.clone().rotate(ROTATE).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'dash.png'));

await writeFile(
  path.join(outDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Kindle dashboard</title>
<body style="margin:0;background:#888;display:grid;place-items:center;min-height:100vh">
<img src="preview.png?t=${Date.now()}" style="max-width:95vw;box-shadow:0 0 20px #0006">
<p style="font:14px sans-serif;color:#fff">Rendered ${new Date().toISOString()}</p>`
);

console.log(`Rendered ${WIDTH}x${HEIGHT}, rotated ${ROTATE}° -> out/dash.png (tz ${TZ})`);
