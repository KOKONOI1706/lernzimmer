# ♥ Lernzimmer

<p align="center">
  <img src="public/assets/backgrounds/berlin-night.png" width="640" style="image-rendering: pixelated" alt="Berlin night pixel background">
</p>

**A cozy pixel study room for learning German.** Decorate your own room: a whiteboard, stickers, pins, a clock,
YouTube/Spotify, rain and fireplace sounds, Hanoi street noise. Then study inside it with spaced-repetition flashcards,
der/die/das games, and Brezel the dachshund cheering you on.

> Status: **M5 — arcade:** Artikel-Regen, Memory, Zahlen-Sprint and the clock quiz, fed by your flashcards. **M4 — flashcards:** Spaced-repetition decks (FSRS) with der/die/das practice, a typing mode, 240 built-in A1 cards and note → card from the board. Before that, **M3 — widgets & sound:** A pixel whiteboard room (M2) with a study toolkit: German-speaking clock + time quiz, Pomodoro timer, music player (YouTube/Spotify/SoundCloud/MP3), rain/fire/wind mixer, word of the day and a to-do list. vi/en/de UI, 3 themes, everything saved locally.

- 📐 [System design](docs/DESIGN.md): vision, UI language, features, architecture, data model, roadmap
- 🎨 [Asset pipeline](docs/ASSETS.md): sprites, palettes, backgrounds, CC0 audio sync
- 📅 [Google Calendar sync](docs/GOOGLE_CALENDAR.md): optional, set up with your own OAuth client ID

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
