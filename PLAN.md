# ksharma-website — build & migration plan

Personal website + portfolio for Karan Sharma, on **GitHub Pages**, built to the same
quality bar as the KRAIL site (mobile + desktop, strong SEO/perf/a11y). Content comes
from [`CONTEXT.md`](./CONTEXT.md). Visual design is provided separately by Karan ("Claude
design" handover); this repo owns structure, content, and the quality baseline — not the
look.

> **Quality baseline:** apply the `app-landing-site` skill
> (`Utility/claude-skills/app-landing-site/SKILL.md`) — full head/SEO + social/structured
> data, async fonts, image optimisation, robots/sitemap, Lighthouse CI, responsive.

---

## Decisions (confirmed with Karan)

- **Repo:** `ksharma-xyz/ksharma-website`, **public**.
- **Blog:** **migrate full content** into this site (not just links).
- **Domain:** **ksharma.xyz will move here**, replacing Google Sites → set up CNAME +
  canonical for `https://www.ksharma.xyz/` from the start; plan a clean cutover.
- **Astraman:** private/upcoming → feature as **"coming soon"** (details from Karan later).
- **Design:** Karan hands over a design; I build it responsive on top of this baseline.

---

## Information architecture

Mirror the current site's sections (Home · Portfolio · Blog · Photography · Social), but
add a dedicated **Apps / Open Source** surface (the current site buries these).

```
/                     Home — hero + positioning, featured work (KRAIL, Sumi, Huezoo), quick links
/portfolio/           Career timeline (CommBank → … → Portea), expandable role highlights
/apps/                Apps & open source — KRAIL, Sumi, Huezoo, dhruva, aagya, Astraman (coming soon)
/blog/                Blog index + one page per post (migrated full content)
/blog/<slug>/         Individual post
/photography/         Image-forward gallery (lazy WebP)
/social/  (or footer) Social/contact links (may collapse into the footer + a /contact)
```

Decide during design whether these are separate HTML pages or one long scrolling page
with anchors. Recommendation: **separate pages** for Blog/Photography (content-heavy),
single-page hero+apps+timeline for the rest.

---

## Tech approach

- **Static HTML + CSS** on GitHub Pages, deployed from `main` (KRAIL/Sumi model:
  `ghp-import` of a staged `_site/`, or serve `/docs` directly). No heavy framework.
- **Blog**: author posts as **Markdown**, render to static HTML at build (lightweight
  generator or a small build step). This keeps future posts easy and supports the
  "migrate full content" decision cleanly.
- **Responsive**: mobile-first; verify at 390px and ≥1280px.
- **SEO/social/perf/a11y**: per the `app-landing-site` skill. Add a `Person`/`WebSite`
  JSON-LD (not `MobileApplication`) for the homepage; `BlogPosting` JSON-LD per post.

---

## Migration steps

### 1. Scaffold (this repo)
- [x] Create public repo + clone.
- [x] `CONTEXT.md`, `PLAN.md`.
- [ ] After design handover: page templates, shared CSS, header/footer, nav.
- [ ] `.github/workflows/deploy.yml` (Pages) + `lighthouse.yml` (audit on push).
- [ ] `CNAME` = `www.ksharma.xyz` (only effective once DNS points here).
- [ ] `robots.txt` + `sitemap.xml` (sitemap includes home, portfolio, apps, every blog post, photography).

### 2. Content port
- [ ] **Apps**: build cards from `CONTEXT.md`; confirm KRAIL store URLs from the KRAIL repo; add Astraman "coming soon".
- [ ] **Portfolio timeline**: from `CONTEXT.md` role highlights (expandable).
- [ ] **Blog full migration**: extract each of the 9 posts from the Google Sites blog →
      Markdown (title, date, body, code blocks, images). Preserve publish dates. Add
      canonical + `BlogPosting` JSON-LD. *Needs: post bodies (extract via fetch, or Karan
      exports them).* Watch for code-snippet formatting and images.
- [ ] **Photography**: needs Karan's images → optimise to WebP, lazy-load, alt text.

### 3. Domain cutover (ksharma.xyz)
- [ ] Add `CNAME` file (`www.ksharma.xyz`) in the repo.
- [ ] In the **domain registrar/DNS**: point `www.ksharma.xyz` (CNAME → `ksharma-xyz.github.io`)
      and apex `ksharma.xyz` (A/AAAA → GitHub Pages IPs, or ALIAS). *Karan does the DNS.*
- [ ] Enable HTTPS in GitHub Pages settings; verify the custom domain.
- [ ] Set canonical URLs to `https://www.ksharma.xyz/...`.
- [ ] Once live and verified, retire/redirect the Google Sites version; keep the same
      paths where possible so existing links don't break.
- [ ] Submit `sitemap.xml` to Google Search Console.

### 4. Verify
- [ ] Lighthouse: A11y / Best Practices / SEO = 100, Performance ≥ 90.
- [ ] Mobile (390px) + desktop (1280px) pass; reduced-motion respected.
- [ ] Social preview (og-cover) renders in Slack/iMessage/LinkedIn.

---

## What I need from Karan

1. **Design handover** (the "Claude design" output) — layout, type, colour, components.
2. **Astraman** one-liner + platforms + links (when ready).
3. **Photography images** (+ optional captions).
4. **KRAIL store URLs** confirmation (or I pull from the KRAIL repo).
5. Whether blog post bodies can be **extracted from Google Sites** by me, or you'll export them.
6. Who controls **ksharma.xyz DNS** (registrar) for the cutover.

---

## Open questions / notes

- Blog engine: hand-rolled Markdown→HTML step vs a minimal generator. Decide at build time;
  keep posts as Markdown either way so they outlive the tooling.
- Social: likely fold into the footer + a small `/contact`, rather than a standalone page.
- The current "Portfolio" is really an experience timeline; the new **Apps** section is the
  place to show shipped products + open-source libs prominently.
