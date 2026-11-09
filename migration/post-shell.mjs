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

/** Turn a row of 3 or more screenshots into a carousel track (idempotent). Buttons are added by the page script. */
export function carouselise(html) {
  return html.replace(/<div class="shots"([^>]*)>([\s\S]*?)<\/div>/g, (all, attrs, inner) => {
    if ((inner.match(/<figure\b/g) || []).length < 3) return all;
    const label = /aria-label="/.test(attrs) ? '' : ' aria-label="Screenshots"';
    const tab = /tabindex=/.test(attrs) ? '' : ' tabindex="0"';
    const role = /role=/.test(attrs) ? '' : ' role="group"';
    return `<div class="shots carousel"${attrs}${tab}${role}${label} data-carousel>${inner}</div>`;
  });
}

/** Small images that carry a width attribute keep that size (width:auto in the CSS would stretch them to their pixel size). */
export function keepSmallSizes(html) {
  return html.replace(/<img\b(?![^>]*\bstyle=)([^>]*?)\bwidth="(\d{1,3})"([^>]*?)>/g, (all, a, w, b) =>
    Number(w) <= 400 ? `<img${a}width="${w}"${b} style="width:${w}px">` : all);
}

export const prepareBody = html => keepSmallSizes(carouselise(decorateExternal(html.trim())));

export function renderPost(post, contentHtml, { prev, next } = {}) {
  const url = `${BASE}/blog/${post.slug}/`;
  const when = dateLabel(post.date);
  const image = post.image ? BASE + post.image : `${BASE}/assets/og-cover.png`;
  const body = prepareBody(contentHtml);
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

<main id="main" class="wrap" tabindex="-1">
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
  document.querySelectorAll('.prose [data-carousel]').forEach(function (track) {
    var wrap = document.createElement('div'); wrap.className = 'carousel-wrap';
    track.parentNode.insertBefore(wrap, track); wrap.appendChild(track);
    var btns = document.createElement('div'); btns.className = 'carousel-btns';
    var ico = function (d) { return '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="' + d + '"/></svg>'; };
    function mk(name, d) { var b = document.createElement('button'); b.type = 'button'; b.className = 'icon-btn'; b.setAttribute('aria-label', name); b.innerHTML = ico(d); btns.appendChild(b); return b; }
    var prev = mk('Previous screenshot', 'M12 4 6 10l6 6'), next = mk('Next screenshot', 'M8 4l6 6-6 6');
    wrap.appendChild(btns);
    function step() { var f = track.querySelector('figure'); return f ? f.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 24) : 260; }
    function update() { btns.hidden = track.scrollWidth <= track.clientWidth + 1; prev.disabled = track.scrollLeft <= 1; next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 1; }
    prev.addEventListener('click', function () { track.scrollBy({ left: -step() }); });
    next.addEventListener('click', function () { track.scrollBy({ left: step() }); });
    track.addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
  });
  function reachable() {
    document.querySelectorAll('.prose pre, .prose table').forEach(function (el) {
      if (el.scrollWidth > el.clientWidth) { el.tabIndex = 0; el.setAttribute('role', 'region'); el.setAttribute('aria-label', el.tagName === 'PRE' ? 'Code sample' : 'Table'); }
    });
  }
  reachable(); addEventListener('resize', reachable);
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
