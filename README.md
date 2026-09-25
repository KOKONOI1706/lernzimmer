# ♥ Lernzimmer

<p align="center">
  <img src="public/assets/backgrounds/berlin-night.png" width="640" style="image-rendering: pixelated" alt="Berlin night pixel background">
</p>

**A cozy pixel study room for learning German.** Decorate your own room: a whiteboard, stickers, pins, a clock,
YouTube/Spotify, rain and fireplace sounds, Hanoi street noise. Then study inside it with spaced-repetition flashcards,
der/die/das games, and Brezel the dachshund cheering you on.

> Status: **M2 — whiteboard.** Your room is a pixel whiteboard: draw, write, sticky notes, stickers from your own photos, pins, undo/redo, zoom, PNG export. Plus the M1 shell: windows, start menu, 3 themes, vi/en/de UI, local autosave.

- 📐 [System design](docs/DESIGN.md): vision, UI language, features, architecture, data model, roadmap
- 🎨 [Asset pipeline](docs/ASSETS.md): sprites, palettes, backgrounds, CC0 audio sync

## Quick start
```bash
npm install
npm run dev            # http://localhost:5317
npm test               # unit tests
npm run build          # typecheck + production build
npm run sprites        # rebuild sprites, atlas and backgrounds into public/assets
```
Open `public/assets/sprites/preview.html` to browse the sprite set.

## Planned stack
Vite · React · TypeScript · Zustand · react-konva · Dexie (IndexedDB) · ts-fsrs · Web Audio · PWA
