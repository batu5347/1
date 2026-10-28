# Deutschland – 24 Stunden ohne Strom (TikTok-Kurzdoku, Remotion)

Vertikales Kurzvideo (1080 × 1920, 30 fps, **61 s = 1830 Frames**, H.264/AAC) zur Frage:
„Was würde passieren, wenn Deutschland plötzlich 24 Stunden lang keinen Strom hätte?“

**Fertiges Video:** [`out/deutschland_24h_ohne_strom.mp4`](out/deutschland_24h_ohne_strom.mp4)

| Datei | Inhalt |
|---|---|
| `voiceover_script.txt` | Sprechertext mit gemessenen Zeiten und Sprechtempo je Szene |
| `storyboard.md` | Schnittplan aller 24 Einstellungen mit Timecodes, Ton-Konzept |
| `src/` | Remotion-Projekt (React + TypeScript) |
| `scripts/` | Erzeugung von Stimme, Untertitel-Timings, Soundtrack, Kartendaten, Vorschau |
| `public/audio/` | `voiceover.wav`, `soundtrack.wav`, `mix.wav` (im Video verwendet) |

Alle Bilder sind **illustrative Rekonstruktionen**, prozedural mit React/SVG/Canvas erzeugt und im Video
durchgehend als „SZENARIO · ILLUSTRATIVE REKONSTRUKTION“ gekennzeichnet. Es gibt keine Fremd-Videos, -Fotos
oder -Musik.

## Erneut rendern

Voraussetzungen: Node.js ≥ 18, Python ≥ 3.10, ffmpeg (mit `rubberband`-Filter).

```bash
npm install
pip install piper-tts onnx scipy numpy

# 1) Kartendaten (nur nötig, wenn build-map.mjs geändert wurde)
npm run build:map

# 2) Stimme + Untertitel-Timings + Soundtrack + Mix (nur bei Textänderungen nötig)
npm run build:audio

# 3) Video rendern -> out/deutschland_24h_ohne_strom.mp4
npm run render
```

Ohne Internetzugang kann Remotion seinen Chrome Headless Shell nicht herunterladen. Dann einen vorhandenen
angeben:

```bash
REMOTION_BROWSER=/pfad/zu/chrome-headless-shell npm run render
```

Weitere Befehle:

- `npm run studio` – Remotion Studio zur interaktiven Vorschau
- `npm run typecheck` – TypeScript-Prüfung
- `node scripts/preview.mjs [frames…]` – Standbilder + Kontaktbogen nach `build/preview/`

## Wie es funktioniert

**Stimme (`scripts/generate_voiceover.py`).** Lokale TTS mit [Piper](https://github.com/rhasspy/piper),
Stimme „Thorsten“ (de_DE, Lizenz CC0; wird beim ersten Lauf von den Piper-GitHub-Releases nach `voices/`
geladen). Jeder Satz wird einzeln synthetisiert; Piper liefert pro Phonem die Anzahl erzeugter Samples. Daraus
werden Start/Ende **jedes Wortes in der tatsächlichen Aufnahme** berechnet (`src/data/voiceover.json`). Das
Skript prüft, ob jede Szene in ihr Zeitfenster passt, und bricht sonst ab. Danach: Pitch −1 Halbton, EQ,
Kompression, kleiner Raum (ffmpeg).

Text und Sprechtempo je Szene stehen in `scripts/vo_script.json`. Zahlen werden für die TTS ausgeschrieben
(„24“ → „vierundzwanzig“), in den Untertiteln aber als Ziffer gezeigt.

**Untertitel.** Max. 2 Zeilen, Umbrüche per dynamischer Programmierung bevorzugt an Sprechpausen. Das gerade
gesprochene Wort wird hervorgehoben, Schlüsselbegriffe sind farbig.

**Schnitt (`src/data/timeline.json`).** Szenengrenzen folgen dem Storyboard (0/4/12/21/31/41/53/61 s).
Schnitte innerhalb der Szenen und viele Animationen (Ampel geht aus bei „Ampeln“, Callouts, Checkliste im
Finale …) sind an **Wörter** der Sprachaufnahme gekoppelt. Wird die Stimme neu erzeugt, bleiben sie
automatisch synchron.

**Soundtrack (`scripts/generate_soundtrack.py`).** Rein synthetisch (NumPy/SciPy): Drone, Herzschlag-Puls,
Pings, Streicherfläche, Stadt-/Wind-Atmo, Blackout-Effekt, Whooshes, Uhr-Ticks, gedämpfte Sirenen. Die Musik wird
anhand der Stimmhüllkurve abgesenkt (Ducking); der Mix wird auf −14 LUFS normalisiert.

**Bild.** `src/shots/City.tsx` projiziert eine prozedurale Stadt (≈ 80 000 Lichtpunkte, Fernsehturm, Spree,
Verkehr) in 3D auf ein Canvas – für Hook, Weitwinkel und Rückkehr des Stroms. Die übrigen Einstellungen sind
SVG-Szenen (`Street.tsx`, `Interior.tsx`, `Facades.tsx`), die Karte nutzt Natural-Earth-Grenzen aus
`world-atlas` (Public Domain). Overlays (Zeitleiste, Uhr, Untertitel, Callouts, Korn, Vignette) liegen in
`src/components/`.

**TikTok-Sicherheitsabstände.** Wichtige Inhalte bleiben zwischen ca. 250 px oben und 430 px unten sowie
links von der Button-Leiste (`SAFE` in `src/theme.ts`).
