import timelineData from "./data/timeline.json";
import vo from "./data/voiceover.json";

export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const TOTAL_FRAMES = 1830; // exakt 61 s

export type Word = (typeof vo.words)[number];
export type Cue = (typeof vo.cues)[number];
type Anchor = number | { w: string; s: string; o?: number; n?: number };

const bare = (t: string) => t.replace(/[^\p{L}\p{N}]/gu, "");

/** Gleiche Logik wie resolve() in scripts/generate_soundtrack.py */
export const resolveTime = (at: Anchor): number => {
  if (typeof at === "number") return at;
  const hits = vo.words.filter((w) => w.scene === at.s && bare(w.text) === at.w);
  const hit = hits[at.n ?? 0];
  if (!hit) throw new Error(`Wort-Anker nicht gefunden: ${at.w} (${at.s})`);
  return hit.start + (at.o ?? 0);
};

export const toFrame = (sec: number) => Math.round(sec * FPS);

/** Startframe eines Wortes (für wortgenaue Animationen). */
export const wordFrame = (w: string, s: string, o = 0, n = 0) => toFrame(resolveTime({ w, s, o, n }));

export const SCENES = timelineData.scenes.map((s) => ({
  ...s,
  from: toFrame(s.start),
  to: toFrame(s.end),
}));

export type ShotId = (typeof timelineData.shots)[number]["id"];

export const SHOTS = timelineData.shots.map((s, i, all) => {
  const from = toFrame(resolveTime(s.at as Anchor));
  const next = all[i + 1];
  const to = next ? toFrame(resolveTime(next.at as Anchor)) : TOTAL_FRAMES;
  return { id: s.id as ShotId, from, duration: to - from };
});

export const BLACKOUT_FRAME = toFrame(resolveTime(timelineData.blackout as Anchor));
export const QUESTION_FRAME = toFrame(resolveTime(timelineData.question as Anchor));
export const CTA_FRAME = toFrame(timelineData.cta);

export const WORDS = vo.words;
export const CUES = vo.cues;
