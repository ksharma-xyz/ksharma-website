# UX laws + accessibility tests

Playwright suite that checks the static site in `../docs` against the Laws of UX and WCAG.
Drop this `tests/` folder at the repo root (next to `docs/`).

## Run

```sh
./tests/run.sh                        # installs deps if missing, runs everything, prints a summary
PORT=8199 ./tests/run.sh              # custom port (default 8899)
./tests/run.sh -g "Fitts"             # extra args go to `playwright test`
./tests/run.sh --project=mobile-light # one project only
npx playwright show-report tests/report
```

A `python3 -m http.server $PORT --directory ../docs` is started automatically (and reused if already running).
Env: `PORT`, `UX_WORKERS` (default 4). The full run is about 1,700 tests and takes a few minutes.

## What runs

Projects: `mobile-light`, `mobile-dark` (390x844), `desktop-light`, `desktop-dark` (1280x800).
Pages: `/`, `/work/`, `/writing/`, `/photos/`, `/about/` plus every `/blog/<slug>/` in `docs/sitemap.xml`
(falls back to the folders in `docs/blog/`). A missing page fails with `PAGE MISSING: ... HTTP 404`, never a crash.

One `describe` per law, one test per page. Failures name the element and the rule, e.g.
`a "All posts" is 72x31px, tap target must be >= 44x44`.

Markup contract: `header nav a`, `.btn-primary`, `.btn`, `.card`, `.card--feature`, `.card--inner`, `footer`, `main`.
Space scale: 4 8 16 24 40 64 104 px.

| Law | Check |
|---|---|
| Fitts | nav links, `button`, `.btn`, card links >= 44x44; inline `p a` >= 24px line height or spaced (see below) |
| Hick | <= 5 `header nav a`; <= 1 visible `.btn-primary` in first viewport |
| Miller | no element with > 7 visible children that are all links / `li` / cards |
| Jakob | landmarks exist; first header link is `/`; nav links distinct and HTTP 200; Back from `/work/` returns to `/` |
| Doherty | LCP < 1500ms, CLS < 0.05 (1 retry, timing is noisy) |
| Von Restorff | <= 1 `.card--feature` |
| Common region | cards nest only card > inner; every card has text |
| Proximity | `.card` padding and flex/grid row/column gaps in `main` on the space scale (+-1px) |
| Similarity | <= 3 card (radius, padding) combos; one `main p a` style |
| Pragnanz | <= 2 font families, <= 6 weights, <= 8 sizes (code/pre/kbd ignored); no resting box-shadow on `.card`, `.btn` |
| Serial position | first `.card--feature` on `/` says KRAIL; last child of `main` or footer links to the public contact address or LinkedIn |
| Peak-end | footer has the public contact address and LinkedIn; no `@gmail.com` in served HTML or DOM |
| Selective attention | no running infinite animations after 1.5s; transitions <= 0.32s on cheap properties; reduced motion: no animations, ~0 transitions |
| Contrast | axe (wcag2a, 2aa, 21aa, 22aa) has zero violations; custom ratio check on every visible text node |
| Postel | no horizontal scroll at 320px and at a 640px viewport (200% zoom); `main` text visible with JS disabled |
| Focus | first 15 tab stops show an outline or a box-shadow change |

The public contact address checked by Serial position and Peak-end is the one written in `ux-laws.spec.ts`.

## Opt-outs and approximations

- `data-ux-list` on an element (or any ancestor) exempts it from Miller (blog/writing index lists, photo grids).
- `data-ux-fluid` on an element (or any ancestor) exempts it from Proximity. `clamp()` spacing cannot be told
  apart from fixed values in computed styles, so mark fluid sections with it.
- Proximity only judges `.card` padding and grid/flex gaps, not margins.
- Inline links (WCAG 2.5.8): links inside a sentence are technically exempt. We still check them, using
  the larger of the link box and the computed line-height, and approximate the spacing exception with a
  24px circle around the link that may not touch another target.
- Hick counts every `header nav a` in the DOM, including ones hidden behind a menu.
- Transitions: `border-*-color` and `-webkit-*` properties are accepted; zero-duration transitions are ignored.
  Only `running` animations are counted. Reduced motion tolerates 10ms (the usual `0.01ms` reset).
- Custom contrast: backgrounds are resolved up the ancestor chain with alpha blending (`rgb()`, `rgba()`,
  `color(srgb ...)`, anything else via a canvas conversion). Text over a `background-image` or over images in
  `figure`/`picture` is skipped, as is visually hidden text. Opacity on ancestors is applied to the text colour.
  If `html`/`body` are transparent the canvas is white (or #121212 when `color-scheme` includes dark).
- Focus: iframes are skipped (they draw their own ring). Box-shadow counts as an indicator only if it
  differs from the element's shadow after it loses focus. Only the first 15 `Tab` stops are checked.
