# Dayna Gan — portfolio v2

Two ways to explore the same content:

- **Professional mode**: a single-page, résumé-style site in purple, with light and dark themes, scroll reveals, voxel 3D project viewers, a live GitHub panel, a print stylesheet and a contact form.
- **Game mode**: an isometric voxel action-RPG in the style of Minecraft Dungeons. You play as Dayna with Xiao Hu the cat, deploying from an orbital station to eight mission biomes, each with trial rooms (locked dungeons with small tasks and hazard gauntlets), a mini-boss and bot fabricators. The prize at the end is the Comms Core contact form.
- **Planet Aurora**: a combat-free open world (nine biomes: meadow, supertree garden, crystal ruins, sky islands, volcano, lighthouse coast, canyon, glowroot jungle, tundra) where every portfolio section — including Hobbies and Future Goals — is a landmark, some behind nature puzzles.
- **Quick tour**: Xiao Hu walks you through everything hands-free (full, or by interest: robotics, embedded systems, AI).

LinkedIn, GitHub, email and the résumé are one click away in both modes.

The full design (every decision, level and idea) is in **[`docs/v2-design.md`](docs/v2-design.md)**. The previous site is preserved in [`archive/v1/`](archive/v1/).

## Editing content: one file

Everything visitors see comes from **[`content/portfolio.md`](content/portfolio.md)**:

```md
# Level         ← a section / mission (About, Education, …)
id: projects
biome: circuit-caverns
light: #22d3ee

## Room         ← a content item (a role, a school, a project)
period: 2026
tags: IoT, Firmware
grants: esp32 +1        ← skill XP earned in-game
requires: soldering 3   ← skill gate (projects)

Prose in Markdown.

### Part        ← sub-content (a bullet, a project component)
did: What I did
learned: What I learnt
```

- Lines of `key: value` directly under a heading are metadata; everything after the first blank line is Markdown.
- Paragraphs starting with `TODO` never reach visitors.
- The skill tree (skills, levels, and where each level is earned) is defined in the file's frontmatter and its `grants:` lines. Edit those lines to change proficiencies.
- New rooms and parts appear in both modes automatically. The game builds its levels from the headings.
- `npm test` validates the file: unknown skills, broken links, duplicate ids, and projects that could never be built all fail the tests.

Project 3D models are voxel builds defined in `game/models/geometry.ts`, keyed by part id. A CAD export can replace them later.

## Develop

Requires Node 22.18+.

```sh
npm ci
npm run dev        # http://localhost:3000  (#play = game, #tour = quick tour, #planet = open world)
npm run typecheck
npm test
npm run build
```

## Deploy (Vercel)

1. Import the repository in Vercel. The framework is detected as Next.js and needs no build settings.
2. Add the environment variables below under **Project → Settings → Environment Variables**.
3. Deploy. The GitHub panel refreshes hourly (`revalidate = 3600`).

| Variable | Required | Purpose |
|---|---|---|
| `RESEND_API_KEY` | for the contact form | API key from [resend.com](https://resend.com). Without it, the form offers an email link instead. |
| `CONTACT_FROM_EMAIL` | recommended | A sender on a domain verified in Resend, e.g. `Portfolio <hello@your-domain.com>`. Resend's default `onboarding@resend.dev` only delivers to the Resend account owner's own address — so if the Resend account is created with daynagsr@gmail.com, the default sender works with no domain. |
| `CONTACT_TO_EMAIL` | optional | Inbox for messages — `daynagsr@gmail.com`. Defaults to the email in `portfolio.md` (the same address). |
| `GITHUB_TOKEN` | optional | Read-only token from Dayna's account; enables the full contribution calendar. |
| `NEXT_PUBLIC_SITE_URL` | optional | Canonical URL for metadata. |

## Code map

| Path | What |
|---|---|
| `content/portfolio.md` | All content |
| `lib/portfolio.ts`, `lib/load.ts` | Parser, validation, Markdown rendering |
| `lib/skills.ts` | Skill levels, sources and build checks (shared by both modes) |
| `lib/github.ts` | GitHub feed with offline fallback |
| `app/api/contact/route.ts` | Contact form → Resend (honeypot + rate limit) |
| `components/pro/*` | Professional mode |
| `components/game/*` | Game UI: HUD, panels, star map, pause menu, touch controls |
| `game/engine/Game.ts` | Game loop, scenes, combat, interactions, HUD state |
| `game/engine/layout.ts`, `trials.ts` | Mission level generator (rooms, corridors, trial rooms, hazards, fabricators) |
| `game/engine/planet.ts`, `nature.ts` | Planet Aurora open world and its nature art/puzzles |
| `game/engine/world.ts`, `terrain.ts` | Terrain meshing (exposed faces, chunks, baked shading) and collision/step rules |
| `game/engine/exploration.ts` | Blueprint tracking, tour topics, engineering-lab maths |
| `game/engine/lore.ts`, `panels.ts` | Text for cards, area titles, fragments and panels (derived from `portfolio.md`) |
| `game/engine/*` (rest) | Characters, props, biomes, textures, set pieces, star map, audio, missions, input, store |
| `game/models/*` | Voxel project models (used by both modes) |
| `tests/*` | Content, level generation, trials, planet, lore, missions and exploration tests (`npm test`) |

## Assets

Every visual asset is generated in code: pixel textures, voxel characters, props and project models. Audio is synthesised with WebAudio. To use a real meow, drop a recording at `public/audio/meow.mp3`.
