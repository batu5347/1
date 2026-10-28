#!/usr/bin/env python3
"""Sprecherspur + wortgenaue Untertitel für „POV: Du bist in New York am 11. September 2001“.

Stimme (Auswahl über --engine):
  elevenlabs (Standard)  ElevenLabs Text-to-Speech, offizielle REST-API
                         POST /v1/text-to-speech/{voice_id}/with-timestamps
                         Zugangsdaten NUR aus Umgebungsvariablen:
                           ELEVENLABS_API_KEY   (Pflicht)
                           ELEVENLABS_VOICE_ID  (Pflicht)
                           ELEVENLABS_MODEL_ID  (optional, Standard aus vo_script.json)
                         Fehlt etwas, bricht das Skript mit einer klaren Meldung ab –
                         es wird NICHT stillschweigend eine andere Stimme verwendet.
  piper                  Lokale Vorschau-Stimme (Piper „Thorsten“, CC0). Nur wenn
                         ausdrücklich gewählt; das Ergebnis wird in voiceover.json
                         und im Video als Vorschau-Stimme gekennzeichnet.

Jeder Satz wird einzeln synthetisiert und an seine Position im 61-s-Raster gelegt.
ElevenLabs liefert Zeichen-Zeitstempel, Piper Phonem-Längen; daraus werden Start/Ende
jedes Wortes in der tatsächlichen Aufnahme berechnet.

Ergebnis:
  public/nineeleven/audio/voiceover.wav   (61 s, 48 kHz)
  src/nineeleven/data/voiceover.json      (Szenen, Wörter, Untertitel-Cues)
  deliverables/nineeleven/untertitel.srt  (+ .vtt)
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import subprocess
import sys
import tarfile
import urllib.error
import urllib.request
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "scripts" / "nineeleven" / "vo_script.json"
BUILD = ROOT / "build" / "nineeleven"
OUT_WAV = ROOT / "public" / "nineeleven" / "audio" / "voiceover.wav"
OUT_JSON = ROOT / "src" / "nineeleven" / "data" / "voiceover.json"
OUT_SUBS = ROOT / "deliverables" / "nineeleven"
VOICE_DIR = ROOT / "voices" / "voice-de-thorsten-low"
VOICE_MODEL = VOICE_DIR / "de-thorsten-low.onnx"
VOICE_URL = "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-de-thorsten-low.tar.gz"
SR = 48000
MAX_CUE_CHARS = 34


# --------------------------------------------------------------------------- Text

def display_tokens(sentence: str) -> list[str]:
    """Anzeige-Tokens (nur an echten Leerzeichen getrennt; '–' hängt am Vorwort)."""
    out: list[str] = []
    for tok in sentence.split(" "):
        if not tok:
            continue
        if re.search(r"\w", tok) or not out:
            out.append(tok)
        else:
            out[-1] += " " + tok
    return out


def tts_words(token: str, cfg: dict, engine: str) -> list[str]:
    """Gesprochene Wörter für ein Anzeige-Token (Zahlen ausgeschrieben)."""
    parts = token.split(" ")  # z. B. "Arbeit –"
    head, tail = parts[0], parts[1:]
    spoken = cfg["tts"].get(head, head)
    if engine == "piper":
        spoken = " ".join(cfg["piperTts"].get(w, w) for w in spoken.split(" "))
    spoken = spoken.replace("_", " ")
    words = spoken.split(" ")
    if tail:
        words[-1] += "," if engine == "piper" else " " + " ".join(tail)
    return words


def show(token: str) -> str:
    return token.replace("_", " ")


# --------------------------------------------------------------------------- ElevenLabs

def elevenlabs_env() -> tuple[str, str, str | None]:
    key = os.environ.get("ELEVENLABS_API_KEY", "").strip()
    voice = os.environ.get("ELEVENLABS_VOICE_ID", "").strip()
    missing = [n for n, v in (("ELEVENLABS_API_KEY", key), ("ELEVENLABS_VOICE_ID", voice)) if not v]
    if missing:
        sys.exit(
            "ElevenLabs-Zugangsdaten fehlen: " + ", ".join(missing) + "\n"
            "Bitte als Umgebungsvariablen setzen (siehe deliverables/nineeleven/ELEVENLABS_SETUP.md).\n"
            "Eine Ersatzstimme wird nicht automatisch verwendet. Für eine reine Vorschau ausdrücklich\n"
            "  python3 scripts/nineeleven/generate_voiceover.py --engine piper\n"
            "aufrufen."
        )
    return key, voice, os.environ.get("ELEVENLABS_MODEL_ID") or None


def synth_elevenlabs(words: list[str], cfg: dict, prev_text: str, next_text: str):
    key, voice, model = elevenlabs_env()
    text = " ".join(words)
    body = {
        "text": text,
        "model_id": model or cfg["voice"]["elevenlabsModel"],
        "language_code": "de",
        "voice_settings": cfg["voice"]["elevenlabsSettings"],
        "previous_text": prev_text or None,
        "next_text": next_text or None,
    }
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format=pcm_44100",
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "Content-Type": "application/json", "Accept": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            res = json.loads(r.read())
    except urllib.error.HTTPError as e:  # Schlüssel nie ausgeben, nur Status + Fehlertext der API
        sys.exit(f"ElevenLabs-API-Fehler {e.code}: {e.read().decode(errors='replace')[:400]}")
    except urllib.error.URLError as e:
        sys.exit(f"ElevenLabs-API nicht erreichbar: {e.reason}")
    pcm = np.frombuffer(base64.b64decode(res["audio_base64"]), dtype="<i2").astype(np.float32) / 32768
    al = res.get("normalized_alignment") or res["alignment"]
    chars, starts, ends = al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]
    aligned = "".join(chars)
    # Wortgrenzen im (ggf. normalisierten) Text suchen – Wörter stehen in gleicher Reihenfolge.
    times, pos = [], 0
    for w in words:
        core = re.sub(r"[^\w]", "", w)
        idx = aligned.find(core[:4], pos) if core else -1
        if idx < 0:
            idx = pos
        end = min(len(chars) - 1, idx + max(1, len(core)) - 1)
        times.append((starts[idx], ends[end]))
        pos = end + 1
    return pcm, 44100, times


# --------------------------------------------------------------------------- Piper (Vorschau)

def load_piper():
    from piper import PiperVoice  # noqa: lazy, nur für die Vorschau-Stimme nötig

    if not VOICE_MODEL.exists():
        VOICE_DIR.parent.mkdir(parents=True, exist_ok=True)
        archive = VOICE_DIR.parent / "voice-de-thorsten-low.tar.gz"
        print(f"Lade Vorschau-Stimme: {VOICE_URL}")
        urllib.request.urlretrieve(VOICE_URL, archive)
        VOICE_DIR.mkdir(exist_ok=True)
        with tarfile.open(archive) as tar:
            tar.extractall(VOICE_DIR, filter="data")
    marker = VOICE_DIR / ".alignment-patched"
    if not marker.exists():  # Modell um Phonem-Längen-Ausgabe erweitern (benötigt Paket "onnx")
        subprocess.run([sys.executable, "-m", "piper.patch_voice_with_alignment", str(VOICE_MODEL)], check=True)
        marker.touch()
    voice = PiperVoice.load(VOICE_MODEL, include_alignments=True)
    original = voice.phonemize

    def phonemize(text: str):  # espeak zerlegt "ç" teils in "c" + Cedille
        fixed = []
        for sentence in original(text):
            out: list[str] = []
            for p in sentence:
                if p == "̧" and out and out[-1] == "c":
                    out[-1] = "ç"
                else:
                    out.append(p)
            fixed.append(out)
        return fixed

    voice.phonemize = phonemize
    return voice


def synth_piper(voice, words: list[str], length_scale: float):
    from piper.config import SynthesisConfig

    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=0.55, noise_w_scale=0.6)
    chunks = list(voice.synthesize(" ".join(words), cfg, include_alignments=True))
    if len(chunks) != 1:
        raise RuntimeError(f"Erwartet genau einen Satz: {' '.join(words)}")
    chunk = chunks[0]
    sr = chunk.sample_rate
    spans, cursor, cs, ce = [], 0, None, None
    for al in chunk.phoneme_alignments:
        p, s, e = al.phoneme, cursor, cursor + al.num_samples
        cursor = e
        if p == " ":
            if cs is not None:
                spans.append((cs / sr, ce / sr))
            cs = ce = None
        elif p in ("^", "$", "_") or re.fullmatch(r"[,.;:!?\-–—…\"']", p):
            continue
        elif p in ("ˈ", "ˌ", "ː"):
            if cs is not None:
                ce = e
        else:
            cs = s if cs is None else cs
            ce = e
    if cs is not None:
        spans.append((cs / sr, ce / sr))
    if len(spans) != len(words):
        raise RuntimeError(f"Wortanzahl passt nicht ({len(spans)} vs {len(words)}): {' '.join(words)}")
    return chunk.audio_float_array.astype(np.float32), sr, spans


# --------------------------------------------------------------------------- Gemeinsam

def trim(audio: np.ndarray, sr: int, spans):
    env = np.convolve(np.abs(audio), np.ones(160) / 160, mode="same")
    voiced = np.nonzero(env > 0.02 * env.max())[0]
    pad = int(0.05 * sr)
    a0, a1 = max(0, int(voiced[0]) - pad), min(len(audio), int(voiced[-1]) + pad)
    audio = audio[a0:a1].copy()
    fade = min(int(0.015 * sr), len(audio) // 4)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    off, dur = a0 / sr, len(audio) / sr
    return audio, [(max(0.0, s - off), min(dur, e - off)) for s, e in spans]


def resample(audio: np.ndarray, sr: int) -> np.ndarray:
    if sr == SR:
        return audio
    x = np.arange(int(len(audio) * SR / sr)) * sr / SR
    return np.interp(x, np.arange(len(audio)), audio).astype(np.float32)


WEAK = {"von", "und", "die", "der", "das", "den", "ein", "eine", "in", "im", "zur", "auf", "des", "ist", "es",
        "um", "nach", "zu", "an", "ihr", "auch", "fast", "sich", "wird", "nicht", "was", "dem"}


def build_cues(words: list[dict]) -> list[list[int]]:
    """Satz -> Untertitel-Blöcke (max. 2 Zeilen), Umbrüche bevorzugt an Pausen."""
    n = len(words)

    def cost(i: int, j: int) -> float:
        text = " ".join(w["text"] for w in words[i:j])
        if len(text) > MAX_CUE_CHARS and j - i > 1:
            return 1e9
        last = words[j - 1]["text"]
        c = (len(text) - 24) ** 2 * 0.05
        if j < n:
            if re.search(r"[,.:;–]$", last):
                c -= 14
            elif re.sub(r"\W", "", last).lower() in WEAK:
                c += 30
        if len(text) < 10:
            c += 18
        return c + 10

    best, back = [0.0] + [float("inf")] * n, [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(max(0, j - 8), j):
            v = best[i] + cost(i, j)
            if v < best[j]:
                best[j], back[j] = v, i
    cues, j = [], n
    while j > 0:
        cues.append(list(range(back[j], j)))
        j = back[j]
    return cues[::-1]


def srt_time(t: float, sep: str = ",") -> str:
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d}{sep}{ms % 1000:03d}"


def write_subtitles(cues: list[dict]) -> None:
    OUT_SUBS.mkdir(parents=True, exist_ok=True)
    srt, vtt = [], ["WEBVTT", ""]
    for i, c in enumerate(cues, 1):
        text = c["text"].replace(" ", " ")
        srt += [str(i), f"{srt_time(c['start'])} --> {srt_time(c['end'])}", text, ""]
        vtt += [f"{srt_time(c['start'], '.')} --> {srt_time(c['end'], '.')}", text, ""]
    (OUT_SUBS / "untertitel.srt").write_text("\n".join(srt), encoding="utf-8")
    (OUT_SUBS / "untertitel.vtt").write_text("\n".join(vtt), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["elevenlabs", "piper"], default="elevenlabs")
    args = ap.parse_args()

    cfg = json.loads(SCRIPT.read_text(encoding="utf-8"))
    total_s = cfg["totalFrames"] / cfg["fps"]
    keywords = set(cfg["keywords"])
    if args.engine == "elevenlabs":
        elevenlabs_env()  # früh abbrechen, bevor irgendetwas geschrieben wird
        voice_label = f"ElevenLabs ({os.environ.get('ELEVENLABS_MODEL_ID') or cfg['voice']['elevenlabsModel']})"
        piper = None
    else:
        piper = load_piper()
        voice_label = "VORSCHAU: Piper „Thorsten“ (lokal, CC0) – nicht die finale ElevenLabs-Stimme"
        print("ACHTUNG: Vorschau-Stimme (Piper) – für das finale Video ElevenLabs verwenden.")

    all_sentences = [s for sc in cfg["scenes"] for s in sc["sentences"]]
    timeline = np.zeros(int(total_s * SR), dtype=np.float32)
    scenes_out, all_words, cues_out = [], [], []
    prev_end, ok, k = 0.0, True, 0
    for scene in cfg["scenes"]:
        t = max(scene["start"] + scene["lead"], prev_end + cfg["sceneGap"])
        scene_start = t
        for si, sentence in enumerate(scene["sentences"]):
            disp = display_tokens(sentence)
            groups = [tts_words(tok, cfg, args.engine) for tok in disp]
            flat = [w for g in groups for w in g]
            if piper is not None:
                audio, sr, spans = synth_piper(piper, flat, scene["lengthScale"])
            else:
                prev_txt = all_sentences[k - 1] if k else ""
                next_txt = all_sentences[k + 1] if k + 1 < len(all_sentences) else ""
                audio, sr, spans = synth_elevenlabs(flat, cfg, prev_txt, next_txt)
            k += 1
            audio, spans = trim(audio, sr, spans)
            audio = resample(audio, sr)
            rms = float(np.sqrt(np.mean(audio**2))) or 1.0
            audio *= min(0.15 / rms, 1.0)
            i0 = int(round(t * SR))
            seg = audio[: max(0, len(timeline) - i0)]
            timeline[i0 : i0 + len(seg)] += seg
            sw, idx = [], 0
            for tok, g in zip(disp, groups):
                s0, e0 = spans[idx][0], spans[idx + len(g) - 1][1]
                idx += len(g)
                sw.append({"text": show(tok), "start": round(t + s0, 3), "end": round(t + e0, 3),
                           "scene": scene["id"], "key": tok in keywords})
            base = len(all_words)
            all_words.extend(sw)
            for cue in build_cues(sw):
                cues_out.append({"scene": scene["id"], "words": [base + j for j in cue]})
            t += len(audio) / SR
            if si < len(scene["sentences"]) - 1:
                t += cfg["sentenceGap"]
        prev_end = t
        fits = t <= scene["end"] + scene.get("maxSpill", 0.35) and t <= total_s - 0.4
        ok &= fits
        scenes_out.append({"id": scene["id"], "title": scene["title"], "start": scene["start"], "end": scene["end"],
                           "voStart": round(scene_start, 3), "voEnd": round(t, 3)})
        print(f"{scene['id']}: Szene {scene['start']:>4.1f}-{scene['end']:>4.1f}s | Stimme {scene_start:6.2f}-{t:6.2f}s"
              f" | {'OK' if fits else 'ZU LANG'}")

    for cue in cues_out:
        cue["start"] = round(max(0.0, all_words[cue["words"][0]]["start"] - 0.08), 3)
    for i, cue in enumerate(cues_out):
        nxt = cues_out[i + 1]["start"] if i + 1 < len(cues_out) else total_s
        cue["end"] = round(min(nxt - 0.02, all_words[cue["words"][-1]]["end"] + 0.7), 3)
        cue["text"] = " ".join(all_words[j]["text"] for j in cue["words"])

    BUILD.mkdir(parents=True, exist_ok=True)
    raw = BUILD / "voiceover_raw.wav"
    with wave.open(str(raw), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes((np.clip(timeline, -1, 1) * 32767).astype(np.int16).tobytes())

    chain = ["highpass=f=70"]
    if args.engine == "piper":  # Vorschau-Stimme etwas tiefer/wärmer und weniger „digital“
        chain += ["rubberband=pitch=0.93:formant=preserved:transients=smooth",
                  "equalizer=f=130:t=q:w=0.9:g=4", "equalizer=f=400:t=q:w=1.2:g=-2.5",
                  "equalizer=f=2600:t=q:w=1.5:g=2", "lowpass=f=9500"]
    chain += ["acompressor=threshold=-20dB:ratio=2.5:attack=8:release=140:makeup=2",
              "aecho=0.8:0.4:32|55:0.10|0.05", "alimiter=limit=0.89",
              f"apad=whole_dur={total_s}", f"atrim=0:{total_s}"]
    OUT_WAV.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(raw), "-af", ",".join(chain),
                    "-ar", str(SR), "-ac", "1", "-c:a", "pcm_s16le", str(OUT_WAV)], check=True)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({"engine": args.engine, "voice": voice_label, "scenes": scenes_out,
                                    "words": all_words, "cues": cues_out}, ensure_ascii=False, indent=1),
                        encoding="utf-8")
    write_subtitles(cues_out)
    print(f"-> {OUT_WAV.relative_to(ROOT)}, {OUT_JSON.relative_to(ROOT)}, {OUT_SUBS.relative_to(ROOT)}/untertitel.srt "
          f"({len(all_words)} Wörter, {len(cues_out)} Cues)")
    if not ok:
        sys.exit("Mindestens eine Szene ist zu lang für ihr Zeitfenster.")


if __name__ == "__main__":
    main()
