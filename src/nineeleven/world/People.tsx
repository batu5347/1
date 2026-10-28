import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clamp, hash, lerp, rng, sstep } from "../lib/math";
import { EVENTS } from "../timeline";
import { GRID_ANGLE, ROAD_HALF, STREET_ORIGIN } from "./geo";

/** Kleidung um 2001: Anzüge, Trenchcoats, Hemden, Jeans */
const TOPS = ["#1f2a3a", "#2b2b2e", "#4a4f57", "#d3c9b5", "#e9e9e6", "#7a8fa8", "#6b4f3a", "#3d5a40", "#7d2f33", "#a9a49a", "#30343f"];
const BOTTOMS = ["#1c1d22", "#2f3138", "#6e6252", "#2c3a55", "#3e3a36", "#55575c"];
const SKIN = ["#f1c9a5", "#e0ac84", "#c68c63", "#a06a45", "#7a4e32", "#5a3a26", "#ecc0a0"];
const N = 300;

type Person = {
  x0: number;
  xRoad: number;
  z0: number;
  dir: number;
  speed: number;
  stopDelay: number;
  stops: boolean;
  fleeDelay: number;
  fleeSpeed: number;
  toRoad: boolean;
  scale: number;
  briefcase: boolean;
  phase0: number;
};

const N_WALK = N - 18;
const makePeople = (): Person[] => {
  const r = rng(1109);
  // feste Gruppe an der Ecke Chambers St (wartet an der Ampel, schaut später nach oben)
  const group: Person[] = Array.from({ length: N - N_WALK }, (_, i) => ({
    x0: i < 11 ? 8.2 + r() * 3.4 : -(8.2 + r() * 3.4),
    xRoad: (r() - 0.5) * 8,
    z0: -574 + r() * 26,
    dir: r() < 0.5 ? 1 : -1,
    speed: 0,
    stopDelay: r() * 1.2,
    stops: true,
    fleeDelay: 0.5 + r() * 2.5,
    fleeSpeed: 1.8 + r() * 1.2,
    toRoad: r() < 0.5,
    scale: 0.92 + r() * 0.16,
    briefcase: r() < 0.35,
    phase0: r() * 10,
  }));
  return group.concat(Array.from({ length: N_WALK }, () => {
    const side = r() < 0.5 ? -1 : 1;
    return {
      x0: side * (ROAD_HALF + 0.7 + r() * 3.8),
      xRoad: (r() - 0.5) * ROAD_HALF * 1.8,
      z0: -800 + r() * 420,
      dir: r() < 0.6 ? 1 : -1,
      speed: 1.15 + r() * 0.5,
      stopDelay: r() * 2.5,
      stops: r() < 0.78,
      fleeDelay: 1 + r() * 4,
      fleeSpeed: 1.6 + r() * 1.3,
      toRoad: r() < 0.45,
      scale: 0.92 + r() * 0.16,
      briefcase: r() < 0.38,
      phase0: r() * 10,
    };
  }));
};

/** Geschwindigkeit entlang der Straße (lokal zl) und Zustand */
const behaviour = (p: Person, t: number) => {
  const I1 = EVENTS.impact1.t;
  const I2 = EVENTS.impact2.t;
  const stopT = I1 + 0.6 + p.stopDelay;
  const fleeT = I2 + p.fleeDelay;
  let v = p.dir * p.speed;
  let look = 0;
  let face = p.dir > 0 ? 0 : Math.PI;
  if (t > stopT && t < fleeT) {
    if (p.stops) {
      const k = sstep(stopT, stopT + 0.8, t);
      v *= 1 - k;
      look = k;
      face = lerp(face, Math.abs(face) > 1 ? Math.PI * 2 : 0, k); // zu den Türmen drehen
    } else {
      v *= 1.35;
    }
  }
  if (t >= fleeT) {
    const k = sstep(fleeT, fleeT + 1.2, t);
    v = lerp(p.stops ? 0 : v, -p.fleeSpeed, k);
    face = lerp(p.stops ? 0 : face, Math.PI, k);
    look = p.stops ? 1 - k : 0;
  }
  return { v, look, face };
};

const STEP = 1 / 15;
const m4 = new THREE.Matrix4();
const base = new THREE.Matrix4();
const part = new THREE.Matrix4();
const q = new THREE.Quaternion();
const e = new THREE.Euler();
const v3 = new THREE.Vector3();
const s3 = new THREE.Vector3();

export const People: React.FC<{ t: number; camLocal: [number, number] }> = ({ t, camLocal }) => {
  const people = useMemo(makePeople, []);
  const refs = {
    torso: useRef<THREE.InstancedMesh>(null),
    head: useRef<THREE.InstancedMesh>(null),
    legL: useRef<THREE.InstancedMesh>(null),
    legR: useRef<THREE.InstancedMesh>(null),
    armL: useRef<THREE.InstancedMesh>(null),
    armR: useRef<THREE.InstancedMesh>(null),
    bag: useRef<THREE.InstancedMesh>(null),
  };
  const geo = useMemo(
    () => ({
      torso: new THREE.BoxGeometry(0.46, 0.66, 0.26),
      head: new THREE.IcosahedronGeometry(0.135, 0),
      leg: new THREE.BoxGeometry(0.17, 0.86, 0.19).translate(0, -0.43, 0),
      arm: new THREE.BoxGeometry(0.12, 0.62, 0.13).translate(0, -0.31, 0),
      bag: new THREE.BoxGeometry(0.1, 0.32, 0.42),
    }),
    [],
  );
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), []);
  const bagMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2a1d14", roughness: 0.7, flatShading: true }), []);

  // Farben einmalig setzen
  useLayoutEffect(() => {
    const c = new THREE.Color();
    people.forEach((p, i) => {
      const top = TOPS[Math.floor(hash(i + 1) * TOPS.length)];
      refs.torso.current!.setColorAt(i, c.set(top));
      refs.armL.current!.setColorAt(i, c.set(top));
      refs.armR.current!.setColorAt(i, c.set(top));
      const bot = BOTTOMS[Math.floor(hash(i + 7) * BOTTOMS.length)];
      refs.legL.current!.setColorAt(i, c.set(bot));
      refs.legR.current!.setColorAt(i, c.set(bot));
      refs.head.current!.setColorAt(i, c.set(SKIN[Math.floor(hash(i + 3) * SKIN.length)]));
    });
    for (const r of Object.values(refs)) if (r.current?.instanceColor) r.current.instanceColor.needsUpdate = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [people]);

  useLayoutEffect(() => {
    const steps = Math.ceil(t / STEP);
    people.forEach((p, i) => {
      // Position durch Integration der Geschwindigkeit (deterministisch)
      let z = p.z0;
      let dist = 0;
      for (let k = 0; k < steps; k++) {
        const tt = k * STEP;
        const dt = Math.min(STEP, t - tt);
        const { v } = behaviour(p, tt);
        z += v * dt;
        dist += Math.abs(v) * dt;
      }
      const { look, face, v } = behaviour(p, t);
      const x = p.toRoad ? lerp(p.x0, p.xRoad, sstep(EVENTS.impact2.t + 3, EVENTS.impact2.t + 11, t)) : p.x0;
      const moving = clamp(Math.abs(v) / 1.2);
      const ph = (dist / 1.45) * Math.PI * 2 + p.phase0;
      const swing = Math.sin(ph) * 0.5 * moving * (Math.abs(v) > 2 ? 1.25 : 1);
      const bob = Math.abs(Math.cos(ph)) * 0.04 * moving;
      // Figuren direkt vor der Linse ausblenden (sonst verdecken sie das Bild)
      const near = Math.hypot(x - camLocal[0], z - camLocal[1]) < 2.4;
      base.compose(v3.set(x, bob, z), q.setFromEuler(e.set(0, face, 0)), s3.setScalar(near ? 0 : p.scale));
      const set = (mesh: THREE.InstancedMesh | null, px: number, py: number, pz: number, rx: number, rz = 0) => {
        if (!mesh) return;
        part.compose(v3.set(px, py, pz), q.setFromEuler(e.set(rx, 0, rz)), s3.set(1, 1, 1));
        m4.multiplyMatrices(base, part);
        mesh.setMatrixAt(i, m4);
      };
      set(refs.torso.current, 0, 1.2, 0, look * -0.12);
      set(refs.head.current, 0, 1.66, look * -0.03, look * -0.75);
      set(refs.legL.current, -0.11, 0.88, 0, swing);
      set(refs.legR.current, 0.11, 0.88, 0, -swing);
      set(refs.armL.current, -0.3, 1.5, 0, -swing * 0.8, 0.06);
      set(refs.armR.current, 0.3, 1.5, 0, p.briefcase ? -swing * 0.25 : swing * 0.8, -0.06);
      if (refs.bag.current) {
        if (p.briefcase) set(refs.bag.current, 0.33, 0.8, 0.02, -swing * 0.25);
        else {
          m4.makeScale(0, 0, 0);
          refs.bag.current.setMatrixAt(i, m4);
        }
      }
    });
    for (const r of Object.values(refs)) if (r.current) r.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={STREET_ORIGIN} rotation={[0, GRID_ANGLE, 0]}>
      <instancedMesh ref={refs.torso} args={[geo.torso, mat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={refs.head} args={[geo.head, mat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={refs.legL} args={[geo.leg, mat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={refs.legR} args={[geo.leg, mat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={refs.armL} args={[geo.arm, mat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={refs.armR} args={[geo.arm, mat, N]} castShadow frustumCulled={false} />
      <instancedMesh ref={refs.bag} args={[geo.bag, bagMat, N]} castShadow frustumCulled={false} />
    </group>
  );
};
