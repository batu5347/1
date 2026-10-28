import { Easing, interpolate, random } from "remotion";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const fade = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: Easing.inOut(Easing.cubic) });

export const easeOut = (f: number, a: number, b: number, from = 0, to = 1) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing: Easing.out(Easing.cubic) });

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Lichtstärke eines Leuchtmittels, das bei Frame `at` ausfällt:
 * kurzes unruhiges Flackern, dann aus (0). Vorher 1.
 */
export const powerFail = (f: number, at: number, seed: string | number, flickerFrames = 7) => {
  if (f < at) return 1;
  const k = f - at;
  if (k >= flickerFrames) return 0;
  const r = random(`${seed}-${Math.floor(k)}`);
  return r > 0.45 ? 0.35 + r * 0.6 : 0.05;
};

/** Umgekehrt: Licht kommt bei `at` zurück (mit kurzem Anlaufen). */
export const powerReturn = (f: number, at: number, seed: string | number, flickerFrames = 8) => {
  if (f < at) return 0;
  const k = f - at;
  if (k >= flickerFrames) return 1;
  return random(`${seed}-r${Math.floor(k)}`) > 0.5 ? 0.75 : 0.1;
};

/** Sanftes Handkamera-Wackeln (deterministisch). */
export const handheld = (f: number, amount = 1, seed = 0) => ({
  x: (Math.sin(f * 0.051 + seed) * 6 + Math.sin(f * 0.137 + seed * 2) * 2.5) * amount,
  y: (Math.cos(f * 0.043 + seed) * 5 + Math.sin(f * 0.111 + seed * 3) * 2) * amount,
  r: Math.sin(f * 0.031 + seed) * 0.25 * amount,
});

/** Langsam blinkendes Signal (0..1), z. B. Flugwarnlicht. */
export const blink = (f: number, period: number, on: number, phase = 0) =>
  ((f + phase) % period) < on ? 1 : 0;
