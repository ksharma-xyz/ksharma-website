// Write docs/sitemap.xml from the site pages and migration/posts.mjs.
//   node scripts/sitemap.mjs
import fs from 'node:fs';
import { POSTS } from '../migration/posts.mjs';
const today = new Date().toISOString().slice(0, 10);
const u = (loc, pri) => `  <url><loc>https://ksharma.xyz${loc}</loc><lastmod>${today}</lastmod><priority>${pri}</priority></url>`;
const out = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  u('/', '1.0'), u('/work/', '0.9'), u('/writing/', '0.8'), u('/about/', '0.7'), u('/photos/', '0.5'),
  ...POSTS.map(p => u(`/blog/${p.slug}/`, '0.6')), '</urlset>', ''].join('\n');
fs.writeFileSync(new URL('../docs/sitemap.xml', import.meta.url), out);
console.log('wrote docs/sitemap.xml');
