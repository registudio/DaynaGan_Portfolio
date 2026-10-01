# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everyone who might evaluate or work with Dayna Gan, a Computer Engineering undergraduate at NUS working in robotics and embedded systems:

- **Internship recruiters** at robotics, embedded, hardware and deep-tech companies, often skimming many candidates in a few minutes on a laptop or phone.
- **Graduate / full-time employers**: engineering leads who will dig into projects to judge depth.
- **University, scholarship and research-lab panels** checking academic record, initiative and trajectory.
- **Peers and collaborators**: classmates, club members and open-source contributors looking for someone to build with.

All four audiences carry equal weight. The site has to answer "who is Dayna, and what can Dayna build?" within seconds for a skimmer, and give a deep reader the evidence to back that up.

## Product Purpose

A personal portfolio that presents one body of work (education, internships, projects, skills, awards, leadership, GitHub activity, hobbies, goals) and turns a visit into an opportunity.

Success has two equal halves:
1. **Remembered and shortlisted.** The visitor leaves convinced Dayna is a hands-on engineer who works across hardware and software.
2. **A clear next action.** The visitor sends a message through the contact form, opens LinkedIn or GitHub, or downloads the résumé.

## Positioning

Dayna works where software meets the physical world: firmware, sensors, robotics simulation and reinforcement learning, carried from prototype through to deployment. The portfolio itself demonstrates this. The same content file drives a professional résumé site and a playable 3D voxel game in which the projects are built from their real parts and the skills are earned. A neighbouring candidate can't truthfully copy a portfolio that is itself an engineering project.

## Operating Context

- Visitors arrive from LinkedIn, résumé links, applications and word of mouth, on desktop and phone.
- A splash screen offers **Professional mode** (single long page) or **Game mode** (isometric voxel action-RPG, with Planet Aurora open world and a hands-free Quick tour). The choice is remembered and can be switched at any time.
- Deep links: `#play` (game), `#tour` (quick tour), `#planet` (open world). Supplementary projects have their own case-study pages under `/projects`.
- The page is printable (print stylesheet) and the résumé PDF lives at `public/resume/DaynaGan_Resume.pdf`.
- Hosted on Vercel; the contact form sends through Resend and falls back to an email link when no API key is configured.

## Capabilities and Constraints

- **Both modes must be kept.** Professional mode and the game (including Planet Aurora and the Quick tour) are permanent; design work may change either but must not remove one.
- All visitor-facing content comes from `content/portfolio.md`; both modes render from it, and `npm test` validates it.
- Stack: Next.js 16 App Router, React 19, Three.js, Motion, Zod, Resend. Every visual asset is generated in code (pixel textures, voxel models); audio is synthesised with WebAudio.
- Game supports keyboard/mouse, gamepad and touch. Graphics quality drops automatically on low-end devices, and a Peaceful mode removes combat.
- Live GitHub panel revalidates hourly, with an offline fallback.
- Open: the displayed email is still the placeholder `hello@example.com` until the Resend address is set up.

## Brand Commitments

- Name: **Dayna Gan** (legal: Gan Sim Ru Dayna). Companion cat **Xiao Hu** ("Little Tiger") guides the game and signs its speech bubbles.
- Voice: first person, plain and warm, engineering-literate, with light humour ("Engineer in the making.", "Let's build something.").
- The purple/violet palette is the incumbent identity; the user has not made it binding.

## Evidence on Hand

- Real projects with write-ups in `content/portfolio.md`: Euna Air, Dreamer × SMAClite, ROSA × ROS 2, Isaac Sim × Nav2, remote-controlled robot claw, drone, Determining the Mass of Jupiter. Files are in `public/projects/<id>/`.
- Stats: Diploma GPA 3.97/4.00, 4 engineering internships, 100+ Nav2 simulation runs evaluated, 80+ RoboCup SG volunteers led.
- Résumé PDF, LinkedIn (`/in/daynagan`), GitHub (`DaynaG3`).
- **Absences:** "Sample project one–five" are placeholders, and 18 TODO paragraphs remain in the content file. There are no testimonials, real photos or CAD models (`public/models/` is empty). Never fabricate any of these.

## Product Principles

1. **Proof over claims.** Every assertion should sit next to the project, metric or artefact that backs it.
2. **Two depths, one truth.** Skimmers get the headline in seconds, deep readers get the engineering, and both modes say the same thing.
3. **Play is the proof of craft.** The game exists to show engineering ability, so it must never get in the way of reaching the content or the contact form.
4. **Always one click from contact.** LinkedIn, GitHub, email and the résumé stay reachable from everywhere in both modes.

## Accessibility & Inclusion

- Respect `prefers-reduced-motion` in both modes; heavy 3D and motion must have calm fallbacks.
- The content must stay reachable without playing the game (Professional mode, Quick tour) and on touch-only devices.
