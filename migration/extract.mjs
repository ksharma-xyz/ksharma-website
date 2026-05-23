// One-off extractor for the old Google Sites at ksharma.xyz.
// Renders each page with the installed Chrome (via puppeteer-core), pulls the
// [role=main] content, converts it to Markdown (Turndown), downloads every
// Google-hosted image, converts to WebP (cwebp), and rewrites image links to
// the local files. Output: migration/extracted/.
//
// Run: cd migration && npm install && node extract.mjs
// Requires: Google Chrome at the macOS default path, and `cwebp` on PATH.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import TurndownService from 'turndown';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, 'extracted');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ORIGIN = 'https://www.ksharma.xyz';

// Discovered URL set (crawled from the nav + index pages, May 2026).
const PAGES = ['home', 'portfolio', 'blog', 'photography', 'social'];
const PORTFOLIO = ['commonwealthbankaustralia', 'cash-app', 'money-by-afterpay', 'telstra',
  'zip-pay', 'qualcomm', 'micromax', 'portea', 'qantas', 'my-beepr'];
const BLOG = ['jetpack-compose-best-practices', 'google-io-extended-2025-compose-multiplatform-to-city',
  'protobuf-generate-kotlin-code', 'graphite-improve-dev-velocity-using-git',
  'android-adb-shortcuts-for-productivity', 'encryption-google-tink-android',
  'jetpack-compose-security-disable-screenshots-recordings', 'a11y-weather-app-android',
  'accessibility-list-item-android-jetpack-compose'];

// Publish dates from the blog index (Google Sites doesn't render them in-page).
const BLOG_DATES = {
  'jetpack-compose-best-practices': '2025-08',
  'google-io-extended-2025-compose-multiplatform-to-city': '2025-06',
  'protobuf-generate-kotlin-code': '2024-07',
  'graphite-improve-dev-velocity-using-git': '2024-06',
  'android-adb-shortcuts-for-productivity': '2024-06',
  'encryption-google-tink-android': '2024-05',
  'jetpack-compose-security-disable-screenshots-recordings': '2024-04',
  'a11y-weather-app-android': '2023-02',
  'accessibility-list-item-android-jetpack-compose': '2023-01',
};

const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-' });

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }
function slugType(slug) {
  if (BLOG.includes(slug)) return 'blog';
  if (PORTFOLIO.includes(slug)) return 'portfolio';
  return 'pages';
}

async function downloadImage(url, destNoExt) {
  // Ask Google for a reasonable width instead of the giant =w16383.
  const sized = url.replace(/=w\d+(-h\d+)?$/i, '=w1600').replace(/=s\d+$/i, '=s1600');
  const res = await fetch(sized);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const tmp = destNoExt + '.orig';
  fs.writeFileSync(tmp, buf);
  const webp = destNoExt + '.webp';
  try {
    execFileSync('cwebp', ['-quiet', '-q', '82', tmp, '-o', webp]);
    fs.unlinkSync(tmp);
    return path.basename(webp);
  } catch {
    // cwebp can't read some formats (e.g. SVG) — keep the original.
    const ext = buf.slice(0, 4).toString('hex').startsWith('89504e47') ? '.png' : '.img';
    const kept = destNoExt + ext;
    fs.renameSync(tmp, kept);
    return path.basename(kept);
  }
}

async function run() {
  ensureDir(OUT);
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const manifest = [];
  const all = [...PAGES, ...PORTFOLIO, ...BLOG];

  for (const slug of all) {
    const url = `${ORIGIN}/${slug}`;
    const type = slugType(slug);
    const page = await browser.newPage();
    await page.setViewport({ width: 1366, height: 1000 });
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector('[role=main]', { timeout: 15000 }).catch(() => {});

      // Google Sites hydrates content AND lazy-loads images on scroll. Step
      // through the full height (both directions) and wait for things to settle.
      await page.evaluate(async () => {
        const sleep = ms => new Promise(r => setTimeout(r, ms));
        const step = Math.round(window.innerHeight * 0.8);
        for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await sleep(250); }
        window.scrollTo(0, document.body.scrollHeight); await sleep(600);
        window.scrollTo(0, 0); await sleep(400);
      });
      await new Promise(r => setTimeout(r, 1200));

      const title = (await page.title()).replace(/^Karan Sharma\s*[-–]\s*/, '').trim();

      // Content for markdown. Google Sites puts the real content in a wrapper
      // div (NOT [role=main], which is near-empty). Pick the element holding the
      // most text, short of the whole body — robust across pages.
      let html = await page.evaluate(() => {
        // Strip Google Sites chrome so the extract is just the page's own content.
        document.querySelectorAll('header,footer,nav,script,style,[role=banner],[role=navigation],[role=contentinfo]')
          .forEach(el => el.remove());
        const bodyLen = document.body.innerText.length;
        let best = document.body, bestLen = 0;
        document.querySelectorAll('div,section,article,main').forEach(el => {
          const t = el.innerText.length;
          if (t > bestLen && t < bodyLen) { best = el; bestLen = t; }
        });
        return best.innerHTML;
      });

      // Images: gather document-wide (banners included) from <img> currentSrc/
      // srcset and from computed background-image. Most robust source of URLs.
      const imgUrls = await page.evaluate(() => {
        const out = new Set();
        const pick = u => { if (u && /googleusercontent\.com/.test(u)) out.add(u.split(' ')[0]); };
        document.querySelectorAll('img').forEach(img => {
          pick(img.currentSrc); pick(img.src);
          if (img.srcset) img.srcset.split(',').forEach(s => pick(s.trim()));
        });
        document.querySelectorAll('*').forEach(el => {
          const bg = getComputedStyle(el).backgroundImage;
          if (bg && bg !== 'none') { const m = bg.match(/url\(["']?([^"')]+)["']?\)/); if (m) pick(m[1]); }
        });
        return [...out];
      });

      // Raw HTML for re-processing later.
      ensureDir(path.join(OUT, 'html'));
      fs.writeFileSync(path.join(OUT, 'html', `${slug}.html`), html);

      // Images: download + webp, rewrite links to local relative paths.
      const imgDir = path.join(OUT, type, 'images', slug);
      let idx = 0;
      const imgFiles = [];
      for (const iurl of imgUrls) {
        ensureDir(imgDir);
        const base = path.join(imgDir, `img-${++idx}`);
        try {
          const fname = await downloadImage(iurl, base);
          const rel = `images/${slug}/${fname}`;
          // Rewrite any occurrence of this image (ignoring its size suffix) in the HTML.
          const stable = iurl.split('=')[0];
          const esc = stable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          html = html.replace(new RegExp(esc + '[^"\')\\s]*', 'g'), rel);
          imgFiles.push(rel);
        } catch (e) { console.warn(`  ! image failed ${iurl.slice(0, 60)}: ${e.message}`); }
      }

      // HTML -> Markdown.
      const md = td.turndown(html);
      const date = BLOG_DATES[slug] || '';
      const fm = [`---`, `title: ${JSON.stringify(title)}`, `source: ${url}`,
        date ? `date: ${date}` : null, `type: ${type}`, `---`, ''].filter(x => x !== null).join('\n');
      ensureDir(path.join(OUT, type));
      fs.writeFileSync(path.join(OUT, type, `${slug}.md`), fm + md + '\n');

      manifest.push({ slug, url, type, title, date, images: imgFiles.length });
      console.log(`✓ ${type}/${slug}  (${imgFiles.length} imgs)`);
    } catch (e) {
      console.error(`✗ ${slug}: ${e.message}`);
      manifest.push({ slug, url, type, error: e.message });
    } finally {
      await page.close();
    }
  }

  fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
  await browser.close();
  console.log(`\nDone. ${manifest.length} pages -> ${OUT}`);
}

run().catch(e => { console.error(e); process.exit(1); });
