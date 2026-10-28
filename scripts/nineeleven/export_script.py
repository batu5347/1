#!/usr/bin/env python3
"""Schreibt den Sprechertext mit gemessenen Zeiten nach deliverables/nineeleven/sprechertext.txt."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
cfg = json.loads((ROOT / "scripts/nineeleven/vo_script.json").read_text(encoding="utf-8"))
vo = json.loads((ROOT / "src/nineeleven/data/voiceover.json").read_text(encoding="utf-8"))
fmt = lambda s: f"{int(s // 60):02d}:{s % 60:05.2f}"

lines = [
    "POV: Du bist in New York am 11. September 2001",
    "Sprechertext (Deutsch) – 61 s, 8 Szenen",
    f"Aufnahme dieser Version: {vo['voice']}",
    "",
    "Regie: tief, ruhig, dokumentarisch, emotional kontrolliert. Pausen nach den Einschlägen bewusst stehen lassen.",
    "",
]
total = 0
for sc, meas in zip(cfg["scenes"], vo["scenes"]):
    n = sum(1 for w in vo["words"] if w["scene"] == sc["id"])
    total += n
    lines += [
        f"SZENE {sc['id'][1:]} – {sc['title'].upper()}  [Bild {fmt(sc['start'])}–{fmt(sc['end'])} | Stimme {fmt(meas['voStart'])}–{fmt(meas['voEnd'])} | {n} Wörter]",
        *[s.replace("_", " ") for s in sc["sentences"]],
        "",
    ]
lines += [f"Gesamt: {total} Wörter.", "", "Aussprache (für TTS ausgeschrieben):"]
lines += [f"  {k.replace('_', ' ')} -> {v}" for k, v in cfg["tts"].items()]
out = ROOT / "deliverables/nineeleven/sprechertext.txt"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"-> {out.relative_to(ROOT)}")
