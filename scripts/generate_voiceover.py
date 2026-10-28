#!/usr/bin/env python3
"""Erzeugt die Sprecherspur und wortgenaue Untertitel-Timings.

- TTS: Piper (lokal, offline) mit der Stimme "Thorsten" (CC0).
- Jeder Satz wird einzeln synthetisiert. Piper liefert pro Phonem die Anzahl
  der erzeugten Samples (Alignment). Daraus werden Start/Ende jedes Wortes in
  der tatsächlichen Aufnahme berechnet -> Untertitel folgen der echten Stimme.
- Ergebnis:
    public/audio/voiceover.wav   (61 s, 48 kHz, bearbeitet)
    src/data/voiceover.json      (Szenen, Wörter, Untertitel-Cues)
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tarfile
import urllib.request
import wave
from pathlib import Path

import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "vo_script.json"
VOICE_DIR = ROOT / "voices" / "voice-de-thorsten-low"
VOICE_MODEL = VOICE_DIR / "de-thorsten-low.onnx"
VOICE_URL = "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-de-thorsten-low.tar.gz"
RAW_WAV = ROOT / "build" / "voiceover_raw.wav"
OUT_WAV = ROOT / "public" / "audio" / "voiceover.wav"
OUT_JSON = ROOT / "src" / "data" / "voiceover.json"

TTS_REPLACEMENTS = {"24": "vierundzwanzig"}
MAX_CUE_CHARS = 38


def ensure_voice() -> None:
    if VOICE_MODEL.exists():
        return
    VOICE_DIR.parent.mkdir(parents=True, exist_ok=True)
    archive = VOICE_DIR.parent / "voice-de-thorsten-low.tar.gz"
    print(f"Lade Stimme: {VOICE_URL}")
    urllib.request.urlretrieve(VOICE_URL, archive)
    VOICE_DIR.mkdir(exist_ok=True)
    with tarfile.open(archive) as tar:
        tar.extractall(VOICE_DIR, filter="data")


def load_voice() -> PiperVoice:
    voice = PiperVoice.load(VOICE_MODEL, include_alignments=True)
    original = voice.phonemize

    # espeak liefert "ç" teilweise zerlegt als "c" + Cedille (U+0327). Das
    # Cedillen-Zeichen fehlt in der Phonem-Tabelle des Modells und bricht sonst
    # das Alignment. Wieder zu "ç" zusammensetzen.
    def phonemize(text: str) -> list[list[str]]:
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

    voice.phonemize = phonemize  # type: ignore[method-assign]
    return voice


def tokenize(sentence: str) -> list[str]:
    """Wörter für die Anzeige; reine Satzzeichen hängen am vorigen Wort."""
    words: list[str] = []
    for tok in sentence.split():
        if re.search(r"\w", tok) or not words:
            words.append(tok)
        else:
            words[-1] += " " + tok
    return words


def bare(word: str) -> str:
    return re.sub(r"[^\wäöüÄÖÜß]", "", word)


def synthesize_sentence(voice: PiperVoice, sentence: str, length_scale: float):
    display = tokenize(sentence)
    tts = " ".join(TTS_REPLACEMENTS.get(bare(w), w) if bare(w) in TTS_REPLACEMENTS else w for w in sentence.split())
    cfg = SynthesisConfig(length_scale=length_scale, noise_scale=0.6, noise_w_scale=0.7)
    chunks = list(voice.synthesize(tts, cfg, include_alignments=True))
    if len(chunks) != 1:
        raise RuntimeError(f"Erwartet genau einen Satz, erhalten {len(chunks)}: {sentence}")
    chunk = chunks[0]
    if chunk.phoneme_alignments is None:
        raise RuntimeError(f"Kein Phonem-Alignment für: {sentence}")
    sr = chunk.sample_rate

    # Wortgrenzen = Leerzeichen-Phoneme. Satzzeichen/BOS/EOS zählen nicht zum Wort.
    words: list[tuple[float, float]] = []
    cursor = 0
    cur_start = None
    cur_end = None
    for al in chunk.phoneme_alignments:
        p = al.phoneme
        start, end = cursor, cursor + al.num_samples
        cursor = end
        if p == " ":
            if cur_start is not None:
                words.append((cur_start / sr, cur_end / sr))
            cur_start = cur_end = None
            continue
        if p in ("^", "$", "_") or re.fullmatch(r"[,.;:!?\-–—…\"']", p):
            continue
        if p in ("ˈ", "ˌ", "ː"):
            if cur_start is not None:
                cur_end = end
            continue
        if cur_start is None:
            cur_start = start
        cur_end = end
    if cur_start is not None:
        words.append((cur_start / sr, cur_end / sr))

    if len(words) != len(display):
        raise RuntimeError(f"Wortanzahl passt nicht ({len(words)} vs {len(display)}): {sentence}")
    # Stille am Satzanfang/-ende abschneiden (Wortzeiten entsprechend verschieben).
    audio = chunk.audio_float_array.astype(np.float32)
    env = np.convolve(np.abs(audio), np.ones(160) / 160, mode="same")
    voiced = np.nonzero(env > 0.02 * env.max())[0]
    pad = int(0.04 * sr)
    a0 = max(0, int(voiced[0]) - pad)
    a1 = min(len(audio), int(voiced[-1]) + pad)
    audio = audio[a0:a1].copy()
    fade = min(int(0.015 * sr), len(audio) // 4)
    audio[:fade] *= np.linspace(0, 1, fade)
    audio[-fade:] *= np.linspace(1, 0, fade)
    off = a0 / sr
    dur = len(audio) / sr
    words = [(max(0.0, ws - off), min(dur, we - off)) for ws, we in words]
    return audio, sr, list(zip(display, words))


WEAK_ENDINGS = {"von", "und", "die", "der", "das", "den", "ein", "eine", "einen", "oder", "für", "mit",
                "wie", "es", "auf", "wird", "nicht", "kein", "keine", "zu", "um", "im", "in", "mehr",
                "manche", "viele", "wo", "er", "aber", "gibt", "nach", "werden", "wäre", "hinge", "du"}


def build_cues(words: list[dict]) -> list[list[int]]:
    """Teilt einen Satz in Untertitel-Blöcke (max. 2 Zeilen à ~20 Zeichen).

    Dynamische Programmierung über alle Umbruchstellen: bevorzugt Sprechpausen
    (Satzzeichen), vermeidet Blöcke, die auf Funktionswörtern enden, und sehr
    kurze oder sehr lange Blöcke.
    """
    n = len(words)

    def cost(i: int, j: int) -> float:  # Block = words[i:j]
        text = " ".join(w["text"] for w in words[i:j])
        if len(text) > MAX_CUE_CHARS and j - i > 1:
            return 1e9
        last = words[j - 1]["text"]
        c = (len(text) - 22) ** 2 * 0.05
        if j < n:
            if re.search(r"[,.:;?!–]$", last):
                c -= 12
            elif bare(last).lower() in WEAK_ENDINGS:
                c += 25
        if len(text) < 10:
            c += 20
        return c + 10

    best = [0.0] + [float("inf")] * n
    back = [0] * (n + 1)
    for j in range(1, n + 1):
        for i in range(max(0, j - 8), j):
            v = best[i] + cost(i, j)
            if v < best[j]:
                best[j], back[j] = v, i
    cues: list[list[int]] = []
    j = n
    while j > 0:
        i = back[j]
        cues.append(list(range(i, j)))
        j = i
    return cues[::-1]


def main() -> None:
    ensure_voice()
    voice = load_voice()
    cfg = json.loads(SCRIPT.read_text(encoding="utf-8"))
    total_s = cfg["totalFrames"] / cfg["fps"]
    keywords = {bare(k).lower() for k in cfg["keywords"]}

    sr_out = None
    timeline: np.ndarray | None = None
    scenes_out = []
    all_words: list[dict] = []
    cues_out: list[dict] = []
    prev_end = 0.0
    ok = True

    for scene in cfg["scenes"]:
        t = max(scene["start"] + scene["lead"], prev_end + cfg["sceneGap"])
        scene_start = t
        for si, sentence in enumerate(scene["sentences"]):
            audio, sr, words = synthesize_sentence(voice, sentence, scene["lengthScale"])
            if timeline is None:
                sr_out = sr
                timeline = np.zeros(int(total_s * sr), dtype=np.float32)
            # Lautheit pro Satz angleichen (Piper normalisiert auf Peak).
            rms = float(np.sqrt(np.mean(audio**2))) or 1.0
            audio = audio * min(0.16 / rms, 1.0)
            i0 = int(round(t * sr))
            seg = audio[: max(0, len(timeline) - i0)]
            timeline[i0 : i0 + len(seg)] += seg
            sentence_words = []
            for text, (ws, we) in words:
                w = {
                    "text": text,
                    "start": round(t + ws, 3),
                    "end": round(t + we, 3),
                    "scene": scene["id"],
                    "key": bare(text).lower() in keywords,
                }
                sentence_words.append(w)
            base = len(all_words)
            all_words.extend(sentence_words)
            for cue in build_cues(sentence_words):
                cues_out.append({"scene": scene["id"], "words": [base + j for j in cue]})
            t += len(audio) / sr
            if si < len(scene["sentences"]) - 1:
                t += cfg["sentenceGap"]
        prev_end = t
        limit = scene["end"] + scene.get("maxSpill", 0.45)
        fits = t <= limit
        ok &= fits
        scenes_out.append({
            "id": scene["id"],
            "title": scene["title"],
            "start": scene["start"],
            "end": scene["end"],
            "voStart": round(scene_start, 3),
            "voEnd": round(t, 3),
        })
        print(f"{scene['id']}: Szene {scene['start']:>5.2f}-{scene['end']:>5.2f}s | Stimme {scene_start:6.2f}-{t:6.2f}s "
              f"| {'OK' if fits else 'ZU LANG'}")

    # Cue-Zeiten: ab erstem Wort bis zum Beginn des nächsten Cues (max. +0.6 s).
    for i, cue in enumerate(cues_out):
        first, last = all_words[cue["words"][0]], all_words[cue["words"][-1]]
        nxt = all_words[cues_out[i + 1]["words"][0]]["start"] if i + 1 < len(cues_out) else total_s
        cue["start"] = round(max(0.0, first["start"] - 0.08), 3)
        cue["end"] = round(min(nxt - 0.02, last["end"] + 0.6), 3)
        cue["text"] = " ".join(all_words[j]["text"] for j in cue["words"])

    assert timeline is not None and sr_out is not None
    RAW_WAV.parent.mkdir(parents=True, exist_ok=True)
    with wave.open(str(RAW_WAV), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr_out)
        wf.writeframes((np.clip(timeline, -1, 1) * 32767).astype(np.int16).tobytes())

    # Klangbearbeitung: 48 kHz, etwas tiefer & wärmer, Präsenz, Kompression, kleiner Raum.
    OUT_WAV.parent.mkdir(parents=True, exist_ok=True)
    chain = ",".join([
        "aresample=48000:resampler=soxr",
        "rubberband=pitch=0.945:formant=preserved:transients=smooth",
        "highpass=f=75",
        "equalizer=f=140:t=q:w=0.9:g=3.5",
        "equalizer=f=380:t=q:w=1.2:g=-2",
        "equalizer=f=2800:t=q:w=1.5:g=2.5",
        "acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2",
        "aecho=0.8:0.5:28|47:0.12|0.07",
        "alimiter=limit=0.89",
        f"apad=whole_dur={total_s}",
        f"atrim=0:{total_s}",
    ])
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(RAW_WAV), "-af", chain,
                    "-ac", "1", "-c:a", "pcm_s16le", str(OUT_WAV)], check=True)

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps({
        "voice": cfg["voice"],
        "scenes": scenes_out,
        "words": all_words,
        "cues": cues_out,
    }, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"-> {OUT_WAV.relative_to(ROOT)}, {OUT_JSON.relative_to(ROOT)} ({len(all_words)} Wörter, {len(cues_out)} Cues)")
    if not ok:
        sys.exit("Mindestens eine Szene ist zu lang für ihr Zeitfenster.")


if __name__ == "__main__":
    main()
