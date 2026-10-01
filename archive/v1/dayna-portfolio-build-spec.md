# Dayna Gan Portfolio Website — Build Specification

## 0. Project Overview

Build an immersive, scroll-driven personal portfolio website for **Gan Sim Ru Dayna**.

The website should feel playful, unique, technically sophisticated, and visually memorable without becoming difficult to navigate or overly interactive. The core experience is a **continuous construction sequence**: as the visitor scrolls, a spherical engineering station made from stylised modular construction bricks progressively assembles around an exposed internal structure.

The visual inspiration comes from:
- technical blueprint drawings
- exposed mechanical cutaways
- modular brick construction inspired by LEGO
- engineering diagrams
- industrial control systems
- robotics / embedded systems / simulation interfaces

The website should prioritize:
1. smooth scrolling
2. accurate 3D modeling
3. strong visual storytelling
4. clear, readable portfolio content
5. optional interactivity only where useful
6. live / dynamic GitHub content
7. maintainable Markdown / MDX-driven content

---

# 1. Core Creative Direction

## Concept

The entire portfolio is presented as the construction of a fictional modular engineering station.

Working name:

**D-01 Engineering Station**

The object is a spherical station inspired by orbital engineering structures and exposed mechanical cutaway diagrams.

The website begins with a **blueprint view** of the complete station.

As the visitor scrolls:
- the blueprint gains depth
- the camera transitions from orthographic to perspective
- internal structural elements assemble first
- additional systems and shell segments progressively attach
- the visitor moves through interior spaces for Projects, GitHub activity, and Blog
- the final section reveals the completed station

The final station should remain **partially cut away** so the internal systems are still visible.

The construction metaphor should represent Dayna's development as an engineer:
- core identity
- academic foundation
- engineering experience
- personal projects
- current technical activity
- writing / learning
- contact / next steps

---

# 2. Construction Style

## Default style

Use **stylised modular engineering bricks inspired by LEGO**, but do not make the entire site dependent on LEGO-specific branding or exact LEGO geometry.

Desired characteristics:
- visible studs or connection points are acceptable
- modular paneling
- structural beams
- plates
- brackets
- cylindrical connectors
- mechanical-looking brick assemblies
- technical modularity
- physically readable construction logic

Avoid:
- bright rainbow toy-like LEGO palettes
- LEGO logos
- direct duplication of official LEGO kits
- exact Star Wars vehicle copying
- excessive cartoon styling

The station should look like:
- an engineering model
- a technical prototype
- a brick-built mechanical system

## Future-proof visual toggle

The implementation should support a future appearance toggle such as:

```text
MODEL STYLE
[ Modular ] [ Brick ]
```

Possible future modes:
- `modular`: stylised engineering construction blocks
- `brick`: more explicit LEGO-like studs / brick language

Do not tightly couple section logic to one material style.

Model structure, section segmentation, transforms, and content mappings should remain the same regardless of visual mode.

---

# 3. Experience Philosophy

The portfolio should **not** behave like a game.

The default interaction model is:

```text
SCROLL
  ↓
STORY PROGRESSES AUTOMATICALLY
  ↓
MODEL BUILDS
  ↓
CAMERA MOVES
  ↓
CONTENT REVEALS
```

The user should never need to:
- drag the camera to find content
- explore an environment before learning who Dayna is
- solve navigation puzzles
- click objects just to progress

Interactivity should be used selectively in:
- the initial blueprint navigation
- project items
- GitHub control room
- blog / archive area
- final assembled-station navigation

The site should remain fully understandable through normal scrolling alone.

---

# 4. Site Information Architecture

Use this structure:

```text
00  BLUEPRINT
    Landing / Navigation

01  CORE
    About Dayna

02  FRAMEWORK
    Education

03  SYSTEMS
    Work Experience

04  PROJECT BAY
    Projects

05  CONTROL ROOM
    GitHub / Current Activity

06  ARCHIVES
    Blog

07  ASSEMBLY COMPLETE
    Contact / Resume / Socials
```

Awards, leadership, skills, and technical competencies should be woven into relevant sections rather than presented as generic standalone grids unless needed.

---

# 5. Global Scroll Narrative

## 00 — Blueprint

### Visual

The site opens in a technical blueprint state.

Background:
- deep technical blue
- subtle engineering grid
- off-white / cyan line art
- occasional safety yellow accent

The spherical station appears as a technical elevation drawing.

Recommended blueprint views:
- front elevation
- side elevation
- optional cutaway
- sectional callouts
- dimension lines
- assembly labels

Suggested annotations:

```text
D-01
ENGINEERING STATION

GAN SIM RU DAYNA

SYSTEM INDEX
01 CORE
02 FRAMEWORK
03 SYSTEMS
04 PROJECT BAY
05 CONTROL ROOM
06 ARCHIVES
07 CONTACT
```

### Interaction

Each major blueprint segment highlights on hover.

Clicking a segment scrolls to that section.

If the visitor does nothing, show:

```text
SCROLL TO BEGIN ASSEMBLY ↓
```

### Transition

As scrolling begins:
1. blueprint line opacity changes
2. dimensional annotations fade
3. line-only geometry gains shaded surfaces
4. orthographic camera transitions toward perspective
5. model gains real depth
6. first internal structure starts assembling

This transition should feel like the blueprint becoming a real object.

---

# 6. Section 01 — CORE / About

## Narrative role

This is the central identity around which everything else is built.

The station begins with:
- central core
- reactor-like hub
- structural spine
- small internal modules

## Generated website copy

### Eyebrow

```text
01 / CORE
ABOUT
```

### Primary heading

```text
Building intelligent systems across hardware, software and robotics.
```

### Short bio

```text
I'm Dayna Gan, a Computer Engineering undergraduate at the National University of Singapore with a background in mechatronics, robotics, embedded systems and intelligent autonomous systems.

I enjoy working where software meets the physical world — from embedded firmware and sensor systems to robotics simulation, reinforcement learning and real-world deployment.
```

### Supporting statement

```text
My work spans hands-on engineering, experimentation and applied research, with a focus on building systems that can move from prototype to real-world use.
```

## Possible visual labels around the core

```text
ROBOTICS
EMBEDDED SYSTEMS
HARDWARE
SOFTWARE
INTELLIGENT SYSTEMS
SIMULATION
PROTOTYPING
```

These can illuminate or connect through animated traces.

---

# 7. Section 02 — FRAMEWORK / Education

## Narrative role

Education forms the structural frame around the central core.

Two major rings / support structures assemble:
1. Singapore Polytechnic
2. National University of Singapore

Awards and academic recognition appear as blueprint annotations attached to the structure.

## Content

### NUS

```text
National University of Singapore
Bachelor of Engineering in Computer Engineering
Aug 2025 – Present

University Engineering Scholarship Recipient
```

### Singapore Polytechnic

```text
Singapore Polytechnic
Diploma in Mechatronics and Robotics, with Merit
Apr 2022 – May 2025

Valedictorian, Class of 2025
GPA: 3.97 / 4.00
SP Engineering Scholarship Recipient
Director's Honour Roll, AY2022–2025
```

## Optional editorial copy

```text
My academic path has moved progressively deeper into the intersection of electronics, software, control systems and intelligent machines — from mechatronics and robotics at Singapore Polytechnic to Computer Engineering at NUS.
```

## Visual ideas

- structural rings
- truss-like brick beams
- technical labels
- degree milestones attached as assembly plates
- scholarship / honour annotations as stamped blueprint metadata

---

# 8. Section 03 — SYSTEMS / Work Experience

## Narrative role

Four major outer station sectors represent Dayna's main engineering work experiences.

Suggested geometry:
- four large spherical shell / system quadrants
- assembled chronologically from earliest to latest
- each sector has distinct internal visual motifs

Experiences:
1. OTSAW Digital
2. A*STAR Institute for Infocomm Research
3. DSO National Laboratories
4. Ecovolt Technologies

---

## 03A — OTSAW Digital

### Label

```text
SYSTEM 01
OTSAW DIGITAL
ROBOTICS INTERN
JAN 2022 – MAR 2022
```

### Content

```text
Worked on hands-on robotics production, electrical design and field deployment.

- Assembled and soldered components for three TREX robotic units.
- Designed electrical-box circuitry for the AirGuard system using Autodesk Inventor.
- Supported on-site deployment, maintenance and troubleshooting of Camello autonomous last-mile delivery robots in Punggol.
```

### Visual motif

- wiring
- assembly bench
- robot body panels
- solder points
- mechanical subassemblies

---

## 03B — A*STAR Institute for Infocomm Research

### Label

```text
SYSTEM 02
A*STAR I²R
ROBOTICS INTERN
SEP 2024 – FEB 2025
```

### Content

```text
Explored robotics simulation, autonomy and natural-language interaction.

- Evaluated NVIDIA Isaac Sim with ROS 2 as a possible primary simulation platform for future robotics projects.
- Implemented a ROSA agent using LangChain to support natural-language control of ROS 2 robots in Isaac Sim.
- Built realistic warehouse crowd simulations using Omni.Anim.People.
- Conducted more than 100 simulation runs to evaluate Nav2 path planning and collision avoidance under dynamic human movement.
```

### Visual motif

- warehouse grid
- moving agents
- ROS nodes
- navigation paths
- simulated occupancy / path overlays

---

## 03C — DSO National Laboratories

### Label

```text
SYSTEM 03
DSO NATIONAL LABORATORIES
SOFTWARE ENGINEER INTERN
MAY 2026 – JUL 2026
```

### Content

```text
Delivered a three-month research project in model-based reinforcement learning for multi-agent mission planning.

- Integrated R2-Dreamer into the SMAClite R2-2100 environment.
- Designed and tested reward-shaping, adaptive-sampling, observability and actor-critic experiments.
- Improved validation macro win rate from near zero to a best checkpoint of 55.6%.
- Achieved 53.11% macro win rate on the blind-IID split and 59.25% on the blind-compositional split.
- Identified scenario-dependent policy and value generalisation as the main performance bottleneck.
```

### Visual motif

- multi-agent movement
- training-state display
- reward graph
- policy network nodes
- agent trajectory traces
- performance numbers as integrated HUD readouts

---

## 03D — Ecovolt Technologies

### Label

```text
SYSTEM 04
ECOVOLT TECHNOLOGIES
HARDWARE ENGINEER INTERN
JAN 2026 – PRESENT
```

### Content

```text
Working on hardware, firmware, environmental sensing and real-world deployment.

- Owned hardware bring-up and customer deployment of Euna Air, an environmental monitoring and sensor-fusion solution.
- Completed on-site validation at customer premises within one week.
- Developed embedded firmware and field-testing procedures.
- Investigated differences between laboratory simulation and real-world operating conditions.
- Contributed to R&D for Maxwell Ultra, an advanced occupancy-sensing system.
- Streamlined production ahead of deployment at a hotel partner.
- Investigated complex network edge cases across enterprise IoT deployments through failure reproduction, firmware auditing and bottleneck analysis.
```

### Visual motif

- sensor arrays
- airflow
- telemetry
- firmware signal paths
- status LEDs
- network lines
- deployment diagnostics

---

# 9. Section 04 — PROJECT BAY

## Narrative role

The camera moves inside the station into a dedicated engineering workshop.

This is the most intentionally interactive part of the site.

The user should still be able to keep scrolling normally, but hovering / clicking project objects should provide deeper exploration.

## Environment

Possible objects:
- workbench
- suspended project prototypes
- miniature robot
- PCB / electronics module
- simulation display
- AI agent visual
- mechanical assembly
- project status lights

## Project interaction pattern

Hover:
- object rotates slightly
- local light turns on
- project name appears
- short summary appears
- stack tags appear

Click:
- open project page or expanded case study

Each project may contain:
- title
- year
- summary
- role
- problem
- approach
- result
- technologies
- images
- video
- GitHub repository
- optional live demo
- lessons learned

## Content source

Projects must come from Markdown / MDX files.

Example:

```text
/content/projects/project-slug.mdx
```

Suggested frontmatter:

```yaml
---
title: "Project Title"
slug: "project-title"
year: 2026
summary: "Short project description."
featured: true
status: "active"
technologies:
  - Python
  - ROS 2
  - C++
github: "https://github.com/..."
demo: null
model: "/models/projects/project-title.glb"
thumbnail: "/images/projects/project-title.webp"
---
```

Do not invent project content from the resume.

The resume does not contain a dedicated personal-project section.

Create placeholder project files only if clearly marked as `TODO`.

Example:

```text
TODO: Add Dayna's real personal / academic project details here.
```

---

# 10. Section 05 — CONTROL ROOM / GitHub

## Narrative role

The visitor enters the station's command center.

This is where GitHub and current technical activity become visible.

## GitHub account

```text
https://github.com/DaynaG3
```

## Live data ideas

Main screen:
- contribution activity

Secondary screens:
- recent repositories
- latest push / commit activity
- primary languages
- stars
- forks
- repository update timestamps
- active / recently updated projects

Example interface language:

```text
CONTROL ROOM
LIVE DEVELOPMENT ACTIVITY

ACTIVE REPOSITORIES
RECENT TRANSMISSIONS
LANGUAGE SYSTEMS
CONTRIBUTION GRID
```

## Technical implementation

Use GitHub API.

Recommended:
- fetch server-side
- cache results
- revalidate periodically
- avoid browser-side unauthenticated request spam
- provide fallback static content if API fails

Do not expose private credentials.

Use environment variables for tokens if authenticated API access is needed.

Possible Next.js caching:

```text
revalidate: 3600
```

or equivalent server caching.

## Fallback behavior

If GitHub API is unavailable:

```text
LIVE FEED TEMPORARILY OFFLINE
VIEW GITHUB PROFILE →
```

The page must not visually break.

---

# 11. Section 06 — ARCHIVES / Blog

## Narrative role

The blog is the station's engineering archive / field-log system.

Possible labels:

```text
ARCHIVES
ENGINEERING LOG
FIELD NOTES
```

## Post naming

Example:

```text
LOG 024
Title

LOG 023
Title
```

## Content design

The archive index can remain immersive.

Individual blog posts should prioritize readability.

Once a blog post opens:
- reduce 3D complexity
- use strong editorial typography
- provide generous line height
- readable max width
- support code blocks
- support images
- support equations if needed
- support embedded media if needed

## Source

Use MDX:

```text
/content/blog/post-slug.mdx
```

Suggested frontmatter:

```yaml
---
title: "Post Title"
slug: "post-title"
date: "2026-09-23"
summary: "Short summary."
tags:
  - robotics
  - embedded
featured: false
cover: "/images/blog/post-title.webp"
---
```

---

# 12. Section 07 — ASSEMBLY COMPLETE / Contact

## Narrative role

The camera exits the station.

Final shell panels assemble.

The complete station is revealed, with a partial cutaway still visible.

The completed object should clearly show that all previous modules are part of one integrated system.

## Final state

```text
ASSEMBLY COMPLETE

D-01
DAYNA GAN

SYSTEM STATUS
● OPERATIONAL
```

Suggested closing line:

```text
Still building.
```

## Contact options

These must be included clearly:

### GitHub

```text
https://github.com/DaynaG3
```

### LinkedIn

```text
https://www.linkedin.com/in/daynagan/
```

### Email

```text
daynagsr@gmail.com
```

Recommended final CTA layout:

```text
LET'S CONNECT

[ GitHub ]
[ LinkedIn ]
[ Email ]
[ Resume ]
```

Use:
- `mailto:daynagsr@gmail.com`
- external links in new tab where appropriate
- proper aria labels

The final station can also become navigable again.

Hover sectors:

```text
CORE         About
FRAMEWORK    Education
SYSTEMS      Experience
PROJECT BAY  Projects
CONTROL      GitHub
ARCHIVES     Blog
```

Clicking a sector should scroll back to the relevant section.

This mirrors the opening blueprint and creates a narrative loop.

---

# 13. Persistent Assembly Indicator

Add a subtle fixed system-progress indicator.

Example:

```text
D-01 // ASSEMBLY

████████░░░░░░░░ 48%

MODULE
03 / SYSTEMS
```

Do not make this look like a generic website scroll progress bar.

It should look like station assembly telemetry.

Final state:

```text
100%
SYSTEM OPERATIONAL
```

---

# 14. Leadership and Community Content

Integrate leadership / community involvement into relevant UI rather than forcing a separate major station sector.

Potential placements:
- secondary module inside About
- archive metadata
- optional "Beyond Engineering" subsection
- smaller side-system panels

## TOUCH Community Services

```text
Youth Mentor
Sep 2022 – Present

Mentor children from disadvantaged backgrounds through academic support, personal guidance and enrichment activities.

Plan and facilitate celebration and engagement programmes to support a positive learning environment.
```

## SP LEO Club

```text
Welfare Head
Mar 2023 – Mar 2024

Organised active-ageing and outreach initiatives for senior beneficiaries.

Designed programmes addressing social and emotional needs of elderly participants.
```

## RoboCup Singapore Student Organising Committee

```text
Chairperson
Oct 2022 – Apr 2023

Led a student organising committee of more than 80 volunteers.

Coordinated students, mentors and external stakeholders.

Managed event planning, volunteer scheduling and on-site operations.
```

## School of Science and Technology

```text
President, Robotics @APEX
2021

Led the school robotics club.

Supported robotics training, project development and competition preparation.
```

---

# 15. Awards

Use awards as compact blueprint annotations or achievement plates.

Content:

```text
A*STAR Science Award (Polytechnic)
2023–2024

SP Engineering Merit Award
2023–2025

Edusave Skills Award
2025
```

---

# 16. Technical Skills

Do not present this as a generic logo wall.

Use skills contextually throughout the site.

## Programming

```text
Python
C++
Java
Verilog
```

## Robotics and Simulation

```text
ROS 2
NVIDIA Isaac Sim
Nav2
```

## Hardware and Prototyping

```text
CAD
Autodesk Inventor
Arduino
ESP32
STM32
Soldering
Hands-on Assembly
3D Printing
```

Possible visual treatment:
- subsystem labels
- project tags
- blueprint annotations
- control-room telemetry
- contextual badges inside experience entries

---

# 17. Recommended Tech Stack

## Framework

```text
Next.js
TypeScript
React
```

Reasons:
- SEO
- routing
- server-side data fetching
- blog / project pages
- Vercel deployment
- static generation
- API integration
- React ecosystem compatibility

---

## Styling

```text
Tailwind CSS
```

Use Tailwind for:
- layout
- typography
- responsive behavior
- cards / panels
- HUD elements
- blog article styling
- project details
- contact UI

Rule:

```text
3D FOR WORLD-BUILDING
DOM FOR INFORMATION
```

Do not render long-form portfolio copy as WebGL text unless strictly decorative.

---

## 3D

```text
Three.js
React Three Fiber
@react-three/drei
```

Use React Three Fiber instead of raw Three.js for primary application integration.

Drei may support:
- camera helpers
- GLTF loading
- environments
- HTML overlays
- performance utilities
- staging helpers

---

## Scroll choreography

```text
GSAP
ScrollTrigger
```

GSAP should control:
- camera travel
- station assembly sequence
- blueprint-to-3D transition
- module entrance timing
- shell assembly
- lighting transitions
- section-driven transforms

Do not use multiple competing libraries for the same scroll-controlled 3D transformations.

---

## UI microinteractions

```text
Motion
```

Use Motion for:
- buttons
- hover interactions
- text reveal
- nav
- modal transitions
- project UI
- blog UI
- page transitions

Responsibility split:

```text
GSAP
= cinematic scroll timeline

Motion
= DOM / UI interaction

React Three Fiber
= scene rendering and 3D state
```

---

## Content

```text
Markdown
MDX
```

All meaningful website copy should be stored outside components.

Recommended:
- Markdown for structured website sections
- MDX for long-form projects / blog posts where embeds or React components are useful

---

# 18. Required Content-Driven Architecture

The website must reference content files in the codebase.

A change to the content Markdown / MDX files should automatically change the website on the next build / development refresh.

Do not hardcode portfolio copy into React components.

## Recommended structure

```text
/content
  site.md

  /sections
    about.md
    education.md
    experience.md
    contact.md

  /projects
    project-01.mdx
    project-02.mdx

  /blog
    post-01.mdx
    post-02.mdx
```

Alternative:

```text
/content
  portfolio.md
```

for all top-level portfolio content plus separate project / blog files.

Recommended implementation is the first approach because it scales better.

---

# 19. Suggested Markdown Schema

## `/content/sections/about.md`

```yaml
---
id: about
module: core
order: 1
eyebrow: "01 / CORE"
title: "Building intelligent systems across hardware, software and robotics."
---

I'm Dayna Gan, a Computer Engineering undergraduate at the National University of Singapore with a background in mechatronics, robotics, embedded systems and intelligent autonomous systems.

I enjoy working where software meets the physical world — from embedded firmware and sensor systems to robotics simulation, reinforcement learning and real-world deployment.
```

---

## `/content/sections/education.md`

```yaml
---
id: education
module: framework
order: 2
eyebrow: "02 / FRAMEWORK"
title: "Education"
---

## National University of Singapore

**Bachelor of Engineering in Computer Engineering**  
Aug 2025 – Present

- University Engineering Scholarship Recipient

## Singapore Polytechnic

**Diploma in Mechatronics and Robotics, with Merit**  
Apr 2022 – May 2025

- Valedictorian, Class of 2025
- GPA: 3.97 / 4.00
- SP Engineering Scholarship Recipient
- Director's Honour Roll, AY2022–2025
```

---

## `/content/sections/experience.md`

Use structured frontmatter or embedded JSON-like metadata if preferred.

Example:

```yaml
---
id: experience
module: systems
order: 3
eyebrow: "03 / SYSTEMS"
title: "Experience"
---
```

Then normal Markdown headings for companies.

If more structured rendering is required, create one MDX file per experience:

```text
/content/experience/ecovolt.mdx
/content/experience/dso.mdx
/content/experience/astar.mdx
/content/experience/otsaw.mdx
```

---

# 20. Content Loader Architecture

Recommended options:
- `gray-matter`
- `next-mdx-remote`
- Contentlayer-compatible equivalent
- custom static Markdown loader

The exact implementation may vary, but requirements are:

1. parse frontmatter
2. parse body
3. expose typed content objects
4. render content into normal React components
5. support development hot reload
6. support build-time generation
7. support project / blog route generation

Suggested TypeScript types:

```ts
type SectionContent = {
  id: string
  module: string
  order: number
  eyebrow?: string
  title: string
  body: string
}

type Project = {
  slug: string
  title: string
  year?: number
  summary: string
  technologies: string[]
  github?: string
  demo?: string
  featured: boolean
  model?: string
  body: string
}

type BlogPost = {
  slug: string
  title: string
  date: string
  summary: string
  tags: string[]
  featured: boolean
  cover?: string
  body: string
}
```

---

# 21. Recommended Folder Structure

```text
/
├── app/
│   ├── page.tsx
│   ├── projects/
│   │   └── [slug]/
│   │       └── page.tsx
│   ├── blog/
│   │   └── [slug]/
│   │       └── page.tsx
│   └── api/
│       └── github/
│
├── components/
│   ├── scene/
│   │   ├── Station.tsx
│   │   ├── Blueprint.tsx
│   │   ├── Core.tsx
│   │   ├── Framework.tsx
│   │   ├── Systems.tsx
│   │   ├── ProjectBay.tsx
│   │   ├── ControlRoom.tsx
│   │   ├── Archives.tsx
│   │   └── OuterShell.tsx
│   │
│   ├── sections/
│   │   ├── AboutSection.tsx
│   │   ├── EducationSection.tsx
│   │   ├── ExperienceSection.tsx
│   │   ├── ProjectsSection.tsx
│   │   ├── GitHubSection.tsx
│   │   ├── BlogSection.tsx
│   │   └── ContactSection.tsx
│   │
│   ├── ui/
│   │   ├── AssemblyProgress.tsx
│   │   ├── BlueprintNav.tsx
│   │   ├── ProjectCard.tsx
│   │   ├── BlogCard.tsx
│   │   └── ContactLinks.tsx
│   │
│   └── providers/
│
├── content/
│   ├── site.md
│   ├── sections/
│   │   ├── about.md
│   │   ├── education.md
│   │   ├── experience.md
│   │   └── contact.md
│   ├── projects/
│   └── blog/
│
├── lib/
│   ├── content.ts
│   ├── github.ts
│   ├── animation.ts
│   └── scene.ts
│
├── public/
│   ├── models/
│   │   └── station/
│   ├── textures/
│   ├── images/
│   └── resume/
│
└── styles/
```

---

# 22. 3D Model Requirements

Accuracy is important.

Do not generate the main station as loose random primitives directly in React unless only prototyping.

The final production model should be authored in a dedicated 3D modeling workflow, preferably Blender.

## Model topology

Recommended model hierarchy:

```text
D01_Station
├── Core
│   ├── Core_Base
│   ├── Core_Ring
│   └── Core_Details
│
├── Framework
│   ├── SP_Ring
│   ├── NUS_Ring
│   └── Support_Beams
│
├── Systems
│   ├── OTSAW_Sector
│   ├── ASTAR_Sector
│   ├── DSO_Sector
│   └── Ecovolt_Sector
│
├── ProjectBay
│   ├── Bay_Structure
│   ├── Workbench
│   └── Project_Mounts
│
├── ControlRoom
│   ├── MainConsole
│   ├── LeftConsole
│   ├── RightConsole
│   └── Screens
│
├── Archives
│   ├── ArchiveStructure
│   └── DataModules
│
└── OuterShell
    ├── Shell_A
    ├── Shell_B
    ├── Shell_C
    ├── Shell_D
    └── CutawayPanels
```

Export as:

```text
GLB / glTF
```

Use meaningful object names.

---

# 23. Modular Assembly Strategy

Do not simulate thousands of individual pieces.

Instead group visual elements into believable construction clusters.

Example:

```text
DSO_Sector
├── Chunk_A
├── Chunk_B
├── Chunk_C
├── Chunk_D
└── Details
```

Each chunk can animate:
- from offset position
- from exploded view
- into final location
- with slight rotational alignment
- with optional small settle / snap motion

This preserves the construction effect while maintaining performance.

---

# 24. Blueprint Implementation

Prefer deriving the blueprint from the actual station geometry so the opening and final object match accurately.

Possible approach:

- use same GLB geometry
- orthographic camera
- custom blueprint material
- edge / outline rendering
- flat technical-blue environment
- white / cyan lines
- dimension and annotation DOM overlays

Transition sequence:

```text
ORTHOGRAPHIC
    ↓
PERSPECTIVE

BLUEPRINT
    ↓
PHYSICAL MATERIALS

FLAT
    ↓
DEPTH

EXPLODED
    ↓
ASSEMBLED
```

This is preferred over fading from a static unrelated blueprint image.

---

# 25. Scroll Architecture

Use a fixed 3D canvas and normal scrolling HTML sections.

Concept:

```text
<body>
  <Canvas fixed />
  <main>
    <section id="blueprint" />
    <section id="about" />
    <section id="education" />
    <section id="experience" />
    <section id="projects" />
    <section id="github" />
    <section id="blog" />
    <section id="contact" />
  </main>
</body>
```

HTML sections drive the 3D scene.

Use ScrollTrigger or equivalent to map scroll progress to:
- camera
- object transforms
- material transitions
- lighting
- opacity
- assembly state

---

# 26. Suggested Scroll Timeline

Exact percentages can be tuned during implementation.

```text
0–10%
Blueprint introduction

10–20%
Blueprint becomes 3D
Core assembles

20–32%
Education framework builds

32–55%
Experience sectors assemble

55–70%
Camera moves into Project Bay

70–82%
Control Room / GitHub

82–92%
Archives / Blog

92–100%
Exit station
Final shell assembly
Complete reveal
Contact
```

---

# 27. Smooth Scrolling

Smoothness is a hard requirement.

Goals:
- no scroll-jacking
- no forced wheel-step navigation
- no abrupt section snapping unless optional
- user should retain normal scroll control

Recommended:
- native scroll + GSAP ScrollTrigger
- optional Lenis if needed for inertial smoothing

If Lenis is used:
- integrate properly with GSAP ticker
- disable or simplify where accessibility / reduced-motion requires
- do not create latency or excessive momentum

All animation should feel responsive to scroll position.

---

# 28. Animation Language

Animations should communicate:
- construction
- engineering
- calibration
- activation
- system assembly

Preferred motion:
- measured
- precise
- controlled
- smooth
- slightly mechanical

Avoid:
- excessive bounce
- random spinning
- constant floating elements
- meaningless motion
- long animation delays

Useful transitions:
- snapping modules into place
- traces illuminating
- screens booting up
- blueprint lines drawing
- shell plates sliding into position
- camera passing through apertures
- panels opening
- data screens activating

---

# 29. Project Interactivity

Projects should support:
- hover highlight
- optional 3D model focus
- technology tags
- GitHub links
- case-study route
- keyboard accessibility

Do not require 3D interaction to open or understand a project.

Provide normal DOM equivalents.

---

# 30. Blog Interactivity

Blog index may use:
- archive drawers
- data cartridges
- log cards
- timeline
- technical filtering

Individual article pages should be conventional and highly readable.

Do not force users to remain inside a 3D scene while reading long-form content.

---

# 31. Mobile Strategy

Do not simply shrink desktop.

Mobile should preserve the narrative with simplified 3D.

Possible simplifications:
- fewer geometry details
- fewer animated chunks
- reduced camera movement
- simplified lighting
- disabled expensive post-processing
- more DOM content prominence
- tap instead of hover

Maintain:
- station construction
- core storyline
- project access
- GitHub access
- blog access
- contact links

---

# 32. Reduced Motion

Honor:

```css
@media (prefers-reduced-motion: reduce)
```

Reduced-motion mode should:
- disable aggressive camera movement
- reduce assembly travel distance
- avoid scroll-linked parallax
- show sections in stable states
- retain all information and navigation

The website must remain fully usable.

---

# 33. Performance Requirements

The 3D model must be optimized.

Use:
- Draco compression where useful
- KTX2 / compressed textures if textures are used
- instancing for repeated parts
- merged static meshes
- efficient materials
- selective shadows
- minimal post-processing
- lazy loading
- route-level code splitting
- device pixel ratio cap
- LOD if needed

Avoid:
- thousands of independent mesh draw calls
- expensive transparent layers
- unnecessary physics
- heavy full-screen post-processing
- large uncompressed textures

Target:
- smooth experience on modern laptops
- graceful degradation on weaker devices
- acceptable mobile loading

---

# 34. Accessibility

Requirements:
- semantic HTML
- keyboard navigation
- visible focus states
- proper links
- alt text
- ARIA where appropriate
- no essential content hidden only inside canvas
- sufficient contrast
- reduced-motion support

The Three.js scene should enhance the website, not contain the only accessible version of critical information.

---

# 35. SEO / Metadata

Add:
- descriptive page title
- description
- Open Graph metadata
- Twitter card metadata
- canonical URLs
- sitemap
- robots.txt
- JSON-LD where appropriate

Suggested homepage title:

```text
Dayna Gan — Computer Engineering, Robotics & Embedded Systems
```

Suggested description:

```text
Portfolio of Dayna Gan, a Computer Engineering undergraduate working across robotics, embedded systems, hardware, simulation and intelligent autonomous systems.
```

---

# 36. Contact Data

Canonical contact information:

```yaml
github: "https://github.com/DaynaG3"
linkedin: "https://www.linkedin.com/in/daynagan/"
email: "daynagsr@gmail.com"
```

Store this in Markdown or central site config, not repeated manually throughout components.

Example `/content/site.md`:

```yaml
---
name: "Gan Sim Ru Dayna"
displayName: "Dayna Gan"
github: "https://github.com/DaynaG3"
linkedin: "https://www.linkedin.com/in/daynagan/"
email: "daynagsr@gmail.com"
---
```

---

# 37. Source Content

The following résumé-derived information should be treated as canonical unless Dayna later updates it in the content files.

## Identity

```text
Gan Sim Ru Dayna
```

## Education

```text
National University of Singapore
Bachelor of Engineering in Computer Engineering
Aug 2025 – Present
University Engineering Scholarship Recipient
```

```text
Singapore Polytechnic
Diploma in Mechatronics and Robotics, with Merit
Apr 2022 – May 2025
Valedictorian, Class of 2025
GPA: 3.97 / 4.00
SP Engineering Scholarship Recipient
Director's Honour Roll, AY2022–2025
```

## Experience

See detailed entries under the SYSTEMS section.

## Awards

```text
A*STAR Science Award (Polytechnic), 2023–2024
SP Engineering Merit Award, 2023–2025
Edusave Skills Award, 2025
```

## Leadership

See detailed entries under Leadership and Community Content.

## Technical skills

See Technical Skills section.

---

# 38. Content Integrity Rules

Do not invent:
- new awards
- project results
- new job responsibilities
- certifications
- startup roles
- research publications
- competition wins
- GitHub metrics
- current project names

If content is missing:
- use `TODO`
- use placeholder content explicitly marked as placeholder
- keep fields empty

Never fabricate data to make the site feel more complete.

---

# 39. Final Design Language

The final visual identity should combine:

```text
BLUEPRINT
+
MODULAR BRICK CONSTRUCTION
+
INDUSTRIAL ENGINEERING UI
+
EDITORIAL PORTFOLIO TYPOGRAPHY
+
SCROLL-DRIVEN CINEMATIC TRANSITIONS
```

Avoid making it feel like:
- a generic developer portfolio
- a Star Wars fan site
- a retro operating-system clone
- a game
- a toy catalog

It should feel like a designed engineering world that represents Dayna.

---

# 40. Visual Design Recommendations

## Blueprint state

- deep blue
- off-white linework
- cyan accents
- safety yellow highlight
- low-noise grid

## Construction state

Suggested materials:
- off-white
- light grey
- graphite
- dark blue
- muted metallic surfaces
- occasional yellow / orange engineering accents

Avoid rainbow brick colors.

## Interior state

- darker graphite
- technical displays
- illuminated panels
- cool instrumentation
- controlled accent color

---

# 41. Typography

Suggested direction:

## Display / interface

Geometric or neo-grotesk sans.

Possible references:
- Space Grotesk
- Geist
- Neue Montreal-like direction
- Söhne-like direction

## Technical labels

Monospace.

Possible references:
- IBM Plex Mono
- Geist Mono
- JetBrains Mono

Use mono sparingly for:
- labels
- module IDs
- telemetry
- metadata
- code-like annotations

---

# 42. Build Priorities

Implement in this order:

## Phase 1 — Content + skeleton
- content schemas
- Markdown / MDX loading
- page routes
- normal HTML portfolio
- project pages
- blog pages
- contact links

## Phase 2 — 3D foundation
- station GLB
- scene setup
- camera
- lighting
- section mapping

## Phase 3 — Scroll choreography
- blueprint
- core assembly
- framework
- systems
- interiors
- final reveal

## Phase 4 — Interactivity
- blueprint navigation
- project hover / click
- GitHub control room
- archive interactions
- final station navigation

## Phase 5 — polish
- performance
- mobile
- accessibility
- reduced motion
- SEO
- transitions
- loading state

---

# 43. Definition of Done

The site is not complete until:

- content is sourced from Markdown / MDX
- edits to content files update the rendered website
- blueprint matches the actual 3D model
- station modules map clearly to site sections
- full scroll sequence is smooth
- no scroll-jacking
- projects remain interactable
- blog remains readable
- GitHub feed works or fails gracefully
- mobile experience remains usable
- reduced-motion mode works
- contact links work
- project and blog routes work
- final station reveal completes the narrative
- no important portfolio text exists only inside canvas
- no fabricated résumé information is present

---

# 44. Astra / Codex Implementation Instruction

Build this as a production-quality Next.js portfolio.

Do not treat the brief as inspiration only.

Preserve:
- the information architecture
- the construction metaphor
- content-driven Markdown architecture
- section-to-station mapping
- smooth scroll behavior
- selective interactivity
- GitHub control-room concept
- partial-cutaway final model
- performance / accessibility requirements

Before implementation:
1. create the content schema
2. scaffold the site without 3D
3. ensure all content renders from Markdown / MDX
4. implement the 3D station as modular named objects
5. connect scroll sections to model state
6. progressively add animation
7. optimize before adding decorative effects

Do not hardcode content in page components.

If a model asset is unavailable, create a clearly documented placeholder scene architecture first rather than permanently replacing the station concept with primitive spheres.

The final system should be easy to update by editing Markdown, adding a new project file, or adding a new blog post without restructuring the website.
