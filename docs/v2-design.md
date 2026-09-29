# Portfolio v2 — master plan

**This is the single record of every plan, idea and decision for v2.** Update it whenever anything changes.

Agreed in the design Q&A. `content/portfolio.md` is the single content source; this file records how it is rendered. v1 lives in `archive/v1/` (git tag `v1-archive`).

## Platform
- Next.js (App Router) on **Vercel** (replaces GitHub Pages).
- Contact form → Next.js API route → **Resend** (`RESEND_API_KEY`), honeypot + rate limit.
- GitHub data fetched server-side, revalidated hourly, with offline fallback.

## Modes
- **Splash**: `▶ PRESS START` (Game) / `☰ VIEW PROFILE` (Professional). Choice remembered; toggle to switch any time. LinkedIn, GitHub, email and résumé are always visible in both modes.
- **Same 8 sections** in both: About · Education · Experience · Projects · Skills & Awards · Leadership & Community · GitHub · Contact.

## Professional mode
- Single long page, sticky section nav, projects expand in place.
- Light (paper + ink + deep violet) and dark (aubergine + lilac) themes via toggle.
- Subtle scroll reveals, timeline draw, number counters.
- Voxel 3D project viewers (same models as the game) with explode.
- Live GitHub panel. Print stylesheet + résumé PDF download.
- Skill tree shown as a static diagram (levels + where each came from).

## Game mode — overview
- Minecraft Dungeons–style **3D voxel** world (Three.js), fixed isometric camera, pixel textures, dynamic lights + bloom. 2D pixel-art HUD, dialogue and world map.
- Futuristic, engineering/robotics/computing themed.
- **Hub**: realistic orbital space station (neutral light, purple accents). Contains the star-map holo table (MCD-style isometric mission map with completion badges), Dayna's bunk + cat bed (résumé on desk), collection locker (view built models), vendor stall (visible but locked — future update).
- Each level = a deployment to a new biome with its own dominant light colour. Interactive glows, danger warnings and entities keep their own accent glows in every biome.
- ~10 min playthrough. Missions in any order. **Comms Core (Contact) unlocks after any 3 missions** (`contactUnlockAfter`); "Skip to Comms" in the pause menu.
- Content display: short in-world holo title + one-line summary; press E for a full holo panel (game pauses).

## Controls & devices
- Keyboard/mouse (WASD, click attack, E interact), gamepad, and mobile touch (virtual joystick + buttons). Auto graphics quality on low-end devices.

## Combat
- Light MCD combat: melee (wrench swing) + ranged (solder beam), dash, a hotbar of artifact abilities, health heart. No game over — respawn at the room door. **Peaceful mode** toggle removes enemies (carried parts are left on the floor, the mini-boss is skipped).
- Solder-beam damage scales with the Soldering skill level.

| Input | Keyboard / mouse | Gamepad | Touch |
|---|---|---|---|
| Move | WASD / arrows | Left stick | Virtual joystick |
| Melee | J / left click | X | ⚔ button |
| Solder beam | K / right click | RT / B | ⚡ button |
| Dash | Shift / Space | LB | ➜ button |
| Interact / scan | E | A | context button |
| Artifacts | 1–4 | D-pad | small buttons |
| Pause | Esc / P | Start | ❚❚ |

### Gear unlocked by clearing missions
| Mission | Gear | Effect |
|---|---|---|
| About | Servo Boots | Dash |
| Education | Scanner Pulse | Reveals terminals, parts and bots on the minimap for a few seconds |
| Experience | EMP Arc | Area stun/damage around Dayna |
| Leadership | Repair Kit | Heal |
| Projects | Drone Buddy | Mini drone that zaps nearby bots for a while |
| GitHub | Firewall | +2 max health (passive) |

### Enemies per biome
Reactor: spark wisps (tutorial) · Spires: none (study zone) · Forge: rogue welder-arms, scrap crawlers · Caverns: short-circuit bugs that carry project parts · Trophy Hall: none · Commons: none (friendly NPCs) · Mainframe: malware packets + **"Merge Conflict"** mini-boss · Comms Array: static drones near the relays.

### Mission objectives (what "cleared" means)
- About, Education, Experience, Leadership: scan every room console.
- Projects: build all six projects.
- Skills & Awards: visit the Awards Wing and the Skill Matrix (shelves are optional → Easter egg).
- GitHub: scan the three consoles and defeat Merge Conflict (skipped in Peaceful mode).
- Contact: power 3 relays and send a transmission.

## Progression
- **Data chips** per room/part → completion % per level (shown on star map).
- **Gear/artifact unlocks** per cleared mission.
- **Achievements** with pop-ups + trophy wall.
- **Skill tree** (XP from rooms): scanning Education/Experience rooms and building projects grants skill levels (`grants:` in the md). Skills **gate project builds** (`requires:` / `needs:`). Soft guidance: parts are always collectable; the assembly station checks skills and the cat says which mission grants a missing level.
- Save progress in the browser; "Continue" on the splash.

### Achievements
First Steps (enter a mission) · Cat Person (pet Xiao Hu 5×) · Bug Squasher (defeat 25 bots) · Pacifist (clear a combat mission without defeating a bot) · Builder (first project) · Master Builder (all six) · Merge Resolved (beat Merge Conflict) · Maxed Out (any skill at Lv 5) · Read Every Bullet (every data chip) · Curator (all models on the shelves) · The Backroom (find it) · Speedrunner (reach the Comms Core within 5 min) · Transmission Sent (send a message).

### Skill tree
- Defined in `content/portfolio.md` frontmatter (`skills:`). Levels 0–5. Edit the `grants:` lines to change proficiencies; `start:` sets a base level.
- Extra skills beyond the résumé list: **Reinforcement learning**, **Leadership**.

| Skill | Earned from (each step = +1 level) |
|---|---|
| Python | SST → SP → NUS → A*STAR (ROSA agent) → DSO (Dreamer) |
| Soldering | SST → SP → OTSAW (TREX) → Ecovolt (Euna Air) |
| C++ | SP → NUS |
| Java | NUS |
| Verilog | NUS |
| Arduino | SST → SP → build Robot Claw |
| ESP32 | SP → Ecovolt (Euna Air) → build Euna Air → build Drone |
| STM32 | SP → Ecovolt (Maxwell Ultra) |
| CAD | SP → OTSAW (AirGuard) → build Robot Claw |
| Autodesk Inventor | SP → OTSAW (AirGuard) |
| 3D printing | SP → build Robot Claw → build Drone |
| Hands-on assembly | OTSAW (TREX) → Ecovolt (Euna Air) → build Drone |
| ROS 2 | A*STAR (sim platform) → build ROSA → build Isaac × Nav2 |
| NVIDIA Isaac Sim | A*STAR (sim platform) → build ROSA → build Isaac × Nav2 |
| Nav2 | build Isaac × Nav2 |
| Reinforcement learning | DSO (Dreamer) → build Dreamer |
| Leadership | Robotics @APEX → RoboCup SG → SP LEO Club → TOUCH |

### Skill gates for project builds (`requires:` / `needs:`)
| Project | Requires | Needs built first |
|---|---|---|
| Euna Air | Soldering 3 · ESP32 1 | — |
| Dreamer × SMAClite | Python 3 · Reinforcement learning 1 | — |
| ROSA × ROS 2 | Python 2 · ROS 2 1 | — |
| Isaac Sim × Nav2 | ROS 2 2 · Isaac Sim 2 | ROSA |
| Robot Claw | CAD 2 · Arduino 2 | — |
| Drone | Soldering 3 · 3D printing 2 · ESP32 2 | Robot Claw, Euna Air |

A test (`tests/content.test.ts`) simulates a full playthrough and fails if any project becomes unbuildable after an edit.

## Companion — Dayna's cat
- Pet cat follows Dayna; **meows (audio)**; tutorial, hints and narration appear as speech bubbles from the cat; points to the nearest missing part.
- Look (from photos): brown **mackerel tabby** — warm grey-brown coat with dark vertical stripes, 'M' mark on the forehead, lighter cream/fawn belly and chin, pink nose, pale green eyes, pink inner ears; ringed tail ending in a black tip; slim dark leather collar (add a tiny purple LED tag). Idle animations: sprawls on its back, belly-up nap on the hub desk, tail flick.
- Name: **Xiao Hu** (小虎, “little tiger”) — `companion.name` in the md.

## Avatar — Dayna (engineer-explorer)
- MCD-proportioned voxel figure, slim.
- Hair: long, very dark brown/black, loose waves past the shoulders, centre part with face-framing curtain strands. Alt: low ponytail.
- Skin: light-medium, warm undertone.
- Outfit: black fitted top, purple utility jacket, cream or dark cargo trousers, tool belt, goggles on forehead, glowing purple gauntlet; small gold pendant.

## Audio
- Chiptune/synthwave per biome + SFX. **Muted by default**, clear speaker toggle.

## Accessibility & QoL
- Minimap + objective tracker (top right). Pause-menu codex of everything read, with jump-to and "Open in Professional mode". Reduced motion/flash, larger text, remappable keys, Peaceful mode.

## Levels

| # | Level | Biome | Light | Enemies | Rooms |
|---|---|---|---|---|---|
| 1 | About | Core Reactor (tutorial) | #c026d3 | spark wisps | Identity Bay · Status Console · Stat Reactor |
| 2 | Education | Academy Spires (climb SST → SP → NUS) | #60a5fa | none | SST · SP · NUS (parts: honours, subjects/modules, trips, clubs) |
| 3 | Experience | Robot Forge (chronological halls) | #f59e0b | welder-arms, scrap crawlers | OTSAW · A*STAR I²R · DSO · Ecovolt (parts = résumé bullets; cross-link portals to Projects) |
| 4 | Projects | Circuit Caverns | #22d3ee | short-circuit bugs (carry parts) | Euna Air · Dreamer × SMAClite · ROSA × ROS 2 · Isaac Sim × Nav2 · Robot Claw · Drone |
| 5 | Skills & Awards | Trophy Hall | #fbbf24 | none | Awards Wing · Collection Shelves · Skill Matrix · (hidden) Backroom |
| 6 | Leadership & Community | Colony Commons biodome (friendly NPCs) | #34d399 | none | Robotics @APEX · RoboCup SG · SP LEO Club · TOUCH |
| 7 | GitHub | Mainframe | #4ade80 | malware packets, "Merge Conflict" mini-boss | Contribution Grid · Repo Racks · Commit Feed |
| 8 | Contact | Comms Array summit on the outer hull | #a78bfa | static drones | Transmission Console |

### Education details
- **SST**: O-Levels — English, Higher Chinese, E Maths, A Maths, Pure Chemistry, Pure Physics, Computing, Combined Humanities (History, Social Studies). President (résumé wording; user also said "chairperson" — to confirm) of Robotics @APEX. Overseas learning: Guangzhou (Makeblock MakeX Robotics Competition 2019), Taiwan. Robotics competitions: placeholders, to be added.
- **SP (DMRO, 2022 intake)**: Valedictorian 2025, GPA 3.97, SP Engineering Scholarship, Director's Honour Roll. Modules confirmed from public info: Systems & Control, Programmable Logic Controllers, Robotic Integration & Programming, Mobile Robotics (full list TODO — SP site unreachable from the build environment). Polyforum 2023, Pre-University Seminar 2023. Skate Club, MMA Club.
- **NUS (CEG, 2025 intake)**: University Engineering Scholarship. CEG core curriculum listed (to be trimmed to courses actually taken). Skate Club.

### Hub (the "camp")
Star-map holo table (mission select) · Dayna's bunk + Xiao Hu's cat bed (bio line, résumé on desk) · collection locker (rotate/explode built models) · vendor stall (closed, "coming soon") · teleporter pad · windows onto Earth.

### Projects — build quests
- Each project's components are scattered across the caverns (crates, ledges, carried by glitch bots). Picking one up shows its part card (summary / did / learned).
- Each project room holds its **blueprint** (silhouettes of missing parts) and an **assembly station**; parts snap into the voxel model with an exploded → assembled animation.
- Built projects go into the player's **collection**.
- Robot Claw and Drone are playable but flagged "CASE FILE INCOMPLETE" (hazard-tape doorway) until their write-ups exist.
- Models: procedural voxel models in code keyed by part id; a GLB can replace one later (matched by node name).

### Trophy Hall Easter egg
- Placing every built project model on the Collection Shelves slides a shelf away → hidden **Backroom** (content TBD).

### Contact finale
- Power 3 relay nodes, the dish aligns, the transmission console (form) opens. Fields: name, email, company (optional), role (optional), reason (Internship/job · Project collaboration · Research · Just saying hi), message. On send: beam to Earth, cat celebrates, "TRANSMISSION RECEIVED", credits with LinkedIn/GitHub/résumé.

## Architecture
- `content/portfolio.md` → `lib/portfolio.ts` (parser, pure) + `lib/load.ts` (fs, frontmatter, Markdown → HTML) + `lib/skills.ts` (skill levels, build checks).
- `app/page.tsx` renders the Professional site on the server (SEO, no-JS) with the splash on top; `export const revalidate = 3600` keeps GitHub data fresh.
- `app/api/contact/route.ts` → Resend. Env: `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL`, optional `GITHUB_TOKEN`.
- Game: plain Three.js engine in `game/` (loop, isometric orthographic camera, instanced voxel meshes, pooled point lights, bloom, particles, grid collision) loaded only when the player presses Start; React overlays in `components/game/` (HUD, panels, star map, pause/codex/skills/achievements/settings, touch controls) talk to the engine through a small store.
- Levels are generated from the content: each `##` room becomes a room in the biome, each `###` part a terminal (or a scattered component in Projects), so new content appears in the game automatically.
- Project voxel models: `game/models/geometry.ts` (part primitives) + `game/models/projects.ts` (voxelizer), shared with Professional-mode viewers.
- Audio is synthesised with WebAudio (music, SFX, meow). Drop a real recording at `public/audio/meow.mp3` to replace the synthesised meow.

## Build plan & status
1. ✅ Archive v1, single content file, this plan.
2. ✅ Parser, skills, GitHub feed, contact API, tests.
3. ✅ Professional mode + splash + mode switch.
4. ✅ Game engine (world, characters, combat, levels, audio).
5. ✅ Game UI (HUD, panels, star map, menus, touch).
6. ✅ Browser verification (desktop + phone), README, deploy notes.
7. ⏳ Deploy to Vercel and set env vars (owner action).
8. ⏳ Polish pass after first real playtests (balance, feel, copy).

## Open items / TODO
- Confirm SST robotics title: President vs Chairperson.
- SST: period, Taiwan trip details, list of robotics competitions, MakeX result.
- SP: full DMRO module list.
- NUS: trim the CEG list to courses taken.
- Robot Claw case study; Drone photos/write-up.
- Certifications (Trophy Hall).
- Backroom content.
- Vercel: create project, set env vars, verify a Resend sender domain (see README).
- Real meow recording (optional) → `public/audio/meow.mp3`.
- Balance tuning after playtests (enemy counts, damage, cooldowns — `game/engine/Game.ts` ENEMY table, `missions.ts` COOLDOWNS).
- Publish the `v1-archive` tag on commit `662dd85` (`git tag v1-archive 662dd85 && git push origin v1-archive`) — the build session couldn't push tags.
- All work now lives on `main` (per request).

## Future update (not built now)
- Futuristic currency (not emeralds) dropped by bots/crates, spent at the hub vendor on cosmetic skins for Dayna **and cat variants** (orange, British blue, Garfield, striped, white socks…).
