// Generate styled blog post pages from the scraped Markdown.
// Reads migration/extracted/blog/*.md, cleans Google Sites artifacts, renders to
// HTML, copies images, and writes docs/blog/<slug>/index.html. Run after extract.mjs.
//   cd migration && node generate-blog.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'extracted', 'blog');
const IMG_SRC = path.join(SRC, 'images');
const OUT = path.join(__dirname, '..', 'docs', 'blog');
const BASE = 'https://ksharma-xyz.github.io/ksharma-website';

const MONTHS = { '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec' };

// Canonical post titles (the page <title> from Google Sites was unreliable).
const TITLES = {
  'jetpack-compose-best-practices': 'Best practices for designing Jetpack Compose APIs',
  'google-io-extended-2025-compose-multiplatform-to-city': 'Google I/O Extended 2025 (Brisbane): Compose Multiplatform to the City',
  'protobuf-generate-kotlin-code': 'Sugar, Spice, and Protobuf: cross-platform collaboration',
  'graphite-improve-dev-velocity-using-git': 'Ship faster with Graphite: improve dev velocity',
  'android-adb-shortcuts-for-productivity': 'Android: adb shortcuts for productivity',
  'encryption-google-tink-android': 'Cryptography with Google Tink on Android',
  'jetpack-compose-security-disable-screenshots-recordings': 'Protect data by blocking screenshots in Jetpack Compose',
  'a11y-weather-app-android': 'Accessible Weather App in Jetpack Compose',
  'accessibility-list-item-android-jetpack-compose': 'Accessibility: List Item Design in Jetpack Compose',
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function parseFront(raw) {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: raw };
  const fm = {};
  m[1].split('\n').forEach(l => { const i = l.indexOf(':'); if (i > 0) fm[l.slice(0, i).trim()] = l.slice(i + 1).trim().replace(/^"|"$/g, ''); });
  return { fm, body: m[2] };
}

function clean(body, slug) {
  return body
    // keep link text, drop Google Sites heading-anchor hrefs
    .replace(/\[([^\]]*)\]\(#[^)]*\)/g, '$1')
    // drop empty heading lines
    .replace(/^#{1,6}[ \t]*$/gm, '')
    // point image paths at the per-post images/ dir we copy alongside the page
    .replace(new RegExp('images/' + slug + '/', 'g'), 'images/')
    // em dashes are banned in copy
    .replace(/ — /g, ', ').replace(/—/g, '-')
    // collapse blank runs
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function readTime(text) {
  const words = text.split(/\s+/).length;
  return Math.max(2, Math.round(words / 220)) + ' min read';
}

function page({ title, dateLabel, slug, contentHtml, readLabel }) {
  const url = `${BASE}/blog/${slug}/`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${esc(title)} | Karan Sharma</title>
<meta name="description" content="${esc(title)}. An engineering post by Karan Sharma." />
<link rel="canonical" href="${url}" />
<meta name="theme-color" content="#13B0E5" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="Karan Sharma" />
<meta property="og:url" content="${url}" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="An engineering post by Karan Sharma." />
<meta property="og:image" content="${BASE}/assets/og-cover.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="${BASE}/assets/og-cover.png" />
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"BlogPosting","headline":${JSON.stringify(title)},"author":{"@type":"Person","name":"Karan Sharma","url":"${BASE}/"},"url":"${url}","image":"${BASE}/assets/og-cover.png"}
</script>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><rect x='1' y='1' width='30' height='30' rx='4' fill='%2313B0E5' stroke='%230A1620' stroke-width='2'/><text x='50%25' y='53%25' dominant-baseline='central' text-anchor='middle' font-family='Inter,Arial,sans-serif' font-weight='800' font-size='15' fill='%23ffffff'>KS</text></svg>" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" />
<link rel="stylesheet" media="print" onload="this.media='all'" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" />
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap" /></noscript>
<link rel="stylesheet" href="../../assets/site.css" />
</head>
<body>
<header class="top">
  <div class="inner">
    <a href="../../" class="brand"><span class="glyph">KS</span><span>Karan Sharma</span></a>
    <nav class="tabs"><a href="../../#blog" style="text-decoration:none"><button>All posts</button></a></nav>
    <div class="header-cta"><a href="mailto:hey@krail.app" class="btn-3d ghost" style="padding:8px 14px;font-size:13px;box-shadow:3px 3px 0 var(--ink)">Get in touch</a></div>
  </div>
</header>

<main class="post-wrap">
  <div class="post-head">
    <a class="post-back" href="../../#blog">&larr; All posts</a>
    <div class="pin">${dateLabel} &middot; ${readLabel}</div>
    <h1>${esc(title)}</h1>
  </div>
  <article class="article">
${contentHtml}
  </article>
  <p style="padding:24px 0 8px"><a class="btn-3d ghost" href="../../#blog" style="box-shadow:3px 3px 0 var(--ink)">&larr; Back to all posts</a></p>
</main>

<footer class="bottom">
  <div class="inner" style="grid-template-columns:1fr">
    <div>
      <h4>Build something <span class="blue">together?</span></h4>
      <p>Happy to talk about Kotlin Multiplatform, mobile platforms, AI tooling, or speaking.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <a href="mailto:hey@krail.app" class="btn-3d">hey@krail.app <span class="arr">&rarr;</span></a>
        <a href="https://www.linkedin.com/in/ksharma-xyz/" rel="noopener" class="btn-3d ghost">LinkedIn <span class="arr">&#8599;</span></a>
      </div>
    </div>
    <div class="meta"><span>&copy; 2026 Karan Sharma &middot; Sydney</span><span>Built with plain HTML &middot; #13B0E5</span></div>
  </div>
</footer>
</body>
</html>
`;
}

const files = fs.readdirSync(SRC).filter(f => f.endsWith('.md'));
let n = 0;
for (const f of files) {
  const slug = f.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
  const { fm, body } = parseFront(raw);
  const cleaned = clean(body, slug);
  const contentHtml = marked.parse(cleaned);
  const title = (fm.title || slug).replace(/-/g, ' ');
  let dateLabel = '';
  if (fm.date) { const [y, m] = fm.date.split('-'); dateLabel = `${MONTHS[m] || ''} ${y}`.trim(); }
  const readLabel = readTime(cleaned);

  const outDir = path.join(OUT, slug);
  fs.mkdirSync(outDir, { recursive: true });
  // copy images for this post
  const srcImg = path.join(IMG_SRC, slug);
  if (fs.existsSync(srcImg)) {
    const dstImg = path.join(outDir, 'images');
    fs.mkdirSync(dstImg, { recursive: true });
    for (const im of fs.readdirSync(srcImg)) fs.copyFileSync(path.join(srcImg, im), path.join(dstImg, im));
  }
  fs.writeFileSync(path.join(outDir, 'index.html'), page({ title, dateLabel, slug, contentHtml, readLabel }));
  console.log(`✓ blog/${slug}/  (${dateLabel}, ${readLabel})`);
  n++;
}
console.log(`\nGenerated ${n} post pages -> ${OUT}`);
