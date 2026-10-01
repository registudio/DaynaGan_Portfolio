# jedd — design handoff

Personal project

## Start here

Open preview.html to review the composed sample page. It is a design reference, not a production website. Built-in element demos are interactive; page-level Motion/GSAP animations and the custom cursor need implementation using the recipe.
The design/ folder contains tokens, CSS, the ordered site recipe and uploaded assets. elements/ contains standalone HTML/CSS/JavaScript for every selected built-in effect. These files have no package dependencies and include reduced-motion fallbacks. Adapt their markup and styles to your components.
Registry selections retain verified install commands in design-playground-selection.json. They are implementation references, not rendered third-party source code. Register the source aliases from components.registries.json in your project's components.json before using those commands. Reference-only components should be inspected and adapted.

## Design decisions

Template: private-tutor
Colour scheme: See design/design.tokens.json
Typography: Newsreader / Inter
Cursor: default
Enabled engines: motion, gsap

## Page order

Intentionally empty. Do not add sections without agreement.

## Selected effects & notes

### Toast stack
Origin: Playground Originals (CSS + JavaScript)
Placement: after navbar

No additional note.

Source: elements/loader-toast.html

### Light beams
Origin: Playground Originals (CSS)
Placement: End of page

No additional note.

Source: elements/beam-sweep.html

### Border draw
Origin: Playground Originals (CSS)
Placement: End of page

No additional note.

Source: elements/border-draw.html

### CountUp
Source: [React Bits](https://reactbits.dev)
Placement: Not placed — decide during build

No additional note.

Install: npx shadcn@latest add @react-bits/CountUp-TS-TW

## Project notes

No additional notes.

## Implementation checklist

- Preserve the section order, omitted sections and undecided choices.
- Apply design tokens and replace sample copy with approved content.
- Integrate selected effects at their recorded placements; notes describe intent.
- Self-host fonts where appropriate and retain uploaded font licensing information.
- Respect prefers-reduced-motion, touch input and keyboard focus.
- Check layout at mobile, tablet and desktop widths before shipping.
