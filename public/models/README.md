# Project CAD models

Drop a CAD export here named after the project id in `content/portfolio.md`, e.g.

    drone.glb   robot-claw.stl   air-quality-sensor.obj

Supported: `.glb` / `.gltf` (best), `.stl`, `.obj`. The site fits and centres the model
automatically. For the exploded view and hotspots, name each object in the export after the
matching part id (e.g. `props`, `motors`, `frame` for the drone). Without named parts, a GLB/OBJ
explodes by its top-level objects; a single-mesh STL just rotates.

Keep files under ~5 MB (use Draco/Meshopt compression for GLB). Until a file exists, the project
shows its wireframe blueprint.
