# ksharma-website — design brief

**Read this first if you're designing the site.** This is the guidance for the *design*
phase. Design the site **before** any building starts; hand back the deliverables in
"What to hand over" and the build will follow.

- **Content / facts:** [`CONTEXT.md`](./CONTEXT.md) — the only source of truth for copy and links. Don't invent details.
- **Structure / tech / constraints:** [`PLAN.md`](./PLAN.md) — IA, GitHub Pages, migration.
- **Quality baseline (non-negotiable):** the `app-landing-site` skill — SEO, performance, accessibility, responsive. Your design must *fit inside* this, never fight it.

---

## Who this is for (audience)

In priority order:
1. **Engineering leaders / hiring managers / recruiters** — need to grasp seniority (Staff, 10+ yrs, CommBank/Block/Afterpay) and impact in seconds.
2. **Developers** — peers who read the blog, use the KMP libraries (dhruva, aagya), star KRAIL.
3. **Conference organisers / community** — speaker credibility.
4. **App users** — people who found Sumi/Huezoo/KRAIL and want to see who made them.

Design for a **skim-first** read on mobile, with depth available on demand.

---

## Goals

- Communicate, fast: *Staff Software Engineer, secure large-scale mobile, KMP/Compose, AI tooling, open-source maker, speaker.*
- Make the **work tangible** — shipped apps + open-source libs are front-and-centre (the current site buries these under an experience timeline).
- Feel **crafted, not templated**. This person builds beautiful apps (Sumi, KRAIL, Huezoo); the site must clear that bar.
- Stay **fast and accessible** on any device.

Anti-goals: generic SaaS/AI-template look; walls of text; hero with a stock illustration;
anything that needs heavy JS or huge images to look good.

---

## Personality / tone

- **Confident and senior**, but calm — not loud. Lets the work speak.
- A maker's craft sensibility. Karan's apps each have a strong identity:
  - **Sumi** — ink-on-paper, warm, minimal, editorial serif, stillness.
  - **KRAIL** — playful, bright pink + cyan, stamp buttons, hand-drawn squiggles.
  - **Huezoo** — dark, neon, energetic.
- The **personal site should be its own identity**, not a clone of any one app — but it
  may quietly signal "the maker of these". A restrained, typographic, editorial direction
  tends to age better for a portfolio than a high-saturation theme. Light and/or dark both
  fine; if both, design both.

---

## What to design (screens & components)

Cover **mobile (≈390px) and desktop (≈1280px)** for each. See `PLAN.md` for the IA.

### Pages
1. **Home** — hero (name, role, one-line positioning), a tight "what I do", **featured work** (KRAIL, Sumi, Huezoo as cards), entry points to Apps / Portfolio / Blog, social/contact.
2. **Apps / Open Source** — cards for KRAIL, Sumi, Huezoo, **dhruva** (location lib), **aagya** (permission lib), and **Astraman (coming soon)**. Each: name, one-liner, platforms, links (store / GitHub / site). Design an empty/"coming soon" card state.
3. **Portfolio (experience timeline)** — CommBank → Block → Afterpay → Telstra → Zip → Qualcomm → Portea. Compact by default, **expandable** role highlights. Design collapsed + expanded states.
4. **Blog index** — list of posts (title, date, tag). Design the list item + a tag/filter if useful.
5. **Blog post** — long-form reading: headings, body, **code blocks** (these posts are code-heavy), inline images, captions. Define the type scale + code styling.
6. **Photography** — image-forward, lazy gallery. Define grid + lightbox/expand behaviour and aspect-ratio handling.
7. **Footer / contact** — social links (GitHub, LinkedIn, Stack Overflow, Mastodon), email. (Social may live in the footer rather than its own page.)

### Shared components
- Header / nav (mobile menu + desktop), incl. behaviour on scroll.
- Buttons / links (default, hover, focus-visible, active).
- App card, role/timeline item, blog list item, tag/chip, image/figure with caption.
- Footer.

### States to include
- Hover **and** keyboard-focus (focus-visible) for all interactive elements.
- Empty/coming-soon (Astraman), loading-not-required (static), and reduced-motion variant for any animation.

---

## Constraints the design must respect (from the quality baseline)

- **Responsive:** must work at 390px wide and scale up to ≥1280px. No fixed-width layouts.
- **Contrast:** body/UI text ≥ 4.5:1; large text ≥ 3:1 (WCAG AA). Pick palettes that pass.
- **Type:** prefer 1–2 web fonts, loadable async (system-font fallback must look acceptable). Define a clear type scale.
- **Motion:** any animation needs a `prefers-reduced-motion` resting state.
- **Images:** design assumes WebP + lazy-loading; provide source images at sensible sizes (don't rely on 4K hero images).
- **Performance:** no design that requires large JS bundles or many web fonts. Static-HTML-friendly.
- **Social preview:** plan a **1200×630 og-cover** concept (wordmark/name + role) and a favicon.
- **Dark/light:** if both, specify tokens for each.

---

## Brand inputs / assets available

- App icons + palettes for Sumi (paper `#F4ECE0` / ink `#1A1410`), Huezoo (dark `#0D0D16` + neon cyan/green), KRAIL (pink `#FF2F8F` + cyan `#1ADBFF`) — for the "featured work" cards, not necessarily the site's own palette.
- Headshot/founder photo exists (used on KRAIL site) — can reuse if a portrait is wanted.
- Photography images: **TBD from Karan**.

---

## What to hand over (so the build can start)

The more of this you provide, the faster and more faithfully the site gets built:

1. **Layouts** for each page at mobile + desktop (Figma, images, or annotated HTML).
2. **Design tokens:** colour palette (with hex + intended contrast), type scale (font
   families, sizes, weights, line-heights), spacing scale, radius, shadows.
3. **Component specs:** the shared components above, with states.
4. **Responsive rules:** breakpoints and how layouts reflow.
5. **Motion notes:** what animates, how, and the reduced-motion fallback.
6. **Assets:** fonts (or Google Fonts names), any illustrations/icons, the og-cover + favicon concept, exported images.
7. **Anything app-specific** you want carried in (e.g. how the featured-app cards should echo each app's identity).

Once handed over, the build follows `PLAN.md` against this design.
