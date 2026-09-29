# Portfolio v2 — design decisions

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
- Light MCD combat: melee + ranged (solder beam / EMP arc), hotbar of 3 artifact abilities, health heart. No game over — respawn at room door. **Peaceful mode** toggle.

## Progression
- **Data chips** per room/part → completion % per level (shown on star map).
- **Gear/artifact unlocks** per cleared mission.
- **Achievements** with pop-ups + trophy wall.
- **Skill tree** (XP from rooms): scanning Education/Experience rooms and building projects grants skill levels (`grants:` in the md). Skills **gate project builds** (`requires:` / `needs:`). Soft guidance: parts are always collectable; the assembly station checks skills and the cat says which mission grants a missing level.
- Save progress in the browser; "Continue" on the splash.

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
| 2 | Education | Academy Spires (climb SST → SP → NUS) | #60a5fa | none | SST · SP · NUS (parts: honours + modules TODO) |
| 3 | Experience | Robot Forge (chronological halls) | #f59e0b | welder-arms, scrap crawlers | OTSAW · A*STAR I²R · DSO · Ecovolt (parts = résumé bullets; cross-link portals to Projects) |
| 4 | Projects | Circuit Caverns | #22d3ee | short-circuit bugs (carry parts) | Euna Air · Dreamer × SMAClite · ROSA × ROS 2 · Isaac Sim × Nav2 · Robot Claw · Drone |
| 5 | Skills & Awards | Trophy Hall | #fbbf24 | none | Awards Wing · Collection Shelves · Skill Matrix · (hidden) Backroom |
| 6 | Leadership & Community | Colony Commons biodome (friendly NPCs) | #34d399 | none | Robotics @APEX · RoboCup SG · SP LEO Club · TOUCH |
| 7 | GitHub | Mainframe | #4ade80 | malware packets, "Merge Conflict" mini-boss | Contribution Grid · Repo Racks · Commit Feed |
| 8 | Contact | Comms Array summit on the outer hull | #a78bfa | static drones | Transmission Console |

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

## Future update (not built now)
- Futuristic currency (not emeralds) dropped by bots/crates, spent at the hub vendor on cosmetic skins for Dayna **and cat variants** (orange, British blue, Garfield, striped, white socks…).
