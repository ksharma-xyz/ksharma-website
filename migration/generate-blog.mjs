// Generate styled blog post pages from the scraped Markdown.
// Reads migration/extracted/blog/*.md, cleans Google Sites artifacts, renders to
// HTML, copies images, and writes docs/blog/<slug>/index.html. Run after extract.mjs.
//   cd migration && node generate-blog.mjs            # new posts only
//   cd migration && node generate-blog.mjs --force    # also overwrite existing posts
//
// Existing posts are hand-edited after generation, so they are skipped unless
// --force is given. Page shell (head, header, footer) comes from post-shell.mjs;
// add a new post's metadata to posts.mjs first. To restyle existing posts without
// touching their bodies, run scripts/restyle-posts.mjs instead.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { POSTS } from './posts.mjs';
import { renderPost } from './post-shell.mjs';
const FORCE = process.argv.includes('--force');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, 'extracted', 'blog');
const IMG_SRC = path.join(SRC, 'images');
const OUT = path.join(__dirname, '..', 'docs', 'blog');
const BASE = 'https://ksharma.xyz';

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

// First pass: collect all post metadata sorted by date (oldest first)
const files = fs.readdirSync(SRC).filter(f => f.endsWith('.md'));
const posts = files.map(f => {
  const slug = f.replace(/\.md$/, '');
  const raw = fs.readFileSync(path.join(SRC, f), 'utf8');
  const { fm, body } = parseFront(raw);
  const cleaned = clean(body, slug);
  const title = (fm.title && fm.title !== slug) ? fm.title : slug.replace(/-/g, ' ');
  let dateLabel = '';
  if (fm.date) { const [y, m] = fm.date.split('-'); dateLabel = `${MONTHS[m] || ''} ${y}`.trim(); }
  return { slug, raw, fm, cleaned, title, dateLabel };
});
posts.sort((a, b) => (a.fm.date || '0000') < (b.fm.date || '0000') ? -1 : 1);

let n = 0;
for (let i = 0; i < posts.length; i++) {
  const { slug, cleaned, title, dateLabel } = posts[i];
  const contentHtml = marked.parse(cleaned);
  const readLabel = readTime(cleaned);
  const prevPost = i > 0 ? { slug: posts[i - 1].slug, title: posts[i - 1].title } : null;
  const nextPost = i < posts.length - 1 ? { slug: posts[i + 1].slug, title: posts[i + 1].title } : null;

  const outDir = path.join(OUT, slug);
  const outFile = path.join(outDir, 'index.html');
  if (fs.existsSync(outFile) && !FORCE) { console.log(`- blog/${slug}/ exists, skipped (hand-edited; use --force)`); continue; }
  const idx = POSTS.findIndex(p => p.slug === slug);
  if (idx < 0) { console.log(`! blog/${slug}/ has no entry in posts.mjs, skipped`); continue; }
  fs.mkdirSync(outDir, { recursive: true });
  const srcImg = path.join(IMG_SRC, slug);
  if (fs.existsSync(srcImg)) {
    const dstImg = path.join(outDir, 'images');
    fs.mkdirSync(dstImg, { recursive: true });
    fs.cpSync(srcImg, dstImg, { recursive: true });
  }
  fs.writeFileSync(outFile, renderPost(POSTS[idx], contentHtml, { prev: POSTS[idx + 1] || null, next: POSTS[idx - 1] || null }));
  console.log(`✓ blog/${slug}/  (${dateLabel}, ${readLabel})`);
  n++;
}
console.log(`\nGenerated ${n} post pages -> ${OUT}`);
