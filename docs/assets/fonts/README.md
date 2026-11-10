# Fonts

**Switzer** by Indian Type Foundry, downloaded from Fontshare (https://www.fontshare.com/fonts/switzer)
and self-hosted unmodified as `Switzer-Variable.woff2` (weights 100 to 900). It is licensed under
the ITF Free Font License, and a copy is in `Switzer-LICENSE-FFL.txt`.

The licence allows self-hosting on your own website. Section 02 forbids making the font file
available through "a repository" or "publicly accessible servers" beyond that use. This repo is
public, so the `.woff2` file is git-ignored and must never be committed here.

How it reaches the site:

- `scripts/fetch-font.sh` downloads the official Switzer zip from Fontshare, takes
  `Switzer-Variable.woff2` out of it, checks its SHA-256 and saves it in this folder.
- `.github/workflows/deploy.yml` runs that script on every deploy, then publishes the site.
  The file only ever exists on the site itself.
- GitHub Pages must be set to deploy from **GitHub Actions**, not from the `/docs` folder.
- The workflow refuses to deploy if the font is ever tracked in this repo.
- If Fontshare is down or ships a new version, the deploy stops and the live site stays on
  its previous version. For a new version, check the file and update `FONT_SHA256` in the
  script.

For local previews, run `./scripts/fetch-font.sh` once in each fresh checkout or worktree.
Git ignores the file. Without it pages fall back to the system font; `scripts/audit.sh` and
`tests/run.sh` print a warning when it is missing.

To swap the font, change the `@font-face` block and the `--font` token at the top of
`assets/site.css`, and the `preload` link in each page's `<head>`.

**JetBrains Mono** (JetBrains, SIL Open Font License 1.1, see `JetBrainsMono-OFL.txt`) is
self-hosted as `JetBrainsMono-Variable.woff2`, the variable font subset to Latin
(weights 100 to 800). It is OFL, so unlike Switzer it is committed. It is used only for
small text: logo, nav, buttons, dates, meta, chips and code.
