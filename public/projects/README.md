# Project files

One folder per project, named after the project's `id` in `content/portfolio.md`.
Drop files in with these names and the site picks them up on the next build:

| File | Used for |
| --- | --- |
| `model.glb` (or `.gltf`, `.stl`, `.obj`) | The 3D viewer on the project stage and its case study page. Name objects in the export after the part ids for exploded view and hotspots. Keep under ~5 MB. Got a STEP file? Don't commit it: convert it with `scripts/cad/` (see the drone). |
| `report.pdf` | A "Read the report" button on the project and its case study. |
| `photos/*.jpg` (`.png`, `.webp`) | The photo gallery, in filename order (`01-…`, `02-…`). Around 1600 px wide is plenty. |

What a project *shows* is set by `media:` in `content/portfolio.md` (`cad`, `photos`,
`diagram` or `blueprint`). To add a project, add an entry there and a folder here.
Supplementary projects (`tier: supplementary`) appear under "More projects" with their own
case study page.
