import React, { useMemo } from "react";
import * as THREE from "three";
import { Vec3 } from "../lib/math";
import { EVENTS } from "../timeline";
import { impactPoint } from "./geo";

/**
 * Stilisierte Boeing 767 (Low-Poly) auf dem Anflug. Sichtbar nur kurz vor dem
 * Einschlag; keine Details, keine Darstellung von Menschen.
 * Flug 11: Anflug aus Nord-Nordost (Kurs ~200°), Flug 175: aus Süd-Südwest (Kurs ~30°) mit starker Querlage.
 */
const FLIGHTS = [
  { id: "N" as const, t: () => EVENTS.impact1.t, heading: 200, descent: -0.03, speed: 210, bank: 0.18, color: "#c2c6ca" },
  { id: "S" as const, t: () => EVENTS.impact2.t, heading: 28, descent: -0.05, speed: 262, bank: -0.62, color: "#5f6873" },
];
const VISIBLE = 3.0; // Sekunden vor dem Einschlag

const Airliner: React.FC<{ color: string }> = ({ color }) => {
  const m = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.25, flatShading: true }),
      dark: new THREE.MeshStandardMaterial({ color: "#2e3238", roughness: 0.6, flatShading: true }),
    }),
    [color],
  );
  // lokale Achsen: +z = Flugrichtung
  return (
    <group>
      <mesh material={m.body} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[2.5, 2.5, 40, 8]} />
      </mesh>
      <mesh material={m.body} position={[0, 0, 22.5]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[2.5, 5, 8]} />
      </mesh>
      <mesh material={m.body} position={[0, 0.4, -22.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[2.4, 6, 8]} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh material={m.body} position={[s * 12, -0.8, 1]} rotation={[0, s * 0.55, 0]} castShadow>
            <boxGeometry args={[24, 0.5, 5.5]} />
          </mesh>
          <mesh material={m.dark} position={[s * 8, -2.3, 4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[1.25, 1.1, 4.5, 8]} />
          </mesh>
          <mesh material={m.body} position={[s * 4.6, 0.5, -21]} rotation={[0, s * 0.6, 0]}>
            <boxGeometry args={[9, 0.35, 3]} />
          </mesh>
        </group>
      ))}
      <mesh material={m.body} position={[0, 5.5, -20.5]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.45, 9, 4.2]} />
      </mesh>
    </group>
  );
};

export const Planes: React.FC<{ t: number }> = ({ t }) => (
  <>
    {FLIGHTS.map((f) => {
      const dt = f.t() - t;
      if (dt <= 0.02 || dt > VISIBLE) return null;
      const h = (f.heading * Math.PI) / 180;
      const dir = new THREE.Vector3(Math.sin(h), f.descent, -Math.cos(h)).normalize();
      const p: Vec3 = impactPoint(f.id);
      const pos = new THREE.Vector3(...p).addScaledVector(dir, -f.speed * dt);
      const yaw = Math.atan2(dir.x, dir.z);
      const pitch = -Math.asin(dir.y);
      return (
        <group key={f.id} position={pos} rotation={[pitch, yaw, 0, "YXZ"]}>
          <group rotation={[0, 0, f.bank]}>
            <Airliner color={f.color} />
          </group>
        </group>
      );
    })}
  </>
);
