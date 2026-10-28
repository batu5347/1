import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { easeOut, fade } from "../lib/anim";
import { CTA_FRAME, QUESTION_FRAME, SCENES, wordFrame } from "../timeline";
import { C, FONT } from "../theme";

const ITEMS = [
  { label: "WASSER", w: "Wasser", color: "#7fb6ff" },
  { label: "LICHT", w: "Licht", color: C.warm },
  { label: "AKKU", w: "Akku", color: C.green },
];

const Icon: React.FC<{ kind: string; color: string }> = ({ kind, color }) => (
  <svg width={54} height={54} viewBox="0 0 54 54">
    {kind === "WASSER" && <path d="M27 6 C27 6 10 26 10 36 a17 17 0 0 0 34 0 C44 26 27 6 27 6 Z" fill={color} />}
    {kind === "LICHT" && (
      <g fill={color}>
        <rect x={20} y={20} width={14} height={30} rx={3} />
        <path d="M14 6 h26 l-6 14 h-14 z" />
      </g>
    )}
    {kind === "AKKU" && (
      <g>
        <rect x={6} y={14} width={38} height={26} rx={5} fill="none" stroke={color} strokeWidth={4} />
        <rect x={45} y={22} width={5} height={10} fill={color} />
        <rect x={11} y={19} width={22} height={16} fill={color} />
      </g>
    )}
  </svg>
);

/** "WÄRST DU VORBEREITET?" + Checkliste synchron zur Stimme + Schluss-CTA. */
export const Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s7 = SCENES.find((s) => s.id === "s7")!.from;
  const g = frame + s7; // globaler Frame
  const q = spring({ frame: g - QUESTION_FRAME, fps, config: { damping: 14, stiffness: 170 } });
  const preCta = fade(g, CTA_FRAME - 8, CTA_FRAME, 1, 0);
  const cta = spring({ frame: g - CTA_FRAME, fps, config: { damping: 12, stiffness: 210 } });
  return (
    <AbsoluteFill>
      {g >= QUESTION_FRAME && (
        <div
          style={{
            position: "absolute",
            top: 330,
            width: "100%",
            textAlign: "center",
            opacity: Math.min(1, q * 1.4) * preCta,
            transform: `scale(${1.3 - 0.3 * q})`,
            fontFamily: FONT.head,
            fontWeight: 700,
            fontSize: 112,
            lineHeight: 1.0,
            color: C.text,
            letterSpacing: 3,
            textShadow: "0 0 40px rgba(0,0,0,0.95), 0 0 80px rgba(255,59,47,0.35)",
          }}
        >
          WÄRST DU
          <br />
          <span style={{ color: C.red }}>VORBEREITET?</span>
        </div>
      )}
      <div style={{ position: "absolute", top: 1090, width: "100%", display: "flex", justifyContent: "center", gap: 22, opacity: preCta }}>
        {ITEMS.map((it) => {
          const at = wordFrame(it.w, "s7", -0.05);
          const a = easeOut(g, at, at + 8);
          if (a <= 0) return null;
          return (
            <div
              key={it.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 22px 10px 14px",
                borderRadius: 16,
                background: "rgba(6,9,15,0.82)",
                border: `2px solid ${it.color}`,
                opacity: a,
                transform: `translateY(${(1 - a) * 30}px)`,
              }}
            >
              <Icon kind={it.label} color={it.color} />
              <span style={{ fontFamily: FONT.head, fontWeight: 600, fontSize: 46, color: C.text, letterSpacing: 2 }}>{it.label}</span>
              <span style={{ width: 30, height: 30, border: `3px solid ${C.text}`, borderRadius: 6, marginLeft: 4 }} />
            </div>
          );
        })}
      </div>
      {g >= CTA_FRAME && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              textAlign: "center",
              transform: `scale(${1.25 - 0.25 * cta})`,
              opacity: Math.min(1, cta * 1.6),
              fontFamily: FONT.head,
              fontWeight: 700,
              fontSize: 104,
              lineHeight: 1.02,
              color: C.text,
              letterSpacing: 2,
              textShadow: "0 0 40px rgba(0,0,0,0.9)",
              marginTop: -120,
            }}
          >
            <svg width={120} height={110} viewBox="0 0 120 110" style={{ display: "block", margin: "0 auto 18px" }}>
              <path d="M10 10 h100 a8 8 0 0 1 8 8 v56 a8 8 0 0 1 -8 8 h-58 l-26 22 v-22 h-16 a8 8 0 0 1 -8 -8 v-56 a8 8 0 0 1 8 -8 z" fill={C.amber} />
              <circle cx={38} cy={46} r={7} fill="#0a0d12" />
              <circle cx={60} cy={46} r={7} fill="#0a0d12" />
              <circle cx={82} cy={46} r={7} fill="#0a0d12" />
            </svg>
            SCHREIB ES IN
            <br />
            <span style={{ color: C.amber }}>DIE KOMMENTARE.</span>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
