// The page shell around a blog post: head, site header, post header, byline,
// previous/next links and footer. The article body is passed in untouched.
// Everything between the CONTENT markers is the post itself.
import { dateLabel } from './posts.mjs';

const BASE = 'https://ksharma.xyz';
export const CONTENT_START = '<!-- post-content:start -->';
export const CONTENT_END = '<!-- post-content:end -->';

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const icon = d => `<svg class="i" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
const BACK = '<svg class="chev-l" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8 10 12.5"/></svg>';
const CARD_CHEV = '<svg class="card-chev" viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';

export function renderPost(post, contentHtml, { prev, next } = {}) {
  const url = `${BASE}/blog/${post.slug}/`;
  const when = dateLabel(post.date);
  const image = post.image ? BASE + post.image : `${BASE}/assets/og-cover.png`;
  const hasCode = /<pre>|<code class="language-/.test(contentHtml);
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
  const navCard = (p, label, cls) => p
    ? `<a class="card ${cls}" href="/blog/${p.slug}/"><span class="label">${label}</span><span class="title">${esc(p.title)}</span>${CARD_CHEV}</a>`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script>
  // Theme before first paint: ?theme=light|dark, else the saved choice, else the OS setting.
  (function () {
    var t = null;
    try {
      var q = new URLSearchParams(location.search).get('theme');
      if (q === 'light' || q === 'dark') { t = q; localStorage.setItem('theme', q); }
      else t = localStorage.getItem('theme');
    } catch (e) {}
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  })();
</script>
<title>${esc(post.title)} | Karan Sharma</title>
<meta name="description" content="${esc(post.description)}">
<meta name="author" content="Karan Sharma">
<link rel="canonical" href="${url}">
<meta name="theme-color" content="#FBFCFE" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#121212" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Karan Sharma">
<meta property="og:url" content="${url}">
<meta property="og:title" content="${esc(post.title)}">
<meta property="og:description" content="${esc(post.description)}">
<meta property="og:image" content="${BASE}/assets/og-cover.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="article:published_time" content="${post.date}">
<meta property="article:author" content="Karan Sharma">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(post.title)}">
<meta name="twitter:description" content="${esc(post.description)}">
<meta name="twitter:image" content="${BASE}/assets/og-cover.png">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="preload" href="/assets/fonts/Switzer-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>

<header class="site-header">
  <div class="wrap header-row">
    <a class="brand" href="/">Karan Sharma</a>
    <nav class="site-nav" aria-label="Primary">
      <ul>
        <li><a href="/work/">Work</a></li>
        <li><a href="/writing/" aria-current="true">Writing</a></li>
        <li><a href="/photos/">Photos</a></li>
        <li><a href="/about/">About</a></li>
      </ul>
    </nav>
    <div class="header-end">
      <button class="theme-toggle" type="button" aria-label="Switch to dark theme" hidden>
        <svg class="i-moon" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z"/></svg>
        <svg class="i-sun" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>
      </button>
    </div>
  </div>
</header>

<main id="main" class="wrap">
  <div class="post-head">
    <a class="btn btn-secondary back" href="/writing/">${BACK} All writing</a>
    <h1>${esc(post.title)}</h1>
    <p class="post-meta"><time class="num" datetime="${post.date}">${when}</time>, <span class="num">${post.read}</span> min read</p>
  </div>
  <article class="article">
${CONTENT_START}
${contentHtml.trim()}
${CONTENT_END}
  </article>
  <div class="post-end">
    <div class="byline">
      <div><strong>Karan Sharma</strong><span>Staff Software Engineer, Sydney</span></div>
      <button class="btn btn-secondary" type="button" data-share hidden>Share this post</button>
    </div>
    <nav class="post-nav" aria-label="More posts">
      ${navCard(prev, 'Older post', 'prev')}
      ${navCard(next, 'Newer post', next && !prev ? 'next only-next' : 'next')}
    </nav>
  </div>
</main>

<footer class="site-footer">
  <div class="wrap">
    <div class="footer-row">
      <h2 class="footer-title">Get in touch</h2>
      <div class="footer-links">
        <a href="mailto:hey@krail.app">hey@krail.app</a>
        <a href="https://www.linkedin.com/in/ksharma-xyz/" rel="me noopener">LinkedIn</a>
        <a href="https://github.com/ksharma-xyz" rel="me noopener">GitHub</a>
      </div>
    </div>
    <p class="footer-meta"><span>&copy; 2026 Karan Sharma, Sydney</span></p>
  </div>
</footer>
<script>
(function () {
  // Wide code blocks and tables scroll sideways: make them reachable by keyboard.
  document.querySelectorAll('.article pre, .article table').forEach(function (el) {
    if (el.scrollWidth > el.clientWidth) { el.tabIndex = 0; el.setAttribute('role', 'region'); el.setAttribute('aria-label', el.tagName === 'PRE' ? 'Code sample' : 'Table'); }
  });
  var b = document.querySelector('[data-share]');
  if (!b || !(navigator.share || navigator.clipboard)) return;
  b.hidden = false;
  b.addEventListener('click', function () {
    var data = { title: document.title, url: location.href };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    navigator.clipboard.writeText(location.href).then(function () {
      b.textContent = 'Link copied';
      setTimeout(function () { b.textContent = 'Share this post'; }, 1800);
    });
  });
})();
</script>
${hasCode ? `<script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/kotlin.min.js"></script>
<script defer src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/protobuf.min.js"></script>
<script>addEventListener('DOMContentLoaded', function () { if (window.hljs) hljs.highlightAll(); });</script>
` : ''}<script>
  // Header theme toggle: flips light/dark and remembers the choice.
  (function () {
    var b = document.querySelector('.theme-toggle');
    if (!b) return;
    var root = document.documentElement;
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : mq.matches; }
    function label() { b.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme'); }
    b.hidden = false; label();
    if (mq.addEventListener) mq.addEventListener('change', label);
    b.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      label();
    });
  })();
</script>
</body>
</html>
`;
}
