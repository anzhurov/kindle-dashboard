import { chromium } from 'playwright';
import sharp from 'sharp';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

// battery badges (0..100%) in the dashboard font, drawn by the Kindle at BATTERY.x/y
const BATTERY = { x: 816, y: 58, width: 200, height: 48 };
await page.setViewportSize({ width: BATTERY.width, height: BATTERY.height * 101 });
await page.goto(pathToFileURL(path.join(root, 'dashboard', 'battery.html')).href, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.dashReady === true, null, { timeout: 20000 });
const badgeSheet = await page.screenshot({ type: 'png' });
await browser.close();

const toGray = (img) => img.flatten({ background: '#fff' }).grayscale().toColourspace('b-w');
const gray = toGray(sharp(raw));
await gray.clone().rotate(ROTATE).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'dash.png'));

const badge = (pct) =>
  toGray(sharp(badgeSheet).extract({ left: 0, top: pct * BATTERY.height, width: BATTERY.width, height: BATTERY.height }))
    .png({ compressionLevel: 9 })
    .toBuffer();

// Kindle package: scripts + battery badges, pulled by dash.sh when `version` changes
const kindleOut = path.join(outDir, 'kindle');
await rm(kindleOut, { recursive: true, force: true });
await cp(path.join(root, 'kindle', 'dashboard'), kindleOut, {
  recursive: true,
  filter: (src) => !/\.(log|old)$/.test(src),
});
await mkdir(path.join(kindleOut, 'battery'), { recursive: true });
for (let pct = 0; pct <= 100; pct++) {
  await writeFile(path.join(kindleOut, 'battery', `${pct}.png`), await badge(pct));
}
const files = (await readdir(kindleOut, { recursive: true, withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => path.relative(kindleOut, path.join(e.parentPath, e.name)))
  .sort();
const hash = createHash('sha256');
for (const f of files) hash.update(f).update(await readFile(path.join(kindleOut, f)));
await writeFile(path.join(kindleOut, 'files'), `${files.join('\n')}\n`);
await writeFile(path.join(kindleOut, 'version'), `${hash.digest('hex').slice(0, 12)}\n`);

// preview shows a sample battery where the Kindle draws the real one
await gray
  .clone()
  .composite([{ input: await badge(80), left: BATTERY.x, top: BATTERY.y }])
  .removeAlpha()
  .png({ compressionLevel: 9 })
  .toFile(path.join(outDir, 'preview.png'));

await writeFile(
  path.join(outDir, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Kindle dashboard</title>
<body style="margin:0;background:#888;display:grid;place-items:center;min-height:100vh">
<img src="preview.png?t=${Date.now()}" style="max-width:95vw;box-shadow:0 0 20px #0006">
<p style="font:14px sans-serif;color:#fff">Rendered ${new Date().toISOString()}</p>`
);

console.log(`Rendered ${WIDTH}x${HEIGHT}, rotated ${ROTATE}° -> out/dash.png (tz ${TZ})`);
