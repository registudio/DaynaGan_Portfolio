# Exporting project models for the exploded view

Each project's 3D viewer explodes its model part by part and shows notes when you hover a part.
For that to work, **every part that should move on its own must be a separate, named object** in
the exported file.

## Checklist

1. **Format:** export as `.glb` (binary glTF). Keep it under ~5 MB. Use Draco or Meshopt compression if your tool offers it.
2. **One object per part:** motor, frame, battery, lid and so on. If your tool merges everything
   into one mesh, split it before exporting.
3. **Name every part.** Use short, simple names with no spaces, such as `Motor_FL`, `Frame` or `Battery`.
   Repeated parts (four propellers, for example) can be grouped under one parent named `Props`.
4. **Assembled pose:** export the model fully assembled. The site moves the parts apart itself.
5. **Origin and scale:** any scale works (the site resizes the model to fit), but centre the
   model near the origin with the parts' pivots at their own centres.

### Blender

- Select a part → press `P` → *Separate by loose parts* (or *Selection*) to split a merged mesh.
- Rename each object in the Outliner (double-click).
- *File → Export → glTF 2.0*, format **glTF Binary (.glb)**.

### Google Flow / Claude Design / Astra

Export to GLB. Then open the file in <https://gltf-viewer.donmccurdy.com/> and check the scene
list shows one named object per part. If it shows one object, split it in Blender first.

## Hooking it up

1. Put the file at `public/models/projects/<slug>.glb`.
2. In `content/projects/<slug>.mdx`, set `model: /models/projects/<slug>.glb`.
3. For each entry in `parts`, set `node:` to the exact object name from the GLB and set `explode:` to
   the direction it should fly out, e.g. `[0, 0.8, 0]` for straight up. The `summary`, `did` and
   `learned` fields are what appear on hover.

Once `model` is set, the whole GLB is drawn and the placeholder shapes are no longer used. Parts
without a matching `node` stay still and have no hover notes. Until the GLB is ready, leave
`model` unset and the placeholder shapes are shown.
