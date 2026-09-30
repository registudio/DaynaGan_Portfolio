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
- Vercel: create project, set env vars (see README). Contact form delivers to daynagsr@gmail.com. Simplest setup: create the Resend account with daynagsr@gmail.com so the default sender works without a custom domain.
- Real meow recording (optional) → `public/audio/meow.mp3`.
- Balance tuning after playtests (enemy counts, damage, cooldowns — `game/engine/Game.ts` ENEMY table, `missions.ts` COOLDOWNS).
- Publish the `v1-archive` tag on commit `662dd85` (`git tag v1-archive 662dd85 && git push origin v1-archive`) — the build session couldn't push tags.
- All work now lives on `main` (per request).

## Improvement round 1 — selected (done)

Chosen by the owner from the backlog below:
- **Performance**: 1–5 (all).
- **Gameplay**: 1–5 (all) — mini-boss per combat mission, themed puzzles, combat feel, difficulty presets, Xiao Hu ability.
- **Features**: 3 (Tour mode). Item 5 (real CAD models + galleries) later, when assets arrive.
- **Content**: 4 — Backroom content.
- **UI/UX & HUD**: 1 (first-run controls overlay) and 2, amended: low-health red screen edge; damage numbers **for mini-bosses only**; **no** small enemy health bars.
- **Design**: 1–4 (texture/prop pass, avatar likeness + per-biome outfits, lighting set pieces, cinematic transitions).

Implementation notes are added to the sections below as each lands.

**Done — UI/UX & HUD:** first-run controls card matched to the last-used device (keyboard & mouse / gamepad / touch; auto-closes after 20 s, reopen via Pause → Controls), device-aware interaction glyphs, pulsing red screen edge at ≤30% health, floating damage numbers on mini-bosses only (no small enemy health bars; the old Merge Conflict bar was removed), mini-boss nameplate + defeat banner.

**Done — Tour mode:** "⏱ Quick tour" on the splash (and in the pause menu, or `#tour`). Xiao Hu narrates while Dayna auto-walks (grid path-finding) to every console, vault, NPC and the Skill Matrix across all missions — 26 stops, each panel open for a timed read (7–16 s by length) — ending at the Transmission Console with the form open. Prev / Hold / Next / Exit controls; bots ignore you; barriers are teleported past.

**Done — Backroom content:** lab-notebook terminals (how the site works), Xiao Hu's corner (she walks to her bed and naps while you're there), flickering yellow light, and a photo-wall placeholder (`TODO` in `portfolio.md` — add images to `public/images/backroom/`).

**Done — Gameplay:**
- *Mini-bosses* (`BOSSES` in `missions.ts`): Overloaded Core (Reactor), Rogue Assembly Arm (Forge), Bug Queen (Caverns), Merge Conflict (Mainframe), Static Swarm (Comms Array, optional so the contact form is never gated). Each has a telegraphed attack rotation (ring / fan / lunge / summon / blink), a nameplate and a defeat banner; required bosses gate the mission clear except in Peaceful mode. Achievement: Giant Slayer.
- *Puzzles* (`PUZZLES`): Reactor — charge capacitors in order; Caverns — rotate junctions to match the circuit diagram; Mainframe — set packet-routing switches. Each gates the final room with an energy barrier; the diagnostics console shows the answer; after a few failed tries Xiao Hu offers to chew through the wire. Achievement: Puzzler (no bypass).
- *Combat feel*: 3-hit wrench combo (finisher = wide, heavy), red telegraph warnings before every enemy attack, hit-stop, dash i-frames that pass through projectiles.
- *Difficulty*: Story / Normal / Hard (enemy HP, damage, speed, attack rate; Hard adds extra bots). Pause → Settings.
- *Xiao Hu* (C / cat button): pounces to stun the nearest bot, otherwise fetches the nearest project part. 10 s cooldown. Achievement: Good Kitty.

**Done — Performance:** static props batched into per-material InstancedMeshes (`game/engine/batch.ts`); character rigs merged per limb/material (~20% fewer draw calls); bots, NPCs and spinners far from the player sleep; dynamic resolution (0.5–1× pixel ratio, tuned every 2 s from a frame-time average); game bundle prefetched during the splash; Latin-only font subsets; level layouts and biome materials cached for the session.

**Done — Design:**
- *Textures & props:* hand-authored 16×16 tiles (`game/engine/authored.ts`, palette-relative shades so one design fits every biome) for deck plate, grate, PCB, hex, stone, academy tile, server rack and grass; ~17 new props (capacitors, conduits, globe, holoboard, hydraulic press, robot shells, chips/resistors, banners, planters, fans, terminal banks, satellite, radar, holo-station) spread across the biome prop lists.
- *Avatar:* layered wavy back hair with highlights; per-biome outfits (`BIOME_OUTFIT` in `characters.ts`): station jacket (hub/Core), lab coat (Spires), welder apron + hi-vis + gloves (Forge), explorer vest + headlamp (Caverns), blazer + gold pin (Trophy Hall), cardigan (Commons), hoodie (Mainframe), flight jacket (Comms).
- *Lighting set pieces* (`game/engine/setpieces.ts`, unlit + additive so they cost no light slots): slanted god-ray shafts in the Spires, a churning molten-solder sea with heat bubbles below the Forge, data waterfalls with glow pools off the Caverns' front edges.
- *Transitions:* star map zooms into the chosen island with a biome-coloured flash (~0.6 s) → Dayna and Xiao Hu stretch into a teleport light column (beam-out) → on arrival they beam back in with a spark burst. All skipped with Reduced motion.

## Round 2 — bug check, feedback fixes (done)

Owner feedback: combat not fully working, low fps, interacting only "from the front", content only via E + pop-up, uneven mob counts; asked for mob spawners and 10 more gameplay ideas.

**Bugs found & fixed**
- *Melee missed anything not in front*: keyboard auto-aim only looked in a 60° cone, so a bot beside/behind you was never hit (reproduced in a headless sim: 0 damage over 10 swings). Melee now targets the best bot all the way round and point-blank bots always count.
- *Swing arc drawn mirrored*: the arc's rotation was the mirror of the real hit direction, so hits looked like misses. Fixed; the drawn arc and the hit test now share one half-angle.
- *Zap auto-aim* ignored walls (shots into pillars); it now needs line of sight. Mouse aim snaps onto a bot within ~22° of the cursor.
- *Inputs dropped during hit-stop* (the brief freeze on hits ate combo presses): they're buffered to the next frame.
- *Bots stacked into one blob*: simple separation push.
- *Interaction*: the glowing ring was drawn smaller than the trigger zone and centred on the prop, and most terminals hugged the back wall. Rings are now drawn at exactly the trigger radius around the trigger point, the zone you're deepest in wins when zones overlap, and terminals/consoles sit on an inset ring so every circle is walkable from all sides (layout test checks all 8 neighbours).
- *Terminals silently dropped/overlapping puzzle nodes in crowded rooms*: spots skip claimed cells and fall back to any clear floor; a test asserts every part gets a terminal.

**Performance**: PBR → Lambert/unlit materials (the biggest per-pixel cost), bloom computed at half resolution (radius retuned), pixel ratio capped at 1.25×, weak-GPU detection (software renderers, older Intel HD/UHD, Mali, Adreno ≤5xx, PowerVR start on Low), 6/4 pooled lights, and automatic quality tiers when frames stay slow at the lowest resolution: shadows off → fewer lights → bloom off. In the software-renderer test, render time per frame dropped ~40% at equal resolution and fps roughly doubled once tiers engaged.

**Mobs**: every mission now has bots — Spires *pop-quiz drones* (drones + wisps), Trophy Hall *dust bots* (crawlers + packets), Commons *pest bugs* (bugs + crawlers); About raised to the same 2–3 per room as the rest.

**Bot fabricators (spawners)**: destructible hazard-striped pads (14 HP) in 2–3 rooms per mission, never in the entry or mini-boss room. While you're in their room they print one of the mission's bots every ~4.5 s (cap 3, +1 on Hard, slower on Story) until destroyed; destroying one drops a heart, is saved, shows on the minimap, and 5 of them unlock *Supply Chain Attack*. Off in Peaceful mode.

**New ways content is conveyed** (besides E → panel):
1. *Walk-up hologram cards* — step into a ring and the label expands into a card with a one-to-two-sentence summary; linger ~1.3 s and it scans itself (progress + skill gains), E still opens the full entry.
2. *Area title cards + narration* — entering a room shows its name, role · org · dates, and a one-line summary; Xiao Hu reads out the room's first line.
3. *Stat holograms* — stat parts (GPA 3.97, 100+ Nav2 runs, 80+ volunteers…) float as big readouts visible from across the room.
4. *Skill pop-ups* — "+ ROS 2", "+ CAD" rise over Dayna when a scan levels a skill.
5. *Data fragments* — bots sometimes drop a shard with one fact from the mission (saved; collect all in a mission for *Archivist*).
All text is derived from `portfolio.md` (`game/engine/lore.ts`, unit-tested), so editing the markdown updates every channel.

### Gameplay ideas — round 2
Owner picked **2, 4, 8** (built in round 3, below). The rest are kept as future ideas (see *Future update*).

## Round 3 — picked ideas + fidelity pass (done)

**Hold the line (idea 2).** Pressing *Assemble* at a vault starts a timed defence (Story 30 s / Normal 45 s / Hard 55 s). Bugs pour in from the vault's edges (drones join past 60%, faster waves near the end, capped at 6 alive). The bar only fills while Dayna is in the vault and no bot is touching the station — otherwise it reads *JAMMED* or *PAUSED*. The project's hologram pulls itself together as the bar fills; on completion the remaining wave fizzles and the project is built. Dying cancels it (parts are kept). Peaceful mode and Tour build instantly.

**Interactive hazards (idea 4)** — biome-themed, placed on clear floor in content rooms (`HAZARDS` in `layout.ts`):
- *Conveyor belts* (Forge): push Dayna and bots along the belt.
- *Laser grids* (Spires, Caverns, Trophy Hall, Mainframe): 2.2 s on / 1.8 s off with a flicker warning; hurt Dayna (1) and bots (2).
- *Explosive capacitors* (Reactor, Forge, Caverns, Trophy Hall, Commons, Comms): hit one and it blows — 5 damage to nearby bots, 2 to Dayna if she's too close, and it sets off neighbouring capacitors (chain reactions). Don't count as kills.
- *EMP pads* (Reactor, Spires, Commons, Mainframe, Comms): charge for 3.5 s then discharge — bots on the pad are stunned and damaged, Dayna is only slowed. Lure bots onto them.
Hazards never hurt Dayna in Peaceful mode or on the Tour.

**Xiao Hu's tricks (idea 8)** — learned as missions are cleared (listed under Pause → Gear): *Hiss* (2 cleared) — her pounce ends in a shockwave that stuns every bot around the target; *Long Fetch* (4) — fetches parts and data fragments from twice as far and recovers faster; *Nine Lives* (6) — once per mission, when Dayna goes down she's revived at half health.

**Design check & fidelity pass.**
- Mobs rebuilt with far more detail: bevelled armour plating (new 16 px `plate` texture), jointed legs, visors, antennae, rotors, tanks, treads, mandibles, glitch shards; dimmer, smaller glow accents so silhouettes read instead of blooming.
- Information interactives made subtler and richer: terminals are now kiosks (slanted readout screen with a `screen` texture, vent, status LED, small holo emitter); consoles have twin monitors and a keyboard; plinths, the Skill Matrix, repo racks, the assembly station and exit pads toned down. Interaction rings are dashed HUD rings that stay dim until targeted. Labels are glassy with a thin accent edge (no neon glow); stat readouts softened.
- Root cause of "too bright": glow materials were lit *and* emissive, so point lights pushed them to white. `glow()` is now unlit (HDR colour, bloom still works), point lights are softer and hung ≥2.4 above props, and the in-game project hologram is fainter.
- More world detail: patterned props default to 16 px textures (and the hand-authored tiles); walls get pipes, vents, lamps and conduit runs; bolted plates along back walls.

## Improvement backlog (suggested)

### Performance
1. Batch static props into per-material InstancedMeshes (each prop is currently several meshes → many draw calls).
2. Only simulate enemies, particles and animations in the player's room ±1; freeze the rest.
3. Dynamic resolution: lower pixel ratio / bloom resolution automatically when FPS drops below ~50.
4. Prefetch the game chunk (Three.js + engine) while the splash is showing; subset the fonts.
5. Cache generated textures, voxel models and level meshes between visits; pack textures into one atlas.

### Gameplay
1. A mini-boss per combat mission (e.g. Forge: Rogue Assembly Arm, Caverns: Bug Queen, Comms: Static Swarm).
2. Content-themed puzzles: rewire a circuit to open a Caverns vault, align lasers in the Reactor, route packets in the Mainframe.
3. Combat feel: 3-hit melee combo, dodge i-frames, enemy attack telegraphs, hit-stop.
4. Difficulty presets (Story / Normal / Hard) scaling enemy HP, damage and count.
5. Xiao Hu ability: pounce to stun a bot, or fetch the nearest project part.

### Features
1. Futuristic currency ("Flux Cores") + vendor cosmetics for Dayna and cat variants (already planned).
2. Shareable run summary card (time, chips, achievements) with a link back to the site.
3. "Tour mode" for busy recruiters: auto-walk through every mission with Xiao Hu narrating.
4. Vercel Analytics events: mode chosen, missions cleared, drop-off point, messages sent.
5. Real CAD (GLB) models and photo/video galleries per project.

### Content
1. Fill the TODOs: SST period, competitions, Taiwan trip, MakeX result, full SP module list, trimmed NUS list.
2. Robot Claw and Drone case studies with build photos and flight footage.
3. Quantify Ecovolt impact (deployment counts, time saved, accuracy) where allowed.
4. Backroom content — e.g. behind-the-scenes lab notebook, bloopers, or a hidden Xiao Hu photo gallery.
5. Per-project links (GitHub repos, reports, demo videos) and a "what I'd do next" line.

### UI/UX & HUD
1. First-run control overlay with device-specific glyphs (keyboard / gamepad / touch).
2. Damage numbers, small enemy health bars and a low-health vignette.
3. Off-screen objective arrow + tap-to-expand full map with a legend.
4. Panel readability: text-size shortcut, "next unread" button, full keyboard navigation of the codex.
5. Mobile polish: haptics, landscape hint, larger hotbar targets, one-thumb mode.

### Design
1. Hand-authored pixel texture atlas and more bespoke props per biome.
2. Stronger avatar likeness (layered wavy hair, per-biome outfits such as a lab coat in the Spires).
3. Lighting set pieces: god-rays in the Spires, molten-solder rivers in the Forge, data waterfalls in the Caverns.
4. Cinematic transitions: teleport beam-out/in, star-map zoom into the chosen island.
5. Professional mode visuals: a rendered voxel hero of Dayna + Xiao Hu, consistent icon set, custom OG image.

## Future update (not built now)
- **Round-2 gameplay ideas kept for later:** mod chips (weapon upgrades named after Dayna's skills), elite bots with affixes, parry (reflect projectiles), Daily Circuit (seeded remix + best time), golden screws (hidden collectibles → cosmetics), knowledge checks (optional quiz per room), mission ranks + NG+ remix.
- Futuristic currency (not emeralds) dropped by bots/crates, spent at the hub vendor on cosmetic skins for Dayna **and cat variants** (orange, British blue, Garfield, striped, white socks…).
