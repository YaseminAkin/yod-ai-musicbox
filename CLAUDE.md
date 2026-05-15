# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MUSICBOX by YOD-AI — web app that converts sheet music images (or PDFs) into playable MIDI with visual notation. Upload → OMR → MusicXML → MIDI → interactive piano playback.

## Development Commands

**Server** (Python, port 3000):
```bash
cd server
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt   # includes homr from PyPI
python3 app.py
```

**Frontend** (Node, port 5173):
```bash
cd Front/vite-project
npm install
npm run dev
```

```bash
# Lint
cd Front/vite-project && npm run lint

# Production build
cd Front/vite-project && npm run build
```

> **Docker does not work** — `homr` fails in containerized environments. Always run locally.

## Architecture

### Data Flow
```
User uploads image/PDF
  → Flask preprocesses with OpenCV (grayscale, threshold, perspective transform, sharpen)
  → homr CLI converts processed image to MusicXML (outputs {stem}.musicxml next to input)
  → music21 converts MusicXML → MIDI
  → relative paths returned to frontend as {musicxml, midi}
  → frontend fetches files via /download/<path:filename>
  → VexFlow renders MusicXML notation
  → Tone.js Sampler plays MIDI with note-roll animation
```

### Backend (`server/app.py`)
Single Flask file, no blueprints. All routes in one module:
- `POST /process-images` — accepts multipart upload (PNG/JPG, max 20 MB), runs full pipeline
- `POST /process-pdf` — extracts pages via pdf2image (max 10 pages), then same pipeline
- `GET /download/<path:filename>` — serves files from `/tmp/musicbox/`
- `POST /delete-user-files` — removes `/tmp/musicbox/{user_id}/` directory

**Session/file management**: Each browser session gets a UUID (`session['user_id']`). Generated files are stored in `/tmp/musicbox/{user_id}/`. Startup cleans up old sessions. 3-minute timeout per request. Cleanup is triggered on page unload and when navigating back to home.

### Frontend (`Front/vite-project/src/`)
React 18 + Vite + Tailwind. Two routes:
- `/` → `create-new-musicbox-page.jsx` — file upload, interactive piano while processing
- `/musicbox` → `musicbox-page.jsx` — notation display, MIDI playback, piano roll animation

State is passed between routes via React Router's `location.state` (not a store). The `data` object `{musicxml, midi}` is the only inter-route payload.

`MusicNotation.jsx` — parses MusicXML via `xml-js`, renders grand staff (treble + bass) with VexFlow. Dynamic measure layout with `ResizeObserver` (responsive width). Handles chords, beams, accidentals, rests. Uses `setStrict(false)` on voices to tolerate OMR imperfections. Accepts `activeMeasure` prop for playback highlight.

**Tone.js playback**: Uses `Tone.Sampler` with Salamander piano samples loaded from `tonejs.github.io`. Sound profile (Piano/Synth) can be switched; switching re-initializes the sampler. Note scheduling uses `Tone.Transport` with 50ms polling for piano roll animation sync.

**Keyboard playback**: Both pages support keyboard-triggered notes via hardcoded `keyMap` objects (different octave ranges per page).

## Key Dependencies

| Dep | Purpose |
|-----|---------|
| `homr` | OMR: image → MusicXML (install from PyPI: `pip install homr`) |
| `music21` | MusicXML → MIDI conversion |
| `opencv-python-headless` | Image preprocessing |
| `pdf2image` | PDF page extraction |
| `Tone.js` + `@tonejs/midi` | Audio synthesis and MIDI parsing |
| `VexFlow` | Music notation rendering (SVG) |
| `react-piano` | Interactive piano keyboard component |
| `xml-js` | MusicXML → JSON for VexFlow parsing |
