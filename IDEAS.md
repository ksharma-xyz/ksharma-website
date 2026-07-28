# Ideas / backlog

Things worth doing on the site, not done yet. Newest first.

## Show one real artifact on the AI page

The AI page currently describes the tooling. It would be more convincing, and more
modest, to show the thing itself: a short mono code block with the real video config
object (`props.json` shape) or a skill's frontmatter. It reads as evidence rather than
a claim, and the mono/geometric styling is already in the design system.

- Where: the "video engine" block, or a new small block under "The toolkit".
- Keep it short (10 to 15 lines), real, and trimmed of anything private.

## Write a post about harness engineering, then link it

The AI page asserts a way of working. A post would prove it, and it fits the Blog tab
(nine posts there now). Topics that already have material behind them: skills over
prompts, why a template beats generating the foundation each time, what a reviewer
agent is worth, deciding what context an agent gets.

- Generate with `migration/generate-blog.mjs`, add to `docs/sitemap.xml`.
- Link from the AI page and the Blog tab.

## Open questions

- **Swift claim.** The Home stack chips include Swift, and the AI page mentions Swift
  and SwiftUI (the design-system catalogue app, iOS work at CBA). Confirm the wording
  is right, or change to "iOS via Compose Multiplatform" and drop the chip.
- Astraman: swap the "Next app, in progress" card on the Apps page for the real app
  once it ships.
