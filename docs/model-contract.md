# Death Star tour model contract

The three supplied GLBs in `3D_models/` are the source assets. Keep them intact. Run `npm run models:prepare` to regenerate compressed runtime copies in `public/models/tour/`.

The station root is `battle_station`. Preparation centers it at the origin with a radius of three world units. These source groups are preserved in both the outline and solid models:

| Source group | Portfolio destination |
| --- | --- |
| 01_hypermatter_reactor | About me |
| 02_imperial_academy_records | Education |
| 03_sector_archives | Blog |
| 04_hangar_bays | Work experience |
| 05_deflector_shields | Skills & awards |
| 06_equatorial_trench | Work experience |
| 07_turbolaser_batteries | Skills & awards |
| 08_superlaser | Projects |
| 09_overbridge | GitHub |
| 10_tractor_beam_emitters | Contact me |
| 11_comlink_array | Contact me |

`lib/tour.ts` defines mappings, camera poses, interaction anchors, clockwise laser positions and their shared focus. `components/tour/room-models.ts` adds batched interior sets and real content on terminal textures. The supplied cockpit follows the camera during the scroll-controlled combat sequence.

The blueprint retains source line geometry, rotates about X and pauses when selected. During the first section it fades as the solid model appears in the same orientation and the construction sheet fades to space. Desktop and mobile use separate compressed solid models. Runtime assets use Meshopt with a locally bundled decoder.

Pop-ups follow projected model anchors and stay within the viewport. Keyboard focus and touch taps expose the same records as hover. The reading dialog contains server-rendered Markdown and remains available if WebGL fails. Reduced motion disables automatic rotation, camera interpolation and flying bolts.

`public/models/tour/manifest.json` records sizes and retained node names. Legacy assets under `public/models/station/` are not used by the tour.

Interior surfaces use locally generated roughness and bump maps, beveled geometry and a generated reflection environment. A single shadow-casting practical light follows the active room; its shadow map is reduced on mobile. Materials, textures and reflection targets are disposed when their scene unmounts.

The four interactive hangars are small openings aligned with the equatorial trench at Y = -0.025. Their positions and pop-up anchors share `hangarPositions` in `lib/tour.ts`; keep these together when changing the close trench camera.
