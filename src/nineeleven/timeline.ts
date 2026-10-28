import vo from "./data/voiceover.json";
import { clamp, lerp } from "./lib/math";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TOTAL_FRAMES = 1830; // exakt 61 s
export const TOTAL_S = TOTAL_FRAMES / FPS;

export type Word = (typeof vo.words)[number];
export const WORDS = vo.words;
export const CUES = vo.cues;
export const VO_SCENES = vo.scenes;
export const VOICE_ENGINE = vo.engine;

const bare = (t: string) => t.replace(/[^\p{L}\p{N}]/gu, "");

/** Startzeit (s) eines Wortes der Sprachaufnahme. */
export const wordAt = (text: string, scene: string, n = 0): number => {
  const hits = WORDS.filter((w) => w.scene === scene && bare(w.text) === bare(text));
  const hit = hits[n];
  if (!hit) throw new Error(`Wort-Anker nicht gefunden: ${text} (${scene})`);
  return hit.start;
};
export const toFrame = (s: number) => Math.round(s * FPS);

/** Szenengrenzen laut Szenenplan (Sekunden). */
export const SCENES = [
  { id: "s1", title: "Der Hook", start: 0, end: 5 },
  { id: "s2", title: "Ein ganz normaler Morgen", start: 5, end: 13 },
  { id: "s3", title: "Der erste Einschlag", start: 13, end: 21 },
  { id: "s4", title: "Die Stadt begreift, was passiert", start: 21, end: 30 },
  { id: "s5", title: "Der zweite Einschlag", start: 30, end: 38 },
  { id: "s6", title: "Manhattan im Ausnahmezustand", start: 38, end: 47 },
  { id: "s7", title: "Der zweite Turm", start: 47, end: 55 },
  { id: "s8", title: "Das Finale", start: 55, end: 61 },
] as const;

/**
 * Historische Ereignisse (Ortszeit New York) und ihr Zeitpunkt im Video.
 * Die Video-Zeitpunkte sind an die gesprochenen Wörter gekoppelt.
 */
export const EVENTS = {
  impact1: { clock: "08:46", minutes: 8 * 60 + 46, t: wordAt("Nordturm.", "s3") - 0.05 },
  impact2: { clock: "09:03", minutes: 9 * 60 + 3, t: wordAt("Südturm.", "s5") - 0.05 },
  collapseS: { clock: "09:59", minutes: 9 * 60 + 59, t: wordAt("stürzt", "s6") },
  collapseN: { clock: "10:28", minutes: 10 * 60 + 28, t: wordAt("stürzt", "s7") },
};

/** Dauer der stilisierten Einstürze im Video (s). */
export const COLLAPSE_DUR = { S: 4.6, N: 5.0 };

/** Video-Zeit -> Uhrzeit (Minuten seit Mitternacht), stückweise linear zwischen den Ereignissen. */
const CLOCK_KEYS: [number, number][] = [
  [0, 8 * 60 + 39],
  [EVENTS.impact1.t, EVENTS.impact1.minutes],
  [EVENTS.impact1.t + 4.4, EVENTS.impact1.minutes + 0.99],
  [EVENTS.impact2.t, EVENTS.impact2.minutes],
  [EVENTS.impact2.t + 4.4, EVENTS.impact2.minutes + 0.99],
  [EVENTS.collapseS.t, EVENTS.collapseS.minutes],
  [EVENTS.collapseS.t + 3.6, EVENTS.collapseS.minutes + 0.99],
  [EVENTS.collapseN.t, EVENTS.collapseN.minutes],
  [TOTAL_S, 10 * 60 + 31],
];
export const clockMinutes = (t: number) => {
  for (let i = 1; i < CLOCK_KEYS.length; i++) {
    const [t0, m0] = CLOCK_KEYS[i - 1];
    const [t1, m1] = CLOCK_KEYS[i];
    if (t <= t1) return lerp(m0, m1, clamp((t - t0) / (t1 - t0)));
  }
  return CLOCK_KEYS[CLOCK_KEYS.length - 1][1];
};
export const fmtClock = (minutes: number) => {
  const m = Math.floor(minutes + 1e-6);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Einstellungen (Schnittliste). Zeiten in Sekunden; Kamera siehe camera.ts */
export const SHOTS = [
  { id: "hook", start: 0 },
  { id: "morning", start: 5.0 },
  { id: "tiltNorth", start: wordAt("Türme", "s2") - 1.2 },
  { id: "impact1", start: 13.0 },
  { id: "lookUp", start: 21.0 },
  { id: "smokeStreet", start: wordAt("Viele", "s4") + 0.6 },
  { id: "impact2", start: 30.0 },
  { id: "evac", start: 38.0 },
  { id: "collapseS", start: wordAt("Um", "s6") - 0.25 },
  { id: "dustStreet", start: 47.0 },
  { id: "collapseN", start: wordAt("Um", "s7") - 0.25 },
  { id: "finaleStreet", start: 55.0 },
  { id: "skyline", start: wordAt("Ein", "s8") - 0.5 },
] as const;
export type ShotId = (typeof SHOTS)[number]["id"];

export const shotAt = (t: number) => {
  let i = 0;
  while (i + 1 < SHOTS.length && t >= SHOTS[i + 1].start) i++;
  const start = SHOTS[i].start;
  const end = i + 1 < SHOTS.length ? SHOTS[i + 1].start : TOTAL_S;
  return { id: SHOTS[i].id as ShotId, start, end, local: t - start, p: clamp((t - start) / (end - start)) };
};
