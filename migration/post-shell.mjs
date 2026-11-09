// The page shell around a blog post: head, site header, post header, previous/next
// links and footer. The article body is passed in untouched, except that links to other
// sites get the external-link icon (decorateExternal, idempotent).
// Everything between the CONTENT markers is the post itself.
import { dateLabel } from './posts.mjs';
import { BASE, esc, open, header, footer, OUT_ICON, THEME_SCRIPT } from './layout.mjs';

export const CONTENT_START = '<!-- post-content:start -->';
export const CONTENT_END = '<!-- post-content:end -->';

/** Add the external icon after the label of every text link that leaves the site. */
export function decorateExternal(html) {
  return html.replace(/<a\b([^>]*\bhref="https?:\/\/(?!ksharma\.xyz)[^"]*"[^>]*)>([\s\S]*?)<\/a>/g, (all, attrs, inner) => {
    if (inner.includes('class="ext"') || /<img\b/.test(inner)) return all;
    return `<a${attrs}>${inner.trimEnd()}${OUT_ICON}</a>`;
  });
}

export function renderPost(post, contentHtml, { prev, next } = {}) {
  const url = `${BASE}/blog/${post.slug}/`;
  const when = dateLabel(post.date);
  const image = post.image ? BASE + post.image : `${BASE}/assets/og-cover.png`;
  const body = decorateExternal(contentHtml.trim());
  const hasCode = /<pre>|<code class="language-/.test(body);
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    url,
    mainEntityOfPage: url,
    image,
    author: { '@type': 'Person', '@id': `${BASE}/#person`, name: 'Karan Sharma', url: `${BASE}/` },
  };
  const navCard = p => `<a class="card" href="/blog/${p.slug}/"><h3>${esc(p.title)}</h3></a>`;
  const more = [prev, next].filter(Boolean);
  return `${open({
    title: `${post.title} | Karan Sharma`, description: post.description, canonical: url, ogType: 'article',
    ogTitle: post.title, ld,
    extraMeta: `<meta property="article:published_time" content="${post.date}">\n<meta property="article:author" content="Karan Sharma">\n`,
  })}
${header('post')}

<main id="main" class="wrap">
  <article class="post">
    <div class="actions"><a class="btn btn-sm" href="/blog/">All posts</a></div>
    <h1>${esc(post.title)}</h1>
    <p class="meta num"><time datetime="${post.date}">${when}</time>, ${post.read} min read</p>
    <div class="prose">
${CONTENT_START}
${body}
${CONTENT_END}
    </div>
    <nav class="grid" aria-label="More posts">
      <h2 class="visually-hidden">More posts</h2>
      ${more.map(navCard).join('\n      ')}
    </nav>
  </article>
</main>

${footer()}
<script>
(function () {
  // Wide code blocks and tables scroll sideways: make them reachable by keyboard.
  document.querySelectorAll('.prose pre, .prose table').forEach(function (el) {
    if (el.scrollWidth > el.clientWidth) { el.tabIndex = 0; el.setAttribute('role', 'region'); el.setAttribute('aria-label', el.tagName === 'PRE' ? 'Code sample' : 'Table'); }
  });
})();
</script>
${hasCode ? `<script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/kotlin.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/protobuf.min.js"></script>
<script>addEventListener('DOMContentLoaded', function () { if (window.hljs) hljs.highlightAll(); });</script>
` : ''}${THEME_SCRIPT}
</body>
</html>
`;
}
