---
name: Dayna Gan — Portfolio
description: A night lab bench for a robotics and embedded-systems engineer, in two modes, professional and playable.
colors:
  paper: "#faf8fc"
  surface: "#ffffff"
  surface-2: "#f3effa"
  tint: "#ede9fe"
  ink: "#1a1523"
  ink-2: "#4a4458"
  ink-3: "#6b6479"
  line: "#e4ddf0"
  violet: "#5b21b6"
  violet-2: "#7c3aed"
  violet-soft: "#ddd6fe"
  ok: "#047857"
  warn: "#b45309"
  night-paper: "#130e1d"
  night-surface: "#1b1528"
  night-surface-2: "#221a33"
  night-tint: "#2a1f40"
  night-ink: "#eee9f7"
  night-ink-2: "#c3bad4"
  night-ink-3: "#9088a3"
  night-line: "#2f2645"
  lilac: "#c4b5fd"
  lilac-2: "#a78bfa"
  aurora-magenta: "#c026d3"
  aurora-indigo: "#4f46e5"
  blueprint-ink: "#93c5fd"
  game-cyan: "#67e8f9"
  game-gold: "#fbbf24"
typography:
  display:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(38px, 5.2vw, 72px)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.045em"
  headline:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.2vw, 52px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(19px, 1.7vw, 22px)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
  lead:
    fontFamily: "Space Grotesk, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.35vw, 19px)"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    letterSpacing: "0.08em"
  pixel:
    fontFamily: "Pixelify Sans, IBM Plex Mono, monospace"
    fontSize: "16px"
    fontWeight: 400
rounded:
  hairline: "2px"
  sm: "6px"
  brand: "9px"
  md: "12px"
  card: "14px"
  lg: "16px"
  xl: "24px"
  pill: "999px"
spacing:
  "1": "4px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "5": "20px"
  "6": "24px"
  "8": "32px"
  "12": "48px"
  "16": "64px"
components:
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.paper}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  chip:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 9px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "22px"
  nav-pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "8px 8px 8px 14px"
  icon-button:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    height: "38px"
    width: "38px"
---

# Design System: Dayna Gan — Portfolio

## Overview

**Creative North Star: "The Night Lab Bench"**

The site is an engineer's workbench after hours. A violet task light pools over the bench, and on it lie blueprints, labelled parts and a project half-assembled. Professional mode opens on that bench: aubergine night (or warm paper by day), a slow aurora of violet, magenta and indigo light behind everything, and the work laid out in the open as wireframe blueprints, CAD models you can explode, and parts numbered and annotated in mono. Game mode is the same bench seen from an orbital station, in pixel type and voxels.

The density is generous, scroll-paced and cinematic. Each section opens with an oversized grotesk title that draws itself in, then settles into a working layout. The tone is precise and tactile. Controls are pills with hairline borders that lift a pixel when touched. Metadata is mono, as on a parts label. Violet is the bench light, not paint: it marks where to look and what you can touch.

**Key Characteristics:**
- Dark-first, with a fully supported light "paper" theme. Every token has both values.
- One family (Space Grotesk) carries the voice, from 72px display down to 17px body, with IBM Plex Mono for every label, date, tag and number unit.
- Engineering artefacts (wireframes, exploded CAD, part numbers, measurement lines) are the decoration.
- The motion is scroll-driven and slow. All of it switches off under `prefers-reduced-motion`.

## Colors

The palette is a single violet hue family on near-neutral aubergine and paper. Accents are rare and functional.

### Primary
- **Bench-Light Violet** (`violet` by day, `lilac` by night): links, the active nav item, primary buttons, focus rings and the current dot on the section rail.
- **Solder Violet** (`violet-2` / `lilac-2`): hover borders, the focus outline, the progress-bar start, numbered part badges.

### Secondary
- **Aurora Magenta** (`aurora-magenta`): only in the aurora backdrop, the brand-mark gradient and the progress-bar tail. Never on text.
- **Aurora Indigo** (`aurora-indigo`): the third aurora blob only.

### Tertiary
- **Blueprint Ink** (`blueprint-ink`): wireframe line work in the project viewer.
- **Game Cyan / Gold** (`game-cyan`, `game-gold`): game HUD highlights and rewards. They live only inside `.g-root`.

### Neutral
- **Night Paper / Day Paper** (`night-paper` / `paper`): the page ground.
- **Bench Surface** (`night-surface`, `night-surface-2` / `surface`, `surface-2`): cards, pills, panels and inputs.
- **Violet Tint** (`night-tint` / `tint`): chip fills and the active-nav glow.
- **Ink ladder** (`ink`, `ink-2`, `ink-3` and night variants): headings, then body, then meta. `ink-3` is the floor; never go fainter for readable text.
- **Hairline** (`line` / `night-line`): every border and divider.
- **Status** (`ok`, `warn`): the "currently" dot, reply-time dot and form states.

### Named Rules
**The Task-Light Rule.** Violet marks what to look at or touch: links, active state, focus, primary action. A violet element that does none of these is decoration and should be ink.

**The Two-Theme Rule.** No colour literal in a component. Every colour resolves through a token with both a light and a night value.

## Typography

**Display Font:** Space Grotesk (with system-ui fallback, size-matched via next/font)
**Body Font:** Space Grotesk
**Label/Mono Font:** IBM Plex Mono
**Game Font:** Pixelify Sans (game mode and the brand mark only)

**Character:** A slightly mechanical grotesk with engineered quirks, which suits a hardware person. Paired with a mono that reads like a component label or a terminal line.

### Hierarchy
- **Display** (700, `--t-3xl`, clamp 38–72px, -0.045em): section takeover titles and the hero name.
- **Headline** (700, `--t-2xl`, clamp 34–52px): headline numbers and docked section titles.
- **Title** (600, `--t-lg`, clamp 19–22px): card, role and project titles.
- **Body** (400, 17px, line-height 1.6): prose, capped near 65–75ch.
- **Lead** (400, `--t-md`): first paragraph of a section or project.
- **Label** (Plex Mono 400, 11.5–12.5px, +0.08em, often uppercase): eyebrows, dates, tags, counters ("01 / 04"), hints.

### Named Rules
**The Parts-Label Rule.** Dates, counts, tags, units and hints are set in mono. Sentences never are.

**The One-Step Rule.** Use the `--t-*` scale only; no ad-hoc font sizes.

## Layout

A single long page with a centred column (`main.pro`, max 1180px, 16px gutters). Each section is a scroll "story": a pinned takeover title animates, then docks to the top-left as the section heading, and the content follows. Projects use a sticky two-column stage, with text and part list on the left and the viewer pinned on the right (`1fr / 1.05fr`). Spacing follows the 4/8/12/16/20/24/32/48/64 steps; sections are separated by `--gap` (clamp 112–176px). The floating pill header is sticky at 12px from the top and compacts after scroll. A right-edge section rail shows position. Main breakpoints are 900, 820, 760 and 600px. Below 820px the nav becomes a bottom sheet and the stages stack.

## Elevation & Depth

The bench is lit from behind. The aurora gives ambient depth, and surfaces sit on it with a hairline border and one soft two-layer shadow (`--shadow`). The pill header adds a 12px backdrop blur. Depth otherwise comes from tonal steps (`paper` → `surface` → `surface-2` → `tint`), not stacked shadows.

### Shadow Vocabulary
- **Bench shadow** (`--shadow`): light `0 1px 2px rgb(40 20 80 / .06), 0 8px 24px -12px rgb(40 20 80 / .18)`; night `0 1px 2px rgb(0 0 0 / .3), 0 12px 32px -16px rgb(0 0 0 / .6)`. Used on cards, the nav pill and panels.

### Named Rules
**The One-Shadow Rule.** There is one shadow token. Hover feedback is a 1px lift plus a violet border, never a bigger shadow.

## Shapes

Machined, softly rounded parts. Controls are full pills (999px), cards and panels are 14px (`--radius`), inner tiles and inputs 12px, and the brand mark is a 9px rounded square. Status dots and timeline nodes are true circles. Borders are 1px hairlines everywhere. Blueprint and measurement marks are straight 1px lines with square ends.

## Components

### Buttons
- **Shape:** full pill (999px).
- **Default:** surface fill, hairline border, ink text, 500 weight, 15px, `10px 16px`.
- **Primary:** Bench-Light Violet fill, paper-coloured text. One per view: "Download résumé" in the hero, "Play" in the nav, "Send" in the form.
- **Hover / Focus:** 1px lift and a Solder Violet border over 150ms. Focus-visible is a 2px Solder Violet outline offset 3px.
- **Small:** `6px 12px`, 14px.

### Chips
- **Style:** mono 12.5px, Violet Tint fill, ink-2 text, pill.
- **Filter chips (`.chip-btn`):** same shape. Hover lifts 1px and turns violet. Selected fills violet.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** surface, with a hairline border and the bench shadow.
- **Internal Padding:** 22px.
- Cards hold a single item (a role, an award, a part). Don't nest cards.

### Inputs / Fields
- **Style:** surface fill, hairline border, 12px radius, generous 18px vertical padding.
- **Focus:** Solder Violet border plus the global focus ring.
- **Error:** `.field-err` message under the field. Never colour alone.

### Navigation
- **Floating pill header:** a blurred surface pill holding the brand mark, section links (14px, ink-2 → violet), the theme toggle and the Play primary. The active link sits on a sliding Violet Tint "glow". Below 820px it collapses to a menu button and a bottom sheet.
- **Section rail:** right-edge dots; the current one is filled violet.
- **Progress bar:** 3px at the top, Solder Violet into magenta, scaled by scroll.

### Project Stage (signature)
A sticky viewer showing a CAD model, wireframe blueprint, photos or a diagram. It has numbered hotspots that match a numbered part list, plus Explode, Hotspots and Auto-rotate pill toggles, zoom controls, and a mono hint line ("drag to rotate · pinch or ⌘/Ctrl + scroll to zoom").

### Metric Tile (signature)
Headline-sized count-up number with a label-sized caption, on a tint tile inside a role card.

## Do's and Don'ts

### Do:
- **Do** resolve every colour through a token that has both a light and a night value.
- **Do** set dates, tags, counts and hints in IBM Plex Mono at the label size.
- **Do** show the real artefact (CAD, wireframe, part list) wherever a claim about a build is made.
- **Do** give every scroll-driven or ambient animation a static `prefers-reduced-motion` state.
- **Do** keep hover feedback to a 1px lift and a violet border.

### Don't:
- **Don't** use gradient text. Headings are solid ink, and the violet emphasis on "Dayna." is a solid colour.
- **Don't** put thick coloured stripes on one side of cards or panels.
- **Don't** animate width, height, padding or margin. Use transform, opacity or grid-template-rows.
- **Don't** let a takeover title leave a viewport empty for long. The content should arrive while the title is still in view.
- **Don't** use the same emoji or icon tile on every card in a grid.
- **Don't** use magenta, cyan or gold for text in professional mode.
