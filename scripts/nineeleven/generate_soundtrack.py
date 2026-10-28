#!/usr/bin/env python3
"""Sounddesign + Musik für „POV: Du bist in New York am 11. September 2001“.

Alles wird synthetisch erzeugt (NumPy/SciPy) – keine fremden Samples, keine Lizenzfragen.
Ereignis-Zeitpunkte folgen derselben Logik wie src/nineeleven/timeline.ts
(gekoppelt an die Wörter der Sprachaufnahme in src/nineeleven/data/voiceover.json).

Ebenen:
  * Stadt-Atmo (Verkehr, entfernte Hupen, vorbeifahrendes Taxi), später gedämpft
  * Musik: ruhiges Klavier-Motiv + Fläche; bricht vor dem ersten Einschlag ab,
    Spannungsaufbau ab dem zweiten Einschlag, nachdenkliches Finale
  * Tiefe, kurze Impulse bei den Einschlägen (kein Explosions-Effekt)
  * aufkommendes Stimmengewirr (ohne erkennbare Worte), entfernte Sirenen
  * tiefes Grollen bei den Einstürzen, danach gedämpfte Stille mit Wind
  * Ducking: Musik/Atmo werden unter der Stimme abgesenkt

Ergebnis: public/nineeleven/audio/soundtrack.wav und mix.wav (Stimme + Soundtrack, -14 LUFS)
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal

ROOT = Path(__file__).resolve().parents[2]
VO_JSON = ROOT / "src" / "nineeleven" / "data" / "voiceover.json"
VO_WAV = ROOT / "public" / "nineeleven" / "audio" / "voiceover.wav"
OUT_ST = ROOT / "public" / "nineeleven" / "audio" / "soundtrack.wav"
OUT_MIX = ROOT / "public" / "nineeleven" / "audio" / "mix.wav"
BUILD = ROOT / "build" / "nineeleven"

SR = 48000
DUR = 61.0
N = int(SR * DUR)
rng = np.random.default_rng(911)

vo = json.loads(VO_JSON.read_text(encoding="utf-8"))
bare = lambda s: re.sub(r"[^\wäöüÄÖÜß]", "", s)


def word(text: str, scene: str, n: int = 0) -> float:
    hits = [w for w in vo["words"] if w["scene"] == scene and bare(w["text"]) == bare(text)]
    return hits[n]["start"]


I1 = word("Nordturm.", "s3") - 0.05
I2 = word("Südturm.", "s5") - 0.05
CS = word("stürzt", "s6")
CN = word("stürzt", "s7")
COLL_S, COLL_N = 4.6, 5.0
print(f"Ereignisse: I1={I1:.2f}s I2={I2:.2f}s Einsturz S={CS:.2f}s Einsturz N={CN:.2f}s")

t = np.arange(N) / SR


# ----------------------------------------------------------------------------- Helfer

def stereo(x: np.ndarray, pan: float = 0.0) -> np.ndarray:
    a = (pan + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def env(points: list[tuple[float, float]]) -> np.ndarray:
    xs, ys = zip(*points)
    return np.interp(t, xs, ys)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def noise(n=N):
    return rng.standard_normal(n).astype(np.float64)


def brown(n=N):
    b = np.cumsum(noise(n))
    b = hp(b, 20)
    return b / (np.abs(b).max() + 1e-9)


def reverb(x: np.ndarray, seconds=2.2, wet=0.3, damp=4000) -> np.ndarray:
    L = int(seconds * SR)
    ir = noise(L) * np.exp(-np.arange(L) / SR * (6.9 / seconds))
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir**2))
    out = np.empty_like(x)
    for c in range(x.shape[1]):
        out[:, c] = x[:, c] * (1 - wet) + signal.fftconvolve(x[:, c], ir)[: len(x)] * wet
    return out


def place(buf: np.ndarray, snd: np.ndarray, at: float):
    i = int(at * SR)
    if i >= len(buf):
        return
    n = min(len(snd), len(buf) - i)
    buf[i : i + n] += snd[:n]


def norm(x, peak=1.0):
    return x / (np.abs(x).max() + 1e-9) * peak


# ----------------------------------------------------------------------------- Stadt-Atmo

def city() -> np.ndarray:
    rumble = lp(brown(), 380) * 0.9
    hiss = bp(noise(), 600, 4000) * 0.05
    # vorbeifahrende Autos (gefiltertes Rauschen, An- und Abschwellen, Panorama)
    cars = np.zeros((N, 2))
    for k in range(26):
        at = rng.uniform(-1, 26)
        d = rng.uniform(2.5, 5)
        n = int(d * SR)
        tt = np.arange(n) / n
        e = np.exp(-((tt - 0.5) ** 2) / 0.03)
        s = bp(noise(n), 120, 1400) * e * rng.uniform(0.15, 0.35)
        pan = np.linspace(rng.uniform(-1, 0), rng.uniform(0, 1), n) * rng.choice([-1, 1])
        a = (pan + 1) * np.pi / 4
        place(cars, np.stack([s * np.cos(a), s * np.sin(a)], 1), at)
    # Hook: Taxi fährt dicht vorbei (t ~ 1.4 s)
    n = int(2.4 * SR)
    tt = np.arange(n) / SR
    e = np.exp(-((tt - 1.3) ** 2) / 0.12)
    whoosh = bp(noise(n), 90, 2600) * e * 0.9
    pan = np.clip((tt - 1.3) * 1.6, -1, 1)
    a = (pan + 1) * np.pi / 4
    place(cars, np.stack([whoosh * np.cos(a), whoosh * np.sin(a)], 1), 0.1)
    # entfernte Hupen (zweitönig, gedämpft)
    horns = np.zeros(N)
    for at, f in [(1.9, 392), (4.2, 349), (7.6, 415), (10.9, 370), (12.4, 330), (24.5, 392), (28.0, 349)]:
        d = rng.uniform(0.25, 0.6)
        n = int(d * SR)
        tt = np.arange(n) / SR
        s = signal.square(2 * np.pi * f * tt) + 0.6 * signal.square(2 * np.pi * f * 1.26 * tt)
        s = lp(s, 1800) * np.minimum(1, tt / 0.02) * np.minimum(1, (d - tt) / 0.05)
        place(horns, s * 0.06, at)
    base = stereo(rumble * 0.22 + hiss) + cars * 0.6 + stereo(horns, 0.3)
    base = reverb(base, 1.6, 0.25)
    # Lautstärke-Verlauf: normaler Morgen -> nach den Einschlägen gedämpft -> nach Einstürzen fast still
    g = env([(0, 0.0), (0.15, 1), (I1 - 0.1, 1), (I1 + 0.3, 0.45), (I1 + 5, 0.7), (I2 - 0.1, 0.7), (I2 + 0.4, 0.35),
             (CS - 0.5, 0.45), (CS + 1, 0.2), (CS + 4, 0.05), (DUR, 0.02)])
    return base * g[:, None]


def crowd() -> np.ndarray:
    """Stimmengewirr ohne Worte: bandbegrenztes Rauschen mit Silben-Modulation"""
    out = np.zeros((N, 2))
    for v in range(14):
        f0 = rng.uniform(300, 1200)
        s = bp(noise(), f0 * 0.6, f0 * 2.2)
        mod = lp(np.abs(noise()), rng.uniform(4, 7)) * 6
        s = s * np.clip(mod, 0, 1.5)
        out += stereo(s, rng.uniform(-0.8, 0.8)) * rng.uniform(0.5, 1)
    out = reverb(norm(out, 0.5), 1.8, 0.45, 2500)
    g = env([(0, 0.0), (I1 + 0.8, 0), (I1 + 2.5, 0.35), (I1 + 7, 0.22), (I2 + 0.3, 0.22), (I2 + 1.5, 0.42), (I2 + 6, 0.3),
             (CS - 1, 0.25), (CS + 0.5, 0.35), (CS + 4, 0.06), (CN, 0.04), (CN + 3, 0.0), (DUR, 0)])
    return out * g[:, None]


def sirens() -> np.ndarray:
    out = np.zeros((N, 2))
    specs = [  # (Start, Dauer, Pan, Pegel, Typ)
        (I1 + 9, 14, -0.6, 0.05, "wail"),
        (I2 + 2, 16, 0.5, 0.06, "wail"),
        (38.0, 4.5, -0.2, 0.24, "pass"),  # Löschfahrzeug fährt an der Kamera vorbei
        (39.0, 3.5, 0.4, 0.12, "yelp"),
        (40.5, 7, -0.7, 0.07, "wail"),
        (CS + 6, 8, 0.6, 0.03, "wail"),
    ]
    for at, d, pan, lvl, kind in specs:
        n = int(d * SR)
        tt = np.arange(n) / SR
        if kind == "yelp":
            f = 900 + 500 * (0.5 + 0.5 * signal.sawtooth(2 * np.pi * 3.2 * tt, 0.5))
        else:
            f = 750 + 600 * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 3.8 - np.pi / 2))
        if kind == "pass":  # Doppler beim Vorbeifahren
            f = f * (1.04 - 0.08 / (1 + np.exp(-(tt - 1.4) * 4)))
        ph = 2 * np.pi * np.cumsum(f) / SR
        s = np.sin(ph) + 0.3 * np.sin(2 * ph) + 0.15 * np.sin(3 * ph)
        e = np.minimum(1, tt / 0.8) * np.minimum(1, (d - tt) / 1.2)
        if kind == "pass":
            e = np.exp(-((tt - 1.4) ** 2) / 1.2) * 0.9 + 0.1 * e
        s = lp(s * e, 2600 if kind != "pass" else 4500) * lvl
        sp = stereo(s, pan)
        if kind == "pass":
            pan_t = np.clip((tt - 1.4) * 0.8, -1, 1)
            a = (pan_t + 1) * np.pi / 4
            sp = np.stack([s * np.cos(a), s * np.sin(a)], 1)
        place(out, sp, at)
    return reverb(out, 2.5, 0.5, 3000)


# ----------------------------------------------------------------------------- Ereignisse

def impact(strength=1.0) -> np.ndarray:
    """Dumpfer, kurzer Impuls (tieffrequent) – kein Explosionsgeräusch"""
    d = 3.2
    n = int(d * SR)
    tt = np.arange(n) / SR
    f = 32 + 48 * np.exp(-tt * 5)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 1.6)
    thud = lp(noise(n), 220) * np.exp(-tt * 3.5) * 0.8
    crack = lp(bp(noise(n), 200, 1800), 1500) * np.exp(-tt * 9) * 0.25
    s = (body + thud + crack) * np.minimum(1, tt / 0.006) * strength
    return reverb(stereo(s), 3.0, 0.35, 1500)


def collapse_rumble(d: float, strength=1.0) -> np.ndarray:
    n = int((d + 6) * SR)
    tt = np.arange(n) / SR
    e = np.clip(tt / 0.8, 0, 1) * np.exp(-np.clip(tt - d, 0, None) * 1.3)
    grow = 0.5 + 0.5 * np.clip(tt / d, 0, 1)
    rumble = lp(brown(n), 140, 4) * 3.0
    roar = lp(bp(noise(n), 60, 900), 700) * 0.35 * (np.abs(lp(noise(n), 3)) * 3)
    s = (rumble + roar) * e * grow * strength
    return reverb(stereo(s), 3.5, 0.4, 1200)


def wind() -> np.ndarray:
    w = bp(noise(), 200, 2200)
    mod = 0.6 + 0.4 * np.sin(2 * np.pi * t / 7.3) * np.sin(2 * np.pi * t / 3.1 + 1)
    s = stereo(w * mod * 0.05, 0.2) + stereo(bp(noise(), 300, 1500) * mod * 0.04, -0.3)
    g = env([(0, 0), (CS + 2, 0), (CS + 6, 0.45), (CN, 0.4), (CN + 4, 0.38), (DUR, 0.3)])
    return s * g[:, None]


# ----------------------------------------------------------------------------- Musik

NOTE = {"D2": 73.42, "A2": 110.0, "C3": 130.81, "D3": 146.83, "E3": 164.81, "F3": 174.61, "G3": 196.0, "A3": 220.0,
        "Bb3": 233.08, "C4": 261.63, "D4": 293.66, "E4": 329.63, "F4": 349.23, "G4": 392.0, "A4": 440.0, "Bb2": 116.54, "F2": 87.31}


def piano(f: float, d: float, vel=1.0) -> np.ndarray:
    n = int(d * SR)
    tt = np.arange(n) / SR
    s = sum(a * np.sin(2 * np.pi * f * k * tt) * np.exp(-tt * (1.2 + k * 0.9)) for k, a in [(1, 1), (2, 0.42), (3, 0.18), (4, 0.08)])
    s *= np.minimum(1, tt / 0.004) * np.minimum(1, (d - tt) / 0.3)
    return s * vel


def pad(freqs: list[float], d: float) -> np.ndarray:
    n = int(d * SR)
    tt = np.arange(n) / SR
    s = np.zeros(n)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            s += signal.sawtooth(2 * np.pi * f * (1 + det / 100) * tt + rng.uniform(0, 6))
    s = lp(s, 900, 2) * (0.8 + 0.2 * np.sin(2 * np.pi * tt / 5.3))
    return s / len(freqs)


def music() -> np.ndarray:
    out = np.zeros((N, 2))
    # 1) Morgen: ruhiges, leicht melancholisches Klavier-Motiv in d-Moll + Fläche
    motif = ["D4", "A3", "F4", "E4", "D4", "A3", "C4", "Bb3"]
    beat = 0.78
    seq_t = 0.35
    while seq_t < I1 - 0.6:
        for i, nname in enumerate(motif):
            at = seq_t + i * beat
            if at > I1 - 0.6:
                break
            vel = 0.5 + 0.2 * (i % 4 == 0)
            place(out, stereo(piano(NOTE[nname], 2.6, vel), -0.15 + 0.3 * (i % 2)), at)
            if i % 4 == 0:
                place(out, stereo(piano(NOTE["D3"] if i == 0 else NOTE["Bb2"], 3.2, 0.45), 0), at)
        seq_t += beat * len(motif)
    p1 = pad([NOTE["D3"], NOTE["F3"], NOTE["A3"]], I1 + 0.2)
    p1 *= np.clip(np.arange(len(p1)) / SR / 2.0, 0, 1)
    place(out, stereo(p1 * 0.22), 0.0)
    # Musik bricht kurz vor dem Einschlag ab (harte Blende)
    cut = env([(0, 1), (I1 - 0.25, 1), (I1 - 0.08, 0), (DUR, 0)])
    out *= cut[:, None]

    # 2) Nach dem ersten Einschlag: Stille, dann tiefe, unruhige Fläche
    d2 = I2 - (I1 + 3.0)
    p2 = pad([NOTE["D2"], NOTE["A2"], NOTE["Bb2"] * 2], d2 + 0.5)
    p2 *= np.clip(np.arange(len(p2)) / SR / 3.0, 0, 1) * 0.28
    place(out, stereo(p2), I1 + 3.0)

    # 3) Ab dem zweiten Einschlag: zunehmende Spannung bis zum Einsturz
    d3 = CS - (I2 + 1.2) + 2
    n3 = int(d3 * SR)
    tt = np.arange(n3) / SR
    p3 = pad([NOTE["D2"], NOTE["A2"], NOTE["D3"], NOTE["F3"]], d3)
    pulse = 0.65 + 0.35 * np.maximum(0, np.sin(2 * np.pi * tt * (1.1 + tt * 0.02))) ** 4
    cres = np.clip(tt / d3, 0, 1) ** 1.5
    high = lp(signal.sawtooth(2 * np.pi * NOTE["A3"] * tt) + signal.sawtooth(2 * np.pi * NOTE["Bb3"] * 1.001 * tt), 1800) * 0.15 * cres
    s3 = (p3 * (0.25 + 0.4 * cres) * pulse + high) * np.clip(tt / 1.5, 0, 1)
    s3 *= np.clip((d3 - tt) / 1.6, 0, 1)
    place(out, stereo(s3), I2 + 1.2)

    # 4) Zwischen den Einstürzen: leiser werdende, tiefe Fläche
    d4 = CN + 4 - (CS + 1.5)
    p4 = pad([NOTE["D2"], NOTE["F2"] * 2, NOTE["A2"]], d4)
    n4 = len(p4)
    tt = np.arange(n4) / SR
    p4 *= np.clip(tt / 2, 0, 1) * np.clip((d4 - tt) / 3, 0, 1) * np.interp(tt, [0, d4], [0.26, 0.08])
    place(out, stereo(p4), CS + 1.5)

    # 5) Finale: wenige, nachdenkliche Klaviertöne, fast ausgeblendet
    for at, nn, v in [(55.4, "D3", 0.32), (55.4, "A3", 0.25), (57.0, "F3", 0.22), (58.6, "D4", 0.2), (58.6, "A3", 0.16), (59.9, "D3", 0.12)]:
        place(out, stereo(piano(NOTE[nn], 4.5, v), 0.1 if v > 0.2 else -0.1), at)
    fin = pad([NOTE["D3"], NOTE["A3"]], 6.5)
    fin *= np.clip(np.arange(len(fin)) / SR / 1.5, 0, 1) * np.clip((6.5 - np.arange(len(fin)) / SR) / 3, 0, 1) * 0.07
    place(out, stereo(fin), 54.8)
    return reverb(out, 3.2, 0.38, 3500)


# ----------------------------------------------------------------------------- Mix

def read_vo() -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", str(VO_WAV), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         check=True, capture_output=True).stdout
    v = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    out = np.zeros(N)
    out[: min(N, len(v))] = v[:N]
    return out


def write(path: Path, x: np.ndarray, normalize_lufs: float | None = None):
    BUILD.mkdir(parents=True, exist_ok=True)
    tmp = BUILD / (path.stem + "_raw.f32")
    x.astype(np.float32).tofile(tmp)
    af = ["alimiter=limit=0.95:level=false"]
    if normalize_lufs is not None:
        af = [f"loudnorm=I={normalize_lufs}:TP=-1.5:LRA=11:linear=true"]
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", str(tmp),
                    "-af", ",".join(af + [f"atrim=0:{DUR}", f"apad=whole_dur={DUR}"]), "-ar", str(SR), "-c:a", "pcm_s16le", str(path)], check=True)
    tmp.unlink()


def main():
    voice = read_vo()
    # Hüllkurve der Stimme fürs Ducking
    ve = lp(np.abs(voice), 6)
    ve = ve / (ve.max() + 1e-9)
    duck = 1 - 0.55 * np.clip(ve * 4, 0, 1)

    m = music() * 0.9
    amb = city() * 1.45 + crowd() * 0.8 + sirens() * 1.0 + wind()
    fx = np.zeros((N, 2))
    place(fx, impact(1.0) * 0.75, I1 + 0.22)
    place(fx, impact(1.15) * 1.0, I2 + 0.12)
    place(fx, collapse_rumble(COLL_S, 1.0) * 0.55, CS)
    place(fx, collapse_rumble(COLL_N, 0.9) * 0.42, CN)
    # gedämpfter Raum nach dem Einsturz (Staub): Atmo zusätzlich tiefpassgefiltert
    muffle = env([(0, 0), (CS + 1.5, 0), (CS + 4, 1), (DUR, 1)])
    amb_m = np.stack([lp(amb[:, c], 700) for c in range(2)], 1)
    amb = amb * (1 - muffle[:, None]) + amb_m * muffle[:, None]

    duck_fx = 1 - 0.45 * np.clip(ve * 4, 0, 1)
    soundtrack = (m + amb) * duck[:, None] + fx * duck_fx[:, None]
    # nach dem zweiten Einsturz leiser werdend, Finale fast still, letzter Moment ruhig
    tail = env([(0, 1), (CN + 2.5, 1), (55.0, 0.45), (57, 0.32), (59.4, 0.3), (DUR, 0.0)])
    soundtrack *= tail[:, None]
    write(OUT_ST, norm(soundtrack, 0.9))

    voice_st = np.stack([voice, voice], 1) * 1.0
    # Pegel so wählen, dass die Morgen-Atmo (0–13 s) ca. 11 dB unter der Stimme liegt
    seg = slice(0, int(13 * SR))
    rms = lambda x: np.sqrt(np.mean(x**2)) + 1e-9
    st_level = rms(voice[seg]) / rms(soundtrack[seg].mean(axis=1)) * 10 ** (-11 / 20)
    mix = voice_st + soundtrack * st_level
    write(OUT_MIX, mix, normalize_lufs=-14)
    print(f"-> {OUT_ST.relative_to(ROOT)}, {OUT_MIX.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
