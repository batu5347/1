/**
 * Welt-Koordinaten in Metern: x = Osten, y = oben, z = Süden (Norden = -z).
 * Ursprung = Mitte des Nordturms (1 WTC). Maße der Türme nach öffentlich
 * dokumentierten Werten, Umgebung stark vereinfacht.
 */
import type { Vec3 } from "../lib/math";

export const FLOOR_H = 3.66;

export const NORTH_TOWER = { id: "N" as const, x: 0, z: 0, w: 63.4, h: 417, antenna: 110 };
// 2 WTC lag ca. 187 m südlich und 11 m östlich des Nordturms
export const SOUTH_TOWER = { id: "S" as const, x: 11, z: 187, w: 63.4, h: 415, antenna: 0 };
export type Tower = typeof NORTH_TOWER | typeof SOUTH_TOWER;

/** Einschlagzonen (Stockwerke 93–99 Nordturm, Nordfassade; 77–85 Südturm, Südfassade) */
export const IMPACT = {
  N: { y0: 92 * FLOOR_H, y1: 99 * FLOOR_H, face: [0, 0, -1] as Vec3, offset: 4 },
  S: { y0: 77 * FLOOR_H, y1: 85 * FLOOR_H, face: [0, 0, 1] as Vec3, offset: 14 },
};
export const impactPoint = (t: "N" | "S"): Vec3 => {
  const tw = t === "N" ? NORTH_TOWER : SOUTH_TOWER;
  const im = IMPACT[t];
  return [tw.x + im.offset, (im.y0 + im.y1) / 2, tw.z + (im.face[2] * tw.w) / 2];
};

/**
 * Straßen-Rahmen („West Broadway“, Tribeca): Das Straßenraster ist um ~29° gegen
 * Nord gedreht. Lokale Koordinaten: xl quer (+ = Ost-Südost), zl längs (+ = Richtung Türme).
 */
export const GRID_ANGLE = (-29 * Math.PI) / 180;
const C = Math.cos(GRID_ANGLE);
const S = Math.sin(GRID_ANGLE);
export const STREET_ORIGIN: Vec3 = [168, 0, -196];
export const toWorld = (xl: number, y: number, zl: number): Vec3 => [
  STREET_ORIGIN[0] + xl * C + zl * S,
  y,
  STREET_ORIGIN[2] - xl * S + zl * C,
];
export const toLocal = (x: number, z: number): [number, number] => {
  const dx = x - STREET_ORIGIN[0];
  const dz = z - STREET_ORIGIN[2];
  return [dx * C - dz * S, dx * S + dz * C];
};
/** Richtung „Straße hinunter“ (zu den Türmen) in Weltkoordinaten */
export const STREET_DIR: Vec3 = [S, 0, C];

export const ROAD_HALF = 7; // Fahrbahn 14 m
export const WALK = 5; // Gehweg
export const FRONT = ROAD_HALF + WALK; // Gebäudefluchtlinie
export const STREET_Z0 = -1500;
export const STREET_Z1 = -95; // Ende der Straße (Vesey St / 7 WTC)
/** Querstraßen (lokale zl) mit historischen Namen */
export const CROSS_STREETS = [
  { zl: -1180, name: "FRANKLIN ST" },
  { zl: -1030, name: "WHITE ST" },
  { zl: -880, name: "WALKER ST" },
  { zl: -735, name: "THOMAS ST" },
  { zl: -590, name: "CHAMBERS ST" },
  { zl: -455, name: "WARREN ST" },
  { zl: -330, name: "MURRAY ST" },
  { zl: -210, name: "PARK PL" },
];
export const CROSS_HALF = 8;

/** Sonne am Morgen des 11.09.2001 (Azimut ~110–140°, Höhe ~33–48°) */
export const sunDir = (minutes: number): Vec3 => {
  const k = Math.min(1, Math.max(0, (minutes - 520) / 110));
  const az = ((108 + 32 * k) * Math.PI) / 180;
  const el = ((32 + 15 * k) * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
};

/** Wind aus Nordwest: Rauch zog nach Südosten Richtung Brooklyn */
export const WIND: Vec3 = [0.72, 0, 0.62];

/** Grober Umriss von Lower Manhattan (Uferlinie) */
export const ISLAND: [number, number][] = [
  [-470, -6000],
  [-470, -1200],
  [-430, -300],
  [-470, 300],
  [-430, 800],
  [-230, 1150],
  [80, 1300],
  [380, 1180],
  [720, 820],
  [1050, 330],
  [1260, -300],
  [1450, -1200],
  [1900, -2600],
  [2300, -6000],
];
export const onIsland = (x: number, z: number) => {
  let inside = false;
  for (let i = 0, j = ISLAND.length - 1; i < ISLAND.length; j = i++) {
    const [xi, zi] = ISLAND[i];
    const [xj, zj] = ISLAND[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
};

/** WTC-Superblock (für Bebauung freigehalten) */
export const WTC_PLAZA = { x: 0, z: 90, r: 215 };
