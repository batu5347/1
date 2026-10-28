import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clamp, easeIn, hash, rng, sstep } from "../lib/math";
import { COLLAPSE_DUR, EVENTS } from "../timeline";
import { BoxBuilder } from "./builder";
import { IMPACT, NORTH_TOWER, SOUTH_TOWER, Tower } from "./geo";
import { towerTexture } from "./textures";

const STRIPES = 59; // Stützen je Fassadenseite

/** Zustand eines Turms zur Video-Zeit t */
export const towerState = (id: "N" | "S", t: number) => {
  const impactT = id === "N" ? EVENTS.impact1.t : EVENTS.impact2.t;
  const collapseT = id === "N" ? EVENTS.collapseN.t : EVENTS.collapseS.t;
  const dur = id === "N" ? COLLAPSE_DUR.N : COLLAPSE_DUR.S;
  const c = clamp((t - collapseT) / dur);
  return { damaged: t >= impactT, sinceImpact: t - impactT, collapsing: t >= collapseT && c < 1, gone: c >= 1, c, sinceCollapse: t - collapseT };
};

const towerGeometry = (tw: Tower, y0: number, y1: number) => {
  const walls = new BoxBuilder();
  const roof = new BoxBuilder();
  walls.box(0, 0, tw.w, tw.w, y1 - y0, { y0, cellW: tw.w / STRIPES, cellH: tw.h, v0: y0 / tw.h, roof });
  return { walls: walls.build(), roof: roof.build() };
};

/** Einschlag-Spur: dunkle Öffnung in Flugzeugform + Glut (stilisiert) */
const Damage: React.FC<{ tw: Tower; t: number; matHole: THREE.Material; matFire: THREE.MeshBasicMaterial }> = ({ tw, t, matHole, matFire }) => {
  const im = IMPACT[tw.id];
  const yc = (im.y0 + im.y1) / 2;
  const sign = im.face[2];
  const zf = (sign * tw.w) / 2 + sign * 0.35;
  const tilt = tw.id === "N" ? 0.42 : -0.6; // Querneigung der Tragflächen
  const pieces = useMemo(() => {
    const r = rng(tw.id === "N" ? 5 : 9);
    const out: { x: number; y: number; w: number; h: number; rot: number }[] = [{ x: im.offset, y: yc, w: 11, h: 13, rot: 0 }];
    for (let i = 0; i < 9; i++) {
      const s = (i % 2 ? -1 : 1) * (4 + Math.floor(i / 2) * 5.2);
      out.push({ x: im.offset + s, y: yc + Math.tan(tilt) * s * 0.55, w: 5.4, h: 7 - Math.abs(s) * 0.12 + r() * 1.5, rot: 0 });
    }
    return out;
  }, [tw.id, im.offset, yc, tilt]);
  const flicker = 0.75 + 0.25 * Math.sin(t * 13.1 + 1.3) * Math.sin(t * 7.7);
  matFire.color.setRGB(1, 0.42 + 0.12 * flicker, 0.12);
  matFire.opacity = 0.85;
  // Glut auf den Nachbarfassaden (Brände über mehrere Etagen)
  const sideFires = useMemo(() => {
    const r = rng(tw.id === "N" ? 33 : 44);
    return Array.from({ length: 16 }, () => ({ face: Math.floor(r() * 4), u: (r() - 0.5) * tw.w * 0.85, y: im.y0 + r() * (im.y1 - im.y0 + 8), w: 3 + r() * 7, h: 2 + r() * 3, k: r() }));
  }, [tw.id, tw.w, im.y0, im.y1]);
  return (
    <group>
      {pieces.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, zf]} material={matHole}>
          <boxGeometry args={[p.w, p.h, 1.2]} />
        </mesh>
      ))}
      {pieces.slice(0, 5).map((p, i) => (
        <mesh key={`f${i}`} position={[p.x + 1, p.y - p.h * 0.25, zf + sign * 0.4]} material={matFire}>
          <boxGeometry args={[p.w * 0.6, p.h * 0.35, 0.3]} />
        </mesh>
      ))}
      {sideFires.map((f, i) => {
        const grow = sstep(0, 6 + f.k * 10, t);
        if (grow <= 0.01) return null;
        const half = tw.w / 2 + 0.3;
        const pos: [number, number, number] =
          f.face === 0 ? [f.u, f.y, half] : f.face === 1 ? [half, f.y, f.u] : f.face === 2 ? [f.u, f.y, -half] : [-half, f.y, f.u];
        const rotY = f.face % 2 ? Math.PI / 2 : 0;
        return (
          <mesh key={`s${i}`} position={pos} rotation={[0, rotY, 0]} scale={[grow, 1, 1]} material={matFire}>
            <planeGeometry args={[f.w, f.h]} />
          </mesh>
        );
      })}
    </group>
  );
};

const OneTower: React.FC<{ tw: Tower; t: number }> = ({ tw, t }) => {
  const st = towerState(tw.id, t);
  const split = IMPACT[tw.id].y0 - (tw.id === "N" ? 0 : 6);
  const geo = useMemo(() => ({ full: towerGeometry(tw, 0, tw.h), top: towerGeometry(tw, split, tw.h) }), [tw, split]);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, -1, 0), tw.h + 1), [tw.h]);
  const mats = useMemo(() => {
    const tex = towerTexture().clone();
    tex.repeat.set(1, 1);
    tex.needsUpdate = true;
    const facade = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, metalness: 0.15, flatShading: true });
    const clipped = facade.clone();
    clipped.clippingPlanes = [plane];
    clipped.clipShadows = true;
    return {
      facade,
      clipped,
      roof: new THREE.MeshStandardMaterial({ color: "#7d8288", roughness: 0.8, flatShading: true }),
      antenna: new THREE.MeshStandardMaterial({ color: "#d9dadb", roughness: 0.6, flatShading: true }),
      hole: new THREE.MeshBasicMaterial({ color: "#0b0b0c" }),
      fire: new THREE.MeshBasicMaterial({ color: "#ff7a2a", transparent: true, opacity: 0.85, toneMapped: false }),
      rubble: new THREE.MeshStandardMaterial({ color: "#6f6a62", roughness: 1, flatShading: true }),
    };
  }, [plane]);

  // Einsturz: Front wandert von der Einschlagzone nach unten, Kopfteil neigt sich und wird zermalmt
  const c = st.c;
  const tiltPhase = sstep(0, 0.16, c);
  const fall = easeIn(clamp((c - 0.06) / 0.94));
  const yf = split * (1 - fall) - 2;
  const tiltMax = tw.id === "S" ? 0.2 : 0.035;
  const topScale = Math.max(0.02, 1 - fall * 1.05);
  plane.constant = st.collapsing ? yf : tw.h + 200;

  const topRef = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const g = topRef.current;
    if (!g) return;
    g.position.set(0, st.collapsing ? yf : split, 0);
    // Südturm kippte nach Osten/Süden, Nordturm sank nahezu senkrecht (Antenne zuerst)
    g.rotation.set(tiltPhase * tiltMax * 0.6, 0, -tiltPhase * tiltMax);
    g.scale.set(1, st.collapsing ? topScale : 1, 1);
  });

  const rubble = useMemo(() => {
    const r = rng(tw.id === "N" ? 71 : 72);
    return Array.from({ length: 14 }, () => ({ x: (r() - 0.5) * 90, z: (r() - 0.5) * 90, w: 14 + r() * 26, h: 4 + r() * 22, d: 14 + r() * 26, ry: r() * 3 }));
  }, [tw.id]);

  if (st.gone) {
    return (
      <group position={[tw.x, 0, tw.z]}>
        {rubble.map((b, i) => (
          <mesh key={i} position={[b.x, b.h / 2, b.z]} rotation={[hash(i) * 0.3, b.ry, 0]} material={mats.rubble} castShadow receiveShadow>
            <boxGeometry args={[b.w, b.h, b.d]} />
          </mesh>
        ))}
      </group>
    );
  }

  const antenna =
    tw.antenna > 0 ? (
      <group position={[0, tw.h, 0]}>
        <mesh position={[0, 3, 0]} material={mats.roof} castShadow>
          <boxGeometry args={[14, 6, 14]} />
        </mesh>
        <mesh position={[0, tw.antenna / 2, 0]} material={mats.antenna} castShadow>
          <cylinderGeometry args={[0.9, 2.6, tw.antenna, 6]} />
        </mesh>
      </group>
    ) : (
      <mesh position={[0, tw.h + 2, 0]} material={mats.roof} castShadow>
        <boxGeometry args={[40, 4, 40]} />
      </mesh>
    );

  return (
    <group position={[tw.x, 0, tw.z]}>
      {!st.collapsing ? (
        <>
          <mesh geometry={geo.full.walls} material={mats.facade} castShadow receiveShadow />
          <mesh geometry={geo.full.roof} material={mats.roof} />
          {antenna}
          {st.damaged && <Damage tw={tw} t={st.sinceImpact} matHole={mats.hole} matFire={mats.fire} />}
        </>
      ) : (
        <>
          <mesh geometry={geo.full.walls} material={mats.clipped} castShadow receiveShadow />
          <group ref={topRef}>
            <group position={[0, -split, 0]}>
              <mesh geometry={geo.top.walls} material={mats.facade} castShadow />
              <mesh geometry={geo.top.roof} material={mats.roof} />
              {antenna}
              <Damage tw={tw} t={st.sinceImpact} matHole={mats.hole} matFire={mats.fire} />
            </group>
          </group>
          {c > 0.75 &&
            rubble.map((b, i) => (
              <mesh key={i} position={[b.x, (b.h / 2) * sstep(0.75, 1, c), b.z]} rotation={[0, b.ry, 0]} scale={[1, sstep(0.75, 1, c) + 0.01, 1]} material={mats.rubble}>
                <boxGeometry args={[b.w, b.h, b.d]} />
              </mesh>
            ))}
        </>
      )}
    </group>
  );
};

export const Towers: React.FC<{ t: number }> = ({ t }) => (
  <>
    <OneTower tw={NORTH_TOWER} t={t} />
    <OneTower tw={SOUTH_TOWER} t={t} />
  </>
);
