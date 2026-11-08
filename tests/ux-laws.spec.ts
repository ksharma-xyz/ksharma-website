import { test, expect, Page, Response } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

/* ------------------------------------------------------------------ */
/* Pages under test                                                   */
/* ------------------------------------------------------------------ */

const DOCS = path.resolve(__dirname, '..', 'docs');

function blogPaths(): string[] {
  const found = new Set<string>();
  try {
    const xml = fs.readFileSync(path.join(DOCS, 'sitemap.xml'), 'utf8');
    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
      let p = m[1];
      try {
        p = new URL(m[1]).pathname;
      } catch {
        /* relative loc: keep as is */
      }
      if (/^\/blog\/[^/]+\/?$/.test(p)) found.add(p.endsWith('/') ? p : p + '/');
    }
  } catch {
    /* no sitemap: fall back to the directory listing below */
  }
  if (found.size === 0) {
    try {
      for (const d of fs.readdirSync(path.join(DOCS, 'blog'), { withFileTypes: true })) {
        if (d.isDirectory() && fs.existsSync(path.join(DOCS, 'blog', d.name, 'index.html'))) {
          found.add(`/blog/${d.name}/`);
        }
      }
    } catch {
      /* no blog folder: only the fixed pages are tested */
    }
  }
  return [...found].sort();
}

const PAGES = ['/', '/work/', '/writing/', '/photos/', '/about/', ...blogPaths()];

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Installed in every document before page scripts run: window.__ux.{vis, sel}. */
function installHelpers() {
  const vis = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    if (r.width <= 1 && r.height <= 1) return false; // sr-only pattern
    if (r.right <= 0 || r.bottom <= 0) return false; // parked off-screen (skip links)
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (parseFloat(cs.opacity) === 0) return false;
    return true;
  };
  const sel = (el: Element): string => {
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    const cls = typeof (el as any).className === 'string' ? (el as any).className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    s += cls.map((c: string) => '.' + c).join('');
    return text ? `${s} "${text}"` : s;
  };
  (window as any).__ux = { vis, sel };
}

/** Navigate; a missing page fails with a clear message instead of crashing later checks. */
async function visit(page: Page, url: string): Promise<Response> {
  await page.addInitScript(installHelpers);
  const res = await page.goto(url, { waitUntil: 'load' });
  if (!res) throw new Error(`PAGE NOT LOADED: ${url} gave no response`);
  if (res.status() >= 400) throw new Error(`PAGE MISSING: ${url} returned HTTP ${res.status()} (page does not exist yet?)`);
  return res;
}

/** Fail with a list of "element: broken rule" lines. */
function check(law: string, violations: string[]) {
  if (violations.length === 0) return;
  const shown = violations.slice(0, 25).map((v) => `  - ${v}`).join('\n');
  const more = violations.length > 25 ? `\n  ... and ${violations.length - 25} more` : '';
  throw new Error(`${law}: ${violations.length} violation(s)\n${shown}${more}`);
}

/** Generate one test per page under the current describe. */
function perPage(title: string, fn: (page: Page, url: string, res: Response) => Promise<void>) {
  for (const url of PAGES) {
    test(`${title} [${url}]`, async ({ page }) => {
      const res = await visit(page, url);
      await fn(page, url, res);
    });
  }
}

const CARD_SEL = '.card, .card--feature, .card--inner';

/* ------------------------------------------------------------------ */
/* Fitts's Law                                                        */
/* ------------------------------------------------------------------ */

test.describe("Fitts's Law", () => {
  perPage("Fitts's Law: nav links, buttons, .btn and card links are at least 44x44", async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      const els = new Set<Element>(document.querySelectorAll('header nav a, button, .btn, a.card, a.card--feature, a.card--inner, a:has(.card), a:has(.card--feature)'));
      for (const el of els) {
        if (!ux.vis(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 43.9 || r.height < 43.9) {
          out.push(`${ux.sel(el)} is ${Math.round(r.width)}x${Math.round(r.height)}px, tap target must be >= 44x44`);
        }
      }
      return out;
    });
    check("Fitts's Law", v);
  });

  // WCAG 2.5.8 (24px minimum) for inline text links. Strictly, links inside a sentence are
  // exempt from 2.5.8; we still check them, but measure the LINE BOX height (max of the
  // rect and the computed line-height) and approximate the spacing exception: a 24px circle
  // centred on the link may not touch another target. Multi-line wrapped links are
  // checked per line fragment.
  perPage("Fitts's Law: inline text links in paragraphs are >= 24px tall or spaced (WCAG 2.5.8)", async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      const targets = Array.from(document.querySelectorAll('a[href], button, input, select, textarea, summary')).filter((t) => ux.vis(t));
      for (const a of document.querySelectorAll('p a:not(.btn)')) {
        if (!ux.vis(a)) continue;
        const lh = parseFloat(getComputedStyle(a).lineHeight) || 0;
        for (const r of Array.from(a.getClientRects())) {
          if (r.width === 0) continue;
          if (Math.max(r.height, lh) >= 23.9) continue;
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          const near = targets.find((t) => {
            if (t === a || t.contains(a) || a.contains(t)) return false;
            return Array.from(t.getClientRects()).some((tr) => {
              const dx = Math.max(tr.left - cx, 0, cx - tr.right);
              const dy = Math.max(tr.top - cy, 0, cy - tr.bottom);
              return Math.hypot(dx, dy) < 12;
            });
          });
          if (near) {
            out.push(`${ux.sel(a)} is only ${Math.round(Math.max(r.height, lh))}px tall and ${ux.sel(near)} sits within the 24px target circle`);
            break;
          }
        }
      }
      return out;
    });
    check("Fitts's Law", v);
  });
});

/* ------------------------------------------------------------------ */
/* Hick's Law                                                         */
/* ------------------------------------------------------------------ */

test.describe("Hick's Law", () => {
  perPage("Hick's Law: at most 5 primary nav links", async (page) => {
    const n = await page.evaluate(() => Array.from(document.querySelectorAll('header nav a')).map((a) => (a.textContent || '').trim()));
    check("Hick's Law", n.length > 5 ? [`header nav has ${n.length} links (${n.join(', ')}), max is 5`] : []);
  });

  perPage("Hick's Law: at most 1 visible .btn-primary in the first viewport", async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const inView = Array.from(document.querySelectorAll('.btn-primary')).filter((b) => {
        if (!ux.vis(b)) return false;
        const r = b.getBoundingClientRect();
        return r.top < window.innerHeight && r.bottom > 0;
      });
      return inView.length > 1 ? [`${inView.length} .btn-primary in first viewport, max is 1: ${inView.map((b: Element) => ux.sel(b)).join(' | ')}`] : [];
    });
    check("Hick's Law", v);
  });
});

/* ------------------------------------------------------------------ */
/* Miller's Law                                                       */
/* ------------------------------------------------------------------ */

test.describe("Miller's Law", () => {
  // Opt out an index list or photo grid by adding data-ux-list to it (or any ancestor).
  perPage("Miller's Law: no group of more than 7 sibling links / list items / cards (opt out: data-ux-list)", async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      for (const el of document.querySelectorAll('body *')) {
        if (el.children.length <= 7) continue;
        if (el.closest('[data-ux-list]')) continue;
        const kids = Array.from(el.children).filter((c) => ux.vis(c));
        if (kids.length <= 7) continue;
        if (!kids.every((c) => c.matches('a, li, .card, .card--feature, .card--inner'))) continue;
        out.push(`${ux.sel(el).replace(/ ".*"$/, '')} has ${kids.length} visible link/list-item/card children (max 7; add data-ux-list if this is an index list or photo grid)`);
      }
      return out;
    });
    check("Miller's Law", v);
  });
});

/* ------------------------------------------------------------------ */
/* Jakob's Law                                                        */
/* ------------------------------------------------------------------ */

test.describe("Jakob's Law", () => {
  perPage("Jakob's Law: page has conventional landmarks (main, header nav, footer)", async (page) => {
    const v = await page.evaluate(() => {
      const out: string[] = [];
      if (!document.querySelector('main')) out.push('no <main> element');
      if (!document.querySelector('header nav a')) out.push('no "header nav a" primary navigation');
      if (!document.querySelector('footer')) out.push('no <footer> element');
      return out;
    });
    check("Jakob's Law", v);
  });

  perPage("Jakob's Law: first link in header (logo) goes home", async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const a = document.querySelector('header a') as HTMLAnchorElement | null;
      if (!a) return ['no link found inside <header>'];
      const u = new URL(a.href);
      if (u.origin !== location.origin || u.pathname !== '/') return [`${ux.sel(a)} points to ${a.getAttribute('href')} (resolves to ${u.pathname}), expected the site root /`];
      return [];
    });
    check("Jakob's Law", v);
  });

  perPage("Jakob's Law: nav links are distinct and resolve to real pages (HTTP 200)", async (page, _url, _res) => {
    const links: string[] = await page.evaluate(() => Array.from(document.querySelectorAll('header nav a')).map((a) => (a as HTMLAnchorElement).href));
    const v: string[] = [];
    if (links.length === 0) v.push('no "header nav a" links found');
    const seen = new Set<string>();
    const origin = new URL(page.url()).origin;
    for (const href of links) {
      if (seen.has(href)) v.push(`header nav has duplicate link ${href}`);
      seen.add(href);
      const u = new URL(href);
      if (u.origin !== origin) continue; // external links are not fetched
      u.hash = '';
      const r = await page.request.get(u.toString());
      if (r.status() !== 200) v.push(`header nav link ${href} returned HTTP ${r.status()}`);
    }
    check("Jakob's Law", v);
  });

  test("Jakob's Law: browser Back from /work/ returns to /", async ({ page }) => {
    await visit(page, '/');
    const link = page.locator('header nav a[href$="/work/"], header nav a[href$="work/"], header nav a[href$="/work"]').first();
    if (await link.count()) {
      await link.click();
    } else {
      await page.goto('/work/');
    }
    await page.waitForLoadState('load');
    expect(new URL(page.url()).pathname, 'expected to land on /work/ (is the page missing?)').toBe('/work/');
    await page.goBack();
    expect(new URL(page.url()).pathname, 'history.back() did not return to /').toBe('/');
  });
});

/* ------------------------------------------------------------------ */
/* Doherty Threshold                                                  */
/* ------------------------------------------------------------------ */

test.describe("Doherty Threshold", () => {
  test.describe.configure({ retries: 1 }); // timing is noisy on a loaded machine
  perPage("Doherty Threshold: LCP < 1500ms and CLS < 0.05", async (page) => {
    await page.waitForTimeout(1000);
    const m = await page.evaluate(
      () =>
        new Promise<{ lcp: number; cls: number; hasLcp: boolean }>((resolve) => {
          let lcp = 0;
          let cls = 0;
          let hasLcp = false;
          new PerformanceObserver((l) => {
            for (const e of l.getEntries()) {
              lcp = e.startTime;
              hasLcp = true;
            }
          }).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver((l) => {
            for (const e of l.getEntries() as any[]) if (!e.hadRecentInput) cls += e.value;
          }).observe({ type: 'layout-shift', buffered: true });
          setTimeout(() => resolve({ lcp, cls, hasLcp }), 300);
        }),
    );
    const v: string[] = [];
    if (m.hasLcp && m.lcp >= 1500) v.push(`LCP is ${Math.round(m.lcp)}ms, must be < 1500ms`);
    if (m.cls >= 0.05) v.push(`CLS is ${m.cls.toFixed(3)}, must be < 0.05`);
    if (!m.hasLcp) test.info().annotations.push({ type: 'note', description: 'no LCP entry reported' });
    check('Doherty Threshold', v);
  });
});

/* ------------------------------------------------------------------ */
/* Von Restorff Effect                                                */
/* ------------------------------------------------------------------ */

test.describe('Von Restorff Effect', () => {
  perPage('Von Restorff Effect: at most one .card--feature per page', async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const f = Array.from(document.querySelectorAll('.card--feature'));
      return f.length > 1 ? [`${f.length} .card--feature elements, max is 1: ${f.map((e) => ux.sel(e)).join(' | ')}`] : [];
    });
    check('Von Restorff Effect', v);
  });
});

/* ------------------------------------------------------------------ */
/* Law of Common Region                                               */
/* ------------------------------------------------------------------ */

test.describe('Law of Common Region', () => {
  perPage('Law of Common Region: cards nest at most card > inner, and every card has a label', async (page) => {
    const v = await page.evaluate((cardSel) => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      for (const el of document.querySelectorAll(cardSel)) {
        const isInner = el.matches('.card--inner');
        const cardAncestors: Element[] = [];
        for (let p = el.parentElement; p; p = p.parentElement) if (p.matches(cardSel)) cardAncestors.push(p);
        if (!isInner && cardAncestors.length > 0) {
          out.push(`${ux.sel(el)} is a card nested inside ${ux.sel(cardAncestors[0])}; only .card--inner may be nested`);
        } else if (isInner && cardAncestors.length > 1) {
          out.push(`${ux.sel(el)} is nested ${cardAncestors.length} cards deep, max is card > inner`);
        } else if (isInner && cardAncestors.some((a) => a.matches('.card--inner'))) {
          out.push(`${ux.sel(el)} is a .card--inner inside another .card--inner`);
        }
        const text = (el.textContent || '').trim() || el.getAttribute('aria-label') || '';
        if (!text) out.push(`${ux.sel(el)} has no heading or text label`);
      }
      return out;
    }, CARD_SEL);
    check('Law of Common Region', v);
  });
});

/* ------------------------------------------------------------------ */
/* Law of Proximity                                                   */
/* ------------------------------------------------------------------ */

test.describe('Law of Proximity', () => {
  // Checked: .card padding (4 sides) and row/column gap of every grid/flex container in main
  // or on a card. Values must be within 1px of 0/4/8/16/24/40/64/104. Clamp()-driven fluid
  // spacing cannot be detected from computed styles: mark such elements data-ux-fluid to skip.
  perPage('Law of Proximity: card padding and grid/flex gaps are on the 4/8/16/24/40/64/104 scale', async (page) => {
    const v = await page.evaluate((cardSel) => {
      const ux = (window as any).__ux;
      const SCALE = [0, 4, 8, 16, 24, 40, 64, 104];
      const on = (n: number) => SCALE.some((s) => Math.abs(n - s) <= 1);
      const out: string[] = [];
      const seen = new Set<Element>();
      const flag = (el: Element, prop: string, val: string) => out.push(`${ux.sel(el)} ${prop} is ${val}, not on the space scale (4 8 16 24 40 64 104)`);
      for (const el of document.querySelectorAll(cardSel)) {
        if (!ux.vis(el) || el.closest('[data-ux-fluid]')) continue;
        seen.add(el);
        const cs = getComputedStyle(el);
        for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
          const val = parseFloat((cs as any)['padding' + side]);
          if (!on(val)) flag(el, `padding-${side.toLowerCase()}`, val + 'px');
        }
      }
      const containers = new Set<Element>([...document.querySelectorAll('main, main *, ' + cardSel)]);
      for (const el of containers) {
        if (!ux.vis(el) || el.closest('[data-ux-fluid]')) continue;
        const cs = getComputedStyle(el);
        if (!/(flex|grid)/.test(cs.display)) continue;
        for (const prop of ['rowGap', 'columnGap']) {
          const raw = (cs as any)[prop] as string;
          if (raw === 'normal') continue;
          const val = parseFloat(raw);
          if (!on(val)) flag(el, prop === 'rowGap' ? 'row-gap' : 'column-gap', raw);
        }
      }
      return out;
    }, CARD_SEL);
    check('Law of Proximity', v);
  });
});

/* ------------------------------------------------------------------ */
/* Law of Similarity                                                  */
/* ------------------------------------------------------------------ */

test.describe('Law of Similarity', () => {
  perPage('Law of Similarity: at most 3 distinct card (border-radius, padding) combos', async (page) => {
    const v = await page.evaluate((cardSel) => {
      const ux = (window as any).__ux;
      const combos = new Map<string, { n: number; ex: string }>();
      for (const el of document.querySelectorAll(cardSel)) {
        if (!ux.vis(el)) continue;
        const cs = getComputedStyle(el);
        const radius = [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius].join(' ');
        const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].join(' ');
        const k = `radius ${radius} / padding ${pad}`;
        const e = combos.get(k) || { n: 0, ex: ux.sel(el) };
        e.n++;
        combos.set(k, e);
      }
      return combos.size > 3 ? [`${combos.size} distinct card styles, max is 3: ` + [...combos].map(([k, e]) => `[${k}] x${e.n} e.g. ${e.ex}`).join('; ')] : [];
    }, CARD_SEL);
    check('Law of Similarity', v);
  });

  perPage('Law of Similarity: inline links in `main p` share one style (color + underline)', async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const styles = new Map<string, string>();
      for (const a of document.querySelectorAll('main p a:not(.btn)')) {
        if (!ux.vis(a)) continue;
        const cs = getComputedStyle(a);
        const k = `color ${cs.color}, text-decoration-line ${cs.textDecorationLine}`;
        if (!styles.has(k)) styles.set(k, ux.sel(a));
      }
      return styles.size > 1 ? [`${styles.size} distinct paragraph link styles, max is 1: ` + [...styles].map(([k, e]) => `[${k}] e.g. ${e}`).join('; ')] : [];
    });
    check('Law of Similarity', v);
  });
});

/* ------------------------------------------------------------------ */
/* Law of Pragnanz                                                    */
/* ------------------------------------------------------------------ */

test.describe('Law of Pragnanz', () => {
  perPage('Law of Pragnanz: at most 2 font families, 6 weights and 8 sizes on visible text', async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const fam = new Map<string, string>();
      const wt = new Map<string, string>();
      const sz = new Map<string, string>();
      for (const el of document.body.querySelectorAll('*')) {
        if (el.closest('code, pre, kbd, samp, script, style, noscript')) continue;
        const hasText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && (n.textContent || '').trim() !== '');
        if (!hasText || !ux.vis(el)) continue;
        const cs = getComputedStyle(el);
        const f = cs.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
        if (!fam.has(f)) fam.set(f, ux.sel(el));
        if (!wt.has(cs.fontWeight)) wt.set(cs.fontWeight, ux.sel(el));
        if (!sz.has(cs.fontSize)) sz.set(cs.fontSize, ux.sel(el));
      }
      const fmt = (m: Map<string, string>) => [...m].map(([k, e]) => `${k} (e.g. ${e})`).join('; ');
      const out: string[] = [];
      if (fam.size > 2) out.push(`${fam.size} font families, max is 2: ${fmt(fam)}`);
      if (wt.size > 6) out.push(`${wt.size} font weights, max is 6: ${fmt(wt)}`);
      if (sz.size > 8) out.push(`${sz.size} font sizes, max is 8: ${fmt(sz)}`);
      return out;
    });
    check('Law of Pragnanz', v);
  });

  perPage('Law of Pragnanz: no box-shadow at rest on .card and .btn', async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      for (const el of document.querySelectorAll('.card, .card--feature, .card--inner, .btn')) {
        const s = getComputedStyle(el).boxShadow;
        if (s && s !== 'none') out.push(`${ux.sel(el)} has box-shadow at rest: ${s}`);
      }
      return out;
    });
    check('Law of Pragnanz', v);
  });
});

/* ------------------------------------------------------------------ */
/* Serial Position Effect                                             */
/* ------------------------------------------------------------------ */

test.describe('Serial Position Effect', () => {
  test("Serial Position Effect: first .card--feature on / mentions KRAIL", async ({ page }) => {
    await visit(page, '/');
    const v = await page.evaluate(() => {
      const f = document.querySelector('.card--feature');
      if (!f) return ['no .card--feature on /'];
      return (f.textContent || '').includes('KRAIL') ? [] : [`first .card--feature has no text "KRAIL": "${(f.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60)}"`];
    });
    check('Serial Position Effect', v);
  });

  perPage('Serial Position Effect: last section of main or footer links to hey@krail.app or LinkedIn', async (page) => {
    const v = await page.evaluate(() => {
      const main = document.querySelector('main');
      const last = main ? main.lastElementChild : null;
      const footer = document.querySelector('footer');
      const ok = (root: Element | null) => !!root && !!root.querySelector('a[href*="hey@krail.app"], a[href*="linkedin.com"]');
      if (ok(last) || ok(footer)) return [];
      return ['neither the last child of main nor footer contains a link to hey@krail.app or linkedin.com'];
    });
    check('Serial Position Effect', v);
  });
});

/* ------------------------------------------------------------------ */
/* Peak-End Rule                                                      */
/* ------------------------------------------------------------------ */

test.describe('Peak-End Rule', () => {
  perPage('Peak-End Rule: footer has hey@krail.app and a linkedin.com link', async (page) => {
    const v = await page.evaluate(() => {
      const f = document.querySelector('footer');
      if (!f) return ['no <footer> element'];
      const out: string[] = [];
      const hasMail = (f.textContent || '').includes('hey@krail.app') || !!f.querySelector('a[href*="hey@krail.app"]');
      if (!hasMail) out.push('footer does not contain hey@krail.app');
      if (!f.querySelector('a[href*="linkedin.com"]')) out.push('footer has no linkedin.com link');
      return out;
    });
    check('Peak-End Rule', v);
  });

  perPage('Peak-End Rule: page HTML never contains a personal @gmail.com address', async (page, _url, res) => {
    const raw = await res.text();
    const dom = await page.content();
    const v: string[] = [];
    if (raw.toLowerCase().includes('@gmail.com')) v.push('served HTML contains "@gmail.com"');
    if (dom.toLowerCase().includes('@gmail.com')) v.push('rendered DOM contains "@gmail.com"');
    check('Peak-End Rule', v);
  });
});

/* ------------------------------------------------------------------ */
/* Selective Attention                                                */
/* ------------------------------------------------------------------ */

const ALLOWED_PROPS = new Set(['transform', 'opacity', 'box-shadow', 'background-color', 'border-color', 'color', 'filter']);

/** Runs in the browser. maxSeconds = longest allowed transition-duration. */
function scanTransitions(arg: { maxSeconds: number; allowedProps: string[] }) {
  const { maxSeconds, allowedProps } = arg;
  const ux = (window as any).__ux;
  const allowed = new Set(allowedProps);
  const secs = (s: string) => (s.trim().endsWith('ms') ? parseFloat(s) / 1000 : parseFloat(s));
  const seen = new Map<string, string>();
  const out: string[] = [];
  for (const el of document.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const key = cs.transitionProperty + '|' + cs.transitionDuration;
    if (seen.has(key)) continue;
    seen.set(key, ux.sel(el));
    const props = cs.transitionProperty.split(',').map((s) => s.trim());
    const durs = cs.transitionDuration.split(',').map(secs);
    props.forEach((p, i) => {
      const d = durs[i % durs.length];
      if (!(d > 0)) return; // 0s transitions are inert, whatever the property
      if (d > maxSeconds + 1e-6) out.push(`${ux.sel(el)} transitions "${p}" for ${d}s, max is ${maxSeconds}s`);
      if (maxSeconds > 0.05) {
        const ok = allowed.has(p) || /^border-(top|right|bottom|left)-color$/.test(p) || /^-webkit-/.test(p);
        if (!ok) out.push(`${ux.sel(el)} transitions "${p}" (${d}s), only transform, opacity, box-shadow, background-color, border-color, color, filter are allowed`);
      }
    });
  }
  return out;
}

function scanAnimations(mode: 'infinite' | 'any') {
  const ux = (window as any).__ux;
  const out: string[] = [];
  for (const a of document.getAnimations()) {
    if (a.playState !== 'running') continue;
    const t = a.effect ? (a.effect as any).getComputedTiming() : { iterations: 1 };
    if (mode === 'infinite' && t.iterations !== Infinity) continue;
    const target = a.effect && (a.effect as any).target ? ux.sel((a.effect as any).target) : '(no target)';
    const name = (a as any).animationName || (a as any).transitionProperty || a.id || 'animation';
    out.push(`${target} runs ${mode === 'infinite' ? 'an infinite ' : 'a '}${(a as any).animationName ? 'CSS animation' : (a as any).transitionProperty ? 'transition' : 'animation'} "${name}"`);
  }
  return out;
}

test.describe('Selective Attention', () => {
  perPage('Selective Attention: no running infinite animations after load', async (page) => {
    await page.waitForTimeout(1500);
    check('Selective Attention', await page.evaluate(scanAnimations, 'infinite'));
  });

  perPage('Selective Attention: transitions are <= 0.32s and only on cheap properties', async (page) => {
    check('Selective Attention', await page.evaluate(scanTransitions, { maxSeconds: 0.32, allowedProps: [...ALLOWED_PROPS] }));
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    perPage('Selective Attention: with prefers-reduced-motion there are no animations and ~0 transitions', async (page) => {
      await page.waitForTimeout(1500);
      const anims = await page.evaluate(scanAnimations, 'any');
      // ~0: 10ms tolerance for the common "0.01ms !important" reset pattern
      const trans = await page.evaluate(scanTransitions, { maxSeconds: 0.01, allowedProps: [...ALLOWED_PROPS] });
      check('Selective Attention', [...anims, ...trans]);
    });
  });
});

/* ------------------------------------------------------------------ */
/* Contrast + accessibility                                           */
/* ------------------------------------------------------------------ */

function contrastScan() {
  const ux = (window as any).__ux;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  type RGBA = [number, number, number, number];
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const alpha = (a?: string) => (a === undefined ? 1 : a.endsWith('%') ? parseFloat(a) / 100 : parseFloat(a));
  const parse = (str: string): RGBA => {
    const s = str.trim();
    let m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.%]+))?\s*\)$/);
    if (m) return [+m[1], +m[2], +m[3], alpha(m[4])];
    m = s.match(/^color\(\s*srgb\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)(?:\s*\/\s*([\d.%]+))?\s*\)$/);
    if (m) return [clamp(+m[1] * 255), clamp(+m[2] * 255), clamp(+m[3] * 255), alpha(m[4])];
    // lab(), oklch(), color(display-p3 ...) etc: let the canvas convert to sRGB
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = s;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const blend = (fg: RGBA, bg: RGBA): RGBA => [fg[0] * fg[3] + bg[0] * (1 - fg[3]), fg[1] * fg[3] + bg[1] * (1 - fg[3]), fg[2] * fg[3] + bg[2] * (1 - fg[3]), 1];
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const lum = (c: RGBA) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a: RGBA, b: RGBA) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const rootCs = getComputedStyle(document.documentElement);
  const darkCanvas = matchMedia('(prefers-color-scheme: dark)').matches && /dark/.test(rootCs.colorScheme);
  const canvasColor: RGBA = darkCanvas ? [18, 18, 18, 1] : [255, 255, 255, 1];

  /** Effective background, or null when the text sits over an image/gradient. */
  const bgOf = (el: Element): RGBA | null => {
    const layers: RGBA[] = [];
    let base: RGBA | null = null;
    for (let n: Element | null = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.backgroundImage !== 'none') return null;
      const c = parse(cs.backgroundColor);
      if (c[3] > 0) {
        if (c[3] >= 1) {
          base = c;
          break;
        }
        layers.push(c);
      }
    }
    let acc: RGBA = base || canvasColor;
    for (let i = layers.length - 1; i >= 0; i--) acc = blend(layers[i], acc);
    return acc;
  };

  const out = new Map<string, string>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!(node.textContent || '').trim()) continue;
    const el = node.parentElement;
    if (!el || el.closest('script, style, noscript, title, [hidden]')) continue;
    range.selectNodeContents(node);
    const rr = range.getBoundingClientRect();
    if (rr.width === 0 || rr.height === 0) continue;
    if (!ux.vis(el)) continue;
    const cs = getComputedStyle(el);
    if (/rect\(0(px)?[, ]+0(px)?[, ]+0(px)?[, ]+0(px)?\)/.test(cs.clip) || /inset\(50%\)/.test(cs.clipPath)) continue; // visually hidden
    // text over images: ancestor background-image, or figure/picture overlays (not figcaption)
    const fig = el.closest('figure, picture');
    if (fig && !el.closest('figcaption') && fig.querySelector('img, video, canvas')) continue;
    const bg = bgOf(el);
    if (!bg) continue;
    let opacity = 1;
    for (let n: Element | null = el; n; n = n.parentElement) opacity *= parseFloat(getComputedStyle(n).opacity);
    if (opacity === 0) continue;
    const fgRaw = parse(cs.color);
    const fg = blend([fgRaw[0], fgRaw[1], fgRaw[2], fgRaw[3] * opacity], bg);
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const need = large ? 3 : 4.5;
    const r = ratio(fg, bg);
    if (Math.round(r * 100) / 100 < need) {
      const rgb = (c: RGBA) => `rgb(${c.slice(0, 3).map(Math.round).join(',')})`;
      const key = `${ux.sel(el)}|${rgb(fg)}|${rgb(bg)}`;
      if (!out.has(key)) out.set(key, `${ux.sel(el)} text ${rgb(fg)} on ${rgb(bg)} is ${r.toFixed(2)}:1, needs ${need}:1 (${size}px${large ? ', large' : ''})`);
    }
  }
  return [...out.values()];
}

test.describe('Contrast', () => {
  perPage('Contrast: axe-core finds no WCAG 2.0/2.1/2.2 A/AA violations', async (page) => {
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    const v = results.violations.map((x) => {
      const nodes = x.nodes.slice(0, 3).map((n) => `${n.target.join(' ')} (${(n.failureSummary || '').split('\n')[1]?.trim() || n.html.slice(0, 60)})`);
      return `[${x.id}, ${x.impact}] ${x.help}: ${x.nodes.length} element(s), e.g. ${nodes.join('; ')}`;
    });
    check('Contrast (axe)', v);
  });

  perPage('Contrast: every visible text node meets 4.5:1 (3:1 for large text)', async (page) => {
    check('Contrast', await page.evaluate(contrastScan));
  });
});

/* ------------------------------------------------------------------ */
/* Postel's Law                                                       */
/* ------------------------------------------------------------------ */

function overflowScan() {
  const ux = (window as any).__ux;
  const de = document.documentElement;
  const out: string[] = [];
  if (de.scrollWidth > de.clientWidth + 1) {
    const culprits: string[] = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.right > de.clientWidth + 1 && ux.vis(el)) culprits.push(`${ux.sel(el)} (right edge ${Math.round(r.right)}px)`);
      if (culprits.length >= 4) break;
    }
    out.push(`horizontal scroll: scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}. Widest: ${culprits.join(' | ') || 'unknown'}`);
  }
  return out;
}

test.describe("Postel's Law", () => {
  perPage("Postel's Law: no horizontal scroll at 320px wide", async (page, url) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    check("Postel's Law", await page.evaluate(overflowScan));
  });

  // 200% zoom of a 1280px window is a 640 CSS px viewport.
  perPage("Postel's Law: no horizontal scroll at 200% zoom (640px viewport)", async (page, url) => {
    await page.setViewportSize({ width: 640, height: 800 });
    await page.goto(url, { waitUntil: 'load' });
    await page.waitForTimeout(200);
    check("Postel's Law", await page.evaluate(overflowScan));
  });

  test.describe('JavaScript disabled', () => {
    test.use({ javaScriptEnabled: false });
    for (const url of PAGES) {
      test(`Postel's Law: main text is visible with JavaScript disabled [${url}]`, async ({ page }) => {
        const res = await page.goto(url, { waitUntil: 'load' });
        if (!res || res.status() >= 400) throw new Error(`PAGE MISSING: ${url} returned HTTP ${res ? res.status() : 'none'}`);
        const main = page.locator('main').first();
        const n = await main.count();
        check("Postel's Law", n === 0 ? ['no <main> element'] : []);
        const visible = await main.isVisible();
        const text = ((await main.innerText()) || '').trim();
        const v: string[] = [];
        if (!visible) v.push('<main> is not visible without JavaScript');
        if (text.length < 20) v.push(`<main> has only ${text.length} characters of visible text without JavaScript`);
        check("Postel's Law", v);
      });
    }
  });
});

/* ------------------------------------------------------------------ */
/* Keyboard focus                                                     */
/* ------------------------------------------------------------------ */

test.describe('Focus visibility', () => {
  perPage('Focus visibility: the first 15 tab stops each show a visible focus indicator', async (page) => {
    type Snap = { sel: string; outline: boolean; shadow: string; w: number; h: number } | null;
    const snap = (): Snap => {
      const ux = (window as any).__ux;
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      (window as any).__prev = el;
      return {
        sel: ux.sel(el),
        // iframes draw their own focus ring inside the (often cross-origin) frame: not judged
        outline: el.tagName === 'IFRAME' || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0),
        shadow: cs.boxShadow,
        w: r.width,
        h: r.height,
      };
    };
    const blurredShadow = () => {
      const p = (window as any).__prev as Element | undefined;
      return p ? getComputedStyle(p).boxShadow : 'none';
    };
    const stops: NonNullable<Snap>[] = [];
    const blurred: string[] = [];
    for (let i = 0; i < 16; i++) {
      await page.keyboard.press('Tab');
      // after pressing Tab the previous element has lost focus: read its resting shadow
      if (i > 0 && stops.length === i) blurred.push(await page.evaluate(blurredShadow));
      if (i === 15) break;
      const s = await page.evaluate(snap);
      if (!s) break;
      stops.push(s);
    }
    const v: string[] = [];
    stops.forEach((s, i) => {
      const shadowChanged = s.shadow !== 'none' && i < blurred.length && s.shadow !== blurred[i];
      const shadowUnknown = s.shadow !== 'none' && i >= blurred.length; // last stop: accept any shadow
      if (!s.outline && !shadowChanged && !shadowUnknown) v.push(`tab stop ${i + 1}: ${s.sel} shows no visible focus indicator (outline none/0, no box-shadow change)`);
    });
    if (stops.length === 0) v.push('no focusable elements reached with Tab');
    check('Focus visibility', v);
  });
});
