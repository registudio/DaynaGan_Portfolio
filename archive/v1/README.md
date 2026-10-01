# Dayna Gan — portfolio

A static, single-page portfolio built with Next.js, TypeScript, React Three Fiber / Three.js and Markdown/MDX. Purple theme, floating navigation, parallax sections, and an exploded-view 3D model for every project.

## Run

Requires Node 22.18+ or Node 24.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run build
```

With a dev server running, `npm run test:routes` checks rendered routes and content refresh.

## Sections

Hero (cursor constellation, chromatic name, rotating chrome blueprints of each project) · About · Education (scroll-filled timeline) · Experience (pinned horizontal track) · Projects (exploded 3D models + before/after slider) · Skills & awards · GitHub (mock profile dashboard) · Contact.

Navigation is a floating pill on top, a progress spine on the left and section dots on the right.

## Playground Originals

`components/playground/` holds stand-ins for studio-supplied elements (cursor constellation, chromatic type, before/after slider). Replace the implementation, keep the export name and props. See `components/playground/README.md`.

## Content

- `content/site.md` — identity, links, hero copy, navigation.
- `content/profile.md` — stats, education, skills, awards, community.
- `content/sections/*.md` — section headings and intros.
- `content/experience/*.mdx` — roles (résumé-sourced).
- `content/projects/*.mdx` — projects. **To add one, copy `first-project.mdx`**, fill it in and set `draft: false`.

### Project models

Each project's `parts` list defines its exploded view. Without a `model`, parts are drawn from primitive shapes (`box`, `cylinder`, `sphere`, `torus`, `cone`, `capsule`). See `docs/3d-model-guide.md` for how to export models with named parts. When a GLB is ready, set `model: /models/projects/<slug>.glb` and give each part the `node` name of the matching GLB node; that node then moves by `explode` and shows the part's notes on hover. `summary`, `did` and `learned` feed the hover panel.

`compare` feeds the before/after slider; each side takes an `image`, a `code` snippet, or a `stat` + `note`.

## GitHub section

Data is fetched when the site is built: profile, pinned repos, recent commits, languages and stars. The deploy workflow rebuilds daily so it stays current. For the full-year contribution calendar, add a repository secret `PORTFOLIO_GITHUB_TOKEN` (a fine-grained personal token from Dayna's account, read-only; no extra permissions needed for public data). Without it the workflow uses the built-in Actions token. If GitHub can't be reached during a build, the section falls back to the portfolio projects with a notice.

## Hosting (GitHub Pages)

The site is a static export (`output: 'export'`) built to `out/`. `.github/workflows/deploy.yml` builds and deploys on every push to `main`, daily, and on demand.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions.** The workflow sets the base path (`/<repo>`) automatically, and uses no base path when a custom domain is configured.

To preview the export locally: `NEXT_PUBLIC_BASE_PATH= npm run build && npx serve out`.
