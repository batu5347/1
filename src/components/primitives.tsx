import React from "react";
import { AbsoluteFill, random } from "remotion";
import { C } from "../theme";

/** Globale SVG-Verläufe, einmal im Dokument definiert und überall per url(#id) nutzbar. */
const GLOWS: [string, string][] = [
  ["gWarm", C.warm],
  ["gSodium", C.sodium],
  ["gRed", C.red],
  ["gBlue", C.blue],
  ["gGreen", C.green],
  ["gWhite", "#ffffff"],
  ["gCool", "#9cc4ff"],
  ["gAmber", C.amber],
];

export const GlobalDefs: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <defs>
      {GLOWS.map(([id, color]) => (
        <radialGradient key={id} id={id}>
          <stop offset="0%" stopColor={color} stopOpacity={1} />
          <stop offset="18%" stopColor={color} stopOpacity={0.55} />
          <stop offset="45%" stopColor={color} stopOpacity={0.16} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      ))}
      <linearGradient id="beamWarm" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#fff4d6" stopOpacity={0.75} />
        <stop offset="35%" stopColor="#ffe2a8" stopOpacity={0.28} />
        <stop offset="100%" stopColor="#ffd38a" stopOpacity={0} />
      </linearGradient>
      <linearGradient id="beamCool" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#f2f7ff" stopOpacity={0.8} />
        <stop offset="35%" stopColor="#cfe1ff" stopOpacity={0.25} />
        <stop offset="100%" stopColor="#cfe1ff" stopOpacity={0} />
      </linearGradient>
      <filter id="soft4" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
      <filter id="soft12" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="12" />
      </filter>
    </defs>
  </svg>
);

type GlowName = "gWarm" | "gSodium" | "gRed" | "gBlue" | "gGreen" | "gWhite" | "gCool" | "gAmber";

/** Lichtpunkt mit Halo (SVG). */
export const Glow: React.FC<{
  x: number;
  y: number;
  r: number;
  g?: GlowName;
  o?: number;
  sx?: number;
}> = ({ x, y, r, g = "gWarm", o = 1, sx = 1 }) =>
  o <= 0.001 ? null : (
    <ellipse cx={x} cy={y} rx={r * sx} ry={r} fill={`url(#${g})`} opacity={o} style={{ mixBlendMode: "screen" }} />
  );

/** Menschliche Silhouette (Ursprung: Füße Mitte). Höhe in px. */
export const Person: React.FC<{
  x: number;
  y: number;
  h: number;
  pose?: "stand" | "phone" | "torch" | "walk";
  flip?: boolean;
  fill?: string;
  rim?: string;
  step?: number; // Gehphase 0..1
}> = ({ x, y, h, pose = "stand", flip = false, fill = "#030509", rim, step = 0 }) => {
  const s = h / 260;
  const sw = Math.sin(step * Math.PI * 2);
  const leg = pose === "walk" || pose === "torch" ? sw * 9 : 0;
  const body = `M38 48 Q50 54 62 48 L76 55 Q86 60 86 74 L84 150 L78 152 L74 104 L74 156
    L${68 + leg} 254 Q${68 + leg} 260 ${62 + leg} 260 L${55 + leg} 260 L51 168 L49 168
    L${45 - leg} 260 L${38 - leg} 260 Q${32 - leg} 260 ${32 - leg} 254 L26 156 L26 104 L22 152 L16 150 L14 74 Q14 60 24 55 Z`;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) translate(-50 -260)`}>
      <ellipse cx={50} cy={24} rx={16} ry={19} fill={fill} />
      <rect x={44} y={38} width={12} height={14} fill={fill} />
      <path d={body} fill={fill} />
      {pose === "phone" && (
        <>
          <path d="M80 70 L92 110 L70 96 L64 92 Z" fill={fill} />
          <rect x={58} y={84} width={14} height={22} rx={2} fill="#bfe0ff" transform="rotate(-25 65 95)" />
        </>
      )}
      {pose === "torch" && <path d="M78 66 L128 92 L126 100 L76 84 Z" fill={fill} />}
      {rim && <path d={body} fill="none" stroke={rim} strokeWidth={2.2 / s} opacity={0.55} />}
      {rim && <ellipse cx={50} cy={24} rx={16} ry={19} fill="none" stroke={rim} strokeWidth={2 / s} opacity={0.55} />}
    </g>
  );
};

/** Lichtkegel einer Taschenlampe. angle in Grad (0 = rechts). */
export const Beam: React.FC<{
  x: number;
  y: number;
  angle: number;
  length: number;
  spread?: number;
  o?: number;
  cool?: boolean;
}> = ({ x, y, angle, length, spread = 16, o = 1, cool = false }) => {
  const w = Math.tan((spread * Math.PI) / 180) * length;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} opacity={o} style={{ mixBlendMode: "screen" }}>
      <polygon points={`0,-3 ${length},${-w} ${length},${w} 0,3`} fill={`url(#${cool ? "beamCool" : "beamWarm"})`} />
      <polygon
        points={`0,-1.5 ${length * 0.6},${-w * 0.35} ${length * 0.6},${w * 0.35} 0,1.5`}
        fill={`url(#${cool ? "beamCool" : "beamWarm"})`}
        opacity={0.6}
      />
      <circle r={7} fill="#fffaf0" />
      <circle r={26} fill="url(#gWhite)" opacity={0.7} />
    </g>
  );
};

/** Sternenhimmel / Nachthimmel als Hintergrund. */
export const NightSky: React.FC<{ top?: string; bottom?: string; stars?: number; seed?: string; o?: number }> = ({
  top = "#02040a",
  bottom = "#0d1a2e",
  stars = 60,
  seed = "sky",
  o = 1,
}) => (
  <>
    <rect x={0} y={0} width={1080} height={1920} fill={`url(#sky-${seed})`} />
    <defs>
      <linearGradient id={`sky-${seed}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={top} />
        <stop offset="100%" stopColor={bottom} />
      </linearGradient>
    </defs>
    {new Array(stars).fill(0).map((_, i) => (
      <circle
        key={i}
        cx={random(`${seed}x${i}`) * 1080}
        cy={random(`${seed}y${i}`) * 900}
        r={0.6 + random(`${seed}r${i}`) * 1.4}
        fill="#dfe8ff"
        opacity={(0.25 + random(`${seed}o${i}`) * 0.5) * o}
      />
    ))}
  </>
);

/** Ganzflächiges SVG im Videoformat. */
export const Stage: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={style}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
      {children}
    </svg>
  </AbsoluteFill>
);

/** Kamerabewegung: langsamer Zoom/Schwenk + leichtes Handkamera-Wackeln. */
export const CamMove: React.FC<{
  children: React.ReactNode;
  frame: number;
  dur: number;
  z0?: number;
  z1?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  hand?: number;
  originY?: number;
}> = ({ children, frame, dur, z0 = 1.02, z1 = 1.1, x0 = 0, x1 = 0, y0 = 0, y1 = 0, hand = 1, originY = 50 }) => {
  const p = Math.min(1, Math.max(0, frame / Math.max(1, dur)));
  const e = 1 - Math.pow(1 - p, 2);
  const hx = (Math.sin(frame * 0.051) * 5 + Math.sin(frame * 0.137) * 2) * hand;
  const hy = (Math.cos(frame * 0.043) * 4 + Math.sin(frame * 0.111) * 2) * hand;
  const z = z0 + (z1 - z0) * e;
  return (
    <AbsoluteFill
      style={{
        transform: `translate(${x0 + (x1 - x0) * e + hx}px, ${y0 + (y1 - y0) * e + hy}px) scale(${z})`,
        transformOrigin: `50% ${originY}%`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
