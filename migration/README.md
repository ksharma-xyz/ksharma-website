# migration/ — extracted content from the old ksharma.xyz (Google Sites)

A one-off scrape of the current Google Sites site, kept as **source material** for
rebuilding the new site. This is a draft, not final copy — clean it up while building.

## What's here

- `extract.mjs` — the scraper (Puppeteer using the installed Chrome + Turndown).
- `extracted/`
  - `blog/<slug>.md`, `portfolio/<slug>.md`, `pages/<slug>.md` — Markdown per page, with
    frontmatter (`title`, `source`, `date` for blog, `type`).
  - `*/images/<slug>/*.webp` — every Google-hosted image, converted to WebP.
  - `manifest.json` — index of all 24 pages (slug, url, type, title, date, image count).
  - `html/` — raw `[content]` HTML per page (gitignored; re-run to regenerate).

## How it was built

Google Sites hydrates content **on scroll** and lazy-loads images, and the real content
is **not** in `[role=main]` (that's near-empty) — it's the largest-text container. The
script scrolls the full page, waits for hydration, picks that container (after stripping
header/nav/footer/banner), converts to Markdown, and downloads every `googleusercontent`
image (asking for `=w1600`) → WebP via `cwebp`.

Re-run: `cd migration && npm install && node extract.mjs`

## Known limitations (clean up during the rebuild)

- **Empty heading anchors**: Google Sites emits `#`/empty-link artifacts around headings — strip these.
- **Code blocks**: some posts render code as **images** (screenshots) or in **iframes**, so
  it may not come through as text. Check posts with many images (a11y posts, etc.) and
  re-type code from the live site or originals where needed.
- **Dates**: pulled from the blog index (Google Sites doesn't render them in-page).
- **Image alt text**: mostly empty in the source; add real alt text when rebuilding.
- This captures content + assets; final copy/editing happens against the new design.

## Pages captured (24)

5 nav (home, portfolio, blog, photography, social) · 10 portfolio detail (CommBank,
Cash App, Afterpay, Telstra, Zip, Qualcomm, Micromax, Portea, Qantas, myBeepr) ·
9 blog posts. See `manifest.json`.
