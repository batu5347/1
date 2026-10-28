import React, { useLayoutEffect, useRef } from "react";
import { AbsoluteFill, Easing, interpolate, random, useCurrentFrame } from "remotion";
import { clamp } from "../lib/anim";

/**
 * Drohnenartige Luftaufnahme einer Großstadt bei Nacht (Berlin-ähnlich:
 * Fernsehturm, Spree, Ausfallstraßen). Prozedural erzeugt und perspektivisch
 * projiziert. Jedes Licht gehört zu einem Stadtbezirk; Bezirke fallen beim
 * Blackout kaskadenartig aus (und kehren ggf. zurück).
 */

const W = 1080;
const H = 1920;

type Kind = 0 | 1 | 2 | 3; // 0 Laterne (Natrium), 1 Laterne (LED), 2 Fenster warm, 3 Fenster kalt
const COLORS: Record<number, [number, number, number]> = {
  0: [255, 172, 74],
  1: [214, 228, 255],
  2: [255, 206, 140],
  3: [190, 214, 255],
};

const R = (k: string) => random(`city-${k}`);

// --------------------------------------------------------------- Stadtmodell
const DISTRICTS = new Array(26).fill(0).map((_, i) => ({
  x: (R(`dx${i}`) - 0.5) * 7000,
  z: 300 + R(`dz${i}`) * 9500,
  order: R(`do${i}`),
}));
const districtOf = (x: number, z: number) => {
  let best = 0;
  let bd = Infinity;
  DISTRICTS.forEach((d, i) => {
    const dd = (d.x - x) ** 2 + (d.z - z) ** 2;
    if (dd < bd) {
      bd = dd;
      best = i;
    }
  });
  return best;
};

const riverX = (z: number) => 520 * Math.sin(z / 1700) + 260 * Math.sin(z / 610 + 1) - 300;
const inRiver = (x: number, z: number) => Math.abs(x - riverX(z)) < 70;

type Lights = {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  kind: Uint8Array;
  district: Uint8Array;
  size: Float32Array;
  phase: Float32Array;
  n: number;
};

type Block = { x0: number; z0: number; x1: number; z1: number; shade: number };

const build = () => {
  const xs: number[] = [];
  const ys: number[] = [];
  const zs: number[] = [];
  const ks: number[] = [];
  const ds: number[] = [];
  const ss: number[] = [];
  const ps: number[] = [];
  const blocks: Block[] = [];
  const push = (x: number, y: number, z: number, k: Kind, s: number) => {
    if (inRiver(x, z)) return;
    xs.push(x);
    ys.push(y);
    zs.push(z);
    ks.push(k);
    ds.push(districtOf(x, z));
    ss.push(s);
    ps.push(random(`ph${xs.length}`));
  };
  const X0 = -4200;
  const X1 = 4200;
  const Z0 = -200;
  const Z1 = 11000;
  // Straßenraster mit leicht variierenden Abständen
  const colsX: number[] = [];
  for (let x = X0, i = 0; x < X1; i++) {
    colsX.push(x);
    x += 120 + R(`cx${i}`) * 90;
  }
  const rowsZ: number[] = [];
  for (let z = Z0, i = 0; z < Z1; i++) {
    rowsZ.push(z);
    z += 110 + R(`rz${i}`) * 80;
  }
  const center = { x: 150, z: 3400 };
  const density = (x: number, z: number) => {
    const d = Math.hypot(x - center.x, (z - center.z) * 0.8);
    return Math.max(0.18, 1 - d / 6500);
  };
  // Laternen entlang der Straßen
  colsX.forEach((x, i) => {
    const major = i % 6 === 0;
    for (let z = Z0; z < Z1; z += major ? 22 : 30) {
      if (R(`lx${i}-${Math.round(z)}`) > 0.25 + density(x, z)) continue;
      push(x + (major ? -9 : 0), 0, z, R(`lk${i}`) > 0.8 ? 1 : 0, major ? 1.25 : 1);
      if (major) push(x + 9, 0, z + 11, 0, 1.25);
    }
  });
  rowsZ.forEach((z, j) => {
    const major = j % 7 === 3;
    for (let x = X0; x < X1; x += major ? 22 : 30) {
      if (R(`lz${j}-${Math.round(x)}`) > 0.25 + density(x, z)) continue;
      push(x, 0, z, R(`lzk${j}`) > 0.8 ? 1 : 0, major ? 1.25 : 1);
    }
  });
  // Diagonale Ausfallstraßen (sternförmig vom Zentrum)
  for (let a = 0; a < 6; a++) {
    const ang = (a / 6) * Math.PI * 2 + 0.3;
    for (let r = 200; r < 9000; r += 20) {
      push(center.x + Math.cos(ang) * r, 0, center.z + Math.sin(ang) * r, 0, 1.35);
    }
  }
  // Häuserblöcke + Fenster
  for (let i = 0; i < colsX.length - 1; i++) {
    for (let j = 0; j < rowsZ.length - 1; j++) {
      const x0 = colsX[i] + 14;
      const x1 = colsX[i + 1] - 14;
      const z0 = rowsZ[j] + 14;
      const z1 = rowsZ[j + 1] - 14;
      const cx = (x0 + x1) / 2;
      const cz = (z0 + z1) / 2;
      if (inRiver(cx, cz)) continue;
      const dens = density(cx, cz);
      const park = R(`park${i}-${j}`) < 0.07;
      blocks.push({ x0, z0, x1, z1, shade: park ? 0.25 : 0.2 + R(`sh${i}-${j}`) ** 2 * 0.9 });
      if (park) continue;
      const count = Math.round(dens * 26 * (0.5 + R(`bc${i}-${j}`)));
      const tall = dens > 0.75 && R(`tall${i}-${j}`) > 0.6;
      for (let k = 0; k < count; k++) {
        const x = x0 + R(`wx${i}-${j}-${k}`) * (x1 - x0);
        const z = z0 + R(`wz${i}-${j}-${k}`) * (z1 - z0);
        const y = tall ? R(`wy${i}-${j}-${k}`) * 110 : R(`wy${i}-${j}-${k}`) * 22;
        push(x, y, z, R(`wk${i}-${j}-${k}`) > 0.3 ? 2 : 3, 0.55);
      }
    }
  }
  const lights: Lights = {
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    z: Float32Array.from(zs),
    kind: Uint8Array.from(ks),
    district: Uint8Array.from(ds),
    size: Float32Array.from(ss),
    phase: Float32Array.from(ps),
    n: xs.length,
  };
  // Fahrspuren für Autos (auf Hauptstraßen)
  const lanes = colsX.filter((_, i) => i % 6 === 0);
  return { lights, blocks, lanes, center };
};

let MODEL: ReturnType<typeof build> | null = null;
const model = () => (MODEL ??= build());

// --------------------------------------------------------------- Glow-Sprites
const spriteCache = new Map<string, HTMLCanvasElement>();
const sprite = (rgb: [number, number, number], core = 0.18) => {
  const key = rgb.join(",") + core;
  const hit = spriteCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  const [r, gg, b] = rgb;
  grd.addColorStop(0, `rgba(255,255,255,1)`);
  grd.addColorStop(core, `rgba(${r},${gg},${b},0.9)`);
  grd.addColorStop(0.45, `rgba(${r},${gg},${b},0.22)`);
  grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  spriteCache.set(key, c);
  return c;
};

// --------------------------------------------------------------- Kamera
export type Cam = { x: number; y: number; z: number; pitch: number; yaw: number; f: number };

const project = (cam: Cam, px: number, py: number, pz: number) => {
  const dx = px - cam.x;
  const dy = py - cam.y;
  const dz = pz - cam.z;
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const x1 = dx * cy - dz * sy;
  const z1 = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const zc = -dy * sp + z1 * cp;
  const yc = dy * cp + z1 * sp;
  return { sx: W / 2 + (cam.f * x1) / zc, sy: H / 2 - (cam.f * yc) / zc, zc };
};

export type CityMode = {
  cam: (frame: number) => Cam;
  /** Helligkeit eines Bezirks (0..1) zum Frame */
  district: (frame: number, d: number, order: number) => number;
  /** Fahrzeuge: 0..1 (1 = normaler Verkehr) */
  traffic: number;
  /** Blaulicht-Fahrzeuge */
  emergency?: boolean;
  /** Notstrom-Inseln (Krankenhäuser etc.) */
  islands?: boolean;
  /** Kerzen-/Taschenlampenlicht in Fenstern */
  candles?: number;
  /** Helligkeit des Mondlichts auf den Dächern */
  moon?: number;
  /** Lichtglocke am Horizont (0..1) */
  skyGlow: (frame: number) => number;
  /** Bewegungsunschärfe-Gefühl beim schnellen Zoom (0..1) */
  rush?: (frame: number) => number;
};

export const CityCanvas: React.FC<{ mode: CityMode }> = ({ mode }) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const g = canvas.getContext("2d")!;
    const { lights, blocks, lanes, center } = model();
    const cam = mode.cam(frame);
    const horizonY = H / 2 - cam.f * Math.tan(cam.pitch);
    const glow = mode.skyGlow(frame);

    // Himmel + Lichtglocke
    g.globalCompositeOperation = "source-over";
    const sky = g.createLinearGradient(0, horizonY - 700, 0, horizonY + 40);
    sky.addColorStop(0, "#02040a");
    sky.addColorStop(0.7, `rgb(${10 + glow * 40},${16 + glow * 20},${30 + glow * 8})`);
    sky.addColorStop(1, `rgb(${18 + glow * 95},${22 + glow * 48},${36 + glow * 10})`);
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    const ground = g.createLinearGradient(0, horizonY, 0, H);
    ground.addColorStop(0, `rgb(${10 + glow * 30},${14 + glow * 14},${24})`);
    ground.addColorStop(1, "#020306");
    g.fillStyle = ground;
    g.fillRect(0, Math.max(0, horizonY), W, H);

    // Bezirkshelligkeit vorberechnen
    const dl = new Float32Array(26);
    for (let d = 0; d < 26; d++) dl[d] = mode.district(frame, d, DISTRICTS[d].order);

    // Mondbeschienene Dächer (sichtbar, wenn es dunkel ist)
    const avgLight = dl.reduce((a, b) => a + b, 0) / 26;
    const moon = (0.5 + 0.45 * (1 - avgLight)) * (mode.moon ?? 1);
    for (const b of blocks) {
      const p = [
        project(cam, b.x0, 0, b.z0),
        project(cam, b.x1, 0, b.z0),
        project(cam, b.x1, 0, b.z1),
        project(cam, b.x0, 0, b.z1),
      ];
      if (p.some((q) => q.zc < 20)) continue;
      if (p.every((q) => q.sx < -50 || q.sx > W + 50 || q.sy < -50 || q.sy > H + 50)) continue;
      const fogK = Math.min(1, p[0].zc / 9000);
      const v = b.shade * moon * (1 - fogK * 0.85);
      g.fillStyle = `rgba(${22 * v + 7},${30 * v + 9},${46 * v + 14},1)`;
      g.beginPath();
      g.moveTo(p[0].sx, p[0].sy);
      for (let i = 1; i < 4; i++) g.lineTo(p[i].sx, p[i].sy);
      g.closePath();
      g.fill();
    }

    // Spree (dunkles Wasser mit leichtem Schimmer)
    g.strokeStyle = "rgba(4,7,14,0.95)";
    g.lineCap = "round";
    g.beginPath();
    let started = false;
    for (let z = Math.max(cam.z + 30, -200); z < 11000; z += 40) {
      const q = project(cam, riverX(z), 0, z);
      if (q.zc < 20) continue;
      g.lineWidth = Math.max(1, (140 * cam.f) / q.zc);
      if (!started) {
        g.moveTo(q.sx, q.sy);
        started = true;
      } else g.lineTo(q.sx, q.sy);
    }
    g.stroke();

    // Lichter
    g.globalCompositeOperation = "lighter";
    const sprites = [0, 1, 2, 3].map((k) => sprite(COLORS[k]));
    const candle = sprite([255, 160, 70], 0.1);
    const candles = mode.candles ?? 0;
    for (let i = 0; i < lights.n; i++) {
      const lvl = dl[lights.district[i]];
      const isCandle = candles > 0 && lights.kind[i] >= 2 && lights.phase[i] < candles;
      if (lvl <= 0.01 && !isCandle) continue;
      const q = project(cam, lights.x[i], lights.y[i], lights.z[i]);
      if (q.zc < 15 || q.sx < -40 || q.sx > W + 40 || q.sy < -40 || q.sy > H + 40) continue;
      const fog = Math.max(0, 1 - q.zc / 11000);
      const base = lights.kind[i] < 2 ? 15 : 8;
      let size = (base * lights.size[i] * cam.f) / q.zc;
      size = Math.min(70, Math.max(1.6, size));
      if (lvl > 0.01) {
        g.globalAlpha = Math.min(1, lvl * fog * (lights.kind[i] < 2 ? 0.95 : 0.8));
        g.drawImage(sprites[lights.kind[i]], q.sx - size, q.sy - size, size * 2, size * 2);
      }
      if (isCandle && lvl < 0.5) {
        const fl = 0.55 + 0.45 * Math.sin(frame * 0.4 + lights.phase[i] * 50);
        g.globalAlpha = 0.5 * fl * fog * (1 - lvl);
        const cs = size * 0.9;
        g.drawImage(candle, q.sx - cs, q.sy - cs, cs * 2, cs * 2);
      }
    }

    // Verkehr (Scheinwerfer weiß, Rücklichter rot)
    const traffic = mode.traffic;
    if (traffic > 0) {
      const head = sprite([235, 240, 255], 0.25);
      const tail = sprite([255, 40, 30], 0.2);
      lanes.forEach((lx, li) => {
        const cars = 26;
        for (let c = 0; c < cars; c++) {
          if (random(`car${li}-${c}`) > traffic) continue;
          const speed = (5 + random(`sp${li}-${c}`) * 5) * traffic;
          const dir = c % 2 === 0 ? 1 : -1;
          const span = 11000;
          const z = (((random(`cz${li}-${c}`) * span + dir * frame * speed) % span) + span) % span;
          const x = lx + (dir > 0 ? 5 : -5);
          const q = project(cam, x, 1, z);
          if (q.zc < 15) continue;
          const s = Math.min(40, Math.max(2, (16 * cam.f) / q.zc));
          g.globalAlpha = Math.max(0, 1 - q.zc / 11000);
          // Autos, die auf uns zukommen -> Scheinwerfer, sonst Rücklichter
          g.drawImage(dir < 0 ? head : tail, q.sx - s, q.sy - s, s * 2, s * 2);
        }
      });
    }

    // Einsatzfahrzeuge mit Blaulicht
    if (mode.emergency) {
      const blue = sprite([60, 120, 255], 0.2);
      for (let e = 0; e < 14; e++) {
        const ang = (Math.floor(random(`em${e}`) * 6) / 6) * Math.PI * 2 + 0.3;
        const r = ((random(`emr${e}`) * 7000 + frame * (9 + e)) % 7500) + 300;
        const x = center.x + Math.cos(ang) * r;
        const z = center.z + Math.sin(ang) * r;
        const q = project(cam, x, 2, z);
        if (q.zc < 15) continue;
        const on = (frame + e * 3) % 8 < 4 ? 1 : 0.25;
        const s = Math.min(110, Math.max(9, (80 * cam.f) / q.zc)) * on;
        g.globalAlpha = 0.95;
        g.drawImage(blue, q.sx - s, q.sy - s, s * 2, s * 2);
      }
    }

    // Notstrom-Inseln (z. B. Krankenhäuser): kleine, weiterhin helle Bereiche
    if (mode.islands) {
      const white = sprite([235, 245, 255], 0.2);
      for (let h = 0; h < 6; h++) {
        const hx = (random(`hx${h}`) - 0.5) * 5000;
        const hz = 1200 + random(`hz${h}`) * 7500;
        for (let k = 0; k < 44; k++) {
          const q = project(cam, hx + random(`hk${h}${k}`) * 90, random(`hy${h}${k}`) * 40, hz + random(`hl${h}${k}`) * 90);
          if (q.zc < 15) continue;
          const s = Math.min(40, Math.max(2.4, (12 * cam.f) / q.zc));
          g.globalAlpha = 0.95;
          g.drawImage(white, q.sx - s, q.sy - s, s * 2, s * 2);
        }
      }
    }

    // Fernsehturm (Silhouette, Kugel, Flugwarnlichter)
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const tx = center.x - 120;
    const tz = center.z - 260;
    const base = project(cam, tx, 0, tz);
    const ball = project(cam, tx, 210, tz);
    const top = project(cam, tx, 368, tz);
    if (base.zc > 30) {
      const k = cam.f / base.zc;
      const lit0 = dl[districtOf(tx, tz)];
      g.strokeStyle = `rgb(${34 + 70 * lit0},${40 + 60 * lit0},${56 + 50 * lit0})`;
      g.lineWidth = Math.max(2, 22 * k);
      g.beginPath();
      g.moveTo(base.sx, base.sy);
      g.lineTo(ball.sx, ball.sy);
      g.stroke();
      g.lineWidth = Math.max(1, 6 * k);
      g.beginPath();
      g.moveTo(ball.sx, ball.sy);
      g.lineTo(top.sx, top.sy);
      g.stroke();
      const br = Math.max(4, 32 * k);
      const lit = dl[districtOf(tx, tz)];
      const bg = g.createRadialGradient(ball.sx - br * 0.3, ball.sy - br * 0.3, br * 0.1, ball.sx, ball.sy, br);
      bg.addColorStop(0, `rgb(${40 + 60 * lit},${46 + 50 * lit},${60 + 40 * lit})`);
      bg.addColorStop(1, "rgb(10,13,20)");
      g.fillStyle = bg;
      g.beginPath();
      g.arc(ball.sx, ball.sy, br, 0, Math.PI * 2);
      g.fill();
      // Ring aus Fenstern in der Kugel
      if (lit > 0.01) {
        g.globalCompositeOperation = "lighter";
        g.globalAlpha = lit;
        const ws = sprite([255, 214, 150]);
        for (let a = 0; a < 18; a++) {
          const ang = (a / 18) * Math.PI;
          const wx = ball.sx + Math.cos(ang) * br * 0.95 * (a % 2 ? 1 : -1) * Math.sin(ang);
          const s2 = Math.max(2, br * 0.18);
          g.drawImage(ws, wx - s2, ball.sy + br * 0.1 - s2, s2 * 2, s2 * 2);
        }
      }
      // Flugwarnlichter laufen über Akku weiter
      g.globalCompositeOperation = "lighter";
      const on = (frame % 45) < 22 ? 1 : 0.15;
      g.globalAlpha = on;
      const red = sprite([255, 40, 30], 0.25);
      const rs = Math.max(6, 26 * k);
      g.drawImage(red, top.sx - rs, top.sy - rs, rs * 2, rs * 2);
      const mid = project(cam, tx, 290, tz);
      g.drawImage(red, mid.sx - rs * 0.8, mid.sy - rs * 0.8, rs * 1.6, rs * 1.6);
    }

    // Dunst am Horizont
    g.globalCompositeOperation = "source-over";
    g.globalAlpha = 1;
    const haze = g.createLinearGradient(0, horizonY - 120, 0, horizonY + 260);
    haze.addColorStop(0, "rgba(10,14,24,0)");
    haze.addColorStop(0.45, `rgba(${14 + glow * 40},${18 + glow * 22},${30},${0.55})`);
    haze.addColorStop(1, "rgba(10,14,24,0)");
    g.fillStyle = haze;
    g.fillRect(0, horizonY - 120, W, 380);
  }, [frame, mode]);

  const rush = mode.rush ? mode.rush(frame) : 0;
  return (
    <AbsoluteFill>
      <canvas ref={ref} width={W} height={H} style={{ width: W, height: H, filter: rush > 0 ? `blur(${rush * 2.5}px)` : undefined }} />
    </AbsoluteFill>
  );
};

// --------------------------------------------------------------- Kamerafahrten / Modi
const ease = Easing.inOut(Easing.cubic);

/** Hook: beleuchtete Stadt, kaskadierender Blackout, schneller Zoom in die dunklen Straßen. */
export const hookMode = (blackout: number, dur: number): CityMode => ({
  cam: (f) => {
    const dive = interpolate(f, [blackout + 6, dur], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) });
    return {
      x: -150 + f * 1.2,
      y: interpolate(dive, [0, 1], [520, 150]),
      z: -400 + f * 6 + dive * 1700,
      pitch: interpolate(dive, [0, 1], [0.36, 0.62]),
      yaw: -0.06 + f * 0.0007,
      f: 1450,
    };
  },
  district: (f, d, order) => {
    const at = blackout + Math.round(order * 16);
    if (f < at) return 1;
    const k = f - at;
    if (k > 6) return 0;
    return random(`hk${d}-${k}`) > 0.5 ? 0.6 : 0.08;
  },
  traffic: 1,
  skyGlow: (f) => (f < blackout ? 1 : interpolate(f, [blackout, blackout + 22], [0.7, 0.05], clamp)),
  rush: (f) => interpolate(f, [blackout + 30, dur], [0, 1], clamp),
});

/** 24 Stunden: weite, fast dunkle Stadt; Blaulicht, Notstrom-Inseln, Kerzen. */
export const wideMode = (dur: number): CityMode => ({
  cam: (f) => {
    const p = ease(Math.min(1, f / dur));
    return { x: 300 - p * 500, y: 1500 - p * 250, z: -2600 + p * 900, pitch: 0.42, yaw: 0.05 - p * 0.08, f: 1500 };
  },
  district: () => 0,
  moon: 1.7,
  traffic: 0.25,
  emergency: true,
  islands: true,
  candles: 0.09,
  skyGlow: () => 0.08,
});

/** Strom kehrt zurück: einzelne Bezirke gehen wieder an. */
export const returnMode = (dur: number, relightAt: number): CityMode => ({
  cam: (f) => {
    const p = ease(Math.min(1, f / dur));
    return { x: -200 + p * 300, y: 900 + p * 500, z: -1200 - p * 600, pitch: 0.4, yaw: -0.04 + p * 0.05, f: 1500 };
  },
  district: (f, d, order) => {
    if (order > 0.45) return 0;
    const at = relightAt + Math.round(order * 30);
    if (f < at) return 0;
    const k = f - at;
    if (k > 8) return 1;
    return random(`rk${d}-${k}`) > 0.5 ? 0.7 : 0.05;
  },
  moon: 1.5,
  traffic: 0.2,
  emergency: true,
  islands: true,
  candles: 0.05,
  skyGlow: (f) => interpolate(f, [relightAt, relightAt + 30], [0.04, 0.25], clamp),
});
