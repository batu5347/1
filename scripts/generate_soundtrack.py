#!/usr/bin/env python3
"""Synthetisiert Musikbett und Sounddesign (rein prozedural, keine Fremd-Samples).

Ergebnis: public/audio/soundtrack.wav (61 s, 48 kHz, Stereo), unter der Stimme
automatisch abgesenkt (Ducking anhand von public/audio/voiceover.wav).
Alle Zeitpunkte entsprechen den Schnitten in src/timeline.ts.
"""
from __future__ import annotations

import json
import re
import wave
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parent.parent
SR = 48000
DUR = 61.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(24)

TIMELINE = json.loads((ROOT / "src" / "data" / "timeline.json").read_text(encoding="utf-8"))
WORDS = json.loads((ROOT / "src" / "data" / "voiceover.json").read_text(encoding="utf-8"))["words"]


def resolve(at) -> float:
    """Gleiche Logik wie resolveTime() in src/timeline.ts."""
    if isinstance(at, (int, float)):
        return float(at)
    hits = [w for w in WORDS if w["scene"] == at["s"] and re.sub(r"[^\wäöüÄÖÜß]", "", w["text"]) == at["w"]]
    return hits[at.get("n", 0)]["start"] + at.get("o", 0.0)


CUTS = [s["start"] for s in TIMELINE["scenes"][1:]]  # Szenenwechsel
BLACKOUT = resolve(TIMELINE["blackout"])  # Moment, in dem Berlin dunkel wird
CTA = resolve(TIMELINE["cta"])            # Einblendung "SCHREIB ES IN DIE KOMMENTARE."
TICKS = TIMELINE["clockTicks"]   # Uhr-Einblendungen
SIRENS = TIMELINE["sirens"]      # [start, ende] Blaulicht-Szenen


def env_curve(points: list[tuple[float, float]]) -> np.ndarray:
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def lowpass(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, f, "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def highpass(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, f, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bandpass(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def place(dst: np.ndarray, src: np.ndarray, at: float, gain: float = 1.0) -> None:
    i = int(at * SR)
    if i >= len(dst):
        return
    n = min(len(src), len(dst) - i)
    dst[i : i + n] += src[:n] * gain


def adsr(n: int, a: float, r: float) -> np.ndarray:
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.exp(-np.linspace(0, 6, nr))
    return e


def sweep(f0: float, f1: float, dur: float, curve: float = 3.0) -> np.ndarray:
    n = int(dur * SR)
    k = np.linspace(0, 1, n)
    f = f1 + (f0 - f1) * np.exp(-curve * k)
    return np.sin(2 * np.pi * np.cumsum(f) / SR)


L = np.zeros(N)
R = np.zeros(N)


def add(x: np.ndarray, pan: float = 0.0, gain: float = 1.0) -> None:
    global L, R
    L += x * gain * np.cos((pan + 1) * np.pi / 4)
    R += x * gain * np.sin((pan + 1) * np.pi / 4)


# ---------------------------------------------------------------- Intensität
# Spannungsbogen: Hook laut, dann ruhiger Aufbau, Höhepunkt nach 24 h, Ausklang.
intensity = env_curve([
    (0, 0.55), (BLACKOUT, 0.7), (4, 0.4), (12, 0.45), (21, 0.55), (31, 0.68),
    (41, 0.85), (50, 0.95), (53, 0.6), (58, 0.4), (60, 0.25), (61, 0.0),
])

# ---------------------------------------------------------------- Stadt vor dem Ausfall
city = lowpass(rng.standard_normal(N), 420) * 0.5 + bandpass(rng.standard_normal(N), 900, 2600) * 0.05
hum = sum(np.sin(2 * np.pi * 50 * h * t) / h for h in (1, 2, 3, 5)) * 0.05
city_env = env_curve([(0, 0.0), (0.05, 1.0), (BLACKOUT, 1.0), (BLACKOUT + 0.06, 0.0), (61, 0.0)])
add((city + hum) * city_env, gain=0.55)

# ---------------------------------------------------------------- Stromausfall-Effekt
# Netzbrummen fällt in der Tonhöhe ab, dazu ein tiefer Impact und ein kurzer Knack.
pd_dur = 1.1
k = np.linspace(0, 1, int(pd_dur * SR))
f = 100 * (1 - 0.85 * k**0.6)
whine = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(2 * np.pi * np.cumsum(f * 3) / SR)
place(L, whine * np.exp(-3 * k) * 0.35, BLACKOUT)
place(R, whine * np.exp(-3 * k) * 0.35, BLACKOUT)
boom = sweep(95, 28, 2.6, 4) * adsr(int(2.6 * SR), 0.004, 2.4)
boom += lowpass(rng.standard_normal(len(boom)), 160) * adsr(len(boom), 0.002, 0.9) * 0.6
place(L, boom, BLACKOUT, 0.85)
place(R, boom, BLACKOUT, 0.85)
click = highpass(rng.standard_normal(int(0.03 * SR)), 1500) * adsr(int(0.03 * SR), 0.0005, 0.028)
place(L, click, BLACKOUT, 0.5)
place(R, click, BLACKOUT, 0.5)

# ---------------------------------------------------------------- Drone (Musikbett)
def drone_voice(freq: float, detune: float, phase: float) -> np.ndarray:
    a = signal.sawtooth(2 * np.pi * freq * (1 + detune) * t + phase)
    b = signal.sawtooth(2 * np.pi * freq * (1 - detune) * t + phase * 1.7)
    return (a + b) * 0.5


pad = np.zeros(N)
# Grundton D (36.7 Hz Sub), dazu Quinte und kleine Terz -> düster, nicht horror.
for fr, g in ((36.71, 0.9), (73.42, 0.6), (110.0, 0.32), (87.31, 0.22)):
    pad += drone_voice(fr, 0.003, fr) * g
# Filter öffnet sich mit der Intensität (blockweise Filterung).
pad_f = np.zeros(N)
block = SR // 10
zi = None
for i in range(0, N, block):
    fc = 120 + 900 * intensity[i] ** 2
    sos = signal.butter(2, fc, "low", fs=SR, output="sos")
    if zi is None:
        zi = signal.sosfilt_zi(sos) * 0
    pad_f[i : i + block], zi = signal.sosfilt(sos, pad[i : i + block], zi=zi)
pad_env = env_curve([(0, 0.0), (0.3, 0.5), (BLACKOUT, 0.35), (BLACKOUT + 0.3, 0.9), (61, 0.9)]) * intensity
lfo = 0.85 + 0.15 * np.sin(2 * np.pi * 0.11 * t)
add(pad_f * pad_env * lfo, -0.15, 0.24)
add(np.roll(pad_f, 900) * pad_env * lfo, 0.15, 0.24)

# Sub-Puls wie ein Herzschlag ab 6 Stunden, schneller bis 24 Stunden.
pulse = np.zeros(N)
beat_t = 21.0
while beat_t < 53.0:
    bpm = np.interp(beat_t, [21, 41, 53], [62, 74, 84])
    one = sweep(70, 38, 0.45, 6) * adsr(int(0.45 * SR), 0.003, 0.4)
    place(pulse, one, beat_t, 1.0)
    place(pulse, one, beat_t + 0.24, 0.55)
    beat_t += 60.0 / bpm
add(pulse * env_curve([(0, 0), (21, 0), (23, 0.6), (41, 0.85), (51, 1.0), (53, 0.0), (61, 0)]), gain=0.33)

# Elektronische Textur: leise, gefilterte Pings mit Echo.
pings = np.zeros(N)
notes = [293.66, 349.23, 440.0, 392.0, 293.66, 523.25, 440.0, 349.23]
pt, ni = 4.5, 0
while pt < 58:
    n = int(0.9 * SR)
    tone = np.sin(2 * np.pi * notes[ni % len(notes)] * np.arange(n) / SR) * np.exp(-np.linspace(0, 7, n))
    place(pings, tone, pt)
    ni += 1
    pt += 1.5 if pt < 41 else 0.75
pings = lowpass(pings, 2200)
echo = np.zeros(N)
for d, g in ((0.375, 0.45), (0.75, 0.25), (1.125, 0.12)):
    echo[int(d * SR):] += pings[: N - int(d * SR)] * g
add(pings + echo * 0.6, 0.35, 0.05)
add(np.roll(echo, 4800), -0.35, 0.035)

# Hohe, dünne Streicher-Fläche (Spannung) ab 12 Stunden.
strings = sum(np.sin(2 * np.pi * fr * t + 0.3 * np.sin(2 * np.pi * 5.1 * t)) for fr in (587.33, 880.0, 698.46))
strings = lowpass(strings, 3000)
add(strings * env_curve([(0, 0), (31, 0), (36, 0.4), (47, 0.85), (52.8, 1.0), (53.2, 0), (61, 0)]), 0.0, 0.016)

# ---------------------------------------------------------------- Atmo nach dem Ausfall
wind = lowpass(rng.standard_normal(N), 300) * (0.7 + 0.3 * np.sin(2 * np.pi * 0.07 * t))
wind += bandpass(rng.standard_normal(N), 1800, 5000) * 0.03
add(wind * env_curve([(0, 0), (BLACKOUT, 0), (BLACKOUT + 0.8, 0.5), (53, 0.55), (59, 0.25), (61, 0)]), gain=0.18)

# ---------------------------------------------------------------- Schnitt-Whooshes
for c in CUTS:
    n = int(0.7 * SR)
    noise = rng.standard_normal(n)
    sw = np.zeros(n)
    for i in range(0, n, 480):
        fc = 300 + 2600 * (i / n) ** 2
        sw[i:i + 480] = bandpass(noise[i:i + 480], fc * 0.6, fc * 1.4, 1)
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    place(L, sw * e * 0.28, c - 0.5)
    place(R, sw[::-1] * e * 0.28, c - 0.5)
    hit = sweep(60, 35, 0.8, 5) * adsr(int(0.8 * SR), 0.003, 0.75)
    place(L, hit, c, 0.32)
    place(R, hit, c, 0.32)

# ---------------------------------------------------------------- Uhr-Ticks
for start, count in TICKS:
    for i in range(count):
        n = int(0.05 * SR)
        tick = bandpass(rng.standard_normal(n), 2500, 6000) * adsr(n, 0.0005, 0.045)
        tick += np.sin(2 * np.pi * 1900 * np.arange(n) / SR) * adsr(n, 0.0005, 0.04) * 0.3
        place(L, tick, start + i * 0.5, 0.16)
        place(R, tick, start + i * 0.5, 0.16)

# ---------------------------------------------------------------- Ferne Sirenen (Martinshorn, gedämpft)
for s0, s1 in SIRENS:
    dur = s1 - s0
    n = int(dur * SR)
    tt = np.arange(n) / SR
    tone = np.where((tt % 1.2) < 0.6, 440.0, 587.33)
    tone = signal.savgol_filter(tone, 2001, 2)
    siren = signal.sawtooth(2 * np.pi * np.cumsum(tone) / SR, 0.5)
    siren = lowpass(bandpass(siren, 300, 2400), 1400)
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.5
    pan = np.linspace(-0.6, 0.6, n)
    place(L, siren * e * np.cos((pan + 1) * np.pi / 4), s0, 0.05)
    place(R, siren * e * np.sin((pan + 1) * np.pi / 4), s0, 0.05)

# ---------------------------------------------------------------- Finale: leiser Schlusspunkt
end_hit = sweep(80, 30, 1.2, 4) * adsr(int(1.2 * SR), 0.004, 1.15)
place(L, end_hit, CTA, 0.45)
place(R, end_hit, CTA, 0.45)

# ---------------------------------------------------------------- Ducking unter der Stimme
with wave.open(str(ROOT / "public" / "audio" / "voiceover.wav")) as wf:
    vo = np.frombuffer(wf.readframes(wf.getnframes()), dtype=np.int16).astype(np.float32) / 32768
vo = np.pad(vo, (0, max(0, N - len(vo))))[:N]
vo_env = lowpass(np.abs(vo), 6, 1)
vo_env = vo_env / (vo_env.max() + 1e-9)
speech = np.clip(vo_env * 6, 0, 1)
# Schneller Attack, langsamer Release.
duck = np.zeros(N)
a, r = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
y = 0.0
for i in range(0, N, 48):
    x = speech[i]
    y = x + (y - x) * (a ** 48 if x > y else r ** 48)
    duck[i:i + 48] = y
gain = 1.0 - 0.55 * duck  # ca. -7 dB unter Sprache
L *= gain
R *= gain

# ---------------------------------------------------------------- Master
mix = np.stack([L, R], axis=1)
mix[:, :] *= np.minimum(1, t / 0.01)[:, None]
mix[-int(0.25 * SR):] *= np.linspace(1, 0, int(0.25 * SR))[:, None]
peak = np.max(np.abs(mix))
mix = np.tanh(mix / peak * 1.4) / np.tanh(1.4) * 0.5  # sanfte Sättigung, Peak ~ -6 dBFS

out = ROOT / "public" / "audio" / "soundtrack.wav"
with wave.open(str(out), "wb") as wf:
    wf.setnchannels(2)
    wf.setsampwidth(2)
    wf.setframerate(SR)
    wf.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f"-> {out.relative_to(ROOT)}")

# ---------------------------------------------------------------- Finale Mischung (TikTok: ca. -14 LUFS)
import subprocess  # noqa: E402

mix_out = ROOT / "public" / "audio" / "mix.wav"
graph = ("[0:a]volume=-2dB[m];[1:a]aformat=channel_layouts=stereo[v];"
         "[m][v]amix=inputs=2:normalize=0:duration=longest")
probe = subprocess.run(
    ["ffmpeg", "-hide_banner", "-i", str(out), "-i", str(ROOT / "public" / "audio" / "voiceover.wav"),
     "-filter_complex", graph + ",loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json", "-f", "null", "-"],
    capture_output=True, text=True, check=True).stderr
meas = json.loads(probe[probe.rindex("{"):])
# Pegel linear anheben (Messung oben), Spitzen per Limiter abfangen (~ -1.5 dBTP).
gain_db = -14.0 - float(meas["input_i"])
ln = f"volume={gain_db:.2f}dB,aresample=192000,alimiter=limit=0.8:attack=2:release=60:level=false,aresample=48000"
subprocess.run(
    ["ffmpeg", "-y", "-loglevel", "error", "-i", str(out), "-i", str(ROOT / "public" / "audio" / "voiceover.wav"),
     "-filter_complex", graph + "," + ln, "-t", str(DUR),
     "-c:a", "pcm_s16le", str(mix_out)], check=True)
print(f"-> {mix_out.relative_to(ROOT)} (Ziel -14 LUFS)")
