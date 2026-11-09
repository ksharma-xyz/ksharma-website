// Build the non-post pages: /, /work/, /blog/, /photos/, /about/ and the /writing/ redirect.
//   node scripts/build-pages.mjs
// Posts are built by migration/post-shell.mjs (scripts/restyle-posts.mjs). Page head data
// lives in migration/page-meta.json, the career roles in migration/career.json.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { POSTS, dateLabel } from '../migration/posts.mjs';
import { BASE, esc, open, header, footer, OUT_ICON, GH, CHEV, THEME_SCRIPT } from '../migration/layout.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const META = JSON.parse(fs.readFileSync(path.join(ROOT, 'migration', 'page-meta.json'), 'utf8'));
const CAREER = JSON.parse(fs.readFileSync(path.join(ROOT, 'migration', 'career.json'), 'utf8'));
const write = (rel, html) => { const f = path.join(ROOT, 'docs', rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, html); console.log('wrote docs/' + rel); };

// Blog is the section name everywhere; the old Writing wording and URL are retired.
const fixLd = ld => JSON.parse(JSON.stringify(ld)
  .replaceAll('https://ksharma.xyz/writing/', 'https://ksharma.xyz/blog/')
  .replaceAll('Writing by Karan Sharma', 'Blog by Karan Sharma')
  .replaceAll('"Writing"', '"Blog"')
  .replaceAll(
    'How AI agents built Veduta in 82 reviewed steps, and what on-device AI taught me',
    POSTS[0].title));

const link = (href, label, cls = 'btn', extra = '') => `<a class="${cls}" href="${href}"${extra}>${label}</a>`;
const ext = (href, label, cls = 'btn', lead = '') => `<a class="${cls}" href="${href}" rel="noopener">${lead}${label} ${OUT_ICON}</a>`;
const PAGE_END = `${footer()}\n${THEME_SCRIPT}\n`;

const IO_POST = '/blog/google-io-extended-2025-compose-multiplatform-to-city/';
const VEDUTA = POSTS[0];
const VEDUTA_SHORT = 'A team of AI agents built my app in 82 steps, each one reviewed before the next began. How they built it, what it cost, and what I learnt putting small AI models inside the app itself.';
const VEDUTA_LONG = 'A team of AI agents built my app in 82 steps, each one reviewed before the next began. Then I put it on a phone and used it, which is where most of the learning happened. How the agents built it, what it cost, and what I learnt putting small AI models inside the app itself.';
const meta = p => `${dateLabel(p.date)}, ${p.read} min read`;
const veduta = (h, summary) => `<a data-ux-fluid class="card card--wide post-feature" href="/blog/${VEDUTA.slug}/">
        <div class="thumb"><img src="${VEDUTA.image}" alt="" width="480" height="1044" loading="lazy" decoding="async"></div>
        <div class="text">
          <${h}>${esc(VEDUTA.title)}</${h}>
          <p>${summary}</p>
          <p class="meta num">${meta(VEDUTA)}</p>
        </div>
      </a>`;

/* ------------------------------------------------------------------ */
/* Home                                                               */
/* ------------------------------------------------------------------ */
function home() {
  const m = META.index;
  const recent = POSTS.slice(1, 5).map(p => `<a class="row" href="/blog/${p.slug}/"><span class="t">${esc(p.title)}</span><span class="d num">${dateLabel(p.date)}</span></a>`).join('\n        ');
  const oldHash = `<script>
  // Old single-page links (/#apps, /#blog ...) now live on their own pages.
  (function () {
    var to = { apps: '/work/#apps', ai: '/work/#ai', portfolio: '/work/#career', blog: '/blog/', photos: '/photos/' };
    var h = location.hash.slice(1);
    if (to[h]) location.replace(to[h]);
  })();
</script>`;
  const head = open({ title: m.title, description: m.description, canonical: `${BASE}/`, ogTitle: m.ogTitle, ogDescription: m.ogDescription, ld: m.ld })
    .replace('<script>\n  // Theme before', oldHash + '\n<script>\n  // Theme before')
    .replace('<a class="skip"', '<canvas id="rain" aria-hidden="true"></canvas>\n<a class="skip"');
  return `${head}
${header('/')}

<main id="main" class="wrap" tabindex="-1">
  <section data-ux-fluid class="hero rise" aria-labelledby="h-name">
    <div class="frame">
      <img class="portrait" src="/assets/shots/portrait.webp" alt="Karan Sharma in a blue blazer, on a boat on Sydney Harbour at night" width="340" height="550" fetchpriority="high">
    </div>
    <div class="copy">
      <h1 id="h-name" aria-label="Building software that works for a diverse user base."><span aria-hidden="true"><span class="verb"><span id="name">Building</span><span class="caret"></span></span><br><span class="rest">software that works<br>for a diverse <span style="white-space:nowrap">user base.</span></span></span></h1>
      <div class="actions">
        <a class="btn btn-primary" href="/work/#apps">Browse my apps</a>
        <a class="btn" href="/work/#ai">My work in AI</a>
        <a class="btn" href="/blog/">Blog</a>
      </div>
    </div>
  </section>

  <section class="section rise" aria-labelledby="h-make">
    <div class="section-head"><h2 id="h-make">Open source</h2><a class="btn btn-sm" href="/work/">All work</a></div>
    <article data-ux-fluid class="card card--feature krail" aria-labelledby="h-krail">
      <div class="text">
        <h3 id="h-krail" class="display">KRAIL</h3>
        <p>Sydney's public transport is complicated enough. KRAIL brings real-time trains, buses, ferries, metro and light rail into one clean, accessible app. It is built in Kotlin Multiplatform, and I <a href="${IO_POST}">presented it at Google I/O Extended Brisbane 2025</a>.</p>
        <div class="actions">
          ${ext('https://krail.app', 'Visit krail.app', 'btn btn-primary')}
          ${ext('https://github.com/ksharma-xyz/KRAIL', 'GitHub', 'btn', GH)}
        </div>
      </div>
      <div class="shots">
        <img src="/assets/shots/krail-1-400.webp" alt="KRAIL home screen with saved trips" width="400" height="870" loading="lazy" decoding="async">
        <img src="/assets/shots/krail-2-400.webp" alt="KRAIL live departure board" width="400" height="870" loading="lazy" decoding="async">
        <img src="/assets/shots/krail-3-400.webp" alt="KRAIL home screen in dark mode" width="400" height="870" loading="lazy" decoding="async">
      </div>
    </article>
    <div class="grid">
      <a class="card" href="/work/#apps"><div class="app-head"><img class="app-icon" src="/assets/shots/sumi-icon.webp" alt="" width="56" height="56" loading="lazy"><h3>Sumi</h3></div><p>A daily Sudoku built around stillness. Ink on paper, five difficulty levels and streaks. No ads, no noise, just the puzzle.</p></a>
      <a class="card" href="/work/#apps"><div class="app-head"><img class="app-icon" src="/assets/shots/huezoo-icon.webp" alt="" width="56" height="56" loading="lazy"><h3>Huezoo</h3></div><p>A colour perception game built on Delta-E science. Spot the outlier among near-identical hues. It starts forgiving and gets quietly brutal.</p></a>
    </div>
  </section>

  <section class="section rise" aria-labelledby="h-ai">
    <div class="section-head"><h2 id="h-ai">AI tooling</h2><a class="btn btn-sm" href="/work/#ai">All AI tooling</a></div>
    <a class="card" href="/work/#ai">
      <div class="tool-list">
        <div class="card card--inner"><b>ASTRAMAN</b><span>Agents that plan, write and review each build</span></div>
        <div class="card card--inner"><b>At Commonwealth Bank</b><span>A graph RAG and agents for mobile engineering across the bank</span></div>
      </div>
    </a>
  </section>

  <section class="section rise" aria-labelledby="h-blog">
    <div class="section-head"><h2 id="h-blog">Blog</h2><a class="btn btn-sm" href="/blog/">All posts</a></div>
    ${veduta('h3', VEDUTA_SHORT)}
    <div class="rows">
        ${recent}
    </div>
  </section>
</main>

${PAGE_END}<script>
(function () {
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var glyphs = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄ0123456789';

  /* Headline: the verb decodes left to right, then cycles every 2.6s. Static "Building" with reduced motion. */
  var nameEl = document.getElementById('name');
  var verbs = ['Building', 'Designing', 'Shipping'], vi = 0, cycleTimer = 0, finalName = verbs[0];
  function scramble() {
    var start = performance.now(), dur = 600;
    (function tick(now) {
      var p = Math.min(1, (now - start) / dur), out = '';
      for (var i = 0; i < finalName.length; i++) out += (i / finalName.length < p) ? finalName[i] : glyphs[(Math.random() * glyphs.length) | 0];
      nameEl.textContent = out;
      if (p < 1) requestAnimationFrame(tick); else nameEl.textContent = finalName;
    })(start);
  }
  function startCycle() {
    clearInterval(cycleTimer);
    if (reduce.matches || document.hidden) return;
    cycleTimer = setInterval(function () { vi = (vi + 1) % verbs.length; finalName = verbs[vi]; scramble(); }, 2600);
  }

  /* Digital rain behind the page: decoration, faint enough that text keeps its contrast. */
  var cv = document.getElementById('rain'), ctx = cv.getContext('2d'), root = document.documentElement;
  var cols = [], fs = 16, raf = 0, last = 0, rgb = '0,255,65', alpha = 0.22, bgCol = '#000000', headCol = '#DBF7E3';
  function readColours() {
    var cs = getComputedStyle(root);
    rgb = cs.getPropertyValue('--rain').trim() || rgb;
    alpha = parseFloat(cs.getPropertyValue('--rain-alpha')) || alpha;
    bgCol = cs.getPropertyValue('--bg').trim() || bgCol;
    headCol = cs.getPropertyValue('--ink').trim() || headCol;
    sizeRain();
  }
  function sizeRain() {
    var r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = Math.ceil(r.width / fs);
    cols = []; for (var i = 0; i < n; i++) cols.push(Math.random() * -r.height / fs);
    ctx.fillStyle = bgCol; ctx.fillRect(0, 0, r.width, r.height);
    if (reduce.matches) { for (var k = 0; k < 40; k++) step(); }
  }
  function step() {
    var w = cv.width, h = cv.height / Math.min(2, devicePixelRatio || 1);
    ctx.fillStyle = bgCol; ctx.globalAlpha = 0.12; ctx.fillRect(0, 0, w, h); ctx.globalAlpha = 1;
    ctx.font = '500 ' + fs + 'px "JetBrains Mono", monospace';
    for (var i = 0; i < cols.length; i++) {
      var y = cols[i] * fs, ch = glyphs[(Math.random() * glyphs.length) | 0];
      ctx.fillStyle = 'rgba(' + rgb + ',' + alpha + ')';
      ctx.fillText(ch, i * fs, y - fs);
      ctx.fillStyle = headCol; ctx.globalAlpha = alpha; ctx.fillText(ch, i * fs, y); ctx.globalAlpha = 1;
      cols[i] = (y > h && Math.random() > 0.975) ? 0 : cols[i] + 1;
    }
  }
  function loop(t) { raf = requestAnimationFrame(loop); if (t - last < 55) return; last = t; step(); }
  function startRain() { cancelAnimationFrame(raf); raf = 0; if (!reduce.matches && !document.hidden) raf = requestAnimationFrame(loop); }
  function stopAll() { cancelAnimationFrame(raf); raf = 0; clearInterval(cycleTimer); }

  readColours(); startRain(); startCycle();
  addEventListener('resize', readColours);
  document.addEventListener('themechange', readColours);
  matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColours);
  document.addEventListener('visibilitychange', function () { if (document.hidden) stopAll(); else { startRain(); startCycle(); } });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(readColours);
})();
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Work                                                               */
/* ------------------------------------------------------------------ */
function work() {
  const m = META.work;
  const appCard = (id, name, icon, text, site, gh, shots) => `<article class="card" aria-labelledby="${id}">
        <div class="app-head"><img class="app-icon" src="/assets/shots/${icon}" alt="" width="56" height="56" loading="lazy"><h3 id="${id}">${name}</h3></div>
        <p>${text}</p>
        <div class="actions">${ext(site, 'Website', 'btn btn-sm')}${ext(gh, 'GitHub', 'btn btn-sm', GH)}</div>
        <div class="shots">${shots.map(([s, a]) => `<img src="/assets/shots/${s}" alt="${a}" width="460" height="996" loading="lazy" decoding="async">`).join('')}</div>
      </article>`;
  const lib = (name, url, text) => `<a class="card" href="${url}" rel="noopener"><h4>${name} ${OUT_ICON}</h4><p>${text}</p></a>`;
  const roles = CAREER.map((r, i) => `<details class="role"${i === 0 ? ' open' : ''}>
        <summary><span class="y num">${r.when}</span><span class="lg"><img src="${r.logo}" alt="" width="${r.w}" height="${r.h}" loading="lazy"></span><span class="c">${esc(r.company)}<span>${esc(r.title)}</span></span><span class="p">${r.city}</span>${CHEV}</summary>
        <ul class="role-detail">${r.bullets.map(b => `<li>${b}</li>`).join('')}</ul>
      </details>`).join('\n      ');
  return `${open({ title: m.title, description: m.description, canonical: `${BASE}/work/`, ogTitle: m.ogTitle, ogDescription: m.ogDescription, ld: fixLd(m.ld) })}
${header('/work/')}

<main id="main" class="wrap" tabindex="-1">
  <h1 class="page-title rise">Work</h1>

  <section class="section" id="apps" aria-labelledby="h-apps">
    <h2 id="h-apps">Apps</h2>
    <article data-ux-fluid class="card card--feature krail" aria-labelledby="w-krail">
      <div class="text">
        <h3 id="w-krail" class="display">KRAIL</h3>
        <p>Sydney public transport shouldn't be stressful. KRAIL covers trains, buses, ferries, metro and light rail: real-time, accessible and open source. It is written in Kotlin Multiplatform with a Ktor backend.</p>
        <p>I presented how it is built at <a href="${IO_POST}">Google I/O Extended Brisbane 2025</a>.</p>
        <div class="actions">
          ${ext('https://krail.app', 'Visit krail.app', 'btn btn-primary')}
          ${ext('https://github.com/ksharma-xyz/KRAIL', 'GitHub', 'btn', GH)}
        </div>
      </div>
      <div class="shots">
        <img src="/assets/shots/krail-1-400.webp" alt="KRAIL home screen with saved trips" width="400" height="870" loading="lazy" decoding="async">
        <img src="/assets/shots/krail-2-400.webp" alt="KRAIL live departure board" width="400" height="870" loading="lazy" decoding="async">
        <img src="/assets/shots/krail-3-400.webp" alt="KRAIL home screen in dark mode" width="400" height="870" loading="lazy" decoding="async">
      </div>
    </article>
    <div class="grid grid--apps">
      ${appCard('w-sumi', 'Sumi', 'sumi-icon.webp', 'A daily Sudoku that respects your attention. Ink on paper, five difficulty levels and streak tracking. No noise, no ads, no dark patterns. Just the puzzle.', 'https://ksharma-xyz.github.io/Sumi/', 'https://github.com/ksharma-xyz/Sumi', [['sumi-1.webp', 'Sumi home screen'], ['sumi-2.webp', 'Sumi puzzle screen']])}
      ${appCard('w-huezoo', 'Huezoo', 'huezoo-icon.webp', 'A colour perception game built around Delta-E science. Find the outlier among near-identical hues. It starts forgiving and gets quietly brutal, and it ranks you by accuracy, not just speed.', 'https://ksharma-xyz.github.io/HueZoo/', 'https://github.com/ksharma-xyz/HueZoo', [['huezoo-1.webp', 'Huezoo home screen'], ['huezoo-2.webp', 'Huezoo gameplay, picking the odd colour out']])}
      <div class="card"><h3>Next app, in progress</h3><p>Kotlin Multiplatform like the rest, for iOS and Android, and the first one built end to end by <a href="#astraman">ASTRAMAN</a>. Coming soon.</p></div>
    </div>
    <h3 class="subhead">Open source libraries and services</h3>
    <div class="grid">
      ${lib('KRAIL-BFF', 'https://github.com/ksharma-xyz/KRAIL-BFF', 'The Ktor backend behind KRAIL: trip planning over the NSW transport network, Protobuf contracts and a containerised deploy.')}
      ${lib('KRAIL-API-PROTO', 'https://github.com/ksharma-xyz/KRAIL-API-PROTO', "Shared API data contracts in Protocol Buffers, the typed boundary between KRAIL's app and backend.")}
      ${lib('dhruva', 'https://github.com/ksharma-xyz/dhruva', 'A Kotlin Multiplatform location library for Android and iOS. Sanskrit-named, one API across platforms.')}
      ${lib('aagya', 'https://github.com/ksharma-xyz/aagya', 'A Kotlin Multiplatform permission library for Android and iOS. Runtime permissions without the per-platform boilerplate.')}
    </div>
  </section>

  <section class="section" id="ai" aria-labelledby="h-ai">
    <h2 id="h-ai">AI tooling</h2>
    <article data-ux-fluid class="card card--wide krail" id="astraman" aria-labelledby="w-astraman">
      <div class="text">
        <h3 id="w-astraman" class="display">ASTRAMAN</h3>
        <p>A small team of AI agents that builds apps the way I would. Every app starts from the same tested base, so they only write what is new.</p>
        <ul class="agents" aria-label="The agents">
          <li class="agent"><b>Vishwakarma</b>plans</li><li class="agent"><b>Karma</b>builds</li><li class="agent"><b>Vivek</b>reviews</li>
          <li class="agent"><b>Drishti</b>learns</li><li class="agent"><b>Tarka</b>checks the logic</li><li class="agent"><b>Fixer</b>retries</li>
        </ul>
      </div>
      <div class="text">
        <h4>How a build runs</h4>
        <ol class="steps">
          <li><strong>Plan.</strong> Read the designs and plan the work.</li>
          <li><strong>Build.</strong> Write the code, one step at a time.</li>
          <li><strong>Check.</strong> Review each step before the next.</li>
          <li><strong>Learn.</strong> Note what went wrong for next time.</li>
        </ol>
        <div class="actions"><a class="btn btn-primary" href="/blog/${VEDUTA.slug}/">Read how ASTRAMAN built Veduta</a></div>
      </div>
    </article>
  </section>

  <section class="section" id="career" aria-labelledby="h-career">
    <div class="section-head"><h2 id="h-career">Career</h2><a class="btn btn-sm" href="/assets/karan-sharma-cv.pdf" download>Download CV (PDF)</a></div>
    <div class="roles" data-ux-list>
      ${roles}
    </div>
  </section>
</main>

${PAGE_END}<script>
(function () {
  // Safari and Firefox without ::details-content: glide the career rows with the Web Animations API.
  if (CSS.supports('selector(::details-content)') || matchMedia('(prefers-reduced-motion: reduce)').matches || !Element.prototype.animate) return;
  document.querySelectorAll('details.role').forEach(function (d) {
    var sum = d.querySelector('summary'), body = d.querySelector('.role-detail'), anim = null;
    sum.addEventListener('click', function (e) {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      if (anim) anim.cancel();
      var closing = d.open, from = d.offsetHeight, to;
      d.style.overflow = 'hidden';
      if (closing) { to = sum.offsetHeight; }
      else { d.open = true; to = d.offsetHeight; body.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 200, delay: 80, easing: 'ease', fill: 'backwards' }); }
      anim = d.animate({ height: [from + 'px', to + 'px'] }, { duration: 280, easing: 'ease' });
      anim.onfinish = anim.oncancel = function () { if (closing) d.open = false; d.style.overflow = ''; anim = null; };
    });
  });
})();
</script>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Blog index and redirect                                            */
/* ------------------------------------------------------------------ */
function blog() {
  const m = META.writing;
  const years = [...new Set(POSTS.map(p => p.date.slice(0, 4)))];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const groups = years.map(y => `<section class="year" aria-labelledby="y${y}"><h2 id="y${y}" class="num">${y}</h2><div class="rows">
      ${POSTS.filter(p => p.date.startsWith(y)).map(p => `<a class="row" href="/blog/${p.slug}/"><span class="t">${esc(p.title)}</span><span class="d num">${MONTHS[Number(p.date.slice(5)) - 1]}</span></a>`).join('\n      ')}
    </div></section>`).join('\n  ');
  return `${open({ title: 'Blog | Karan Sharma', description: m.description, canonical: `${BASE}/blog/`, ogTitle: 'Blog | Karan Sharma', ogDescription: m.ogDescription, ld: fixLd(m.ld) })}
${header('/blog/')}

<main id="main" class="wrap" tabindex="-1">
  <h1 class="page-title rise">Blog</h1>
  ${veduta('h2', VEDUTA_LONG).replace('card card--wide post-feature', 'card card--wide post-feature rise')}
  ${groups}
</main>

${PAGE_END}</body>
</html>
`;
}

function writingRedirect() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Blog | Karan Sharma</title>
<meta http-equiv="refresh" content="0; url=/blog/">
<link rel="canonical" href="${BASE}/blog/">
<meta name="robots" content="noindex">
<script>location.replace('/blog/' + location.search + location.hash);</script>
</head>
<body>
<p><a href="/blog/">Blog</a></p>
</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* Photos                                                             */
/* ------------------------------------------------------------------ */
function photos() {
  const m = META.photos;
  const P = [
    ['p2', 'The Sydney Opera House sails lit gold at night, above a harbourside terrace with steps edged in blue and green light', 'Sydney Opera House at night', 1136],
    ['p1', 'The Golden Gate Bridge seen past a rough stone wall, with the coastline and a rock in the bay below', 'Golden Gate Bridge, San Francisco', 1136],
    ['p3', 'A quiet beach with granite boulders, clear water and low mountains under a big blue sky', 'Granite boulders on a quiet beach', 1137],
    ['p4', 'Sunset over rippled sand at low tide, the sun low on the horizon', 'Sunset over the sand at low tide', 1136],
    ['p5', 'A sandstone clock tower at night covered in bright projected patterns of orange, blue and red', 'A clock tower lit with projections at night', 1136],
  ];
  const figs = P.map(([id, alt, cap, h], i) => `<li><figure><img src="/assets/photos/${id}-640.webp" srcset="/assets/photos/${id}-640.webp 640w, /assets/photos/${id}.webp 899w" sizes="(max-width: 600px) 100vw, 320px" alt="${alt}" width="640" height="${h}"${i < 2 ? (i === 0 ? ' fetchpriority="high"' : '') : ' loading="lazy" decoding="async"'}><figcaption>${cap}</figcaption></figure></li>`).join('\n      ');
  return `${open({ title: m.title, description: m.description, canonical: `${BASE}/photos/`, ogTitle: m.ogTitle, ogDescription: m.ogDescription, ld: fixLd(m.ld) })}
${header('/photos/')}

<main id="main" class="wrap" tabindex="-1">
  <h1 class="page-title rise">Photos</h1>
  <ul class="photo-grid rise" data-ux-list>
      ${figs}
  </ul>
</main>

${PAGE_END}</body>
</html>
`;
}

/* ------------------------------------------------------------------ */
/* About                                                              */
/* ------------------------------------------------------------------ */
function about() {
  const m = META.about;
  const skill = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  return `${open({ title: m.title, description: m.description, canonical: `${BASE}/about/`, ogTitle: m.ogTitle, ogDescription: m.ogDescription, ld: fixLd(m.ld) })}
${header('/about/')}

<main id="main" class="wrap" tabindex="-1">
  <h1 class="page-title rise">About</h1>
  <section data-ux-fluid class="about rise" aria-label="About Karan">
    <div class="frame">
      <img class="portrait" src="/assets/shots/portrait.webp" alt="Karan Sharma in a blue blazer, on a boat on Sydney Harbour at night" width="340" height="550" fetchpriority="high">
    </div>
    <div class="prose">
      <p>I'm Karan Sharma, a Staff Software Engineer in Sydney. I have spent more than ten years building secure mobile products, at Commonwealth Bank, Block (Cash App) and Afterpay among others.</p>
      <p>At Commonwealth Bank I work across Android and iOS on the CommBank app. I build AI-powered features for the app, and the agentic strategy and AI tooling for mobile across the whole bank. That includes a RAG and a graph RAG that hold all of our mobile engineering knowledge, so engineers can ask a question and get an answer without a meeting. Before that I built the CommBiz business banking app from the ground up, including its architecture, engineering standards and AI strategy. I also train engineers across the org on AI-assisted development.</p>
      <p>Outside work I maintain KRAIL, an open source Sydney transit app in Compose Multiplatform, and two small games, Sumi and Huezoo. I care about accessibility, and about software that works for everyone who has to use it. I have spoken about KRAIL at Google I/O Extended, and I write about what I learn.</p>
      <p>I studied computer science at Punjab Technical University in India, and started my career in Bangalore before moving to Sydney.</p>
    </div>
  </section>
  <section class="section" aria-labelledby="skills-title">
    <h2 id="skills-title">What I work with</h2>
    <div class="card">
      <dl class="skills">
        ${skill('AI', 'Harness engineering, context engineering, MCP servers, agents and agentic workflows')}
        ${skill('Mobile', 'Kotlin Multiplatform, Compose Multiplatform, Jetpack Compose, Android SDK')}
        ${skill('Security', 'Cryptography, session management, data privacy')}
        ${skill('Accessibility', 'WCAG 2.1 and 2.2')}
        ${skill('Architecture', 'Clean Architecture, MVVM, MVP, server-driven UI')}
        ${skill('APIs', 'GraphQL, Protobuf, REST')}
        ${skill('Build and CI', 'Gradle, GitHub Actions')}
        ${skill('Quality', 'Unit testing, snapshot testing, Coroutines, Git')}
        ${skill('Web and backend', 'TypeScript, Node.js, Ktor')}
      </dl>
    </div>
  </section>
  <section class="section" aria-labelledby="more-title">
    <h2 id="more-title">Elsewhere</h2>
    <div class="grid">
      <div class="card"><h3>Education</h3><p>B.E. in Computer Science and Engineering, Punjab Technical University, India.</p><p class="meta"><span class="num">2010</span> to <span class="num">2014</span></p></div>
      <a class="card" href="${IO_POST}"><h3>Speaking</h3><p>Compose Multiplatform to the City, at Google I/O Extended in Brisbane.</p><p class="meta"><span class="num">Jun 2025</span></p></a>
      <div class="card"><h3>Profiles</h3>
        <div class="actions">
          ${ext('https://github.com/ksharma-xyz', 'GitHub', 'btn btn-sm', GH).replace('rel="noopener"', 'rel="me noopener"')}
          ${ext('https://www.linkedin.com/in/ksharma-xyz/', 'LinkedIn', 'btn btn-sm').replace('rel="noopener"', 'rel="me noopener"')}
          ${ext('https://stackoverflow.com/users/1505493/karan-sharma', 'Stack Overflow', 'btn btn-sm').replace('rel="noopener"', 'rel="me noopener"')}
          ${ext('https://androiddev.social/@karansharma', 'Mastodon', 'btn btn-sm').replace('rel="noopener"', 'rel="me noopener"')}
        </div>
      </div>
    </div>
  </section>
</main>

${PAGE_END}</body>
</html>
`;
}

write('index.html', home());
write('work/index.html', work());
write('blog/index.html', blog());
write('writing/index.html', writingRedirect());
write('photos/index.html', photos());
write('about/index.html', about());
