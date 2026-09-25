# Asset pipeline

```
assets/                         SOURCE (edit these)
  palettes/pd17.json            master 17-colour palette + der/die/das mapping
  palettes/themes.json          aconite / aquarium / violet theme colours
  sprites/src/sprites.mjs       pixel maps as text: one char = one pixel
  manifest.json                 external assets (fonts, CC0 audio, optional packs)
  manifest.lock.json            written by sync: sha256, license, author per file
scripts/
  build-sprites.mjs             sprites + atlas + contact sheet + procedural backgrounds
  sync-assets.mjs               downloads/validates external assets
public/assets/                  GENERATED (committed, served as-is)
  sprites/*.png, atlas.png, atlas.json, preview.html
  backgrounds/berlin-night.png, aquarium.png   (320×180)
  audio/*.mp3                   (after sync)
```

## Commands
```bash
npm run sprites          # rebuild all generated art
npm run sprites:check    # validate only (row widths, palette keys)
npm run assets:dry       # show sync status
npm run assets:search -- "rain on tin roof"   # find CC0 sounds on Freesound
npm run assets:sync      # download curated sounds, write manifest.lock.json
```
CI (`.github/workflows/assets.yml`) rebuilds sprites on every push and fails if `public/assets` is out of date.

## Adding a sprite
1. Add an entry to `assets/sprites/src/sprites.mjs`, using palette keys from `pd17.json` (`.` = transparent).
2. Multiple frames make an animation. Set `fps`. For UI panels, set `slice` (9-slice inset).
3. Run `npm run sprites`, then open `public/assets/sprites/preview.html` (hover over a sprite to see frame 2).
4. In the app, load sprites through `atlas.json`: `frames[key]` gives `{x,y,w,h}`, and `sprites[name]` gives `{frames, tags, fps, slice}`.

**Drawing in Aseprite instead:** export with the `pd17` palette and use an indexed PNG. A future `scripts/png-to-map.mjs` will convert PNGs back into text maps so everything stays diff-able.

## Starter set (M0)
| Group | Sprites |
|---|---|
| UI | heart, cursor, speaker, play, pause, btn_close/min/max, panel_aconite/violet/dialog/aqua (9-slice) |
| Board & widgets | pin, pencil, sticky_note, clock, music_note, book, mug (steam anim), coin, sparkle (anim) |
| Ambience | fire (anim, also the streak flame), tree, raindrop |
| Germany 🇩🇪 | pretzel, dachshund *Brezel* (tail wag), flag_de |
| Vietnam 🇻🇳 | non_la (conical hat), xe_may (motorbike), flag_vn |
| Board tools (M2, 12×12) | tool_hand, tool_eraser, tool_highlighter, tool_rect, tool_ellipse, tool_arrow, tool_text, tool_image, tool_undo, tool_redo (mirrored), tool_trash, tool_download |
| Backgrounds | berlin-night (Fernsehturm skyline), aquarium (inspired by reference 1) |

## Sound
- **Procedural (in-app Web Audio, no files):** white/pink/brown noise, rain, wind, fire, ocean, clock tick, typewriter.
- **Recorded (CC0 only, via Freesound):** 12 slots in `manifest.json`, in the groups nature, city, germany and vietnam. Each starts uncurated (`freesound: null`). Curate a slot by running `assets:search`, listening on freesound.org, then pasting the id. Target size ≤ 1 MB per loop.

## Licensing rules
- Only **CC0** (or our own) art and audio go in the repo. The sync script re-checks the license on every download.
- Fonts are **OFL**, installed through `@fontsource/*` (self-hosted).
- The reference images used for the design mood board are **not** committed. They are someone else's art.
- User uploads (stickers, backgrounds) stay in the user's own browser (IndexedDB) and are never uploaded unless cloud sync is turned on.
