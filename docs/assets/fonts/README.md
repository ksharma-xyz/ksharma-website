# Fonts

**Switzer** by Indian Type Foundry, downloaded from Fontshare (https://www.fontshare.com/fonts/switzer)
and self-hosted unmodified as `Switzer-Variable.woff2` (weights 100 to 900). It is licensed under
the ITF Free Font License, and a copy is in `Switzer-LICENSE-FFL.txt`.

The licence allows self-hosting on your own website. Section 02 forbids making the font file
available through "a repository" or "publicly accessible servers" beyond that use. This repo is
public, so the `.woff2` file is git-ignored and must never be committed here.

How it reaches the site:

- The file lives in the private repo `ksharma-xyz/ksharma-website-fonts`.
- `.github/workflows/deploy.yml` reads that repo with a read-only deploy key (secret
  `FONTS_DEPLOY_KEY`), checks the file's SHA-256, copies it into `docs/assets/fonts/` and
  publishes the site. The file only ever exists on the site itself.
- GitHub Pages must be set to deploy from **GitHub Actions**, not from the `/docs` folder.
- The workflow refuses to deploy if the font is ever tracked in this repo.

For local previews, keep your own copy of the file in this folder. Git ignores it.

To update the font, replace the file in the private repo with a fresh Fontshare download and
update `FONT_SHA256` in the deploy workflow.

To swap the font, change the `@font-face` block and the `--font` token at the top of
`assets/site.css`, and the `preload` link in each page's `<head>`.

**JetBrains Mono** (JetBrains, SIL Open Font License 1.1, see `JetBrainsMono-OFL.txt`) is
self-hosted as `JetBrainsMono-Variable.woff2`, the variable font subset to Latin
(weights 100 to 800). It is OFL, so unlike Switzer it is committed. It is used only for
small text: logo, nav, buttons, dates, meta, chips and code.
