// Shared page furniture for every page: head, header, footer, icon sprite and scripts.
// Used by scripts/build-pages.mjs (home, work, blog index, photos, about) and post-shell.mjs.
export const BASE = 'https://ksharma.xyz';
export const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const OUT_ICON = '<svg class="ext" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 11 11 5M6 5h5v5"/></svg>';
export const GH = '<svg class="gh" aria-hidden="true"><use href="#i-gh"/></svg>';
export const MAIL = '<svg class="mail" aria-hidden="true"><use href="#i-mail"/></svg>';
export const CHEV = '<svg class="chev" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">
  <symbol id="i-gh" viewBox="0 0 24 24"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 2.9.8.1-.7.4-1.1.6-1.3-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></symbol>
  <symbol id="i-mail" viewBox="0 0 16 16"><path d="M2 4h12v8H2zM2.5 4.5 8 9l5.5-4.5"/></symbol>
</svg>`;

export const THEME_HEAD = `<script>
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
</script>`;

const THEME_BTN = `<button class="icon-btn theme-toggle" type="button" aria-label="Switch to dark theme" hidden>
      <svg class="i-moon" viewBox="0 0 20 20" aria-hidden="true"><path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7Z"/></svg>
      <svg class="i-sun" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="3.6"/><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"/></svg>
    </button>`;

export const THEME_SCRIPT = `<script>
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
      document.dispatchEvent(new Event('themechange'));
    });
  })();
</script>`;

const NAV = [['/work/', 'Work'], ['/blog/', 'Blog'], ['/photos/', 'Photos'], ['/about/', 'About']];

/** active: '/work/' etc. for the page itself; 'post' marks a blog post (Blog stays current). */
export function header(active) {
  const links = NAV.map(([href, label]) => {
    const cur = href === active ? ' aria-current="page"' : (active === 'post' && href === '/blog/' ? ' aria-current="true"' : '');
    return `<a href="${href}"${cur}>${label}</a>`;
  }).join('');
  return `<header class="wrap site-header">
    <a class="logo" href="/"><span class="blk" aria-hidden="true"></span>Karan Sharma</a>
    <nav class="nav" aria-label="Primary">${links}</nav>
    ${THEME_BTN}
  </header>`;
}

export function footer() {
  return `<footer class="wrap site-footer">
  <div class="row-f">
    <h2>Get in touch</h2>
    <div class="actions">
      <a class="btn btn-sm" href="mailto:hey@krail.app">${MAIL}hey@krail.app</a>
      <a class="btn btn-sm" href="https://www.linkedin.com/in/ksharma-xyz/" rel="me noopener">LinkedIn ${OUT_ICON}</a>
      <a class="btn btn-sm" href="https://github.com/ksharma-xyz" rel="me noopener">${GH}GitHub ${OUT_ICON}</a>
    </div>
  </div>
  <p class="copy-note num">&copy; 2026 Karan Sharma, Sydney</p>
</footer>`;
}

/** Everything from <!doctype> to the opening <body>, plus skip link and icon sprite. */
export function open({ title, description, canonical, ogType = 'website', ogTitle, ogDescription, image = `${BASE}/assets/og-cover.png`, ld, extraMeta = '' }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${THEME_HEAD}
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="author" content="Karan Sharma">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#FFFFFF" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)">
<meta property="og:type" content="${ogType}">
<meta property="og:site_name" content="Karan Sharma">
<meta property="og:url" content="${canonical}">
<meta property="og:title" content="${esc(ogTitle || title)}">
<meta property="og:description" content="${esc(ogDescription || description)}">
<meta property="og:image" content="${image}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="en_AU">
${extraMeta}<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(ogTitle || title)}">
<meta name="twitter:description" content="${esc(ogDescription || description)}">
<meta name="twitter:image" content="${image}">
<link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
<link rel="preload" href="/assets/fonts/Switzer-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/JetBrainsMono-Variable.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script type="application/ld+json">
${JSON.stringify(ld, null, 2)}
</script>
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${SPRITE}
`;
}
