// Re-wrap every existing post in the current page shell without touching its body.
//   node scripts/restyle-posts.mjs
// Posts are hand-edited after generation, so the body is read back out of each
// docs/blog/<slug>/index.html and written back byte for byte. Works on both the
// old template (article ... article-byline) and the current one (content markers).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTS } from '../migration/posts.mjs';
import { renderPost, prepareBody, CONTENT_START, CONTENT_END } from '../migration/post-shell.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

export function extractBody(html) {
  if (html.includes(CONTENT_START)) {
    return html.split(CONTENT_START)[1].split(CONTENT_END)[0];
  }
  const start = html.indexOf('<article class="article">');
  const end = html.indexOf('<div class="article-byline">');
  if (start < 0 || end < 0) throw new Error('could not find the post body');
  return html.slice(start + '<article class="article">'.length, end);
}

for (let i = 0; i < POSTS.length; i++) {
  const post = POSTS[i];
  const file = path.join(ROOT, 'docs', 'blog', post.slug, 'index.html');
  const before = fs.readFileSync(file, 'utf8');
  const body = extractBody(before);
  const next = POSTS[i - 1] || null; // newer
  const prev = POSTS[i + 1] || null; // older
  const out = renderPost(post, body, { prev, next });
  if (extractBody(out).trim() !== prepareBody(body)) throw new Error(`body changed for ${post.slug}`);
  fs.writeFileSync(file, out);
  console.log(`restyled blog/${post.slug}/`);
}
