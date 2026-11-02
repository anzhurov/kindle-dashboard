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
await browser.close();

const gray = sharp(raw).grayscale().toColourspace('b-w');
await gray.clone().rotate(ROTATE).png({ compressionLevel: 9 }).toFile(path.join(outDir, 'dash.png'));

// Kindle package: scripts + battery icons, pulled by dash.sh when `version` changes
const BATTERY = { x: 920, y: 62, width: 96, height: 48 };
const batterySvg = (pct) => {
  const { width: w, height: h } = BATTERY;
  const fill = Math.round(((w - 31) * pct) / 100);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
    <rect width="${w}" height="${h}" fill="#fff"/>
    <rect x="3" y="3" width="${w - 14}" height="${h - 6}" rx="11" fill="#fff" stroke="#000" stroke-width="5"/>
    <rect x="${w - 8}" y="${h / 2 - 8}" width="7" height="16" rx="3" fill="#000"/>
    ${fill > 0 ? `<rect x="11" y="11" width="${fill}" height="${h - 22}" rx="5" fill="#000"/>` : ''}
  </svg>`;
};
const batteryPng = (pct) =>
  sharp(Buffer.from(batterySvg(pct))).flatten({ background: '#fff' }).grayscale().toColourspace('b-w').png().toBuffer();

const kindleOut = path.join(outDir, 'kindle');
await rm(kindleOut, { recursive: true, force: true });
await cp(path.join(root, 'kindle', 'dashboard'), kindleOut, {
  recursive: true,
  filter: (src) => !/\.(log|old)$/.test(src),
});
await mkdir(path.join(kindleOut, 'battery'), { recursive: true });
for (let pct = 0; pct <= 100; pct += 5) {
  await writeFile(path.join(kindleOut, 'battery', `${pct}.png`), await batteryPng(pct));
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
  .composite([{ input: await batteryPng(80), left: BATTERY.x, top: BATTERY.y }])
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
