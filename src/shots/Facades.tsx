import React from "react";
import { interpolate, random, useCurrentFrame } from "remotion";
import type { ShotProps } from "../BlackoutVideo";
import { Callout } from "../components/overlays";
import { Beam, CamMove, Glow, NightSky, Person, Stage } from "../components/primitives";
import { blink, clamp, easeOut, powerFail } from "../lib/anim";
import { localWord } from "../lib/shot";
import { C } from "../theme";

/** Bürohochhaus in Untersicht: Etagen gehen von oben nach unten aus. */
export const Office: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const start = localWord("office", "Nichts", "s2", 0.05);
  const floors = 22;
  const cols = 9;
  // Untersicht: Gebäude verjüngt sich nach oben
  const xAt = (k: number, y: number) => {
    const t = (y - 200) / 1600;
    const half = 260 + 260 * t;
    return 540 - half + 2 * half * k;
  };
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < floors; r++) {
    const y0 = 200 + (r / floors) * 1600 + 6;
    const y1 = 200 + ((r + 1) / floors) * 1600 - 6;
    const at = start + r * 1.3;
    for (let c = 0; c < cols; c++) {
      const k0 = c / cols + 0.012;
      const k1 = (c + 1) / cols - 0.012;
      const on = random(`of${r}-${c}`) < 0.82;
      const lvl = on ? powerFail(f, at + random(`ofd${r}${c}`) * 3, `of${r}${c}`, 5) : 0;
      cells.push(
        <polygon
          key={`${r}-${c}`}
          points={`${xAt(k0, y0)},${y0} ${xAt(k1, y0)},${y0} ${xAt(k1, y1)},${y1} ${xAt(k0, y1)},${y1}`}
          fill={lvl > 0.1 ? `rgba(214,230,255,${0.25 + 0.7 * lvl})` : "#0c1320"}
        />,
      );
    }
  }
  const lit = 1 - interpolate(f, [start, start + floors * 1.3 + 6], [0, 1], clamp);
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.08} originY={80}>
      <Stage>
        <NightSky top="#02040a" bottom="#0d1830" seed="of" stars={70} />
        <polygon points="280,200 800,200 1060,1800 20,1800" fill="#070b12" stroke="#3a4f72" strokeWidth={4} />
        {cells}
        <Glow x={540} y={1000} r={900} g="gCool" o={lit * 0.35} sx={0.8} />
        {/* Notausgangsleuchten bleiben */}
        {[5, 11, 17].map((r) => (
          <circle key={r} cx={xAt(0.08, 200 + (r / floors) * 1600 + 30)} cy={200 + (r / floors) * 1600 + 30} r={5} fill={C.green} />
        ))}
        <rect x={0} y={1800} width={1080} height={120} fill="#040507" />
      </Stage>
    </CamMove>
  );
};

/** Plattenbau bei Nacht: dunkle Fenster, vereinzelt Kerzen/Taschenlampen. */
export const Apartments: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const kalt = localWord("apartments", "kalt", "s4");
  const win: React.ReactNode[] = [];
  for (let r = 0; r < 14; r++) {
    for (let c = 0; c < 8; c++) {
      const x = 120 + c * 108;
      const y = 380 + r * 92;
      const k = random(`ap${r}-${c}`);
      const candle = k < 0.09;
      const torch = k > 0.97;
      const fl = 0.6 + 0.4 * Math.sin(f * 0.5 + k * 40) * Math.sin(f * 0.17 + k * 9);
      win.push(
        <g key={`${r}-${c}`}>
          <rect x={x} y={y} width={70} height={58} fill={candle ? `rgba(255,170,80,${0.35 + 0.3 * fl})` : "#0b1220"} />
          {candle && <Glow x={x + 35} y={y + 44} r={60} g="gWarm" o={0.6 * fl} />}
          {torch && <Glow x={x + 35 + Math.sin(f * 0.1 + k * 10) * 20} y={y + 30} r={70} g="gWhite" o={0.6} />}
          <rect x={x} y={y + 64} width={70} height={6} fill="#151d2a" />
        </g>,
      );
    }
  }
  return (
    <CamMove frame={f} dur={dur} z0={1.12} z1={1.0} x0={-30} x1={10}>
      <Stage>
        <NightSky top="#01030a" bottom="#0c1730" seed="ap" stars={80} />
        <circle cx={880} cy={260} r={46} fill="#dbe4f5" opacity={0.85} />
        <Glow x={880} y={260} r={200} g="gCool" o={0.4} />
        <rect x={80} y={340} width={920} height={1400} fill="#131b29" />
        <rect x={80} y={340} width={920} height={1400} fill="url(#apShade)" />
        <defs>
          <linearGradient id="apShade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6a8ac0" stopOpacity={0.08} />
            <stop offset="100%" stopColor="#000" stopOpacity={0.4} />
          </linearGradient>
        </defs>
        {win}
        <rect x={0} y={1740} width={1080} height={180} fill="#05070b" />
        {/* Kalter Hauch */}
        <rect width={1080} height={1920} fill="#7fb0ff" opacity={0.05 + 0.04 * easeOut(f, kalt, kalt + 15)} style={{ mixBlendMode: "screen" }} />
      </Stage>
      <Callout x={110} y={1000} text="HEIZUNG: AUS" sub="Auch Heizungspumpen brauchen Strom" from={kalt} color="#7fb6ff" />
    </CamMove>
  );
};

/** Mobilfunkmast: Akku-Reserve sinkt, Standort fällt aus. */
export const CellTower: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const off = localWord("cellTower", "ausfallen", "s4");
  const battery = Math.max(0, Math.round(interpolate(f, [0, off], [9, 0], clamp)));
  const alive = f < off ? 1 : powerFail(f, off, "mast", 6);
  const waves = [0, 1, 2].map((i) => ((f * 2.2 + i * 40) % 120) / 120);
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.1} originY={40}>
      <Stage>
        <NightSky top="#02040b" bottom="#1f3456" seed="ct" stars={90} />
        <Glow x={540} y={1500} r={900} g="gCool" o={0.25} sx={1.2} />
        <rect x={0} y={1500} width={1080} height={420} fill="#05070a" />
        {/* Gittermast */}
        <polygon points="470,1500 610,1500 556,420 524,420" fill="none" stroke="#2a3446" strokeWidth={14} />
        {new Array(14).fill(0).map((_, i) => {
          const y0 = 1500 - i * 77;
          const y1 = y0 - 77;
          const w0 = 70 - i * 3.9;
          const w1 = w0 - 3.9;
          return <path key={i} d={`M${540 - w0} ${y0} L${540 + w1} ${y1} M${540 + w0} ${y0} L${540 - w1} ${y1}`} stroke="#2a3446" strokeWidth={6} />;
        })}
        {/* Antennen */}
        {[-1, 0, 1].map((s) => (
          <rect key={s} x={530 + s * 46} y={440} width={22} height={110} fill="#111722" stroke="#1d2533" strokeWidth={3} />
        ))}
        {/* Funkwellen */}
        {waves.map((w, i) => (
          <circle key={i} cx={540} cy={495} r={60 + w * 420} fill="none" stroke="#7fb6ff" strokeWidth={4} opacity={(1 - w) * 0.5 * alive} />
        ))}
        {/* Flugwarnlicht */}
        <circle cx={540} cy={400} r={8} fill={C.red} opacity={blink(f, 40, 18)} />
        <Glow x={540} y={400} r={80} g="gRed" o={blink(f, 40, 18) * 0.8} />
        {/* Technikschrank */}
        <rect x={680} y={1380} width={150} height={120} fill="#0d121a" stroke="#1c2432" strokeWidth={4} />
        <circle cx={705} cy={1405} r={7} fill={alive > 0.5 ? C.green : C.red} />
        <Glow x={705} y={1405} r={40} g={alive > 0.5 ? "gGreen" : "gRed"} o={0.8} />
      </Stage>
      <Callout
        x={110}
        y={980}
        text={f < off ? "MOBILFUNKSTANDORT" : "STANDORT: OFFLINE"}
        sub={f < off ? `Akku-Reserve: ${battery} %` : "Kein Empfang in der Umgebung"}
        from={4}
        color={f < off ? C.amber : C.red}
      />
    </CamMove>
  );
};

/** Krankenhaus außen: Notaufnahme, Notstromaggregat, Rettungswagen. */
export const Hospital: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const ns = localWord("hospital", "Notstrom", "s4");
  const flash = Math.floor(f / 3) % 4 === 0 ? 1 : Math.floor(f / 3) % 4 === 2 ? 0.7 : 0;
  const win: React.ReactNode[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 9; c++) {
      // Notstrom versorgt nur ausgewählte Bereiche (z. B. Intensiv, OP, Notaufnahme)
      const critical = r >= 4 && r <= 6 && c >= 2 && c <= 6;
      const lit = critical ? 0.92 : random(`hw${r}${c}`) < 0.06 ? 0.4 : 0;
      win.push(
        <rect key={`${r}-${c}`} x={110 + c * 98} y={520 + r * 92} width={66} height={56} fill={lit ? `rgba(220,236,255,${lit})` : "#0c1320"} />,
      );
    }
  }
  return (
    <CamMove frame={f} dur={dur} z0={1.1} z1={1.0} x0={20} x1={-20}>
      <Stage>
        <NightSky top="#02040a" bottom="#0e1a30" seed="hs" stars={60} />
        <g transform="translate(0 -190)">
        <rect x={80} y={480} width={920} height={800} fill="#151d2a" />
        {win}
        <Glow x={540} y={980} r={420} g="gCool" o={0.35} sx={1.4} />
        {/* Rotes Kreuz + Schild Notaufnahme */}
        <rect x={360} y={1290} width={360} height={74} fill="#2a0a0a" />
        <rect x={360} y={1290} width={360} height={74} fill={C.red} opacity={0.85} />
        <text x={540} y={1342} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={46} fill="#fff" letterSpacing={4}>
          NOTAUFNAHME
        </text>
        <Glow x={540} y={1326} r={300} g="gRed" o={0.55} sx={1.4} />
        <rect x={80} y={1364} width={920} height={556} fill="#0a0e14" />
        {/* Notstromaggregat (Container) mit Abgas */}
        <rect x={760} y={1400} width={250} height={150} fill="#1b2430" stroke="#2c3646" strokeWidth={4} />
        <rect x={960} y={1340} width={18} height={60} fill="#2c3646" />
        {[0, 1, 2, 3].map((i) => {
          const p = ((f * 1.4 + i * 25) % 100) / 100;
          return <circle key={i} cx={969 + p * 60} cy={1330 - p * 220} r={18 + p * 50} fill="#8a96a8" opacity={(1 - p) * 0.18} />;
        })}
        <circle cx={790} cy={1430} r={8} fill={C.green} />
        <Glow x={790} y={1430} r={40} g="gGreen" o={0.8} />
        {/* Rettungswagen */}
        <g transform="translate(330 1560)">
          <rect x={-220} y={-150} width={380} height={150} rx={14} fill="#d8dde4" opacity={0.25} />
          <rect x={160} y={-110} width={90} height={110} rx={10} fill="#d8dde4" opacity={0.2} />
          <rect x={-200} y={-90} width={360} height={14} fill={C.red} opacity={0.5} />
          <circle cx={-130} cy={6} r={32} fill="#020306" />
          <circle cx={150} cy={6} r={32} fill="#020306" />
          <Glow x={-150} y={-160} r={220} g="gBlue" o={flash} />
          <Glow x={60} y={-160} r={220} g="gBlue" o={1 - flash} />
        </g>
        <Person x={930} y={1660} h={360} pose="stand" rim="#7fb6ff" />
        <rect x={0} y={1910} width={1080} height={200} fill="#0a0e14" />
        </g>
      </Stage>
      <Callout x={90} y={420} text="NOTSTROMAGGREGAT: AKTIV" sub="Laufzeit hängt vom Treibstoff ab" from={ns} color={C.green} />
    </CamMove>
  );
};

/** Tankstelle: Zapfsäulen ohne Strom. */
export const GasStation: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  return (
    <CamMove frame={f} dur={dur} z0={1.08} z1={1.0}>
      <Stage>
        <NightSky top="#02040a" bottom="#0e1828" seed="gs" stars={50} />
        {/* Dach */}
        <polygon points="40,560 1040,560 980,680 100,680" fill="#11171f" />
        <rect x={40} y={540} width={1000} height={40} fill="#1a222d" />
        {[200, 540, 880].map((x) => (
          <rect key={x} x={x - 60} y={680} width={120} height={10} fill="#1c222b" />
        ))}
        <rect x={0} y={1400} width={1080} height={520} fill="#0b0e13" />
        {[290, 790].map((x, i) => (
          <g key={x}>
            <rect x={x - 22} y={680} width={44} height={720} fill="#0e131a" />
            <rect x={x - 90} y={980} width={180} height={420} rx={12} fill="#1b222c" stroke="#2a3340" strokeWidth={4} />
            <rect x={x - 66} y={1010} width={132} height={80} fill="#050608" />
            <text x={x} y={1062} textAnchor="middle" fontFamily="JetBrains Mono" fontWeight={700} fontSize={30} fill="#141820">
              --.--
            </text>
            <rect x={x - 66} y={1120} width={132} height={60} fill="#11161d" />
            <path d={`M${x + 90} ${1150} q60 20 40 120`} stroke="#090b0f" strokeWidth={14} fill="none" />
            {i === 0 && (
              <g transform={`translate(${x} 1260) rotate(-5)`}>
                <rect x={-80} y={-40} width={160} height={80} fill="#ece8dc" />
                <text x={0} y={-6} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={26} fill="#b3261e">
                  AUSSER
                </text>
                <text x={0} y={26} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={26} fill="#b3261e">
                  BETRIEB
                </text>
              </g>
            )}
          </g>
        ))}
        {/* Wartendes Auto mit Scheinwerfern */}
        <g transform="translate(560 1560)">
          <path d="M-200 0 L-190 -90 Q-170 -150 -100 -160 L100 -160 Q170 -150 190 -90 L200 0 Z" fill="#06080c" />
          <Glow x={-150} y={-50} r={110} g="gWhite" o={0.95} sx={1.5} />
          <Glow x={150} y={-50} r={110} g="gWhite" o={0.95} sx={1.5} />
        </g>
        <Glow x={540} y={1380} r={520} g="gCool" o={0.25} sx={1.6} />
      </Stage>
      <Callout x={90} y={860} text="ZAPFSÄULEN: KEIN STROM" from={4} />
    </CamMove>
  );
};

/** Geldautomat außer Betrieb, Taschenlampe tastet ihn ab. */
export const Atm: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const sx = interpolate(f, [0, dur], [380, 660]);
  const sy = 860 + Math.sin(f * 0.09) * 80;
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.1}>
      <Stage>
        <rect width={1080} height={1920} fill="#07090d" />
        {/* Wand */}
        {new Array(30).fill(0).map((_, i) => (
          <line key={i} x1={0} x2={1080} y1={i * 70} y2={i * 70} stroke="#0c1016" strokeWidth={3} />
        ))}
        <rect x={250} y={520} width={580} height={900} rx={18} fill="#1a2029" stroke="#2c3542" strokeWidth={8} />
        <rect x={310} y={600} width={460} height={300} rx={8} fill="#030406" />
        <rect x={330} y={960} width={240} height={180} rx={8} fill="#11161d" />
        {new Array(12).fill(0).map((_, i) => (
          <rect key={i} x={345 + (i % 3) * 76} y={975 + Math.floor(i / 3) * 40} width={60} height={28} rx={4} fill="#262e3a" />
        ))}
        <rect x={610} y={980} width={160} height={16} rx={4} fill="#05070a" />
        <rect x={420} y={1220} width={240} height={20} rx={4} fill="#05070a" />
        <g transform="translate(540 760) rotate(-3)">
          <rect x={-170} y={-60} width={340} height={120} fill="#ece8dc" />
          <text x={0} y={-8} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={40} fill="#1a1d24">
            VORÜBERGEHEND
          </text>
          <text x={0} y={38} textAnchor="middle" fontFamily="Oswald" fontWeight={700} fontSize={40} fill="#b3261e">
            AUSSER BETRIEB
          </text>
        </g>
        <circle cx={sx} cy={sy} r={300} fill="url(#gWarm)" opacity={0.5} style={{ mixBlendMode: "screen" }} />
        <rect width={1080} height={1920} fill="#000" opacity={0.2} />
        <Person x={150} y={1900} h={700} pose="torch" rim="#ffd38a" />
        <Beam x={240} y={1470} angle={-60} length={420} spread={12} o={0.7} />
      </Stage>
      <Callout x={90} y={1000 + 120} text="GELDAUTOMAT: AUS" sub="Bargeld nur, wer vorgesorgt hat" from={8} />
    </CamMove>
  );
};

/** Smartphone: Netz bricht weg. */
export const PhoneSignal: React.FC<ShotProps> = ({ dur }) => {
  const f = useCurrentFrame();
  const bars = Math.max(0, 4 - Math.floor(interpolate(f, [4, 26], [0, 4.99], clamp)));
  const noNet = bars === 0;
  const msg = easeOut(f, 30, 38);
  return (
    <CamMove frame={f} dur={dur} z0={1.0} z1={1.1} originY={45} hand={1.4}>
      <Stage>
        <rect width={1080} height={1920} fill="#040509" />
        {/* Bokeh im Hintergrund */}
        {new Array(12).fill(0).map((_, i) => (
          <Glow key={i} x={random(`bk${i}`) * 1080} y={300 + random(`bky${i}`) * 1300} r={40 + random(`bkr${i}`) * 70} g={i % 3 ? "gCool" : "gWarm"} o={0.12} />
        ))}
        <Glow x={540} y={900} r={700} g="gCool" o={0.35} />
        {/* Hand */}
        <path d="M250 1700 Q230 1300 300 1150 L360 1100 L360 1500 Q380 1600 460 1700 Z" fill="#1a1412" />
        <path d="M820 1700 Q860 1350 790 1200 L730 1220 L740 1500 Q700 1620 640 1700 Z" fill="#1a1412" />
        {/* Telefon */}
        <rect x={300} y={520} width={480} height={980} rx={64} fill="#0a0b0e" stroke="#2b2f37" strokeWidth={6} />
        <rect x={322} y={542} width={436} height={936} rx={46} fill="#0f1622" />
        <rect x={322} y={542} width={436} height={936} rx={46} fill="url(#phoneScreen)" />
        <defs>
          <linearGradient id="phoneScreen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d2c48" />
            <stop offset="100%" stopColor="#0b111c" />
          </linearGradient>
        </defs>
        {/* Statusleiste */}
        <text x={360} y={598} fontFamily="Inter" fontWeight={700} fontSize={26} fill="#e9eef8">
          {noNet ? "Kein Netz" : "21:47"}
        </text>
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={620 + i * 14} y={590 - (i + 1) * 7} width={9} height={(i + 1) * 7} rx={2} fill={i < bars ? "#e9eef8" : "#3b4558"} />
        ))}
        {noNet && <line x1={616} y1={598} x2={672} y2={560} stroke={C.red} strokeWidth={4} />}
        <rect x={688} y={574} width={44} height={22} rx={5} fill="none" stroke="#e9eef8" strokeWidth={2.5} />
        <rect x={692} y={578} width={10} height={14} rx={2} fill={C.red} />
        {/* Nachrichten */}
        <rect x={360} y={700} width={300} height={70} rx={24} fill="#2a3448" />
        <text x={380} y={745} fontFamily="Inter" fontWeight={500} fontSize={24} fill="#dfe6f2">
          Bei euch auch kein Strom?
        </text>
        <rect x={420} y={800} width={300} height={70} rx={24} fill="#2f7dff" opacity={0.9} />
        <text x={440} y={845} fontFamily="Inter" fontWeight={500} fontSize={24} fill="#fff">
          Ja, alles dunkel hier.
        </text>
        <g opacity={msg}>
          <circle cx={735} cy={835} r={16} fill={C.red} />
          <text x={735} y={844} textAnchor="middle" fontFamily="Inter" fontWeight={900} fontSize={24} fill="#fff">
            !
          </text>
          <text x={720} y={900} textAnchor="end" fontFamily="Inter" fontWeight={500} fontSize={20} fill="#ff8a80">
            Nicht zugestellt
          </text>
        </g>
        {noNet && (
          <g>
            <rect x={350} y={960} width={380} height={160} rx={26} fill="#0b0f18" stroke="#3b4558" strokeWidth={2} />
            <text x={540} y={1025} textAnchor="middle" fontFamily="Inter" fontWeight={800} fontSize={32} fill="#e9eef8">
              Keine Verbindung
            </text>
            <text x={540} y={1070} textAnchor="middle" fontFamily="Inter" fontWeight={500} fontSize={22} fill="#9aa6ba">
              Mobilfunknetz nicht verfügbar
            </text>
          </g>
        )}
        <Glow x={540} y={1000} r={500} g="gCool" o={0.18} />
      </Stage>
    </CamMove>
  );
};
