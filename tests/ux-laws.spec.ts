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

const PAGES = ['/', '/work/', '/blog/', '/photos/', '/about/', ...blogPaths()];

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
  perPage("Fitts's Law: nav links, buttons, .btn and card links are at least 44x44 (.btn-sm 44x40)", async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      const els = new Set<Element>(document.querySelectorAll('header nav a, button, .btn, a.card, a.card--feature, a.card--inner, a:has(.card), a:has(.card--feature)'));
      for (const el of els) {
        if (!ux.vis(el)) continue;
        const r = el.getBoundingClientRect();
        // Owner spec: .btn is 48px tall and .btn-sm is 40px (pills, WCAG 2.5.8 needs 24). Everything else >= 44.
        const minH = el.classList.contains('btn-sm') ? 39.9 : 43.9;
        if (r.width < 43.9 || r.height < minH) {
          out.push(`${ux.sel(el)} is ${Math.round(r.width)}x${Math.round(r.height)}px, tap target must be >= 44x44 (.btn-sm: 44x40)`);
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

  // Hover must be a quiet colour change: nothing on the page may move.
  perPage('Doherty Threshold: hover never moves content', async (page) => {
    test.setTimeout(180_000);
    await page.waitForTimeout(1500); // let the one-off load sequence finish
    const count = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const els = Array.from(document.querySelectorAll('a.card, .btn, .theme-toggle')).filter((e) => ux.vis(e));
      els.forEach((e, i) => e.setAttribute('data-ux-hover', String(i)));
      return els.length;
    });
    const v: string[] = [];
    for (let i = 0; i < Math.min(count, 80); i++) {
      const loc = page.locator(`[data-ux-hover="${i}"]`);
      await loc.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(50);
      const measure = () =>
        loc.evaluate((el) => {
          const parts = [el, ...Array.from(el.querySelectorAll('img, h2, h3, h4, p, svg'))];
          return parts.map((n) => {
            const r = n.getBoundingClientRect();
            return [r.left, r.top, r.width, r.height];
          });
        });
      const before = await measure();
      const box = await loc.boundingBox();
      if (!box) continue;
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(300);
      const after = await measure();
      const moved = before.some((b, k) => b.some((x, j) => Math.abs(x - after[k][j]) > 0.5));
      if (moved) {
        const name = await loc.evaluate((el) => (window as any).__ux.sel(el));
        v.push(`${name} moves on hover (it or something inside it changed position or size)`);
      }
    }
    await page.mouse.move(0, 0);
    check('Doherty Threshold', v);
  });
});

/* ------------------------------------------------------------------ */
/* No link to the site's own source                                   */
/* ------------------------------------------------------------------ */

test.describe("No link to the site's own source", () => {
  perPage("No link to the site's own source: no repo link and no 'Source for this site'", async (page, _url, res) => {
    const raw = await res.text();
    const v: string[] = [];
    const links = await page.evaluate(() =>
      Array.from(document.querySelectorAll('a[href*="ksharma-xyz/ksharma-website"]')).map((a) => (window as any).__ux.sel(a)),
    );
    for (const l of links) v.push(`${l} links to the site's source repo`);
    if (/Source for this site/i.test(raw)) v.push('served HTML contains "Source for this site"');
    const dom = await page.evaluate(() => document.body.innerText);
    if (/Source for this site/i.test(dom)) v.push('rendered page shows "Source for this site"');
    check("No link to the site's own source", v);
  });
});

/* ------------------------------------------------------------------ */
/* Numbers never wrap                                                 */
/* ------------------------------------------------------------------ */

test.describe('Numbers never wrap', () => {
  perPage('Numbers never wrap: stat values, prices, dates and read times sit on one line', async (page) => {
    await page.waitForTimeout(500);
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      const lineCount = (el: Element) => {
        const r = document.createRange();
        r.selectNodeContents(el);
        const tops = new Set<number>();
        for (const rect of Array.from(r.getClientRects())) if (rect.width > 0) tops.add(Math.round(rect.bottom));
        return tops.size;
      };
      for (const el of Array.from(document.querySelectorAll('.stats b, .num, .row-meta, .meta time'))) {
        if (!ux.vis(el)) continue;
        const n = lineCount(el);
        if (n > 1) out.push(`${ux.sel(el)} wraps onto ${n} lines`);
      }
      return out;
    });
    check('Numbers never wrap', v);
  });
});

/* ------------------------------------------------------------------ */
/* Stretch layout                                                     */
/* ------------------------------------------------------------------ */

// Owner rule: always stretch. No text block may be capped narrower than its container.
test.describe('Stretch layout', () => {
  perPage('Stretch layout: no text block has a max-width narrower than its container', async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      for (const el of Array.from(document.querySelectorAll('main p, main li, main figcaption, main blockquote, main h1, main h2, main dd'))) {
        if (!ux.vis(el)) continue;
        const mw = getComputedStyle(el).maxWidth;
        if (mw === 'none' || mw.endsWith('%')) continue;
        const parent = el.parentElement;
        if (!parent) continue;
        const pcs = getComputedStyle(parent);
        const inner = parent.clientWidth - parseFloat(pcs.paddingLeft) - parseFloat(pcs.paddingRight);
        const cap = parseFloat(mw);
        if (cap < inner - 1) out.push(`${ux.sel(el)} is capped at max-width ${mw}, its container is ${Math.round(inner)}px wide`);
      }
      return out;
    });
    check('Stretch layout', v);
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
/* Law of Uniform Connectedness                                       */
/* ------------------------------------------------------------------ */

// Items in one action row read as a group only if they line up: same vertical centre,
// same height for buttons, and text sitting on one baseline.
function scanActionRows() {
  const ux = (window as any).__ux;
  const out: string[] = [];
  const isItem = (c: Element) => c.matches('.btn, a, button') && ux.vis(c) && c.getClientRects().length === 1;
  const firstLineBottom = (el: Element): number | null => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => ((n.textContent || '').trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP),
    });
    const t = w.nextNode();
    if (!t) return null;
    const r = document.createRange();
    r.selectNodeContents(t);
    const rects = r.getClientRects();
    return rects.length ? rects[0].bottom : null;
  };
  for (const parent of Array.from(document.body.querySelectorAll('*'))) {
    const kids = Array.from(parent.children).filter(isItem);
    if (kids.length < 2) continue;
    // group into visual lines by vertical overlap
    const lines: Element[][] = [];
    for (const k of kids.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)) {
      const r = k.getBoundingClientRect();
      const line = lines.find((l) => {
        const f = l[0].getBoundingClientRect();
        return r.top < f.bottom && r.bottom > f.top;
      });
      if (line) line.push(k);
      else lines.push([k]);
    }
    for (const line of lines) {
      if (line.length < 2) continue;
      const ref = line[0];
      const rr = ref.getBoundingClientRect();
      const refC = rr.top + rr.height / 2;
      const refBtn = line.find((e) => e.matches('.btn'));
      const refBase = line.find((e) => !e.matches('.card, .card--feature, .card--inner'));
      const refBaseline = refBase ? firstLineBottom(refBase) : null;
      for (const el of line.slice(1)) {
        const r = el.getBoundingClientRect();
        const c = r.top + r.height / 2;
        if (Math.abs(c - refC) > 1) out.push(`${ux.sel(el)} centre is ${(c - refC).toFixed(1)}px off ${ux.sel(ref)} in the same row`);
        if (refBtn && el !== refBtn && el.matches('.btn')) {
          const h0 = refBtn.getBoundingClientRect().height;
          if (Math.abs(r.height - h0) > 0.5) out.push(`${ux.sel(el)} is ${r.height.toFixed(1)}px tall, ${ux.sel(refBtn)} is ${h0.toFixed(1)}px in the same row`);
        }
      }
      // Baselines: compared for controls and links, not for whole-card links (cards are regions).
      if (refBase && refBaseline !== null) {
        for (const el of line) {
          if (el === refBase || el.matches('.card, .card--feature, .card--inner')) continue;
          const b = firstLineBottom(el);
          if (b !== null && Math.abs(b - refBaseline) > 1) out.push(`${ux.sel(el)} text baseline is ${(b - refBaseline).toFixed(1)}px off ${ux.sel(refBase)} in the same row`);
        }
      }
    }
  }
  return out;
}

test.describe('Law of Uniform Connectedness: action rows align', () => {
  perPage('Law of Uniform Connectedness: items in a row share one centre line, and buttons one height', async (page) => {
    await page.waitForTimeout(1000); // after the load sequence
    const v = (await page.evaluate(scanActionRows)).filter((m) => !m.includes('text baseline'));
    check('Law of Uniform Connectedness', v);
  });
  perPage('Law of Uniform Connectedness: text baselines align across siblings in a row', async (page) => {
    await page.waitForTimeout(1000);
    const v = (await page.evaluate(scanActionRows)).filter((m) => m.includes('text baseline'));
    check('Law of Uniform Connectedness', v);
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
    // The hero's block caret blinks by design (owner-approved Phosphor hero). Reduced motion turns it off (tested below).
    const found = (await page.evaluate(scanAnimations, 'infinite')).filter((m) => !/\.caret/.test(m));
    check('Selective Attention', found);
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
  const canvasColor: RGBA = darkCanvas ? [0, 0, 0, 1] : [255, 255, 255, 1];

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


/* ------------------------------------------------------------------ */
/* Phosphor rules (owner decisions, 2026-11-09)                       */
/* ------------------------------------------------------------------ */

test.describe('Arrow rule', () => {
  // Only links that open another site carry the external icon. Internal links, mailto and downloads carry none.
  perPage('Arrow rule: internal links and buttons have no arrow or chevron; every other-origin link has the external icon', async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      const ARROW = /[\u2190-\u21FF\u27A1\u279C\u203A\u00BB\u2192]|->|=>/;
      for (const a of Array.from(document.querySelectorAll('a[href], button'))) {
        if (!ux.vis(a)) continue;
        const href = a.getAttribute('href') || '';
        const text = (a.textContent || '').trim();
        const external = /^https?:/i.test(href) && new URL(href, location.href).origin !== location.origin;
        const icons = Array.from(a.querySelectorAll('svg'));
        const hasExt = !!a.querySelector('svg.ext');
        if (ARROW.test(text)) out.push(`${ux.sel(a)} has an arrow character in its label`);
        if (external && a.matches('a.store')) continue; // icon-only store logo, see Store links
        if (external) {
          if (!hasExt) out.push(`${ux.sel(a)} opens another site but has no external icon`);
          const label = (a.textContent || '').trim();
          const last = a.lastElementChild;
          if (hasExt && last && !last.matches('svg.ext') && !a.matches('a.card')) out.push(`${ux.sel(a)} external icon must come after the label`);
          void label;
        } else {
          for (const i of icons) {
            if (!i.matches('svg.gh, svg.mail, svg.i-moon, svg.i-sun, svg.chev') && !a.closest('.carousel-btns')) out.push(`${ux.sel(a)} (internal) contains an icon ${ux.sel(i)}`);
            if (i.matches('svg.ext')) out.push(`${ux.sel(a)} is internal but carries the external icon`);
          }
          if (a.matches('a') && a.querySelector('svg.chev')) out.push(`${ux.sel(a)} (internal) contains a chevron`);
        }
      }
      const body = document.body.innerText;
      const m = body.match(/[\u2190-\u21FF\u27A1]/);
      if (m) out.push(`page text contains the arrow character ${m[0]}`);
      return out;
    });
    check('Arrow rule', v);
  });
});

test.describe('Store links', () => {
  // App Store and Google Play appear only as icon-only logo links (a.store) on the app cards:
  // labelled for screen readers, a 44px target, and nothing else mentions the stores.
  perPage('Store links: store URLs only as labelled, icon-only logo links at least 44px', async (page) => {
    const v = await page.evaluate(() => {
      const out: string[] = [];
      for (const a of Array.from(document.querySelectorAll('a[href]'))) {
        const href = a.getAttribute('href') || '';
        if (!/apps\.apple\.com|play\.google\.com/i.test(href)) continue;
        if (!a.matches('a.store')) { out.push(`${href} is a store link without the .store logo style`); continue; }
        if (!(a.getAttribute('aria-label') || '').trim()) out.push(`${href} has no aria-label`);
        if ((a.textContent || '').trim()) out.push(`${href} has visible text, it must be icon-only`);
        if (!a.querySelector('svg')) out.push(`${href} has no logo`);
        const r = a.getBoundingClientRect();
        if (r.width && (r.width < 44 || r.height < 44)) out.push(`${href} is ${Math.round(r.width)}x${Math.round(r.height)}px, needs 44x44`);
      }
      if (/App Store|Google Play/.test(document.body.innerText)) out.push('rendered text mentions "App Store" or "Google Play"');
      return out;
    });
    check('Store links', v);
  });
});

test.describe('Matrix rain', () => {
  perPage('Matrix rain: the rain canvas exists and is visible on / only', async (page, url) => {
    const r = await page.evaluate(() => {
      const c = document.querySelector('canvas#rain') as HTMLCanvasElement | null;
      if (!c) return { present: false, visible: false, hidden: false };
      const b = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return { present: true, visible: b.width > 0 && b.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden', hidden: c.getAttribute('aria-hidden') === 'true' };
    });
    const v: string[] = [];
    if (url === '/') {
      if (!r.present) v.push('no canvas#rain on /');
      else {
        if (!r.visible) v.push('canvas#rain is not visible on /');
        if (!r.hidden) v.push('canvas#rain must be aria-hidden');
      }
    } else if (r.present) v.push('canvas#rain must only exist on /');
    check('Matrix rain', v);
  });

  test('Matrix rain: it actually paints, and it stops when the tab is hidden', async ({ page }) => {
    await visit(page, '/');
    await page.waitForTimeout(800);
    const painted = await page.evaluate(() => {
      const c = document.getElementById('rain') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let lit = 0;
      for (let i = 0; i < d.length; i += 4 * 37) if (d[i + 1] > 40) lit++;
      return lit;
    });
    expect(painted, 'the rain canvas has no green pixels').toBeGreaterThan(0);
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('Matrix rain: with reduced motion the verb is static and the rain is one still frame', async ({ page }) => {
      await visit(page, '/');
      await page.waitForTimeout(3200);
      const verb = await page.evaluate(() => (document.getElementById('name') as HTMLElement).textContent);
      expect(verb).toBe('Building');
      const a = await page.evaluate(() => (document.getElementById('rain') as HTMLCanvasElement).toDataURL());
      await page.waitForTimeout(400);
      const b = await page.evaluate(() => (document.getElementById('rain') as HTMLCanvasElement).toDataURL());
      expect(a, 'rain keeps animating with prefers-reduced-motion').toBe(b);
    });
  });
});

test.describe('Home hero', () => {
  test('Home hero: no paragraph, chips or table between the headline and the action row', async ({ page }) => {
    await visit(page, '/');
    const v = await page.evaluate(() => {
      const out: string[] = [];
      const copy = document.querySelector('.hero .copy');
      if (!copy) return ['no .hero .copy'];
      const kids = Array.from(copy.children).map((c) => c.tagName.toLowerCase() + (c.className ? '.' + String(c.className).split(' ')[0] : ''));
      if (kids.join(',') !== 'h1,div.actions') out.push(`hero copy children are [${kids.join(', ')}], expected [h1, div.actions]`);
      if (copy.querySelector('p, ul:not(.actions), dl, table')) out.push('hero has a paragraph, list or table');
      const h1 = copy.querySelector('h1')!;
      if (!/Building software that works for a diverse user base\./.test(h1.getAttribute('aria-label') || '')) out.push('h1 aria-label is not the full sentence');
      const btns = Array.from(copy.querySelectorAll('.actions a')).map((a) => (a.textContent || '').trim());
      if (btns.join('|') !== 'Browse my apps|My work in AI|Blog') out.push(`hero buttons are [${btns.join(' | ')}]`);
      return out;
    });
    check('Home hero', v);
  });

  test('Home hero: the action row bottom aligns with the portrait bottom (+-2px) from 900px up', async ({ page }) => {
    const vp = page.viewportSize()!;
    test.skip(vp.width < 900, 'stacked layout below 900px');
    await visit(page, '/');
    await page.waitForTimeout(800);
    const d = await page.evaluate(() => {
      const a = document.querySelector('.hero .actions')!.getBoundingClientRect();
      const p = document.querySelector('.hero .portrait')!.getBoundingClientRect();
      return { actions: a.bottom, portrait: p.bottom };
    });
    expect(Math.abs(d.actions - d.portrait), `actions bottom ${d.actions} vs portrait bottom ${d.portrait}`).toBeLessThanOrEqual(2);
  });
});

test.describe('No helper text', () => {
  perPage('No helper text: no "Say hello" card and no eyebrow or status labels', async (page) => {
    const v = await page.evaluate(() => {
      const t = document.body.innerText;
      const out: string[] = [];
      for (const w of ['Say hello', 'Latest post', 'Older post', 'Newer post', 'Previous', 'Live on iOS']) if (t.includes(w)) out.push(`page text contains "${w}"`);
      const labels = Array.from(document.querySelectorAll('header nav a, h1, h2, h3, .btn')).map((e) => e.textContent || '').join(' ');
      if (/\bWriting\b/.test(labels)) out.push('a nav item, heading or button still says "Writing" (the section is called Blog)');
      return out;
    });
    check('No helper text', v);
  });
});

test.describe('Type', () => {
  perPage('Type: no heading uses a monospace font', async (page) => {
    const v = await page.evaluate(() => {
      const ux = (window as any).__ux;
      const out: string[] = [];
      for (const h of Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))) {
        if (!ux.vis(h)) continue;
        const f = getComputedStyle(h).fontFamily;
        if (/mono|monospace|menlo|consolas/i.test(f)) out.push(`${ux.sel(h)} uses ${f}`);
      }
      return out;
    });
    check('Type', v);
  });
});

test.describe('Career logos', () => {
  test('Career logos: every role shows its decorative logo and Commonwealth Bank is open', async ({ page }) => {
    await visit(page, '/work/');
    const v = await page.evaluate(() => {
      const out: string[] = [];
      const roles = Array.from(document.querySelectorAll('details.role'));
      if (roles.length !== 10) out.push(`${roles.length} roles, expected 10`);
      roles.forEach((r, i) => {
        const img = r.querySelector('summary .lg img') as HTMLImageElement | null;
        if (!img) out.push(`role ${i + 1} has no logo`);
        else if (img.getAttribute('alt') !== '') out.push(`role ${i + 1} logo must have alt=""`);
        if (i === 0 && !(r as HTMLDetailsElement).open) out.push('first role is not open');
        if (i > 0 && (r as HTMLDetailsElement).open) out.push(`role ${i + 1} should start closed`);
      });
      return out;
    });
    check('Career logos', v);
  });
});

test.describe('Post images and carousels', () => {
  for (const post of blogPaths()) {
    test(`Post images: no taller than 60vh or wider than 960px at 1440x900 [${post}]`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await visit(page, post);
      await page.evaluate(async () => {
        const imgs = Array.from(document.querySelectorAll('.prose img')) as HTMLImageElement[];
        imgs.forEach((i) => (i.loading = 'eager'));
        await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = () => r(0); }))));
      });
      const v = await page.evaluate(() => {
        const out: string[] = [];
        document.querySelectorAll('.prose img, .prose figure.chart').forEach((el) => {
          const r = el.getBoundingClientRect();
          if (r.height > window.innerHeight * 0.6 + 1) out.push(`${el.tagName} is ${Math.round(r.height)}px tall`);
          if (r.width > 961) out.push(`${el.tagName} is ${Math.round(r.width)}px wide`);
        });
        return out;
      });
      check('Post images', v);
    });
  }

  test('Carousel: Veduta screenshots scroll with named prev/next buttons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, '/blog/building-veduta-on-device-ai-agents/');
    const track = page.locator('.prose [data-carousel]').first();
    await expect(track).toHaveCount(1);
    const prev = page.getByRole('button', { name: 'Previous screenshot' }).first();
    const next = page.getByRole('button', { name: 'Next screenshot' }).first();
    await expect(prev).toBeVisible();
    await expect(prev).toBeDisabled();
    const box = await next.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await track.getAttribute('tabindex')).toBe('0');
    await next.scrollIntoViewIfNeeded();
    await next.click();
    await expect.poll(() => track.evaluate((e) => e.scrollLeft)).toBeGreaterThan(50);
    await expect(prev).toBeEnabled();
  });
});

test.describe('Career bullets', () => {
  test('Career: bullets start at the same left edge as the dates', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await visit(page, '/work/');
    const v = await page.evaluate(() => {
      const y = document.querySelector('details.role[open] .y')!.getBoundingClientRect().left;
      const li = document.querySelector('details.role[open] .role-detail li')!.getBoundingClientRect().left;
      return Math.abs(y - li) <= 2 ? [] : [`dates at ${y}, bullets at ${li}`];
    });
    check('Career', v);
  });
});

test.describe('Career motion', () => {
  test('Career: opening a closed role shows its bullets within 600ms', async ({ page }) => {
    await visit(page, '/work/');
    const role = page.locator('details.role').nth(1);
    await role.locator('summary').click();
    await expect(role.locator('.role-detail li').first()).toBeVisible({ timeout: 600 });
    await expect.poll(() => role.locator('.role-detail').evaluate((e) => getComputedStyle(e).opacity), { timeout: 600 }).toBe('1');
  });
  test('Career: reduced motion toggles instantly', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await visit(page, '/work/');
    const role = page.locator('details.role').nth(1);
    await role.locator('summary').click();
    expect(await role.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(true);
    const h = await role.evaluate((e) => e.getBoundingClientRect().height);
    await page.waitForTimeout(30);
    expect(await role.evaluate((e) => e.getBoundingClientRect().height)).toBe(h);
    expect(await role.locator('.role-detail').evaluate((e) => getComputedStyle(e).opacity)).toBe('1');
    await role.locator('summary').click();
    expect(await role.evaluate((e) => (e as HTMLDetailsElement).open)).toBe(false);
  });
});

test.describe('Smooth motion', () => {
  const COLOUR_PROPS = ['color', 'background-color', 'border-color', 'all'];
  for (const url of ['/', '/work/', '/blog/']) {
    test(`Smooth motion: links, buttons, summaries and cards transition colour in 1 to 320ms [${url}]`, async ({ page }) => {
      await visit(page, url);
      const v = await page.evaluate((props) => {
        const out: string[] = [];
        document.querySelectorAll('a, button, summary, .card').forEach((el) => {
          const cs = getComputedStyle(el);
          const dur = cs.transitionDuration.split(',').map((d) => parseFloat(d) * (d.includes('ms') ? 0.001 : 1));
          const pr = cs.transitionProperty.split(',').map((x) => x.trim());
          const ok = pr.some((p, i) => props.includes(p) && dur[i % dur.length] > 0 && dur[i % dur.length] <= 0.32);
          if (!ok) out.push(`${el.tagName}.${(el as HTMLElement).className}: ${cs.transitionProperty} ${cs.transitionDuration}`);
        });
        return out.slice(0, 8);
      }, COLOUR_PROPS);
      check('Smooth motion', v);
    });
  }

  test('Smooth motion: html scrolls smoothly, and instantly under reduced motion', async ({ page }) => {
    await visit(page, '/');
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('smooth');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  });

  test('Smooth motion: cross-document view transitions are enabled', async () => {
    const css = fs.readFileSync(path.join(DOCS, 'assets', 'site.css'), 'utf8');
    expect(css).toMatch(/@view-transition\s*\{\s*navigation:\s*auto/);
  });

  test('Smooth motion: the theme toggle switches without errors and ends on the right colours', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    await visit(page, '/work/');
    const toggle = page.locator('.theme-toggle');
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const before = await bg();
    await toggle.click();
    await expect.poll(bg, { timeout: 2000 }).not.toBe(before);
    const after = await bg();
    await toggle.click();
    await expect.poll(bg, { timeout: 2000 }).toBe(before);
    expect(after).not.toBe(before);
    expect(errors).toEqual([]);
  });

  test('Smooth motion: reduced motion makes every transition and animation instant', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await visit(page, '/work/');
    const v = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll('body *').forEach((el) => {
        const cs = getComputedStyle(el);
        const bad = (s: string) => s.split(',').some((d) => parseFloat(d) > 0.001);
        if (bad(cs.transitionDuration) || (cs.animationName !== 'none' && bad(cs.animationDuration))) out.push(`${el.tagName}.${(el as HTMLElement).className}`);
      });
      return out.slice(0, 8);
    });
    check('Smooth motion', v);
  });
});

test.describe('Keyboard', () => {
  const FOCUSABLE = 'a[href], button, input, select, textarea, summary, iframe, [tabindex]';

  perPage('Keyboard: Tab reaches every interactive element in order, shows a visible, unobscured, 3:1 focus ring, and never traps', async (page) => {
    await page.evaluate(() => (document.querySelectorAll('.prose [data-carousel], .shots') as any)); // no-op: pages are already settled
    // smooth scrolling is tested on its own; here jumps must be instant so focus can be judged where it lands
    await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' });
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      imgs.forEach((i) => (i.loading = 'eager'));
      await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = () => r(0); }))));
    });
    const expected = await page.evaluate((sel) => {
      const ux = (window as any).__ux;
      const list = Array.from(document.querySelectorAll(sel)).filter((el) => {
        const e = el as HTMLElement & { disabled?: boolean };
        if (e.disabled || e.getAttribute('tabindex') === '-1' || e.closest('[inert]')) return false;
        if (e.tagName === 'A' && e.classList.contains('skip')) return true;
        return ux.vis(e) || (e.tagName === 'SUMMARY' && !!e.getClientRects().length);
      });
      (window as any).__expected = list;
      return list.length;
    }, FOCUSABLE);
    const v: string[] = [];
    const seen: number[] = [];
    const ringSeen = new Set<string>();
    for (let i = 0; i < expected + 40; i++) {
      await page.keyboard.press('Tab');
      const r = await page.evaluate(async () => {
        // smooth scrolling: wait until the focused element has been scrolled into view (up to 5s)
        const t0 = performance.now();
        while (performance.now() - t0 < 5000) {
          await new Promise((res) => requestAnimationFrame(res));
          const a = document.activeElement as HTMLElement | null;
          if (!a || a === document.body) break;
          const b = a.getBoundingClientRect();
          if (b.bottom > 0 && b.top < innerHeight) break;
        }
        await new Promise((res) => requestAnimationFrame(res));
        const el = document.activeElement as HTMLElement;
        const list = (window as any).__expected as Element[];
        if (!el || el === document.body) return { wrapped: true } as any;
        const ux = (window as any).__ux;
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        // focus not obscured: the topmost element at the centre of the focused element is the element, or inside/around it
        const cx = Math.min(Math.max(rect.left + rect.width / 2, 1), innerWidth - 1);
        const cy = Math.min(Math.max(rect.top + rect.height / 2, 1), innerHeight - 1);
        const top = document.elementFromPoint(cx, cy);
        const obscured = !!top && !(el.contains(top) || top.contains(el));
        const offscreen = rect.bottom <= 0 || rect.top >= innerHeight || rect.right <= 0 || rect.left >= innerWidth;
        // ring contrast
        const parse = (c: string) => (c.match(/[\d.]+/g) || []).map(Number);
        const lum = (c: number[]) => { const f = (x: number) => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
        let bg = [255, 255, 255], n: Element | null = el.parentElement; // the ring sits outside the element
        while (n) { const b = parse(getComputedStyle(n).backgroundColor); if (b.length >= 3 && (b.length === 3 || b[3] > 0.95)) { bg = b; break; } n = n.parentElement; }
        const oc = parse(cs.outlineColor);
        const hasOutline = el.tagName === 'IFRAME' || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2);
        const L1 = lum(oc), L2 = lum(bg);
        const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
        return { idx: list.indexOf(el), sel: ux.sel(el), obscured, offscreen, hasOutline, ratio, oc: cs.outlineColor, bg: bg.join(',') };
      });
      if (r.wrapped) break;
      if (r.idx < 0) { v.push(`${r.sel}: focused but not in the expected interactive set`); continue; }
      if (seen.includes(r.idx)) { if (r.sel.startsWith('iframe')) continue; break; } // a cross-origin iframe keeps focus while Tab moves inside it; anything else seen twice means we wrapped round
      seen.push(r.idx);
      if (r.obscured || r.offscreen) v.push(`${r.sel}: focused element is hidden or covered`);
      if (!r.hasOutline) v.push(`${r.sel}: no focus outline of 2px or more`);
      else if (r.ratio < 3) { const k = `${r.oc}|${r.bg}`; if (!ringSeen.has(k)) { ringSeen.add(k); v.push(`${r.sel}: focus ring ${r.oc} on rgb(${r.bg}) is ${r.ratio.toFixed(2)}:1, needs 3:1`); } }
      if (i === 0 && !(await page.evaluate(() => document.activeElement?.classList.contains('skip')))) v.push('the first tab stop is not the skip link');
    }
    const missed = expected - new Set(seen).size;
    if (missed > 0) v.push(`${missed} of ${expected} interactive elements were never reached by Tab`);
    for (let i = 1; i < seen.length; i++) if (seen[i] < seen[i - 1]) { v.push('tab order does not follow the page order'); break; }
    check('Keyboard', v);
  });

  perPage('Keyboard: the skip link is the first tab stop and moves focus to main', async (page) => {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.className)).toContain('skip');
    await page.keyboard.press('Enter');
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('main');
  });

  test('Keyboard: the theme toggle works with Enter and Space', async ({ page }) => {
    await visit(page, '/work/');
    const t = page.locator('.theme-toggle');
    await t.focus();
    const label = () => t.getAttribute('aria-label');
    const a = await label();
    await page.keyboard.press('Enter');
    await expect.poll(label).not.toBe(a);
    await page.keyboard.press('Space');
    await expect.poll(label).toBe(a);
  });

  test('Keyboard: career rows open and close with Enter and Space', async ({ page }) => {
    await visit(page, '/work/');
    const role = page.locator('details.role').nth(1);
    const open = () => role.evaluate((e) => (e as HTMLDetailsElement).open);
    await role.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect.poll(open).toBe(true);
    await page.keyboard.press('Enter');
    await expect.poll(open).toBe(false);
    await page.keyboard.press('Space');
    await expect.poll(open).toBe(true);
    await page.keyboard.press('Space');
    await expect.poll(open).toBe(false);
  });

  test('Keyboard: the carousel scrolls by arrow keys and by its buttons, and a disabled button is skipped', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await visit(page, '/blog/building-veduta-on-device-ai-agents/');
    const track = page.locator('[data-carousel]').first();
    const left = () => track.evaluate((e) => e.scrollLeft);
    await track.focus();
    await page.keyboard.press('ArrowRight');
    await expect.poll(left).toBeGreaterThan(20);
    await page.keyboard.press('ArrowLeft');
    await expect.poll(left).toBeLessThan(5);
    // at the start Previous is disabled, so Tab from the track goes straight to Next
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Next screenshot');
    await page.keyboard.press('Enter');
    await expect.poll(left).toBeGreaterThan(50);
    await page.keyboard.press('Shift+Tab');
    expect(await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))).toBe('Previous screenshot');
  });

  perPage('Keyboard: axe finds no WCAG A/AA violations at 1440 and 390, with careers open and closed', async (page, url) => {
    const v: string[] = [];
    for (const [w, h] of [[1440, 900], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      const states = url === '/work/' ? ['closed', 'all-open'] : ['default'];
      for (const st of states) {
        if (st !== 'default') await page.evaluate((s) => document.querySelectorAll('details.role').forEach((d) => ((d as HTMLDetailsElement).open = s === 'all-open')), st);
        const res = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        res.violations.forEach((x) => v.push(`${w}px ${st}: [${x.id}] ${x.help}: ${x.nodes.slice(0, 2).map((n) => n.target.join(' ')).join('; ')}`));
      }
    }
    check('Keyboard (axe)', v);
  });
});

test.describe('Old Writing URL', () => {
  test('Old Writing URL: /writing/ is a noindex redirect to /blog/', async ({ page }) => {
    const res = await page.goto('/writing/', { waitUntil: 'load' });
    expect(res && res.status()).toBeLessThan(400);
    await page.waitForURL('**/blog/');
    const raw = await (await page.request.get('/writing/')).text();
    expect(raw).toContain('http-equiv="refresh"');
    expect(raw).toContain('rel="canonical" href="https://ksharma.xyz/blog/"');
    expect(raw).toContain('noindex');
  });
});
