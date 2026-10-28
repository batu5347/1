import React, { useMemo } from "react";
import * as THREE from "three";
import { rng } from "../lib/math";
import { EVENTS } from "../timeline";
import { CROSS_HALF, CROSS_STREETS, FRONT, GRID_ANGLE, ROAD_HALF, STREET_ORIGIN } from "./geo";
import { awningTexture, signTexture, walkSignTexture } from "./textures";

/** Straßenmobiliar im Bereich der Kamera-Einstellungen (lokale Straßenkoordinaten) */
const Z_MIN = -900;
const Z_MAX = -300;
const SHOPS: [string, string][] = [
  ["DELI & GROCERY", "#1f5d3a"],
  ["COFFEE SHOP", "#6b2a1f"],
  ["PHARMACY", "#1d3f73"],
  ["CLEANERS", "#7a1f3d"],
  ["NEWSSTAND", "#2f2f2f"],
  ["PIZZA", "#8c2a1c"],
  ["SHOE REPAIR", "#3b4a2a"],
  ["LIQUORS", "#4a2a63"],
];

export const Props: React.FC<{ t: number }> = ({ t }) => {
  const mats = useMemo(
    () => ({
      pole: new THREE.MeshStandardMaterial({ color: "#3d4a3f", roughness: 0.7, flatShading: true }),
      steel: new THREE.MeshStandardMaterial({ color: "#8d9093", roughness: 0.5, metalness: 0.4, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: "#1b1d1f", roughness: 0.8, flatShading: true }),
      yellow: new THREE.MeshStandardMaterial({ color: "#d9a520", roughness: 0.6, flatShading: true }),
      lamp: new THREE.MeshStandardMaterial({ color: "#f4f1e0", emissive: "#3a3628", roughness: 0.5, flatShading: true }),
      trunk: new THREE.MeshStandardMaterial({ color: "#4a3626", roughness: 1, flatShading: true }),
      leaves: [
        new THREE.MeshStandardMaterial({ color: "#4f7a36", roughness: 1, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: "#5d8a3c", roughness: 1, flatShading: true }),
        new THREE.MeshStandardMaterial({ color: "#44692f", roughness: 1, flatShading: true }),
      ],
      hydrant: new THREE.MeshStandardMaterial({ color: "#b8271e", roughness: 0.6, flatShading: true }),
      green: new THREE.MeshBasicMaterial({ color: "#3dff8a", toneMapped: false }),
      red: new THREE.MeshBasicMaterial({ color: "#ff2b1c", toneMapped: false }),
      off: new THREE.MeshStandardMaterial({ color: "#2a2a2a", roughness: 0.6 }),
      fireEscape: new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.8, flatShading: true }),
    }),
    [],
  );
  const signMats = useMemo(() => Object.fromEntries(CROSS_STREETS.map((c) => [c.name, new THREE.MeshBasicMaterial({ map: signTexture(c.name) })])), []);
  const broadway = useMemo(() => new THREE.MeshBasicMaterial({ map: signTexture("W BROADWAY") }), []);
  const walkMats = useMemo(() => [new THREE.MeshBasicMaterial({ map: walkSignTexture(true), toneMapped: false }), new THREE.MeshBasicMaterial({ map: walkSignTexture(false), toneMapped: false })], []);
  const awnings = useMemo(() => SHOPS.map(([txt, bg]) => new THREE.MeshStandardMaterial({ map: awningTexture(txt, bg), roughness: 0.9 })), []);

  const layout = useMemo(() => {
    const r = rng(77);
    const lamps: [number, number][] = [];
    const trees: [number, number, number][] = [];
    const hydrants: [number, number][] = [];
    const shops: [number, number, number][] = [];
    const booths: [number, number][] = [];
    const escapes: [number, number, number][] = [];
    for (const side of [-1, 1]) {
      for (let z = Z_MIN; z < Z_MAX; z += 34) {
        if (CROSS_STREETS.some((c) => Math.abs(c.zl - z) < CROSS_HALF + 3)) continue;
        if (side > 0 && z > -675 && z < -530) continue; // Sichtachse der Gehweg-Kamera frei halten
        lamps.push([side * (ROAD_HALF + 0.6), z + r() * 4]);
      }
      for (let z = Z_MIN; z < Z_MAX; z += 13 + r() * 12) {
        if (CROSS_STREETS.some((c) => Math.abs(c.zl - z) < CROSS_HALF + 4)) continue;
        if (side > 0 && z > -675 && z < -530) continue;
        if (r() < 0.55) trees.push([side * (ROAD_HALF + 1.4), z, Math.floor(r() * 3)]);
        else if (r() < 0.3) hydrants.push([side * (ROAD_HALF + 0.7), z]);
        else if (r() < 0.25) booths.push([side * (ROAD_HALF + 1.0), z]);
      }
      for (let z = Z_MIN; z < Z_MAX; z += 20 + r() * 26) {
        if (CROSS_STREETS.some((c) => Math.abs(c.zl - z) < CROSS_HALF + 6)) continue;
        if (r() < 0.6) shops.push([side, z, Math.floor(r() * SHOPS.length)]);
        if (r() < 0.35) escapes.push([side, z + 6, 3 + Math.floor(r() * 4)]);
      }
    }
    return { lamps, trees, hydrants, shops, booths, escapes };
  }, []);

  // Ampelphase: bis kurz nach dem ersten Einschlag Grün für West Broadway
  const greenForStreet = Math.floor(t / 9) % 2 === 0;
  const walk = t < EVENTS.impact1.t ? !greenForStreet : false;

  return (
    <group position={STREET_ORIGIN} rotation={[0, GRID_ANGLE, 0]}>
      {layout.lamps.map(([x, z], i) => (
        <group key={`l${i}`} position={[x, 0, z]}>
          <mesh material={mats.pole} position={[0, 4.2, 0]} castShadow>
            <cylinderGeometry args={[0.09, 0.14, 8.4, 6]} />
          </mesh>
          <mesh material={mats.pole} position={[-Math.sign(x) * 1.3, 8.3, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 2.6, 5]} />
          </mesh>
          <mesh material={mats.lamp} position={[-Math.sign(x) * 2.5, 8.2, 0]}>
            <boxGeometry args={[0.9, 0.22, 0.45]} />
          </mesh>
        </group>
      ))}
      {layout.trees.map(([x, z, k], i) => (
        <group key={`t${i}`} position={[x, 0, z]}>
          <mesh material={mats.trunk} position={[0, 1.6, 0]} castShadow>
            <cylinderGeometry args={[0.12, 0.18, 3.2, 5]} />
          </mesh>
          <mesh material={mats.leaves[k]} position={[0, 4.4, 0]} scale={[1, 1.15, 1]} castShadow>
            <icosahedronGeometry args={[2.1 + (i % 3) * 0.3, 0]} />
          </mesh>
        </group>
      ))}
      {layout.hydrants.map(([x, z], i) => (
        <mesh key={`h${i}`} material={mats.hydrant} position={[x, 0.45, z]} castShadow>
          <cylinderGeometry args={[0.16, 0.2, 0.75, 6]} />
        </mesh>
      ))}
      {layout.booths.map(([x, z], i) => (
        <group key={`b${i}`} position={[x, 0, z]}>
          <mesh material={mats.steel} position={[0, 1.15, 0]} castShadow>
            <boxGeometry args={[0.7, 2.3, 0.5]} />
          </mesh>
          <mesh material={mats.dark} position={[-Math.sign(x) * 0.26, 1.3, 0]}>
            <boxGeometry args={[0.2, 0.9, 0.36]} />
          </mesh>
        </group>
      ))}
      {layout.shops.map(([side, z, k], i) => (
        <mesh key={`s${i}`} material={awnings[k]} position={[side * (FRONT - 0.9), 3.6, z]} rotation={[0, side > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <planeGeometry args={[7, 1.6]} />
        </mesh>
      ))}
      {layout.escapes.map(([side, z, floors], i) => (
        <group key={`e${i}`} position={[side * (FRONT - 0.7), 0, z]}>
          {Array.from({ length: floors }, (_, f) => (
            <mesh key={f} material={mats.fireEscape} position={[0, 7.8 + f * 3.4, 0]} castShadow>
              <boxGeometry args={[1.2, 0.12, 5]} />
            </mesh>
          ))}
          <mesh material={mats.fireEscape} position={[-side * 0.55, 7.8 + ((floors - 1) * 3.4) / 2, 0]}>
            <boxGeometry args={[0.06, (floors - 1) * 3.4 + 1, 5]} />
          </mesh>
        </group>
      ))}
      {/* Ampeln, Fußgängersignale und Straßenschilder an den Kreuzungen */}
      {CROSS_STREETS.filter((c) => c.zl > Z_MIN && c.zl < Z_MAX).map((c) =>
        [-1, 1].map((side) => {
          const zc = c.zl - side * (CROSS_HALF + 1.2);
          return (
            <group key={`${c.name}${side}`} position={[side * (ROAD_HALF + 0.8), 0, zc]}>
              <mesh material={mats.pole} position={[0, 3, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.13, 6, 6]} />
              </mesh>
              <group position={[0, 5.2, -side * 0.35]} rotation={[0, side > 0 ? Math.PI : 0, 0]}>
                <mesh material={mats.yellow}>
                  <boxGeometry args={[0.42, 1.2, 0.36]} />
                </mesh>
                <mesh material={greenForStreet ? mats.off : mats.red} position={[0, 0.36, -0.19]}>
                  <circleGeometry args={[0.12, 8]} />
                </mesh>
                <mesh material={greenForStreet ? mats.green : mats.off} position={[0, -0.36, -0.19]}>
                  <circleGeometry args={[0.12, 8]} />
                </mesh>
              </group>
              <mesh material={walk ? walkMats[0] : walkMats[1]} position={[0, 2.8, side * 0.2]} rotation={[0, side > 0 ? 0 : Math.PI, 0]}>
                <planeGeometry args={[0.5, 0.5]} />
              </mesh>
              <mesh material={signMats[c.name]} position={[0, 6.25, 0]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[2.4, 0.45]} />
              </mesh>
              <mesh material={signMats[c.name]} position={[0, 6.25, 0]} rotation={[0, -Math.PI / 2, 0]}>
                <planeGeometry args={[2.4, 0.45]} />
              </mesh>
              <mesh material={broadway} position={[0, 6.75, 0]} rotation={[0, side > 0 ? Math.PI : 0, 0]}>
                <planeGeometry args={[2.4, 0.45]} />
              </mesh>
            </group>
          );
        }),
      )}
    </group>
  );
};
