# ♥ Lernzimmer

<p align="center">
  <img src="public/assets/backgrounds/berlin-night.png" width="640" style="image-rendering: pixelated" alt="Berlin night pixel background">
</p>

**A cozy pixel study room for learning German.** Decorate your own room: a whiteboard, stickers, pins, a clock,
YouTube/Spotify, rain and fireplace sounds, Hanoi street noise. Then study inside it with spaced-repetition flashcards,
der/die/das games, and Brezel the dachshund cheering you on.

> Status: **M0 — design & asset pipeline.** The app itself starts in M1.

- 📐 [System design](docs/DESIGN.md): vision, UI language, features, architecture, data model, roadmap
- 🎨 [Asset pipeline](docs/ASSETS.md): sprites, palettes, backgrounds, CC0 audio sync

## Quick start (assets)
```bash
npm run sprites        # build sprites, atlas and backgrounds into public/assets
npm run assets:dry     # check external asset status
```
Open `public/assets/sprites/preview.html` to browse the sprite set.

## Planned stack
Vite · React · TypeScript · Zustand · react-konva · Dexie (IndexedDB) · ts-fsrs · Web Audio · i18next (vi/en/de) · PWA
