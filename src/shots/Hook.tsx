import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { ShotProps } from "../BlackoutVideo";
import { clamp } from "../lib/anim";
import { BLACKOUT_FRAME } from "../timeline";
import { C, FONT } from "../theme";
import { CityCanvas, hookMode, returnMode, wideMode } from "./City";

export const CityHook: React.FC<ShotProps> = ({ dur }) => {
  const mode = useMemo(() => hookMode(BLACKOUT_FRAME, dur), [dur]);
  const frame = useCurrentFrame();
  // Kurzer Erschütterungs-Impuls beim Ausfall
  const k = frame - BLACKOUT_FRAME;
  const shake = k >= 0 && k < 14 ? Math.sin(k * 2.7) * (14 - k) * 1.1 : 0;
  return (
    <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px)` }}>
      <CityCanvas mode={mode} />
    </AbsoluteFill>
  );
};

export const CityWide: React.FC<ShotProps> = ({ dur }) => {
  const mode = useMemo(() => wideMode(dur), [dur]);
  return <CityCanvas mode={mode} />;
};

export const CityReturn: React.FC<ShotProps> = ({ dur }) => {
  const mode = useMemo(() => returnMode(dur, Math.round(dur * 0.5)), [dur]);
  return <CityCanvas mode={mode} />;
};

/** "DEUTSCHLAND." sofort, "24 STUNDEN OHNE STROM." im Moment des Ausfalls. */
export const HookTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 16, stiffness: 220 } });
  const b = spring({ frame: frame - BLACKOUT_FRAME, fps, config: { damping: 13, stiffness: 200 } });
  const out = interpolate(frame, [108, 120], [1, 0], clamp);
  const flick = frame >= BLACKOUT_FRAME && frame < BLACKOUT_FRAME + 6 ? (frame % 2 ? 0.4 : 1) : 1;
  return (
    <AbsoluteFill style={{ alignItems: "center", opacity: out }}>
      <div style={{ position: "absolute", top: 520, width: "100%", textAlign: "center" }}>
        <div
          style={{
            fontFamily: FONT.head,
            fontWeight: 700,
            fontSize: 150,
            letterSpacing: 6,
            color: C.text,
            opacity: Math.min(1, frame / 2) * flick,
            transform: `scale(${1.25 - 0.25 * a})`,
            textShadow: "0 0 40px rgba(0,0,0,0.9), 0 6px 0 rgba(0,0,0,0.6)",
          }}
        >
          DEUTSCHLAND.
        </div>
        {frame >= BLACKOUT_FRAME && (
          <div
            style={{
              marginTop: 10,
              fontFamily: FONT.head,
              fontWeight: 700,
              fontSize: 96,
              lineHeight: 1.0,
              letterSpacing: 3,
              color: C.text,
              transform: `scale(${1.6 - 0.6 * b})`,
              opacity: Math.min(1, b * 1.5),
              textShadow: "0 0 40px rgba(0,0,0,0.95)",
            }}
          >
            <span style={{ color: C.red }}>24 STUNDEN</span>
            <br />
            OHNE STROM.
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
