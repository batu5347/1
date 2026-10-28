/**
 * Deterministische Partikel-Emitter (reine Funktionen der Video-Zeit t).
 * Jeder Partikel i hat feste Zufallswerte; Position/Größe/Farbe folgen
 * analytisch aus seinem Alter – dadurch ist jeder Frame unabhängig renderbar.
 */
import { clamp, hash, lerp, sstep } from "../lib/math";
import { COLLAPSE_DUR, EVENTS } from "../timeline";
import type { P } from "./Billboards";
import { FRONT, IMPACT, NORTH_TOWER, SOUTH_TOWER, toWorld, WIND } from "./geo";

const H = (i: number, k: number) => hash(i * 13.37 + k * 101.7);

type Rgb = [number, number, number];
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

const SMOKE_DARK = hex("#1e1d1c");
const SMOKE_MID = hex("#5b5753");
const SMOKE_LIGHT = hex("#8d8780");
const DUST = hex("#c4bcae");
const DUST_DARK = hex("#9c9486");

/** Zustand der Türme für die Emitter */
const collapse = (id: "N" | "S", t: number) => {
  const t0 = id === "N" ? EVENTS.collapseN.t : EVENTS.collapseS.t;
  const d = id === "N" ? COLLAPSE_DUR.N : COLLAPSE_DUR.S;
  return { t0, d, c: clamp((t - t0) / d) };
};

/** Rauchfahne aus der Einschlagzone, vom Wind nach Südosten getragen */
const plume = (out: P[], id: "N" | "S", t: number) => {
  const tw = id === "N" ? NORTH_TOWER : SOUTH_TOWER;
  const im = IMPACT[id];
  const tStart = id === "N" ? EVENTS.impact1.t : EVENTS.impact2.t;
  const col = collapse(id, t);
  const tEnd = col.t0 + col.d * 0.5;
  if (t < tStart) return;
  const rate = 34;
  const life = 15;
  const n0 = Math.max(0, Math.floor((t - life - tStart) * rate));
  const n1 = Math.floor((Math.min(t, tEnd) - tStart) * rate);
  for (let i = n0; i <= n1; i++) {
    const born = tStart + i / rate + H(i, 1) / rate;
    const age = t - born;
    if (age < 0 || age > life) continue;
    const k = i + (id === "N" ? 0 : 50000);
    // Startpunkt auf dem Umfang der Brandzone
    const side = Math.floor(H(k, 2) * 4);
    const u = (H(k, 3) - 0.5) * tw.w;
    const half = tw.w / 2;
    const ox = side === 0 ? u : side === 1 ? half : side === 2 ? u : -half;
    const oz = side === 0 ? half : side === 1 ? u : side === 2 ? -half : u;
    const y0 = lerp(im.y0, im.y1 + 6, H(k, 4));
    // Anfangs-Entwicklung (die ersten Sekunden kräftiger, danach dichte Fahne)
    const ramp = sstep(0, 3.5, t - tStart);
    const wind = 9 + H(k, 5) * 7;
    const drift = age * wind * (0.6 + 0.4 * ramp);
    const rise = 4 + 20 * Math.sqrt(age) + H(k, 6) * 10;
    const swirl = Math.sin(age * 0.7 + H(k, 7) * 6) * (3 + age * 1.6);
    const x = tw.x + ox * (1 + age * 0.05) + WIND[0] * drift * 1.7 + swirl * 0.6;
    const z = tw.z + oz * (1 + age * 0.05) + WIND[2] * drift * 1.7 - swirl * 0.5;
    const y = y0 + rise - age * age * 0.12;
    const s = (10 + age * 7.5 + H(k, 8) * 8) * (0.7 + 0.3 * ramp);
    const fadeIn = sstep(0, 0.6, age);
    const fadeOut = 1 - sstep(life * 0.55, life, age);
    const cShade = mixRgb(SMOKE_DARK, id === "N" ? SMOKE_MID : SMOKE_LIGHT, sstep(0.5, 9, age));
    const lit = 0.9 + H(k, 9) * 0.2;
    out.push({ x, y, z, s, r: cShade[0] * lit, g: cShade[1] * lit, b: cShade[2] * lit, a: 0.62 * fadeIn * fadeOut, rot: H(k, 10) * 6.28 + age * 0.05, v: Math.floor(H(k, 11) * 4) });
  }
};

/** Kurzer Feuerball beim Einschlag (additiv, stilisiert) */
export const fireballs = (t: number): P[] => {
  const out: P[] = [];
  for (const id of ["N", "S"] as const) {
    const tw = id === "N" ? NORTH_TOWER : SOUTH_TOWER;
    const im = IMPACT[id];
    const t0 = id === "N" ? EVENTS.impact1.t : EVENTS.impact2.t;
    const age = t - t0;
    if (age < 0 || age > 3.2) continue;
    const big = id === "S" ? 1.5 : 1;
    const n = 70;
    for (let i = 0; i < n; i++) {
      const k = i + (id === "N" ? 0 : 1000);
      // Austritt: Nordturm v. a. Nord-/Südseite, Südturm v. a. Ost- und Nordseite
      const dirs: [number, number][] = id === "N" ? [[0, -1], [0, 1], [1, 0]] : [[1, 0], [0, -1], [0, 1]];
      const [dx, dz] = dirs[Math.floor(H(k, 1) * (H(k, 9) < 0.7 ? 2 : 3))];
      const sp = (18 + H(k, 2) * 40) * big;
      const grow = 1 - Math.exp(-age * 2.4);
      const along = (H(k, 3) - 0.5) * tw.w * 0.9 * (1 + grow);
      const x = tw.x + im.offset * 0.5 + (dx !== 0 ? dx * (tw.w / 2 + sp * grow) : along) + (H(k, 4) - 0.5) * 12 * grow;
      const z = tw.z + (dz !== 0 ? dz * (tw.w / 2 + sp * grow) : along) + (H(k, 5) - 0.5) * 12 * grow;
      const y = (im.y0 + im.y1) / 2 + (H(k, 6) - 0.4) * 22 * grow + age * 6;
      const s = (8 + 26 * grow + H(k, 7) * 10) * big;
      const heat = Math.exp(-age * 1.3);
      out.push({ x, y, z, s, r: 0.9, g: 0.32 * heat + 0.12, b: 0.05 * heat + 0.02, a: heat * (age < 0.08 ? age / 0.08 : 1) * 0.42, rot: H(k, 8) * 6, v: i % 4 });
    }
  }
  return out;
};

/** Dunkle Rauchwolke direkt nach dem Feuerball */
const impactSmoke = (out: P[], t: number) => {
  for (const id of ["N", "S"] as const) {
    const tw = id === "N" ? NORTH_TOWER : SOUTH_TOWER;
    const im = IMPACT[id];
    const t0 = (id === "N" ? EVENTS.impact1.t : EVENTS.impact2.t) + 0.35;
    const age = t - t0;
    if (age < 0 || age > 14) continue;
    for (let i = 0; i < 60; i++) {
      const k = i + (id === "N" ? 3000 : 4000);
      const a = H(k, 1) * Math.PI * 2;
      const r = (tw.w / 2 + 10) * (0.6 + 0.6 * H(k, 2)) + 30 * (1 - Math.exp(-age));
      const x = tw.x + Math.cos(a) * r + WIND[0] * age * 9;
      const z = tw.z + Math.sin(a) * r + WIND[2] * age * 9;
      const y = (im.y0 + im.y1) / 2 + (H(k, 3) - 0.3) * 30 + age * 5;
      out.push({ x, y, z, s: 22 + age * 6 + H(k, 4) * 14, r: SMOKE_DARK[0], g: SMOKE_DARK[1], b: SMOKE_DARK[2], a: 0.7 * (1 - sstep(4, 14, age)) * sstep(0, 0.3, age), rot: H(k, 5) * 6, v: i % 4 });
    }
  }
};

/** Staub des Einsturzes: an der Einsturzfront nach außen, dann Bodenwolke */
const collapseDust = (out: P[], id: "N" | "S", t: number) => {
  const tw = id === "N" ? NORTH_TOWER : SOUTH_TOWER;
  const { t0, d, c } = collapse(id, t);
  const im = IMPACT[id];
  if (t < t0) return;
  const k0 = id === "N" ? 10000 : 20000;
  // a) Front-Staub
  const nf = 1100;
  for (let i = 0; i < nf; i++) {
    const k = k0 + i;
    const born = t0 + (i / nf) * d * 0.98;
    const age = t - born;
    if (age < 0) continue;
    const cb = clamp((born - t0) / d);
    const yf = im.y0 * (1 - Math.pow(clamp((cb - 0.06) / 0.94), 2.2));
    const a = H(k, 1) * Math.PI * 2;
    const sp = 22 + H(k, 2) * 30;
    const tau = 2.2;
    const out_r = tw.w * 0.5 + sp * tau * (1 - Math.exp(-age / tau));
    const x = tw.x + Math.cos(a) * out_r + WIND[0] * age * 6;
    const z = tw.z + Math.sin(a) * out_r + WIND[2] * age * 6;
    const y = Math.max(8 + H(k, 3) * 20, yf + (H(k, 4) - 0.5) * 30 - age * (6 + H(k, 5) * 10) + 12 * Math.sqrt(age));
    const s = 22 + age * 10 + H(k, 6) * 18;
    const col = mixRgb(DUST_DARK, SMOKE_LIGHT, H(k, 7) * 0.6);
    const fade = 1 - sstep(10, 22, age);
    out.push({ x, y, z, s: Math.min(s, 170), r: col[0], g: col[1], b: col[2], a: 0.75 * sstep(0, 0.25, age) * fade, rot: H(k, 8) * 6, v: i % 4 });
  }
  // a2) Staubfahnen, die in Bögen nach außen und unten fallen
  for (let i = 0; i < 320; i++) {
    const k = k0 + 3000 + i;
    const born = t0 + (i / 320) * d * 0.9;
    const age = t - born;
    if (age < 0 || age > 7) continue;
    const cb = clamp((born - t0) / d);
    const yf = im.y0 * (1 - Math.pow(clamp((cb - 0.06) / 0.94), 2.2));
    const a = H(k, 1) * Math.PI * 2;
    const sp = 26 + H(k, 2) * 26;
    const r = tw.w * 0.5 + sp * age;
    const y = yf + 6 * age - 0.5 * 14 * age * age;
    if (y < 5) continue;
    const x = tw.x + Math.cos(a) * r;
    const z = tw.z + Math.sin(a) * r;
    const col = mixRgb(DUST, SMOKE_LIGHT, H(k, 3) * 0.6);
    out.push({ x, y, z, s: 10 + age * 7, r: col[0], g: col[1], b: col[2], a: 0.7 * (1 - sstep(3.5, 7, age)), rot: H(k, 4) * 6, v: i % 4 });
  }
  // b) Bodenwolke, die sich durch die Straßen ausbreitet und lange stehen bleibt
  const ng = 520;
  for (let i = 0; i < ng; i++) {
    const k = k0 + 5000 + i;
    const born = t0 + d * (0.35 + 0.6 * (i / ng));
    const age = t - born;
    if (age < 0) continue;
    const a = H(k, 1) * Math.PI * 2;
    const R = 120 + H(k, 2) * 480;
    const r = R * (1 - Math.exp(-age / 3.2));
    const x = tw.x + Math.cos(a) * r + WIND[0] * age * 4;
    const z = tw.z + Math.sin(a) * r + WIND[2] * age * 4;
    const y = 12 + H(k, 3) * (40 + 110 * (1 - Math.exp(-age / 4)));
    const s = 45 + H(k, 4) * 60 + age * 3;
    const col = mixRgb(DUST, DUST_DARK, H(k, 5) * 0.6);
    out.push({ x, y, z, s: Math.min(s, 150), r: col[0], g: col[1], b: col[2], a: 0.6 * sstep(0, 0.8, age), rot: H(k, 6) * 6, v: i % 4 });
  }
  // c) Aufsteigende Rauch-/Staubsäule über der Einsturzstelle
  if (c > 0.6) {
    const rate = 18;
    const life = 22;
    const ts = t0 + d * 0.6;
    const n0 = Math.max(0, Math.floor((t - life - ts) * rate));
    const n1 = Math.floor((t - ts) * rate);
    for (let i = n0; i <= n1; i++) {
      const k = k0 + 9000 + i;
      const age = t - (ts + i / rate);
      if (age < 0 || age > life) continue;
      const x = tw.x + (H(k, 1) - 0.5) * 120 + WIND[0] * age * 14;
      const z = tw.z + (H(k, 2) - 0.5) * 120 + WIND[2] * age * 14;
      const y = 20 + age * 24 + H(k, 3) * 40;
      const col = mixRgb(DUST_DARK, SMOKE_MID, 0.5 + H(k, 4) * 0.5);
      out.push({ x, y, z, s: 55 + age * 11, r: col[0], g: col[1], b: col[2], a: 0.5 * sstep(0, 1, age) * (1 - sstep(life * 0.6, life, age)), rot: H(k, 5) * 6, v: i % 4 });
    }
  }
};

/** Staubwalze in der Straßenschlucht (lokales Straßen-Koordinatensystem) */
const streetDust = (out: P[], t: number, shot: string) => {
  if (shot === "dustStreet") {
    const tl = t - 47;
    const front = -505 - 52 * tl; // Front läuft nach Norden auf die Kamera zu
    for (let i = 0; i < 700; i++) {
      const depth = Math.pow(H(i, 1), 1.6) * 380;
      const zl = front + depth;
      const xl = (H(i, 2) - 0.5) * (FRONT * 2 + (depth > 30 ? 10 : 0));
      const roll = Math.sin(tl * 1.4 + H(i, 3) * 6.28) * 4;
      const yl = Math.pow(H(i, 4), 1.3) * (35 + depth * 0.25) + 2 + roll;
      const [x, y, z] = toWorld(xl, yl, zl - roll * 0.6);
      const s = 9 + H(i, 5) * 16 + depth * 0.06;
      const col = mixRgb(DUST, DUST_DARK, 0.25 + H(i, 6) * 0.5);
      out.push({ x, y, z, s, r: col[0], g: col[1], b: col[2], a: 0.85 * (depth < 4 ? depth / 4 : 1), rot: H(i, 7) * 6 + tl * 0.2, v: i % 4 });
    }
  }
  if (shot === "evac") {
    // Rauchschwaden ziehen hoch über die Straße
    const tl = t - 38;
    for (let i = 0; i < 90; i++) {
      const zl = -700 + H(i, 1) * 520 + tl * 3;
      const xl = (H(i, 2) - 0.5) * 70 + tl * 2;
      const [x, y, z] = toWorld(xl, 25 + H(i, 3) * 70, zl);
      out.push({ x, y, z, s: 30 + H(i, 4) * 40, r: SMOKE_MID[0], g: SMOKE_MID[1], b: SMOKE_MID[2], a: 0.22, rot: H(i, 5) * 6, v: i % 4 });
    }
  }
  if (shot === "finaleStreet") {
    // Schwebender Staub
    const tl = t - 55;
    for (let i = 0; i < 220; i++) {
      const zl = -700 + Math.pow(H(i, 1), 0.8) * 380;
      const xl = (H(i, 2) - 0.5) * (FRONT * 2);
      const [x, y, z] = toWorld(xl + Math.sin(tl * 0.3 + i) * 2, 1 + H(i, 3) * 45 + tl * 0.3, zl);
      const col = mixRgb(DUST, DUST_DARK, H(i, 4) * 0.5);
      out.push({ x, y, z, s: 6 + H(i, 5) * 14, r: col[0], g: col[1], b: col[2], a: 0.3, rot: H(i, 6) * 6, v: i % 4 });
    }
  }
};

/** Papier, das langsam durch die Luft fällt (Finale) */
export const papers = (t: number, shot: string): P[] => {
  const out: P[] = [];
  if (shot !== "finaleStreet" && shot !== "dustStreet") return out;
  const t0 = shot === "finaleStreet" ? 55 : 47;
  const tl = t - t0 + 6;
  for (let i = 0; i < 140; i++) {
    const zl = (shot === "finaleStreet" ? -700 : -655) + 8 + Math.pow(H(i, 1), 1.4) * 120;
    const fall = (1.2 + H(i, 2) * 1.2) * tl;
    const y = ((40 + H(i, 3) * 60 - fall) % 70 + 70) % 70 + 0.3;
    const sway = Math.sin(tl * (1 + H(i, 4)) + i) * 2.2;
    const [x, , z] = toWorld((H(i, 5) - 0.5) * FRONT * 2 + sway, 0, zl + Math.cos(tl * 0.8 + i) * 1.5);
    const flip = Math.abs(Math.sin(tl * (2 + H(i, 6) * 2) + i));
    out.push({ x, y, z, s: 0.32 * (0.35 + 0.65 * flip) + 0.05, r: 0.95, g: 0.94, b: 0.9, a: 0.95, rot: tl * (1 + H(i, 7)) + i, v: i % 4 });
  }
  return out;
};

/** Alle normal überblendeten Rauch-/Staub-Partikel zum Zeitpunkt t */
export const smokeAndDust = (t: number, shot: string): P[] => {
  const out: P[] = [];
  plume(out, "N", t);
  plume(out, "S", t);
  impactSmoke(out, t);
  collapseDust(out, "S", t);
  collapseDust(out, "N", t);
  streetDust(out, t, shot);
  return out;
};

