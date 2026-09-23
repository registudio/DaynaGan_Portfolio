# Dayna Gan / Death Star portfolio tour

A scroll-controlled ghost tour through a sectional Death Star, built with Next.js, TypeScript, React Three Fiber, Three.js and Markdown/MDX. Supplied GLBs, resume and source brief are preserved.

## Run

Requires Node 22.18+ or Node 24.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
npm start
```

With the development server running, `npm run test:routes` verifies rendered Markdown routes, content refresh, draft exclusion, assets and GitHub API caching. Temporary content fixtures are removed in a finally block.

## Tour

The blue construction sheet and rotating outline blend into deep space and the solid uploaded station. Visit the reactor, academy, hangars, superlaser, defensive systems, Overbridge, archives and comlink array. Hover, focus or tap model markers to open attached records. Select a hangar to explore its fighter reports. Eight scroll-controlled project beams converge at one focus. The X-wing sequence uses green near-misses and red return fire, revealing skills and awards as targets are cleared.

The small section rail shows progress. Content appears in model-attached pop-ups. Mobile uses larger targets, portrait camera framing and constrained pop-ups. A reading view, keyboard controls, reduced motion and WebGL fallback keep the content accessible.

## Content

- `content/site.md`: identity, links and navigation.
- `content/tour.md`: education, skills, awards and tour copy. SST shows Elective: Computing+; unspecified dates remain blank.
- `content/sections/*.md`: eight portfolio sections.
- `content/experience/*.mdx`: resume-sourced work records.
- `content/projects/*.mdx` and `content/blog/*.mdx`: case studies and logs.
- `public/resume/DaynaGan_Resume.pdf`: resume download.

Zod validates frontmatter. Draft templates are excluded from indexes, sitemap and public routes. The eight project generators keep marked placeholders until real case studies are supplied. Set `draft: false` only after adding real content. Development reads changes on refresh; production content changes require a rebuild. MDX is trusted repository content.

## Models

```sh
npm run models:prepare
```

The script prepares compressed runtime copies from the three uploaded GLBs, retaining named sectors and producing desktop/mobile assets. The desktop model preserves more geometry and larger textures. Blueprint: approximately 60 KB; desktop station: 8.35 MB; mobile station: 5.40 MB; cockpit: 0.35 MB. Source GLBs remain unchanged. Supplemental interiors use batched geometry, paneling, conduits and illuminated displays. See `docs/model-contract.md`.

## Hosting and GitHub

Vercel is the selected target to retain server fetching and hourly revalidation. Import this repository with the Next.js defaults. Set `NEXT_PUBLIC_SITE_URL` to the public URL; Vercel's production URL is detected automatically. Optional `GITHUB_TOKEN` stays server-only and raises API limits. Never prefix credentials with `NEXT_PUBLIC_`.

The homepage and `/api/github` revalidate after one hour. Only public DaynaG3 repositories and events are used. Activity is recent public event activity, not a fabricated contribution history. Fetch failures and rate limits show an offline state and a GitHub profile link. Local testing may show this fallback when network access is unavailable.

This is not a static GitHub Pages export. Nothing has been deployed. Fonts are bundled locally.
