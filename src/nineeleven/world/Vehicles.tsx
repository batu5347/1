import React, { useMemo } from "react";
import * as THREE from "three";
import { clamp, easeOut, mixHex, rng, sstep } from "../lib/math";
import { EVENTS } from "../timeline";
import { GRID_ANGLE, STREET_ORIGIN } from "./geo";

type Kind = "taxi" | "sedan" | "bus" | "van" | "fire" | "police" | "ambulance";
type Vehicle = { kind: Kind; x: number; color: string; zAt: (t: number) => number; dirSign: number; lights?: boolean };

const SEDAN_COLORS = ["#2d3a4c", "#8b8f94", "#5b1f22", "#d9d6cf", "#1d2a24", "#3c3f44", "#6b6150"];
const I1 = EVENTS.impact1.t;
const I2 = EVENTS.impact2.t;
const CS = EVENTS.collapseS.t;

/** Normaler Verkehr, der nach dem ersten Einschlag langsam zum Stehen kommt */
const flowing = (z0: number, v0: number, stopAt: number) => (t: number) => {
  const t1 = Math.min(t, stopAt);
  let z = z0 + v0 * t1;
  if (t > stopAt) {
    const k = clamp((t - stopAt) / 3);
    z += v0 * 3 * (k - (k * k) / 2); // gleichmäßig abbremsen
  }
  return z;
};

const makeVehicles = (): Vehicle[] => {
  const r = rng(42);
  const list: Vehicle[] = [];
  // Hook: Taxi kommt der Kamera entgegen und fährt dicht vorbei
  list.push({ kind: "taxi", x: 4.8, color: "#f2c230", dirSign: -1, zAt: flowing(-641, -12.5, I1 + 2) });
  // Taxi hält an der Kreuzung Chambers St
  list.push({ kind: "taxi", x: -2.0, color: "#f2c230", dirSign: 1, zAt: (t) => (t < 5 ? -700 + 8 * t : -660 + 56 * easeOut((t - 5) / 4.2)) });
  // fließender Verkehr in beiden Richtungen
  for (let i = 0; i < 30; i++) {
    const south = i % 2 === 0;
    const kind: Kind = r() < 0.42 ? "taxi" : r() < 0.08 ? "bus" : r() < 0.15 ? "van" : "sedan";
    const lane = south ? (r() < 0.5 ? -2.0 : -5.0) : r() < 0.5 ? 2.0 : 5.0;
    const v = (7 + r() * 5) * (south ? 1 : -1);
    const z0 = -980 + r() * 760;
    list.push({ kind, x: lane, color: kind === "taxi" ? "#f2c230" : SEDAN_COLORS[Math.floor(r() * SEDAN_COLORS.length)], dirSign: south ? 1 : -1, zAt: flowing(z0, v, I1 + 1.5 + r() * 3) });
  }
  // parkende Autos am Bordstein
  for (let i = 0; i < 18; i++) {
    const side = i % 2 ? 1 : -1;
    const zp = -860 + i * 27 + r() * 6;
    if (side > 0 && zp > -600 && zp < -520) continue;
    list.push({ kind: r() < 0.25 ? "van" : "sedan", x: side * 6.4, color: SEDAN_COLORS[Math.floor(r() * SEDAN_COLORS.length)], dirSign: side > 0 ? -1 : 1, zAt: () => zp });
  }
  // Einsatzfahrzeuge fahren nach Süden zu den Türmen (Kamera-Einstellung „evac“ ab 38 s)
  list.push({ kind: "fire", x: -4.6, color: "#b3191f", dirSign: 1, lights: true, zAt: (t) => -466 + 15 * (t - 38) });
  list.push({ kind: "police", x: 3.6, color: "#f4f4f2", dirSign: 1, lights: true, zAt: (t) => -500 + 17 * (t - 38.6) });
  list.push({ kind: "ambulance", x: -4.6, color: "#f4f4f2", dirSign: 1, lights: true, zAt: (t) => -520 + 14 * (t - 39.4) });
  list.push({ kind: "fire", x: 3.6, color: "#b3191f", dirSign: 1, lights: true, zAt: (t) => -560 + 15 * (t - 40.2) });
  // abgestellter Streifenwagen im Staub (Finale)
  list.push({ kind: "police", x: -4.2, color: "#f4f4f2", dirSign: 1, lights: true, zAt: (t) => (t < CS ? -2000 : -612) });
  return list;
};

const box = (w: number, h: number, l: number) => new THREE.BoxGeometry(w, h, l);
const GEO = {
  carBody: box(1.86, 0.72, 4.9),
  carCabin: box(1.58, 0.56, 2.5),
  wheel: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 8).rotateZ(Math.PI / 2),
  sign: box(0.72, 0.26, 0.32),
  bar: box(1.3, 0.16, 0.32),
  busBody: box(2.55, 2.7, 12),
  busWin: box(2.58, 0.95, 10.6),
  vanBody: box(2.0, 2.0, 5.4),
  fireBody: box(2.5, 2.2, 9.6),
  fireCab: box(2.5, 2.7, 2.6),
  ladder: box(0.9, 0.3, 9),
  stripe: box(1.9, 0.18, 4.92),
};

const useMats = () =>
  useMemo(
    () => ({
      glass: new THREE.MeshStandardMaterial({ color: "#26313d", roughness: 0.25, metalness: 0.3, flatShading: true }),
      tire: new THREE.MeshStandardMaterial({ color: "#151515", roughness: 0.9, flatShading: true }),
      chrome: new THREE.MeshStandardMaterial({ color: "#c9cbcd", roughness: 0.4, metalness: 0.5, flatShading: true }),
      white: new THREE.MeshStandardMaterial({ color: "#f2f0ea", roughness: 0.6, flatShading: true }),
      blue: new THREE.MeshStandardMaterial({ color: "#1f3f8f", roughness: 0.6, flatShading: true }),
      redStripe: new THREE.MeshStandardMaterial({ color: "#c8341f", roughness: 0.6, flatShading: true }),
      lightRed: new THREE.MeshBasicMaterial({ color: "#ff2a1a", toneMapped: false }),
      lightBlue: new THREE.MeshBasicMaterial({ color: "#2a5cff", toneMapped: false }),
      lightOff: new THREE.MeshStandardMaterial({ color: "#3a2020", roughness: 0.5 }),
    }),
    [],
  );

const VehicleMesh: React.FC<{ v: Vehicle; t: number; idx: number; mats: ReturnType<typeof useMats> }> = ({ v, t, idx, mats }) => {
  const z = v.zAt(t);
  // Staub legt sich nach dem Einsturz auf alles
  const dust = sstep(CS + 2, CS + 6, t) * 0.75;
  const body = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.1, flatShading: true }), []);
  body.color.set(mixHex(v.color, "#b9b2a5", dust));
  if (z < -1400 || z > -120) return null;
  const rotY = v.dirSign > 0 ? 0 : Math.PI;
  const flash = v.lights && t > I2 - 4 ? Math.floor(t * 5 + idx) % 2 === 0 : false;
  const wheels = (len: number, w = 0.86) =>
    [-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => <mesh key={`${sx}${sz}`} geometry={GEO.wheel} material={mats.tire} position={[sx * w, 0.34, sz * len]} />),
    );
  let content: React.ReactNode;
  switch (v.kind) {
    case "bus":
      content = (
        <>
          <mesh geometry={GEO.busBody} material={mats.white} position={[0, 1.75, 0]} castShadow />
          <mesh geometry={GEO.busWin} material={mats.glass} position={[0, 2.25, 0.3]} />
          <mesh geometry={box(2.6, 0.3, 12.02)} material={mats.blue} position={[0, 1.25, 0]} />
          {wheels(4.2, 1.05)}
        </>
      );
      break;
    case "van":
    case "ambulance":
      content = (
        <>
          <mesh geometry={GEO.vanBody} material={v.kind === "ambulance" ? mats.white : body} position={[0, 1.4, 0]} castShadow />
          <mesh geometry={box(1.9, 0.7, 1.2)} material={mats.glass} position={[0, 1.75, 2.2]} />
          {v.kind === "ambulance" && <mesh geometry={box(2.02, 0.3, 5.42)} material={mats.redStripe} position={[0, 1.2, 0]} />}
          {v.lights && <mesh geometry={GEO.bar} material={flash ? mats.lightRed : mats.lightOff} position={[0, 2.5, 2.3]} />}
          {wheels(1.8, 0.92)}
        </>
      );
      break;
    case "fire":
      content = (
        <>
          <mesh geometry={GEO.fireBody} material={body} position={[0, 1.55, -0.8]} castShadow />
          <mesh geometry={GEO.fireCab} material={body} position={[0, 1.8, 4.6]} castShadow />
          <mesh geometry={box(2.4, 0.9, 0.2)} material={mats.glass} position={[0, 2.5, 5.9]} />
          <mesh geometry={GEO.ladder} material={mats.chrome} position={[0, 2.85, -0.8]} castShadow />
          <mesh geometry={box(2.52, 0.2, 9.62)} material={mats.white} position={[0, 1.1, -0.8]} />
          <mesh geometry={GEO.bar} material={flash ? mats.lightRed : mats.lightOff} position={[0, 3.25, 4.8]} />
          {wheels(3.4, 1.0)}
        </>
      );
      break;
    default:
      content = (
        <>
          <mesh geometry={GEO.carBody} material={v.kind === "police" ? mats.white : body} position={[0, 0.74, 0]} castShadow />
          <mesh geometry={GEO.carCabin} material={mats.glass} position={[0, 1.38, -0.25]} castShadow />
          {v.kind === "taxi" && <mesh geometry={GEO.sign} material={mats.white} position={[0, 1.79, -0.2]} />}
          {v.kind === "taxi" && <mesh geometry={box(1.88, 0.08, 4.92)} material={mats.tire} position={[0, 0.88, 0]} />}
          {v.kind === "police" && <mesh geometry={GEO.stripe} material={mats.blue} position={[0, 0.82, 0]} />}
          {v.kind === "police" && (
            <>
              <mesh geometry={box(0.6, 0.16, 0.3)} material={flash ? mats.lightRed : mats.lightOff} position={[-0.33, 1.75, -0.2]} />
              <mesh geometry={box(0.6, 0.16, 0.3)} material={!flash ? mats.lightBlue : mats.lightOff} position={[0.33, 1.75, -0.2]} />
            </>
          )}
          {wheels(1.5)}
        </>
      );
  }
  return (
    <group position={[v.x, 0, z]} rotation={[0, rotY, 0]}>
      {content}
    </group>
  );
};

export const Vehicles: React.FC<{ t: number }> = ({ t }) => {
  const list = useMemo(makeVehicles, []);
  const mats = useMats();
  return (
    <group position={STREET_ORIGIN} rotation={[0, GRID_ANGLE, 0]}>
      {list.map((v, i) => (
        <VehicleMesh key={i} v={v} t={t} idx={i} mats={mats} />
      ))}
    </group>
  );
};
