# Fonts

**Switzer** by Indian Type Foundry, downloaded from Fontshare (https://www.fontshare.com/fonts/switzer)
and self-hosted unmodified as `Switzer-Variable.woff2` (weights 100 to 900). It is licensed under
the ITF Free Font License, and a copy is in `Switzer-LICENSE-FFL.txt`.

The licence allows self-hosting for your own website. Section 02 also forbids making the font
files available through "a repository" or "publicly accessible servers" beyond that use. This
repo is public, so the `.woff2` file is git-ignored for now. Before deploying, decide whether
committing it is acceptable, or ask ITF. Until the file is committed, the deployed site falls
back to the system UI font, which still looks fine.

To swap the font, change the `@font-face` block and the `--font` token at the top of
`assets/site.css`, and the `preload` link in each page's `<head>`.
