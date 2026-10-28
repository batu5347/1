import React from "react";
import { interpolate, random, useCurrentFrame } from "remotion";
import type { ShotProps } from "../BlackoutVideo";
import { Callout } from "../components/overlays";
import { Beam, CamMove, Glow, Person, Stage } from "../components/primitives";
import germany from "../data/germany.json";
import { blink, clamp, easeOut, powerFail } from "../lib/anim";
import { localWord } from "../lib/shot";
import { C } from "../theme";

/** Notausgangsschild (batteriegepuffert, bleibt an). */
const ExitSign: React.FC<{ x: number; y: number; s?: number }> = ({ x, y, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <Glow x={0} y={0} r={130} g="gGreen" o={0.55} />
    <rect x={-70} y={-28} width={140} height={56} rx={4} fill="#14b86a" />
    <circle cx={-38} cy={-12} r={6} fill="#eafff3" />
    <path d="M-44 -4 L-30 -6 L-24 6 L-14 14 M-34 0 L-40 14 L-50 18 M-30 -4 L-22 -12" stroke="#eafff3" strokeWidth={5} fill="none" strokeLinecap="round" />
    <path d="M0 0 H48 M34 -12 L48 0 L34 12" stroke="#eafff3" strokeWidth={7} fill="none" strokeLinecap="round" />
  </g>
);

/** U-Bahnhof: Zug bleibt stehen, Licht fällt aus, nur Notbeleuchtung. */
export const Subway: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const fail = 8;
  const rows = 9;
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.1} x0={10} x1={-20}>
      <Stage>
        <rect width={1080} height={1920} fill="#06080c" />
        {/* Tunnelröhre in Perspektive */}
        <polygon points="0,0 1080,0 700,760 380,760" fill="#0b0f16" />
        <polygon points="0,1920 380,1000 700,1000 1080,1920" fill="#0d1118" />
        <polygon points="0,0 380,760 380,1000 0,1920" fill="#10151e" />
        {/* Kachelwand links */}
        {new Array(14).fill(0).map((_, i) => {
          const t = i / 14;
          const x = 380 * t;
          return <line key={i} x1={x} y1={760 * t} x2={x} y2={1920 - 920 * t} stroke="#1a2230" strokeWidth={2} />;
        })}
        {/* U-Bahn-Schild */}
        <g transform="translate(120 620) skewY(30)">
          <rect x={-46} y={-46} width={92} height={92} rx={8} fill="#1f4ea8" opacity={0.85} />
          <text x={0} y={30} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={84} fill="#e9eef8">
            U
          </text>
        </g>
        {/* Deckenleuchten: gehen reihenweise aus */}
        {new Array(rows).fill(0).map((_, i) => {
          const t = 1 - i / rows;
          const y = 760 * (1 - t) + 40 * t;
          const x0 = 380 * (1 - t) + 140 * t;
          const x1 = 700 * (1 - t) + 940 * t;
          const lvl = powerFail(f, fail + i * 1.5, `sub${i}`, 6);
          return (
            <g key={i}>
              <line x1={x0 + (x1 - x0) * 0.2} x2={x0 + (x1 - x0) * 0.8} y1={y} y2={y} stroke={lvl > 0.2 ? "#f2f6ff" : "#1b222e"} strokeWidth={4 + 10 * t} />
              <Glow x={(x0 + x1) / 2} y={y} r={160 * t + 30} g="gCool" o={lvl * 0.6} sx={2.2} />
            </g>
          );
        })}
        {/* Zug rechts */}
        <polygon points="700,820 1080,560 1080,1500 700,990" fill="#141a24" />
        {new Array(6).fill(0).map((_, i) => {
          const t0 = i / 6;
          const t1 = t0 + 0.11;
          const X = (t: number) => 1080 - 380 * Math.pow(1 - t, 0.9) * 0 - 380 * t;
          const top = (t: number) => 600 + (845 - 600) * t;
          const bot = (t: number) => 860 + (920 - 860) * t;
          const lvl = Math.max(powerFail(f, fail + 3, "zug", 10), 0.12);
          return (
            <polygon
              key={i}
              points={`${X(t0)},${top(t0)} ${X(t1)},${top(t1)} ${X(t1)},${bot(t1)} ${X(t0)},${bot(t0)}`}
              fill={lvl > 0.2 ? "#ffe9c2" : "#3a2a1a"}
              opacity={0.3 + 0.7 * lvl}
            />
          );
        })}
        <Glow x={900} y={760} r={420} g="gWarm" o={powerFail(f, fail + 3, "zug", 10) * 0.45} />
        {/* Bahnsteigkante */}
        <line x1={380} y1={1000} x2={0} y2={1920} stroke="#c9a43a" strokeWidth={10} opacity={0.35} />
        <ExitSign x={540} y={800} s={0.8} />
        <Person x={250} y={1500} h={520} pose="stand" rim="#6fe0a8" />
        <Person x={470} y={1250} h={300} pose="phone" rim="#9cc4ff" />
        <Glow x={480} y={1060} r={40} g="gCool" o={0.6} />
        <rect width={1080} height={1920} fill="#000" opacity={interpolate(f, [fail, fail + 14], [0, 0.35], clamp)} />
      </Stage>
      <Callout x={90} y={1080} text="U-BAHN: STILLSTAND" from={fail + 12} />
    </CamMove>
  );
};

/** Supermarkt: Deckenlicht geht reihenweise aus. */
export const Supermarket: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const fail = 16;
  const shelfColors = ["#c0392b", "#e67e22", "#f1c40f", "#27ae60", "#2980b9", "#8e44ad", "#ecf0f1", "#d35400"];
  const amb = f < fail ? 1 : Math.max(0.12, interpolate(f, [fail, fail + 24], [1, 0.12], clamp));
  const shelf = (side: -1 | 1) => {
    const items: React.ReactNode[] = [];
    const outer = side < 0 ? 0 : 1080;
    const inner = side < 0 ? 440 : 640;
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 10; c++) {
        const t0 = c / 10;
        const t1 = (c + 0.9) / 10;
        const X = (t: number) => outer + (inner - outer) * t;
        const Y = (t: number, k: number) => {
          const top = 300 + (720 - 300) * t;
          const bot = 1720 + (1060 - 1720) * t;
          return top + (bot - top) * k;
        };
        const k0 = r / 6 + 0.02;
        const k1 = k0 + 0.12;
        const col = shelfColors[Math.floor(random(`sh${side}${r}${c}`) * shelfColors.length)];
        items.push(
          <polygon key={`${r}-${c}`} points={`${X(t0)},${Y(t0, k0)} ${X(t1)},${Y(t1, k0)} ${X(t1)},${Y(t1, k1)} ${X(t0)},${Y(t0, k1)}`} fill={col} opacity={0.25 + 0.6 * amb} />,
        );
      }
    }
    return items;
  };
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.12} originY={45}>
      <Stage>
        <rect width={1080} height={1920} fill="#0a0d12" />
        <polygon points="0,300 1080,300 640,720 440,720" fill={`rgb(${20 + 150 * amb},${22 + 150 * amb},${26 + 150 * amb})`} opacity={0.5} />
        <polygon points="0,1720 440,1060 640,1060 1080,1720 1080,1920 0,1920" fill={`rgb(${14 + 120 * amb},${15 + 120 * amb},${18 + 115 * amb})`} />
        <polygon points="440,720 640,720 640,1060 440,1060" fill="#06080c" />
        {shelf(-1)}
        {shelf(1)}
        {/* Leuchtstoffröhren an der Decke */}
        {new Array(8).fill(0).map((_, i) => {
          const t = i / 8;
          const y = 300 + (720 - 300) * t + 20;
          const w = 300 * (1 - t) + 40;
          const lvl = powerFail(f, fail + (8 - i) * 1.6, `sm${i}`, 6);
          return (
            <g key={i}>
              <rect x={540 - w / 2} y={y} width={w} height={8 * (1 - t) + 3} fill={lvl > 0.2 ? "#ffffff" : "#20252e"} />
              <Glow x={540} y={y} r={w * 0.9} g="gWhite" o={lvl * 0.5} sx={1.4} />
            </g>
          );
        })}
        <ExitSign x={540} y={780} s={0.55} />
        <Person x={420} y={1400} h={420} pose="torch" rim="#ffd38a" />
        <Beam x={460} y={1150} angle={-20} length={500} spread={10} o={interpolate(f, [fail + 20, fail + 30], [0, 0.9], clamp)} cool />
        <Person x={690} y={1240} h={250} pose="stand" flip rim="#6fe0a8" />
      </Stage>
      <Callout x={90} y={1010} text="KÜHLTRUHEN: AUS" from={fail + 34} />
    </CamMove>
  );
};

/** Kasse: Kassensysteme und Kartenterminal ohne Strom. */
export const Checkout: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <CamMove frame={f} dur={dur} z0={1.1} z1={1.0} x0={-20} x1={20}>
      <Stage>
        <rect width={1080} height={1920} fill="#07090d" />
        {/* Warteschlange im Hintergrund */}
        <Person x={760} y={1060} h={330} pose="stand" fill="#0b0f16" rim="#3d4b63" />
        <Person x={880} y={1080} h={360} pose="phone" fill="#0b0f16" rim="#9cc4ff" />
        <Person x={980} y={1100} h={380} pose="stand" fill="#0b0f16" rim="#3d4b63" />
        <Glow x={890} y={880} r={60} g="gCool" o={0.5} />
        {/* Kassentresen + Band */}
        <polygon points="0,1120 1080,980 1080,1250 0,1500" fill="#151b25" />
        <polygon points="80,1130 1080,1010 1080,1080 80,1220" fill="#0c0f15" />
        {new Array(12).fill(0).map((_, i) => (
          <line key={i} x1={80 + i * 85} y1={1130 - i * 10.2} x2={80 + i * 85} y2={1220 - i * 11.8} stroke="#1a202b" strokeWidth={3} />
        ))}
        {/* Kassenbildschirm (schwarz) */}
        <rect x={150} y={720} width={300} height={210} rx={10} fill="#0d1118" stroke="#262e3b" strokeWidth={6} />
        <rect x={165} y={735} width={270} height={180} fill="#030406" />
        <rect x={285} y={930} width={30} height={160} fill="#1a202b" />
        {/* Kartenterminal */}
        <rect x={520} y={960} width={110} height={170} rx={14} fill="#11161f" stroke="#262e3b" strokeWidth={4} transform="rotate(-8 575 1045)" />
        <rect x={535} y={975} width={80} height={50} fill="#030406" transform="rotate(-8 575 1045)" />
        {/* Aufsteller "Kasse geschlossen" */}
        <g transform="translate(330 1020) rotate(-4)">
          <rect x={-140} y={-70} width={280} height={110} fill="#e8e3d6" />
          <text x={0} y={-18} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={40} fill="#b3261e">
            KASSE
          </text>
          <text x={0} y={26} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={40} fill="#1a1d24">
            GESCHLOSSEN
          </text>
        </g>
        <Glow x={330} y={1000} r={260} g="gWarm" o={0.32 + Math.sin(f * 0.2) * 0.04} />
        <Beam x={-20} y={700} angle={30} length={620} spread={11} o={0.45} />
      </Stage>
      <Callout x={90} y={1180} text="KARTENZAHLUNG: NICHT MÖGLICH" from={6} />
    </CamMove>
  );
};

/** Aufzug steht still. */
export const Elevator: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const bx = 540 + Math.sin(f * 0.08) * 90;
  const by = 960 + Math.cos(f * 0.06) * 120;
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.08}>
      <Stage>
        <rect width={1080} height={1920} fill="#07090d" />
        <rect x={250} y={520} width={580} height={1100} fill="#151b25" />
        <rect x={280} y={600} width={258} height={1000} fill="#2a313d" />
        <rect x={542} y={600} width={258} height={1000} fill="#2a313d" />
        <line x1={540} x2={540} y1={600} y2={1600} stroke="#06080c" strokeWidth={6} />
        {new Array(10).fill(0).map((_, i) => (
          <line key={i} x1={290 + i * 52} x2={300 + i * 52} y1={600} y2={1600} stroke="#353d4a" strokeWidth={2} opacity={0.5} />
        ))}
        {/* Etagenanzeige (aus) */}
        <rect x={470} y={540} width={140} height={44} rx={6} fill="#050608" />
        <text x={540} y={574} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={700} fontSize={30} fill="#1f1210">
          - -
        </text>
        {/* Zettel */}
        <g transform="translate(540 980) rotate(2)">
          <rect x={-150} y={-80} width={300} height={160} fill="#e9e5d8" />
          <text x={0} y={-24} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={38} fill="#1a1d24">
            AUFZUG
          </text>
          <text x={0} y={26} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={38} fill="#b3261e">
            AUSSER BETRIEB
          </text>
        </g>
        {/* Notruftaste blinkt (Akku) */}
        <rect x={860} y={1000} width={60} height={110} rx={8} fill="#11161f" />
        <circle cx={890} cy={1040} r={14} fill={blink(f, 30, 14) ? "#ffd21f" : "#3a3010"} />
        <Glow x={890} y={1040} r={70} g="gAmber" o={blink(f, 30, 14) * 0.8} />
        {/* Taschenlampen-Spot */}
        <circle cx={bx} cy={by} r={260} fill="url(#gWarm)" opacity={0.45} style={{ mixBlendMode: "screen" }} />
        <rect width={1080} height={1920} fill="#000" opacity={0.25} />
      </Stage>
      <Callout x={90} y={1180} text="AUFZÜGE STEHEN STILL" from={8} />
    </CamMove>
  );
};

/** Familie am Tisch im Taschenlampenlicht; Vorräte werden passend zum Text markiert. */
export const Family: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const flick = 0.9 + 0.1 * Math.sin(f * 0.37) * Math.sin(f * 0.13);
  const water = localWord("family", "Wasser", "s5");
  const akku = localWord("family", "Akkus", "s5");
  const meds = localWord("family", "Medikamente", "s5");
  const hi = (at: number) => easeOut(f, at, at + 8);
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.16} originY={55}>
      <Stage>
        <rect width={1080} height={1920} fill="#060507" />
        {/* Fenster mit dunkler Stadt */}
        <rect x={640} y={420} width={330} height={460} fill="#0a1222" stroke="#15110e" strokeWidth={18} />
        <line x1={805} x2={805} y1={420} y2={880} stroke="#15110e" strokeWidth={12} />
        <circle cx={900} cy={500} r={28} fill="#c9d6ee" opacity={0.7} />
        <Glow x={900} y={500} r={110} g="gCool" o={0.3} />
        {/* Lichtschein an der Decke */}
        <Glow x={540} y={520} r={560} g="gWarm" o={0.35 * flick} sx={1.3} />
        {/* Familie */}
        <Person x={250} y={1500} h={640} pose="stand" fill="#0b0806" rim="#ffb46a" />
        <Person x={830} y={1500} h={600} pose="stand" flip fill="#0b0806" rim="#ffb46a" />
        <Person x={600} y={1300} h={380} pose="stand" fill="#0b0806" rim="#ffb46a" />
        {/* Tisch */}
        <polygon points="80,1260 1000,1260 1080,1440 0,1440" fill="#2a1a10" />
        <polygon points="0,1440 1080,1440 1080,1480 0,1480" fill="#140c07" />
        <Glow x={540} y={1240} r={520} g="gWarm" o={0.75 * flick} sx={1.4} />
        {/* Taschenlampe senkrecht */}
        <rect x={522} y={1150} width={36} height={110} rx={8} fill="#1c1f26" />
        <Glow x={540} y={1150} r={90} g="gWhite" o={0.9 * flick} />
        <Beam x={540} y={1150} angle={-90} length={700} spread={20} o={0.55 * flick} />
        {/* Wasserflaschen */}
        <g opacity={0.75 + 0.25 * hi(water)}>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${170 + i * 58} 1150)`}>
              <rect x={-20} y={0} width={40} height={130} rx={10} fill="#5f8fbf" opacity={0.65} />
              <rect x={-9} y={-22} width={18} height={24} fill="#2b5aa0" />
              <rect x={-20} y={48} width={40} height={30} fill="#d8e6f5" opacity={0.6} />
            </g>
          ))}
        </g>
        {/* Powerbank + Handy */}
        <g opacity={0.75 + 0.25 * hi(akku)}>
          <rect x={700} y={1210} width={120} height={56} rx={10} fill="#22262e" stroke="#3a404c" strokeWidth={3} />
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={716 + i * 16} y={1228} width={10} height={18} fill={i < 3 ? C.green : "#2b3a30"} />
          ))}
        </g>
        {/* Medikamente */}
        <g opacity={0.75 + 0.25 * hi(meds)}>
          <rect x={860} y={1200} width={110} height={66} rx={6} fill="#e9eef3" />
          <rect x={860} y={1200} width={110} height={18} fill="#c0392b" />
          <path d="M905 1238 h20 M915 1228 v20" stroke="#c0392b" strokeWidth={6} />
        </g>
        <rect width={1080} height={1920} fill="url(#famVig)" />
        <defs>
          <radialGradient id="famVig" cx="50%" cy="62%" r="70%">
            <stop offset="40%" stopColor="#000" stopOpacity={0} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.85} />
          </radialGradient>
        </defs>
      </Stage>
      <Callout x={110} y={970} text="WASSER" from={water} color="#7fb6ff" />
      <Callout x={600} y={1050} text="GELADENE AKKUS" from={akku} color={C.green} />
      <Callout x={980} y={1140} text="MEDIKAMENTE" from={meds} color="#ff8a80" align="right" />
    </CamMove>
  );
};

/** Leitstelle: Bildschirmwand mit Lagekarte, Disponenten. */
export const ControlRoom: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const verkehr = localWord("controlRoom", "Verkehr", "s6");
  const komm = localWord("controlRoom", "Kommunikation", "s6");
  const mapScale = 0.42;
  return (
    <CamMove frame={f} dur={dur} z0={1.12} z1={1.0}>
      <Stage>
        <rect width={1080} height={1920} fill="#04060a" />
        {/* Bildschirmwand */}
        {[
          [60, 470, 300, 200],
          [720, 470, 300, 200],
          [60, 690, 300, 200],
          [720, 690, 300, 200],
        ].map(([x, y, w, h], i) => (
          <g key={i}>
            <rect x={x} y={y} width={w} height={h} fill="#0b1a2e" stroke="#1d2a3c" strokeWidth={6} />
            {new Array(6).fill(0).map((_, k) => (
              <rect
                key={k}
                x={x + 20}
                y={y + 24 + k * 26}
                width={(w - 40) * (0.3 + 0.7 * random(`cr${i}${k}${Math.floor(f / 10)}`))}
                height={10}
                fill={k === 2 && i % 2 ? C.red : "#2f7dff"}
                opacity={0.6}
              />
            ))}
          </g>
        ))}
        <rect x={380} y={450} width={320} height={460} fill="#08131f" stroke="#1d2a3c" strokeWidth={6} />
        <g transform={`translate(${540 - (germany.width * mapScale) / 2} ${470}) scale(${mapScale * 0.92})`}>
          <path d={germany.outline} fill="#2a0e10" stroke={C.red} strokeWidth={4} opacity={0.9} />
          {germany.cities.slice(0, 15).map((c) => (
            <circle key={c.name} cx={c.x} cy={c.y} r={9} fill={blink(f, 20, 10, c.x) ? C.red : "#5a1a18"} />
          ))}
        </g>
        <Glow x={540} y={680} r={600} g="gBlue" o={0.35} sx={1.2} />
        {/* Notstrom-Kennzeichnung */}
        <rect x={420} y={920} width={240} height={40} rx={6} fill="#0b2a1a" />
        <text x={540} y={948} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={700} fontSize={22} fill={C.green}>
          USV / NOTSTROM
        </text>
        {/* Disponenten von hinten */}
        <rect x={0} y={1180} width={1080} height={80} fill="#0c1018" />
        <Person x={260} y={1640} h={600} pose="stand" fill="#020305" rim="#4f86d8" />
        <Person x={800} y={1660} h={640} pose="stand" fill="#020305" rim="#4f86d8" flip />
        <path d="M210 1170 q50 -70 100 0" stroke="#1b2333" strokeWidth={10} fill="none" />
        <path d="M750 1150 q50 -70 100 0" stroke="#1b2333" strokeWidth={10} fill="none" />
      </Stage>
      <Callout x={90} y={1010} text="VERKEHR" sub="Ampeln, Bahnen, Tunnel" from={verkehr} color={C.amber} />
      <Callout x={990} y={1100} text="KOMMUNIKATION" sub="Netze überlastet/aus" from={komm} color="#7fb6ff" align="right" />
    </CamMove>
  );
};

/** Intensivstation mit Notstrom. */
export const HospitalIcu: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const vers = localWord("hospitalIcu", "Versorgung", "s6");
  const ecg = (x: number) => {
    const ph = ((x + f * 9) % 260) / 260;
    if (ph > 0.42 && ph < 0.46) return -70;
    if (ph > 0.46 && ph < 0.5) return 40;
    if (ph > 0.3 && ph < 0.36) return -12;
    return 0;
  };
  const pts = new Array(80).fill(0).map((_, i) => `${590 + i * 4.5},${790 + ecg(i * 4.5)}`).join(" ");
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.1} x0={20} x1={-20}>
      <Stage>
        <rect width={1080} height={1920} fill="#05080b" />
        <rect x={0} y={1180} width={1080} height={740} fill="#0a0f13" />
        {/* Monitor */}
        <rect x={570} y={640} width={400} height={300} rx={12} fill="#0b1014" stroke="#25303a" strokeWidth={8} />
        <rect x={585} y={655} width={370} height={270} fill="#020806" />
        <polyline points={pts} fill="none" stroke={C.green} strokeWidth={4} />
        <text x={930} y={700} textAnchor="end" fontFamily="JetBrains Mono" fontWeight={700} fontSize={44} fill={C.green}>
          72
        </text>
        <text x={930} y={900} textAnchor="end" fontFamily="JetBrains Mono" fontWeight={700} fontSize={30} fill="#5fd0ff">
          SpO2 97
        </text>
        <Glow x={770} y={790} r={330} g="gGreen" o={0.25} />
        <rect x={760} y={940} width={20} height={260} fill="#1a2028" />
        {/* Infusionsständer */}
        <line x1={300} y1={560} x2={300} y2={1220} stroke="#2a323c" strokeWidth={8} />
        <rect x={260} y={580} width={80} height={120} rx={20} fill="#8fb3c8" opacity={0.35} />
        {/* Bett */}
        <polygon points="80,1180 960,1180 1040,1320 20,1320" fill="#1b232c" />
        <polygon points="120,1120 520,1120 560,1190 80,1190" fill="#c9d6de" opacity={0.25} />
        <ellipse cx={230} cy={1120} rx={90} ry={40} fill="#d8e2ea" opacity={0.3} />
        {/* gedimmte Notbeleuchtung */}
        <rect x={380} y={300} width={320} height={16} fill="#c8d8ff" opacity={0.4} />
        <Glow x={540} y={308} r={320} g="gCool" o={0.4} sx={1.6} />
        <rect x={80} y={440} width={330} height={56} rx={8} fill="#0b2a1a" />
        <circle cx={112} cy={468} r={11} fill={blink(f, 24, 16) ? C.green : "#0f3a22"} />
        <text x={135} y={478} fontFamily="JetBrains Mono" fontWeight={700} fontSize={26} fill={C.green}>
          NOTSTROM AKTIV
        </text>
      </Stage>
      <Callout x={90} y={1030} text="VERSORGUNG" sub="Kritische Bereiche über Notstrom" from={vers} color={C.green} />
    </CamMove>
  );
};
