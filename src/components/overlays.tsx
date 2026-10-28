import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, easeOut, fade } from "../lib/anim";
import { CUES, SCENES, WORDS } from "../timeline";
import { C, FONT, SAFE } from "../theme";

/** Filmische Nachbearbeitung: Vignette, Körnung, leichter Farbstich. */
export const Grade: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse 85% 60% at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 85%, rgba(0,0,0,0.85) 100%)",
        }}
      />
      <AbsoluteFill style={{ background: "rgba(20,60,90,0.07)", mixBlendMode: "color" }} />
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0, opacity: 0.11, mixBlendMode: "overlay" }}>
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={frame % 24} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Kennzeichnung: inszenierte, illustrative Rekonstruktion. */
export const Badge: React.FC = () => (
  <div
    style={{
      position: "absolute",
      left: SAFE.left,
      top: SAFE.top + 70,
      fontFamily: FONT.mono,
      fontWeight: 500,
      fontSize: 21,
      letterSpacing: 2.5,
      color: "rgba(255,255,255,0.62)",
      display: "flex",
      alignItems: "center",
      gap: 10,
    }}
  >
    <span style={{ width: 9, height: 9, borderRadius: 9, background: C.red, boxShadow: `0 0 10px ${C.red}` }} />
    SZENARIO · ILLUSTRATIVE REKONSTRUKTION
  </div>
);

/** Kurzer Abblendeffekt an Schnitten. */
export const CutDip: React.FC<{ at: number; len?: number; color?: string }> = ({ at, len = 5, color = "#000" }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at - 2, at, at + len], [0, 0.9, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{ background: color, opacity: o }} /> : null;
};

/** Eingebrannte Untertitel, wortgenau aus den Alignment-Daten der Sprachaufnahme. */
export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cue = CUES.find((c) => t >= c.start && t < c.end);
  if (!cue) return null;
  const local = frame - cue.start * fps;
  const pop = spring({ frame: local, fps, config: { damping: 18, stiffness: 260 } });
  const out = interpolate(t, [cue.end - 0.08, cue.end], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left + 6,
        right: SAFE.right - 40,
        bottom: SAFE.bottom + 40,
        display: "flex",
        justifyContent: "center",
        opacity: Math.min(1, local / 3) * out,
        transform: `translateY(${(1 - pop) * 18}px) scale(${0.96 + pop * 0.04})`,
      }}
    >
      <div
        style={{
          fontFamily: FONT.body,
          fontWeight: 800,
          fontSize: 64,
          lineHeight: 1.18,
          textAlign: "center",
          color: C.text,
          maxWidth: 820,
          textShadow: "0 3px 0 rgba(0,0,0,0.85), 0 0 22px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.9)",
          WebkitTextStroke: "1.5px rgba(0,0,0,0.55)",
          paintOrder: "stroke fill",
        }}
      >
        {cue.words.map((wi, i) => {
          const w = WORDS[wi];
          const active = t >= w.start - 0.03 && t < w.end + 0.05;
          const spoken = t >= w.start - 0.03;
          return (
            <span
              key={wi}
              style={{
                display: "inline-block",
                marginRight: i < cue.words.length - 1 ? "0.32em" : 0,
                color: w.key ? C.amber : C.text,
                opacity: spoken ? 1 : 0.78,
                transform: `scale(${active ? 1.07 : 1})`,
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};

/** Lesbarkeits-Verlauf hinter den Untertiteln und unter dem oberen HUD. */
export const ReadabilityShade: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.6) 78%, rgba(0,0,0,0.35) 100%)",
    }}
  />
);

const MILESTONES = [
  { label: "10 MIN", scene: "s2", minutes: 10 },
  { label: "1 STD", scene: "s3", minutes: 60 },
  { label: "6 STD", scene: "s4", minutes: 360 },
  { label: "12 STD", scene: "s5", minutes: 720 },
  { label: "24 STD", scene: "s6", minutes: 1440 },
];

/** Verstrichene Zeit seit dem Stromausfall in Minuten (animierte Uhr). */
export const elapsedMinutes = (frame: number) => {
  let prev = 0;
  for (const m of MILESTONES) {
    const sc = SCENES.find((s) => s.id === m.scene)!;
    if (frame < sc.to) {
      const p = interpolate(frame, [sc.from, sc.from + 40], [0, 1], { ...clamp });
      return prev + (m.minutes - prev) * (1 - Math.pow(1 - p, 3));
    }
    prev = m.minutes;
  }
  return 1440;
};

const fmt = (min: number) => {
  const h = Math.floor(min / 60);
  const m = Math.floor(min % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

/** Zeitleiste oben: Fortschritt über 10 Min → 24 Std, plus Digitaluhr. */
export const TimeHUD: React.FC<{ from: number; to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const mins = elapsedMinutes(frame);
  const appear = easeOut(frame, from, from + 12) * fade(frame, to - 10, to, 1, 0);
  if (appear <= 0) return null;
  const width = 1080 - SAFE.left - SAFE.right - 150;
  const idx = MILESTONES.filter((m) => mins >= m.minutes - 0.01).length - 1;
  const segs = MILESTONES.length - 1;
  // Fortschritt zwischen den Meilensteinen (gleichmäßig verteilt).
  let pos = 0;
  for (let i = 0; i < MILESTONES.length; i++) {
    const a = i === 0 ? 0 : MILESTONES[i - 1].minutes;
    const b = MILESTONES[i].minutes;
    if (mins <= b) {
      pos = i === 0 ? 0 : (i - 1 + (mins - a) / (b - a)) / segs;
      break;
    }
    pos = 1;
  }
  return (
    <div style={{ position: "absolute", left: SAFE.left, top: SAFE.top - 6, opacity: appear }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
        <div
          style={{
            fontFamily: FONT.mono,
            fontWeight: 700,
            fontSize: 34,
            color: C.text,
            background: "rgba(255,59,47,0.16)",
            border: "1.5px solid rgba(255,59,47,0.55)",
            padding: "4px 12px",
            borderRadius: 8,
            letterSpacing: 1,
          }}
        >
          <span style={{ color: C.red }}>T+</span> {fmt(mins)}
        </div>
        <div style={{ position: "relative", width, height: 46 }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 10, height: 4, background: "rgba(255,255,255,0.18)", borderRadius: 4 }} />
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 10,
              height: 4,
              width: width * pos,
              background: `linear-gradient(90deg, ${C.amber}, ${C.red})`,
              borderRadius: 4,
              boxShadow: `0 0 12px ${C.red}`,
            }}
          />
          {MILESTONES.map((m, i) => {
            const x = (i / segs) * width;
            const reached = i <= idx;
            return (
              <React.Fragment key={m.label}>
                <div
                  style={{
                    position: "absolute",
                    left: x - 7,
                    top: 5,
                    width: 14,
                    height: 14,
                    borderRadius: 14,
                    background: reached ? C.red : "#2a3344",
                    boxShadow: reached ? `0 0 10px ${C.red}` : "none",
                    border: "2px solid rgba(255,255,255,0.7)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: x,
                    top: 24,
                    transform: "translateX(-50%)",
                    fontFamily: FONT.mono,
                    fontSize: 17,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    color: reached ? C.text : "rgba(255,255,255,0.45)",
                  }}
                >
                  {m.label}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** Analoge Uhr, deren Zeiger die verstrichene Zeit zeigen. */
const Clock: React.FC<{ minutes: number; size: number }> = ({ minutes, size }) => {
  const hourA = (minutes / 720) * 360;
  const minA = (minutes / 60) * 360;
  return (
    <svg width={size} height={size} viewBox="-60 -60 120 120">
      <circle r={54} fill="rgba(5,8,14,0.7)" stroke={C.text} strokeWidth={5} />
      {new Array(12).fill(0).map((_, i) => (
        <line key={i} x1={0} y1={-44} x2={0} y2={i % 3 === 0 ? -34 : -39} stroke={C.text} strokeWidth={i % 3 === 0 ? 5 : 3} transform={`rotate(${i * 30})`} />
      ))}
      <line x1={0} y1={6} x2={0} y2={-26} stroke={C.text} strokeWidth={7} strokeLinecap="round" transform={`rotate(${hourA})`} />
      <line x1={0} y1={8} x2={0} y2={-40} stroke={C.red} strokeWidth={4} strokeLinecap="round" transform={`rotate(${minA})`} />
      <circle r={5} fill={C.red} />
    </svg>
  );
};

/** Große Zeiteinblendung am Szenenanfang ("1 STUNDE" …) mit animierter Uhr. */
export const SceneLabel: React.FC<{ from: number; value: string; unit: string; hold?: number }> = ({
  from,
  value,
  unit,
  hold = 66,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const local = frame - from;
  if (local < 0 || local > hold + 14) return null;
  const s = spring({ frame: local, fps, config: { damping: 14, stiffness: 180 } });
  const out = fade(local, hold, hold + 12, 1, 0);
  const mins = elapsedMinutes(frame);
  const blur = interpolate(local, [0, 5], [14, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 400,
        display: "flex",
        justifyContent: "center",
        opacity: out * Math.min(1, local / 3),
        transform: `scale(${1.35 - 0.35 * s}) translateY(${(1 - out) * -40}px)`,
        filter: `blur(${blur}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28, padding: "18px 40px", background: "rgba(3,6,12,0.55)", borderRadius: 18, border: "1px solid rgba(255,255,255,0.14)" }}>
        <Clock minutes={mins} size={128} />
        <div style={{ display: "flex", flexDirection: "column", lineHeight: 0.92 }}>
          <span style={{ fontFamily: FONT.head, fontWeight: 700, fontSize: 150, color: C.text, letterSpacing: 2, textShadow: "0 0 30px rgba(255,59,47,0.45)" }}>
            {value}
          </span>
          <span style={{ fontFamily: FONT.head, fontWeight: 600, fontSize: 62, color: C.red, letterSpacing: 8, marginTop: 14 }}>{unit}</span>
        </div>
      </div>
    </div>
  );
};

/** Kleine Info-Markierung mit Linie (dokumentarischer Stil). */
export const Callout: React.FC<{
  x: number;
  y: number;
  text: string;
  sub?: string;
  from: number;
  to?: number;
  color?: string;
  align?: "left" | "right";
}> = ({ x, y, text, sub, from, to = 99999, color = C.amber, align = "left" }) => {
  const frame = useCurrentFrame();
  const o = easeOut(frame, from, from + 8) * fade(frame, to - 6, to, 1, 0);
  if (o <= 0) return null;
  const grow = easeOut(frame, from, from + 10);
  return (
    <div
      style={{
        position: "absolute",
        left: align === "left" ? x : undefined,
        right: align === "right" ? 1080 - x : undefined,
        top: y,
        opacity: o,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "left" ? "flex-start" : "flex-end",
      }}
    >
      <div
        style={{
          fontFamily: FONT.mono,
          fontWeight: 700,
          fontSize: 30,
          color: "#0a0d12",
          background: color,
          padding: "5px 14px",
          letterSpacing: 1.5,
          clipPath: `inset(0 ${100 - grow * 100}% 0 0)`,
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </div>
      {sub && (
        <div
          style={{
            fontFamily: FONT.mono,
            fontWeight: 500,
            fontSize: 24,
            color: C.text,
            background: "rgba(5,8,14,0.75)",
            padding: "4px 14px",
            marginTop: 4,
            whiteSpace: "nowrap",
            opacity: easeOut(frame, from + 6, from + 14),
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
