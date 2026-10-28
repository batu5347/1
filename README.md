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

---

# POV: Du bist in New York am 11. September 2001 (Remotion + Three.js)

Zweite Komposition im selben Projekt: `NineEleven` – vertikal 1080 × 1920, 30 fps, **exakt 61 s = 1830 Frames**.
Fiktionalisierte, stilisierte POV-Rekonstruktion im Low-Poly-3D-Stil (React Three Fiber via `@remotion/three`).

**Fertiges Video:** [`out/nineeleven_pov_11_september_2001.mp4`](out/nineeleven_pov_11_september_2001.mp4)

| Datei | Inhalt |
|---|---|
| `deliverables/nineeleven/sprechertext.txt` | Sprechertext je Szene mit gemessenen Zeiten |
| `deliverables/nineeleven/untertitel.srt` / `.vtt` | Untertitel (wortgenau aus der Aufnahme) |
| `deliverables/nineeleven/kontaktbogen.jpg` | Kontaktbogen der 8 Szenen |
| `deliverables/nineeleven/ELEVENLABS_SETUP.md` | ElevenLabs-Einrichtung + Umgebungsvariablen |
| `src/nineeleven/` | Komposition, Kamera, Zeitplan, 3D-Welt (`world/`), Text-Ebene (`components/`) |
| `scripts/nineeleven/` | Stimme, Soundtrack, Vorschau/Kontaktbogen |

## Historische Zeitpunkte (im Video gekennzeichnet)

| Uhrzeit | Ereignis | Video |
|---|---|---|
| 08:46 | American Airlines Flug 11 trifft den Nordturm (Nordfassade, Etagen 93–99) | Szene 3 |
| 09:03 | United Airlines Flug 175 trifft den Südturm (Südfassade, Etagen 77–85) | Szene 5 |
| 09:59 | Einsturz des Südturms | Szene 6 |
| 10:28 | Einsturz des Nordturms | Szene 7 |

Die Einschläge/Einstürze sind an die gesprochenen Wörter gekoppelt (`src/nineeleven/timeline.ts`), die
eingeblendete Uhr läuft stückweise linear zwischen diesen Zeitpunkten. Keine Verletzten, keine Opfer, keine
Darstellung von Menschen in den Gebäuden; keine erfundenen Zitate oder Augenzeugenberichte. Der Hinweis
„Fiktionalisierte POV-Rekonstruktion“ wird zu Beginn eingeblendet, eine kleine Kennzeichnung bleibt stehen.

## Rendern

```bash
npm install
pip install numpy scipy            # Soundtrack
# Stimme: ElevenLabs (siehe deliverables/nineeleven/ELEVENLABS_SETUP.md)
npm run voice:911                  # oder ausdrücklich: npm run voice:911:preview (Piper-Vorschau)
npm run audio:911
npm run render:911                 # -> out/nineeleven_pov_11_september_2001.mp4
npm run preview:911                # Kontaktbogen -> deliverables/nineeleven/kontaktbogen.jpg
```

Ohne GPU rendert Chrome per SwiftShader (`--gl=swangle`, ca. 3–8 s pro Frame). Ohne Internet einen
vorhandenen Headless-Chrome angeben: `REMOTION_BROWSER=/pfad/zu/chrome-headless-shell npm run render:911`.

## Aufbau

- **Welt** (`src/nineeleven/world/`): Twin Towers mit Fassadentextur (59 Stützen je Seite, Technikgeschosse,
  Lobby-Bögen, Antenne), West Broadway in Tribeca mit Querstraßen, Gehwegen, Ampeln (WALK/DONT WALK),
  grünen Straßenschildern, Markisen, Feuerleitern, Wassertürmen, Telefonzellen; Lower Manhattan auf gedrehtem
  Straßenraster, 7 WTC, World Financial Center, Hudson, Jersey City. Alles prozedural (keine externen Modelle).
- **Figuren/Fahrzeuge**: 300 instanzierte Low-Poly-Menschen (gehen, bleiben stehen, schauen nach oben,
  verlassen das Viertel), gelbe Taxis, Busse, Löschfahrzeuge und Streifenwagen mit Blinklicht.
- **Partikel** (`effects.ts`, `Billboards.tsx`): deterministische Rauchfahnen (Wind nach Südosten),
  Feuerbälle, Staubfront und -wolke der Einstürze, Staubwalze in der Straße, fallendes Papier.
- **Farbdramaturgie** (`grade.ts`): warmer Morgen → kühler, staubiger, entsättigter Tag.
- **Ton** (`scripts/nineeleven/generate_soundtrack.py`): komplett synthetisch – Stadt-Atmo, Taxi-Vorbeifahrt,
  Hupen, Klavier-Motiv, Abbruch der Musik vor dem Einschlag, tiefe Impulse, Stimmengewirr, Sirenen,
  Einsturz-Grollen, gedämpfte Stille, Ducking unter der Stimme, Mix auf −14 LUFS.

## Status dieser Version

- Gerendert und geprüft: 1080 × 1920, H.264 High + AAC 48 kHz Stereo, **1830 Videoframes = 61,0 s**, keine
  schwarzen Abschnitte, −14,3 LUFS, Spitze −1,5 dBFS (`bash scripts/qc.sh out/nineeleven_pov_11_september_2001.mp4`).
- **Stimme:** In dieser Umgebung waren keine ElevenLabs-Zugangsdaten gesetzt (und `api.elevenlabs.io` war
  vom Netzwerk-Proxy gesperrt). Die Tonspur nutzt deshalb ausdrücklich die lokale **Vorschau-Stimme** (Piper
  „Thorsten“). Für die finale Fassung `ELEVENLABS_API_KEY` und `ELEVENLABS_VOICE_ID` setzen und
  `npm run voice:911 && npm run audio:911 && npm run render:911` ausführen.
