import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { ShotProps } from "../BlackoutVideo";
import { Glow, Stage } from "../components/primitives";
import germany from "../data/germany.json";
import { clamp, powerReturn } from "../lib/anim";
import { CTA_FRAME, SHOTS } from "../timeline";

/** Dunkle Deutschlandkarte; nach und nach kehren Lichtpunkte zurück, Kamera zoomt heraus. */
export const MapShot: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const from = SHOTS.find((s) => s.id === "map")!.from;
  const cta = CTA_FRAME - from;
  const scale = interpolate(f, [0, dur], [1.32, 0.9], clamp);
  const cy = interpolate(f, [0, dur], [820, 900], clamp);
  // Am Ende wird es fast vollständig dunkel
  const master = interpolate(f, [cta - 50, cta - 5], [1, 0.12], clamp);
  const ox = 540 - (germany.width / 2) * scale;
  const oy = cy - (germany.height / 2) * scale;
  return (
    <Stage>
      <rect width={1080} height={1920} fill="#020306" />
      <g transform={`translate(${ox} ${oy}) scale(${scale})`} opacity={master}>
        <path d={germany.neighbours} fill="#06090f" stroke="#111a28" strokeWidth={1.2 / scale} />
        <path d={germany.outline} fill="#070b14" stroke="#3a5a8c" strokeWidth={2.4 / scale} />
        {germany.lights.map((l, i) => {
          const at = 18 + l.d * 190;
          const lvl = powerReturn(f, at, `ml${i}`, 6) * (l.d < 0.7 ? 1 : 0);
          return lvl > 0 ? <circle key={i} cx={l.x} cy={l.y} r={l.r * 1.4} fill="#ffcf85" opacity={0.85 * lvl} /> : null;
        })}
        {germany.cities.map((c, i) => {
          const at = 30 + i * 4;
          const lvl = powerReturn(f, at, `mc${i}`, 8);
          const r = 18 + Math.sqrt(c.pop) * 46;
          return <Glow key={c.name} x={c.x} y={c.y} r={r} g="gSodium" o={0.8 * lvl} />;
        })}
        {germany.cities.slice(0, 6).map((c, i) => {
          const lvl = powerReturn(f, 30 + i * 4, `mt${i}`, 8);
          return (
            <text key={c.name} x={c.x + 14} y={c.y - 12} fontFamily="JetBrains Mono" fontWeight={700} fontSize={22 / scale} fill="#e9eef8" opacity={0.7 * lvl}>
              {c.name.toUpperCase()}
            </text>
          );
        })}
      </g>
    </Stage>
  );
};
