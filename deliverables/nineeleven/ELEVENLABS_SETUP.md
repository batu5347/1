# ElevenLabs einrichten (finale Erzählstimme)

Das Video ist für eine deutsche ElevenLabs-Stimme gebaut. Die Pipeline liest die
Zugangsdaten **ausschließlich aus Umgebungsvariablen** – nichts wird im Code
gespeichert oder geloggt.

## Benötigte Umgebungsvariablen

| Variable | Pflicht | Inhalt |
|---|---|---|
| `ELEVENLABS_API_KEY` | ja | API-Schlüssel (elevenlabs.io → Profil → *API Keys*) |
| `ELEVENLABS_VOICE_ID` | ja | ID der gewählten Stimme (Voice Library → Stimme → *ID kopieren*) |
| `ELEVENLABS_MODEL_ID` | nein | Standard: `eleven_multilingual_v2` (aus `scripts/nineeleven/vo_script.json`) |
| `REMOTION_BROWSER` | nein | Pfad zu einem vorhandenen Chrome Headless Shell, falls Remotion keinen herunterladen kann |

## Stimme wählen

In der Voice Library nach **Deutsch**, **männlich**, Anwendungsfall
*Narrative / Informative* filtern und eine tiefe, ruhige Dokumentar-Stimme
wählen (keine Trailer-Stimme). Stimm-Einstellungen sind in
`scripts/nineeleven/vo_script.json` → `voice.elevenlabsSettings` hinterlegt
(Stability 0.62, Similarity 0.8, Style 0.18, Speed 0.96).

## Ablauf

```bash
export ELEVENLABS_API_KEY="…"      # nicht in Dateien committen
export ELEVENLABS_VOICE_ID="…"

npm run voice:911    # Stimme je Satz über /v1/text-to-speech/{voice_id}/with-timestamps
                     # -> public/nineeleven/audio/voiceover.wav
                     # -> src/nineeleven/data/voiceover.json (Wort-Zeitstempel)
                     # -> deliverables/nineeleven/untertitel.srt / .vtt
npm run audio:911    # Soundtrack + Mix (Ducking, -14 LUFS) -> public/nineeleven/audio/mix.wav
python3 scripts/nineeleven/export_script.py   # Sprechertext mit gemessenen Zeiten
npm run render:911   # -> out/nineeleven_pov_11_september_2001.mp4
```

Das Skript prüft, ob jede Szene in ihr Zeitfenster passt, und bricht sonst ab.
Dann in `vo_script.json` bei der betroffenen Szene `lead` verkleinern, den Satz
kürzen oder `voice.elevenlabsSettings.speed` leicht erhöhen.

Schnitte, Einschlag-/Einsturz-Zeitpunkte, Untertitel und Sounddesign sind an die
Wörter der Aufnahme gekoppelt und bleiben nach einem Stimmwechsel automatisch
synchron.

Fehlen die Variablen, bricht `npm run voice:911` mit einer Meldung ab. Eine
Ersatzstimme wird nur verwendet, wenn man sie ausdrücklich anfordert
(`npm run voice:911:preview`, lokale Piper-Stimme „Thorsten“, CC0); das wird
dann in `voiceover.json` als Vorschau vermerkt.
