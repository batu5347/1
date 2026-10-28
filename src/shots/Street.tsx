import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame } from "remotion";
import type { ShotProps } from "../BlackoutVideo";
import { Callout } from "../components/overlays";
import { Beam, CamMove, Glow, NightSky, Person, Stage } from "../components/primitives";
import { clamp, easeOut, powerFail } from "../lib/anim";
import { localWord } from "../lib/shot";

const VP = { x: 540, y: 860 }; // Fluchtpunkt

/** Häuserzeile in Zentralperspektive (links oder rechts der Straße). */
const SideBuildings: React.FC<{ side: -1 | 1; seed: string; lit?: number; tint?: string }> = ({
  side,
  seed,
  lit = 0,
  tint = "#0b111c",
}) => {
  const edgeX = side < 0 ? 0 : 1080;
  const nearX = side < 0 ? 250 : 830;
  const items: React.ReactNode[] = [];
  // Fassade als Trapez zum Fluchtpunkt
  const top = 120;
  items.push(
    <polygon
      key="f"
      points={`${edgeX},${top - 300} ${VP.x + side * 120},${VP.y - 260} ${VP.x + side * 120},${VP.y + 40} ${edgeX},1500`}
      fill={tint}
    />,
  );
  // Fensterreihen
  for (let c = 0; c < 9; c++) {
    const t0 = c / 9;
    const t1 = t0 + 0.06;
    for (let r = 0; r < 7; r++) {
      const lerpX = (t: number) => edgeX + (VP.x + side * 120 - edgeX) * t;
      const topAt = (t: number) => top - 300 + (VP.y - 260 - (top - 300)) * t;
      const botAt = (t: number) => 1500 + (VP.y + 40 - 1500) * t;
      const ry0 = r / 7.5 + 0.05;
      const ry1 = ry0 + 0.07;
      const y = (t: number, k: number) => topAt(t) + (botAt(t) - topAt(t)) * k;
      const on = random(`${seed}${c}-${r}`) < lit;
      items.push(
        <polygon
          key={`w${c}-${r}`}
          points={`${lerpX(t0)},${y(t0, ry0)} ${lerpX(t1)},${y(t1, ry0)} ${lerpX(t1)},${y(t1, ry1)} ${lerpX(t0)},${y(t0, ry1)}`}
          fill={on ? "#ffcf8a" : "#121a28"}
          opacity={on ? 0.85 : 1}
        />,
      );
    }
  }
  void nearX;
  return <g>{items}</g>;
};

const Road: React.FC<{ wet?: boolean }> = ({ wet = true }) => (
  <g>
    <polygon points={`-200,1920 ${VP.x - 30},${VP.y} ${VP.x + 30},${VP.y} 1280,1920`} fill={wet ? "#0a0e16" : "#0c0f15"} />
    {new Array(12).fill(0).map((_, i) => {
      const t0 = Math.pow(i / 12, 2);
      const t1 = Math.pow((i + 0.45) / 12, 2);
      const y0 = VP.y + (1920 - VP.y) * t0;
      const y1 = VP.y + (1920 - VP.y) * t1;
      const w0 = 2 + 18 * t0;
      const w1 = 2 + 18 * t1;
      return <polygon key={i} points={`${540 - w0},${y0} ${540 + w0},${y0} ${540 + w1},${y1} ${540 - w1},${y1}`} fill="#3a4250" opacity={0.6} />;
    })}
    <polygon points={`-200,1920 ${VP.x - 30},${VP.y} ${VP.x - 120},${VP.y} -900,1920`} fill="#121722" />
    <polygon points={`1280,1920 ${VP.x + 30},${VP.y} ${VP.x + 120},${VP.y} 1980,1920`} fill="#121722" />
  </g>
);

const Car: React.FC<{ x: number; y: number; s: number; brake: number; seed: string }> = ({ x, y, s, brake, seed }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-110 0 L-104 -60 Q-90 -110 -50 -116 L50 -116 Q90 -110 104 -60 L110 0 Q110 20 96 20 L-96 20 Q-110 20 -110 0 Z" fill="#06080d" />
    <rect x={-80} y={-104} width={160} height={40} rx={8} fill="#0d1420" />
    <rect x={-100} y={-48} width={42} height={16} rx={4} fill="#5a0b08" />
    <rect x={58} y={-48} width={42} height={16} rx={4} fill="#5a0b08" />
    <Glow x={-79} y={-40} r={40 + brake * 50} g="gRed" o={0.6 + brake * 0.4} sx={1.5} />
    <Glow x={79} y={-40} r={40 + brake * 50} g="gRed" o={0.6 + brake * 0.4} sx={1.5} />
    {brake > 0.5 && <Glow x={0} y={-108} r={28} g="gRed" o={brake} sx={2} />}
    {/* Spiegelung auf nasser Fahrbahn */}
    <Glow x={-79} y={110} r={90} g="gRed" o={(0.35 + brake * 0.3) * (0.8 + random(seed) * 0.2)} sx={0.25} />
    <Glow x={79} y={110} r={90} g="gRed" o={0.35 + brake * 0.3} sx={0.25} />
  </g>
);

/** Kreuzung: Ampel fällt aus, Autos bremsen. */
export const Traffic: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const failAt = localWord("traffic", "Ampeln", "s2", 0.05);
  const lamp = powerFail(f, failAt, "ampel", 9);
  const brake = interpolate(f, [failAt + 4, failAt + 12], [0, 1], clamp);
  const crossX = interpolate(f, [0, failAt + 10, failAt + 30], [-260, 160, 210], clamp);
  return (
    <CamMove frame={f} dur={dur} z0={1.04} z1={1.14} originY={48}>
      <Stage>
        <NightSky top="#03060d" bottom="#101b2c" seed="traffic" stars={40} />
        <SideBuildings side={-1} seed="tl" lit={0} />
        <SideBuildings side={1} seed="tr" lit={0} />
        <Road />
        {/* Querverkehr: Scheinwerfer von links */}
        <g transform={`translate(${crossX} 1010)`}>
          <rect x={-120} y={-60} width={240} height={70} rx={20} fill="#05070b" />
          <Glow x={118} y={-20} r={70} g="gWhite" o={0.9} sx={1.6} />
          <Beam x={118} y={-20} angle={4} length={520} spread={9} o={0.5} cool />
        </g>
        <Car x={430} y={1120} s={0.95} brake={brake} seed="c1" />
        <Car x={640} y={980} s={0.55} brake={brake} seed="c2" />
        <Car x={520} y={920} s={0.35} brake={brake * 0.8} seed="c3" />
        {/* Ampel */}
        <rect x={858} y={560} width={22} height={1100} fill="#0a0d13" />
        <rect x={792} y={560} width={122} height={330} rx={16} fill="#11161f" stroke="#1d2532" strokeWidth={4} />
        {[640, 726, 812].map((y, i) => (
          <g key={y}>
            <circle cx={853} cy={y} r={38} fill={i === 0 ? `rgb(${60 + 195 * lamp},${16 + 40 * lamp},${12 + 30 * lamp})` : "#1a1f28"} />
            <path d={`M813 ${y - 40} Q853 ${y - 62} 893 ${y - 40}`} fill="#0a0d13" />
          </g>
        ))}
        <Glow x={853} y={640} r={240} g="gRed" o={lamp * 0.9} />
        <Glow x={853} y={640} r={70} g="gWhite" o={lamp * 0.35} />
      </Stage>
      <Callout x={600} y={940} text="AMPELN: AUS" from={failAt + 12} />
    </CamMove>
  );
};

/** Menschen schauen ratlos auf ihre Smartphones. */
export const Phones: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const people = [
    { x: 200, y: 1560, h: 760, flip: false },
    { x: 860, y: 1640, h: 900, flip: true },
    { x: 520, y: 1380, h: 520, flip: false },
    { x: 700, y: 1300, h: 380, flip: true },
    { x: 330, y: 1270, h: 330, flip: true },
  ];
  return (
    <CamMove frame={f} dur={dur} z0={1.08} z1={1.0} x0={-30} x1={30}>
      <Stage>
        <NightSky top="#02040a" bottom="#0b1424" seed="ph" stars={30} />
        <SideBuildings side={-1} seed="pl" lit={0.02} />
        <SideBuildings side={1} seed="pr" lit={0.02} />
        <Road wet={false} />
        {people
          .slice()
          .sort((a, b) => a.h - b.h)
          .map((p, i) => {
            const s = p.h / 260;
            const hx = p.x + (p.flip ? -1 : 1) * 15 * s;
            const hy = p.y - 165 * s;
            const flick = 0.85 + 0.15 * Math.sin(f * 0.3 + i);
            return (
              <g key={i}>
                <Glow x={hx} y={hy} r={95 * s} g="gCool" o={0.55 * flick} />
                <Person x={p.x} y={p.y} h={p.h} pose="phone" flip={p.flip} rim="#9cc4ff" />
                <Glow x={hx} y={hy} r={22 * s} g="gWhite" o={0.6 * flick} />
              </g>
            );
          })}
      </Stage>
    </CamMove>
  );
};

/** Menschen gehen mit Taschenlampen nach Hause, es wird Nacht. */
export const FlashlightWalk: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const dusk = easeOut(f, 0, dur, 0, 1);
  const walkers = [
    { x: 330, y: 1500, h: 560, a: 70, ph: 0 },
    { x: 720, y: 1420, h: 440, a: 105, ph: 0.4 },
    { x: 540, y: 1260, h: 260, a: 80, ph: 0.7 },
  ];
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.12} y0={0} y1={-30}>
      <Stage>
        <NightSky top="#03060d" bottom={dusk < 0.5 ? "#1b2a44" : "#0d1626"} seed="fw" stars={50} o={dusk} />
        <rect x={0} y={0} width={1080} height={1000} fill="#2a3f63" opacity={0.35 * (1 - dusk)} />
        <SideBuildings side={-1} seed="fwl" lit={0.04} tint="#0a0f19" />
        <SideBuildings side={1} seed="fwr" lit={0.03} tint="#0a0f19" />
        <Road wet={false} />
        {walkers.map((w, i) => {
          const step = (f / 18 + w.ph) % 1;
          const s = w.h / 260;
          const sway = Math.sin(f * 0.12 + i) * 9;
          return (
            <g key={i}>
              <Beam x={w.x + 30 * s} y={w.y - 160 * s} angle={w.a + sway} length={900 * s} spread={13} o={0.85} />
              <Person x={w.x} y={w.y + Math.sin(step * Math.PI * 4) * 3} h={w.h} pose="walk" step={step} rim="#ffd38a" />
            </g>
          );
        })}
      </Stage>
    </CamMove>
  );
};

/** Viele Taschenlampen auf einer dunklen Straße (Totale von oben). */
export const FlashlightCrowd: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const n = 16;
  return (
    <CamMove frame={f} dur={dur} z0={1.12} z1={1.0}>
      <Stage>
        <rect width={1080} height={1920} fill="#05080e" />
        {/* Pflaster / Gehwegplatten von oben */}
        {new Array(24).fill(0).map((_, i) => (
          <line key={i} x1={0} y1={i * 90 + 40} x2={1080} y2={i * 90 + 80} stroke="#0d1320" strokeWidth={3} />
        ))}
        <rect x={0} y={0} width={180} height={1920} fill="#080b12" />
        <rect x={900} y={0} width={180} height={1920} fill="#080b12" />
        {new Array(n).fill(0).map((_, i) => {
          const bx = 200 + random(`fc${i}`) * 680;
          const by = 380 + random(`fcy${i}`) * 1000 + f * (1.2 + random(`fcs${i}`) * 1.6) * (i % 2 ? 1 : -1);
          const ang = (i % 2 ? 90 : -90) + Math.sin(f * 0.07 + i * 1.7) * 28;
          return (
            <g key={i}>
              <Beam x={bx} y={by} angle={ang} length={420} spread={15} o={0.55} cool={i % 3 === 0} />
              <circle cx={bx - 12} cy={by - (i % 2 ? 18 : -18)} r={22} fill="#020306" />
              <ellipse cx={bx - 12} cy={by - (i % 2 ? 18 : -18)} rx={34} ry={18} fill="#020306" />
            </g>
          );
        })}
      </Stage>
    </CamMove>
  );
};

/** Geschlossene Geschäfte, Menschen davor. */
export const ClosedShops: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const shops = [
    { name: "BÄCKEREI", x: 40 },
    { name: "APOTHEKE", x: 380 },
    { name: "SUPERMARKT", x: 720 },
  ];
  const beamA = -150 + Math.sin(f * 0.05) * 12;
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.1} x0={20} x1={-30}>
      <Stage>
        <NightSky top="#02040a" bottom="#0c1526" seed="cs" stars={50} />
        <rect x={0} y={420} width={1080} height={900} fill="#0b111b" />
        {new Array(6).fill(0).map((_, r) =>
          new Array(5).fill(0).map((__, c) => (
            <rect key={`${r}-${c}`} x={70 + c * 200} y={450 + r * 60} width={110} height={36} fill="#121b2a" />
          )),
        )}
        {shops.map((s, i) => (
          <g key={s.name}>
            <rect x={s.x} y={820} width={320} height={70} fill="#0e1520" stroke="#1e2838" strokeWidth={3} />
            <text x={s.x + 160} y={868} textAnchor="middle" fontFamily="Oswald" fontWeight={600} fontSize={40} fill="#3a465a" letterSpacing={4}>
              {s.name}
            </text>
            {i === 1 && <path d="M690 790 h24 v-24 h24 v24 h24 v24 h-24 v24 h-24 v-24 h-24 z" fill="#1d3a2a" transform="translate(-160 -20)" />}
            {/* Rollladen */}
            <rect x={s.x + 10} y={900} width={300} height={420} fill="#141b26" />
            {new Array(21).fill(0).map((_, k) => (
              <line key={k} x1={s.x + 10} x2={s.x + 310} y1={905 + k * 20} y2={905 + k * 20} stroke="#0a0f17" strokeWidth={4} />
            ))}
          </g>
        ))}
        {/* Zettel am Rollladen, von Taschenlampe angeleuchtet */}
        <g transform="rotate(-3 540 1040)">
          <rect x={455} y={985} width={170} height={120} fill="#d9d4c4" />
          <text x={540} y={1028} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={22} fill="#20242c">
            HEUTE
          </text>
          <text x={540} y={1058} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={22} fill="#20242c">
            GESCHLOSSEN
          </text>
          <text x={540} y={1086} textAnchor="middle" fontFamily="Inter" fontWeight={500} fontSize={15} fill="#30343c">
            (Stromausfall)
          </text>
        </g>
        <rect x={0} y={1320} width={1080} height={600} fill="#07090e" />
        <Beam x={880} y={1300} angle={beamA + 360} length={520} spread={9} o={0.9} />
        <Glow x={540} y={1045} r={150} g="gWarm" o={0.5 + Math.sin(f * 0.05) * 0.1} />
        <Person x={250} y={1640} h={620} pose="stand" rim="#7f9cc8" />
        <Person x={880} y={1700} h={720} pose="torch" flip rim="#ffd38a" />
        <Person x={600} y={1560} h={420} pose="phone" rim="#9cc4ff" />
      </Stage>
    </CamMove>
  );
};

/** Einsatzfahrzeug mit Blaulicht fährt durch die dunkle Straße. */
export const Emergency: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const flashL = Math.floor(f / 3) % 4 === 0 ? 1 : Math.floor(f / 3) % 4 === 1 ? 0.3 : 0;
  const flashR = Math.floor(f / 3) % 4 === 2 ? 1 : Math.floor(f / 3) % 4 === 3 ? 0.3 : 0;
  const vx = interpolate(f, [0, dur], [-260, 1240]);
  return (
    <CamMove frame={f} dur={dur} z0={1.06} z1={1.0} hand={1.6}>
      <Stage>
        <NightSky top="#02040a" bottom="#0b1424" seed="em" stars={30} />
        <SideBuildings side={-1} seed="el" lit={0.03} />
        <SideBuildings side={1} seed="er" lit={0.02} />
        <Road />
        {/* Blaulicht auf den Fassaden */}
        <rect x={0} y={0} width={540} height={1920} fill="#2f7dff" opacity={flashL * 0.22} style={{ mixBlendMode: "screen" }} />
        <rect x={540} y={0} width={540} height={1920} fill="#2f7dff" opacity={flashR * 0.22} style={{ mixBlendMode: "screen" }} />
        <g transform={`translate(${vx} 1180)`}>
          <path d="M-230 0 L-230 -170 Q-226 -190 -200 -190 L80 -190 Q120 -190 150 -150 L220 -80 Q236 -64 236 -40 L236 0 Z" fill="#0b0f16" />
          <rect x={-200} y={-170} width={240} height={14} fill="#c43a1e" opacity={0.6} />
          <rect x={-210} y={-120} width={420} height={18} fill="#d9dde4" opacity={0.18} />
          <circle cx={-140} cy={6} r={36} fill="#020306" />
          <circle cx={140} cy={6} r={36} fill="#020306" />
          <rect x={-130} y={-212} width={140} height={22} rx={6} fill="#14213a" />
          <Glow x={-100} y={-204} r={220} g="gBlue" o={flashL} />
          <Glow x={-20} y={-204} r={220} g="gBlue" o={flashR} />
          <Glow x={236} y={-50} r={80} g="gWhite" o={0.9} sx={1.4} />
          <Beam x={236} y={-50} angle={6} length={700} spread={10} o={0.55} cool />
        </g>
        <Glow x={vx - 60} y={1350} r={260} g="gBlue" o={(flashL + flashR) * 0.35} sx={1.6} />
      </Stage>
    </CamMove>
  );
};
