# Playground Originals

Components in this folder are **stand-ins** for design elements supplied by the
design studio ("Playground Originals"). Each one has a small, stable props
interface. When the studio code arrives, replace the implementation inside the
file and keep the exported name and props, so no section code has to change.

| File                      | Element                       | Props                                                                    |
| ------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `CursorConstellation.tsx` | Cursor constellation (chrome) | `className?` — fills its positioned parent                               |
| `ChromaticText.tsx`       | Chromatic type                | `as?`, `children`, `className?`                                          |
| `BeforeAfter.tsx`         | Before and after slider       | `before`, `after` (React nodes), `beforeLabel`, `afterLabel`, `initial?` |

Colours come from the CSS custom properties in `app/globals.css`
(`--violet`, `--lilac`, `--orchid`, `--chrome-*`), so studio code should read
those rather than hard-coding its own palette.
