import React, { useMemo } from "react";
import * as THREE from "three";
import { mixHex, rng } from "../lib/math";
import { BoxBuilder } from "./builder";
import { CROSS_HALF, CROSS_STREETS, FRONT, GRID_ANGLE, ISLAND, onIsland, ROAD_HALF, STREET_ORIGIN, STREET_Z0, STREET_Z1, WTC_PLAZA } from "./geo";
import { FacadeStyle, facadeTexture } from "./textures";

const STYLES: FacadeStyle[] = ["brick", "stone", "concrete", "glass", "dark"];
const CELL: Record<FacadeStyle, [number, number]> = {
  brick: [3.0, 3.4],
  stone: [3.2, 3.6],
  concrete: [3.6, 3.6],
  glass: [3.0, 3.8],
  dark: [3.0, 3.8],
};
const ROOF_COLORS = ["#6d6a66", "#7b7671", "#5d5b59", "#88837b"];

type Builders = Record<FacadeStyle, BoxBuilder>;
const newBuilders = (): Builders => ({ brick: new BoxBuilder(), stone: new BoxBuilder(), concrete: new BoxBuilder(), glass: new BoxBuilder(), dark: new BoxBuilder() });

/** Leichte Helligkeitsvariation pro Gebäude (Vertex-Farbe) */
const tint = (r: () => number): [number, number, number] => {
  const k = 0.82 + r() * 0.3;
  return [k, k * (0.97 + r() * 0.05), k * (0.95 + r() * 0.06)];
};

/** Bebauung entlang „West Broadway“ in lokalen Straßenkoordinaten */
const buildStreet = (walls: Builders, roof: BoxBuilder, extra: BoxBuilder, roofTanks: [number, number, number][]) => {
  const r = rng(2001);
  const blocks: [number, number][] = [];
  let z = STREET_Z0;
  for (const cs of CROSS_STREETS) {
    blocks.push([z, cs.zl - CROSS_HALF]);
    z = cs.zl + CROSS_HALF;
  }
  blocks.push([z, STREET_Z1]);
  for (const side of [-1, 1]) {
    for (const [z0, z1] of blocks) {
      let zz = z0 + 1;
      while (zz < z1 - 6) {
        const w = Math.min(z1 - zz, 13 + r() * 20);
        const d = 26 + r() * 22;
        const near = Math.abs((zz - -650) / 600);
        const h = 18 + r() * 44 + (r() < 0.18 ? 30 + r() * 40 : 0) + Math.max(0, 1 - near) * 6;
        const style = r() < 0.5 ? "brick" : r() < 0.55 ? "stone" : r() < 0.6 ? "concrete" : r() < 0.5 ? "dark" : "glass";
        const [cw, ch] = CELL[style];
        const cx = side * (FRONT + d / 2);
        const cz = zz + w / 2;
        // Erdgeschoss mit Ladenfront (dunkler, etwas vorspringend)
        extra.box(cx - side * 0.4, cz, d, w - 0.6, 4.4, { color: [0.16 + r() * 0.05, 0.17, 0.19], roof: null });
        walls[style].box(cx, cz, d, w - 0.4, h - 4.4, { y0: 4.4, cellW: cw, cellH: ch, u0: r(), v0: 0, color: tint(r), roof });
        // Gesims
        if (style === "brick" || style === "stone") {
          extra.box(cx - side * 0.3, cz, d + 0.9, w + 0.2, 1.1, { y0: h - 0.2, color: [0.82, 0.79, 0.72] });
        }
        if (r() < 0.35 && h < 75) roofTanks.push([cx + (r() - 0.5) * d * 0.5, h, cz + (r() - 0.5) * w * 0.4]);
        zz += w;
      }
    }
  }
};

/** Übrige Stadt auf gedrehtem Raster (Welt-Ausschlüsse: Ufer, WTC-Platz, Straßenzug) */
const buildCity = (walls: Builders, roof: BoxBuilder) => {
  const r = rng(911);
  const BW = 92;
  const BL = 150;
  for (let bx = -26; bx <= 26; bx++) {
    for (let bz = -30; bz <= 16; bz++) {
      const xl0 = bx * (BW + 16);
      const zl0 = bz * (BL + 18) - 40;
      // Straßenzug West Broadway selbst ist separat modelliert
      if (Math.abs(xl0 + BW / 2) < BW / 2 + 70 && zl0 + BL > STREET_Z0 - 40 && zl0 < STREET_Z1 + 40) continue;
      let zz = zl0;
      while (zz < zl0 + BL - 8) {
        const lotL = Math.min(zl0 + BL - zz, 22 + r() * 40);
        let xx = xl0;
        while (xx < xl0 + BW - 8) {
          const lotW = Math.min(xl0 + BW - xx, 24 + r() * 30);
          const cxl = xx + lotW / 2;
          const czl = zz + lotL / 2;
          const wx = STREET_ORIGIN[0] + cxl * Math.cos(GRID_ANGLE) + czl * Math.sin(GRID_ANGLE);
          const wz = STREET_ORIGIN[2] - cxl * Math.sin(GRID_ANGLE) + czl * Math.cos(GRID_ANGLE);
          xx += lotW;
          if (!onIsland(wx, wz) || !onIsland(wx - 30, wz) || !onIsland(wx + 30, wz)) continue;
          if (Math.hypot(wx - WTC_PLAZA.x, wz - WTC_PLAZA.z) < WTC_PLAZA.r) continue;
          if (wz < -3200 && r() < 0.35) continue;
          // Höhenprofil: Financial District hoch, Tribeca niedrig, Battery Park City mittel
          const fidi = Math.exp(-((wx - 430) ** 2 + (wz - 560) ** 2) / 420 ** 2);
          const bpc = wx < -260 ? 0.7 : 0;
          const north = Math.min(1, Math.max(0, (-wz - 400) / 1600));
          let h = 16 + r() * 40 + fidi * (60 + r() * 190) + bpc * (40 + r() * 80) - north * 10;
          if (r() < 0.08) h += 40 + r() * 70 * (1 - north * 0.6);
          if (wz < -4200) h += r() * 140;
          h = Math.max(12, h);
          const style = h > 110 ? (r() < 0.5 ? "glass" : r() < 0.5 ? "dark" : "concrete") : STYLES[Math.floor(r() * 3)];
          const [cw, ch] = CELL[style];
          const setback = h > 120 && r() < 0.5;
          const bw = lotW - 4;
          const bl = lotL - 4;
          if (setback) {
            const h1 = h * (0.45 + r() * 0.2);
            walls[style].box(wx, wz, bw, bl, h1, { rot: GRID_ANGLE, cellW: cw, cellH: ch, u0: r(), color: tint(r), roof });
            walls[style].box(wx, wz, bw * 0.7, bl * 0.7, h - h1, { y0: h1, rot: GRID_ANGLE, cellW: cw, cellH: ch, u0: r(), v0: h1 / ch, color: tint(r), roof });
          } else {
            walls[style].box(wx, wz, bw, bl, h, { rot: GRID_ANGLE, cellW: cw, cellH: ch, u0: r(), color: tint(r), roof });
          }
        }
        zz += lotL;
      }
    }
  }
};

/** Markante Nachbargebäude (vereinfacht) */
const buildLandmarks = (walls: Builders, roof: BoxBuilder, caps: BoxBuilder) => {
  const rot = GRID_ANGLE;
  // 7 World Trade Center (47 Geschosse, ~186 m), nördlich der Vesey Street
  walls.stone.box(-15, -215, 105, 44, 186, { rot: 0.05, cellW: 3.2, cellH: 3.9, color: [0.78, 0.66, 0.55], roof });
  // 3 WTC (Marriott, 22 Geschosse) und 4/5/6 WTC (9 Geschosse) am Platz
  walls.concrete.box(-58, 262, 34, 70, 82, { cellW: 3, cellH: 3.7, roof });
  walls.dark.box(150, 150, 60, 120, 34, { cellW: 3, cellH: 3.8, roof });
  walls.dark.box(130, -55, 120, 50, 34, { cellW: 3, cellH: 3.8, roof });
  walls.dark.box(-95, -45, 60, 70, 34, { cellW: 3, cellH: 3.8, roof });
  // World Financial Center (Battery Park City) mit Pyramiden-/Kuppel-Dächern
  const wfc: [number, number, number, number][] = [
    [-300, 60, 176, 50],
    [-320, 210, 197, 54],
    [-305, 360, 225, 58],
    [-290, 500, 152, 46],
  ];
  wfc.forEach(([x, z, h, w], i) => {
    walls.stone.box(x, z, w, w, h, { rot, cellW: 3.2, cellH: 3.8, color: [0.86, 0.8, 0.7], roof });
    caps.box(x, z, w * 0.55, w * 0.55, 10 + i * 2, { y0: h, rot, color: [0.55, 0.5, 0.42] });
  });
  // One Liberty Plaza (dunkel), Millennium Hilton, Woolworth Building
  walls.dark.box(255, 330, 70, 110, 226, { rot, cellW: 3.4, cellH: 3.9, roof });
  walls.dark.box(230, 120, 22, 85, 177, { rot, cellW: 3, cellH: 3.6, roof });
  walls.stone.box(560, -140, 60, 60, 120, { rot, cellW: 3, cellH: 3.6, color: [0.95, 0.92, 0.85], roof });
  walls.stone.box(560, -140, 30, 30, 70, { y0: 120, rot, cellW: 3, cellH: 3.6, color: [0.95, 0.92, 0.85], roof });
  caps.box(560, -140, 14, 14, 51, { y0: 190, rot, color: [0.6, 0.62, 0.55] });
  // Verizon Building (West St)
  walls.stone.box(-170, -330, 90, 70, 152, { rot, cellW: 3.2, cellH: 3.8, color: [0.82, 0.7, 0.58], roof });
};

/** Bebauung in New Jersey (Westufer) und Brooklyn (Ostufer) für die Skyline-Einstellung */
const buildShores = (walls: Builders, roof: BoxBuilder) => {
  const r = rng(77);
  for (let i = 0; i < 380; i++) {
    const west = i < 220;
    const x = west ? -1720 - r() * 1500 : 1650 + r() * 1400;
    const z = -3000 + r() * 4500;
    if (west && Math.hypot(x + 2020, z - 510) < 700) continue;
    const h = 10 + r() * (west ? 30 : 22) + (west && r() < 0.06 ? 60 : 0);
    walls[STYLES[Math.floor(r() * 3)]].box(x, z, 20 + r() * 40, 20 + r() * 40, h, { rot: r() * 0.4, color: tint(r), roof });
  }
};

/** Wassertürme auf Dächern (typisch für Tribeca) */
const WaterTanks: React.FC<{ tanks: [number, number, number][] }> = ({ tanks }) => {
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: "#6b4c33", roughness: 0.95, flatShading: true }), []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3a3a3a", roughness: 0.8, flatShading: true }), []);
  return (
    <>
      {tanks.map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh position={[0, 2, 0]} material={steel} castShadow>
            <boxGeometry args={[3.2, 4, 3.2]} />
          </mesh>
          <mesh position={[0, 5.6, 0]} material={wood} castShadow>
            <cylinderGeometry args={[2.3, 2.3, 3.6, 8]} />
          </mesh>
          <mesh position={[0, 8.1, 0]} material={wood} castShadow>
            <coneGeometry args={[2.5, 1.5, 8]} />
          </mesh>
        </group>
      ))}
    </>
  );
};

export const City: React.FC<{ dust: number }> = ({ dust }) => {
  const data = useMemo(() => {
    const walls = newBuilders();
    const roof = new BoxBuilder();
    const extra = new BoxBuilder();
    const caps = new BoxBuilder();
    const streetWalls = newBuilders();
    const streetRoof = new BoxBuilder();
    const tanks: [number, number, number][] = [];
    buildStreet(streetWalls, streetRoof, extra, tanks);
    buildCity(walls, roof);
    buildLandmarks(walls, roof, caps);
    buildShores(walls, roof);
    const mats = Object.fromEntries(
      STYLES.map((s) => [s, new THREE.MeshStandardMaterial({ map: facadeTexture(s), vertexColors: true, roughness: 0.88, metalness: 0.02, flatShading: true })]),
    ) as unknown as Record<FacadeStyle, THREE.Material>;
    const roofMat = new THREE.MeshStandardMaterial({ color: ROOF_COLORS[1], roughness: 1, vertexColors: true, flatShading: true });
    const plainMat = new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.8, flatShading: true });
    return {
      walls: STYLES.filter((s) => !walls[s].empty).map((s) => ({ geo: walls[s].build(), mat: mats[s] })),
      streetWalls: STYLES.filter((s) => !streetWalls[s].empty).map((s) => ({ geo: streetWalls[s].build(), mat: mats[s] })),
      roof: roof.build(),
      streetRoof: streetRoof.build(),
      extra: extra.build(),
      caps: caps.build(),
      roofMat,
      plainMat,
      tanks,
    };
  }, []);

  return (
    <>
      {data.walls.map((w, i) => (
        <mesh key={`w${i}`} geometry={w.geo} material={w.mat} castShadow receiveShadow />
      ))}
      <mesh geometry={data.roof} material={data.roofMat} receiveShadow />
      <mesh geometry={data.caps} material={data.plainMat} castShadow />
      <group position={STREET_ORIGIN} rotation={[0, GRID_ANGLE, 0]}>
        {data.streetWalls.map((w, i) => (
          <mesh key={`s${i}`} geometry={w.geo} material={w.mat} castShadow receiveShadow />
        ))}
        <mesh geometry={data.streetRoof} material={data.roofMat} receiveShadow />
        <mesh geometry={data.extra} material={data.plainMat} castShadow receiveShadow />
        <WaterTanks tanks={data.tanks} />
      </group>
      <Ground dust={dust} />
    </>
  );
};

/** Boden: Insel (Asphalt), Ufer, Wasser, Straße mit Gehwegen und Markierungen */
const Ground: React.FC<{ dust: number }> = ({ dust }) => {
  const g = useMemo(() => {
    const shape = new THREE.Shape(ISLAND.map(([x, z]) => new THREE.Vector2(x, -z)));
    const island = new THREE.ShapeGeometry(shape);
    island.rotateX(-Math.PI / 2);
    // Fahrbahnmarkierungen + Zebrastreifen
    const marks = new BoxBuilder();
    for (let z = STREET_Z0; z < STREET_Z1; z += 12) {
      if (CROSS_STREETS.some((c) => Math.abs(z - c.zl) < CROSS_HALF + 6)) continue;
      marks.box(-0.25, z, 0.15, 6, 0.02, { y0: 0.06, color: [0.95, 0.78, 0.2], roof: marks });
      marks.box(0.25, z, 0.15, 6, 0.02, { y0: 0.06, color: [0.95, 0.78, 0.2], roof: marks });
      marks.box(-3.5, z, 0.14, 3, 0.02, { y0: 0.06, color: [0.9, 0.9, 0.88], roof: marks });
      marks.box(3.5, z, 0.14, 3, 0.02, { y0: 0.06, color: [0.9, 0.9, 0.88], roof: marks });
    }
    for (const c of CROSS_STREETS) {
      for (const dz of [-CROSS_HALF - 2.2, CROSS_HALF + 2.2]) {
        for (let x = -ROAD_HALF + 0.6; x < ROAD_HALF; x += 1.2) marks.box(x, c.zl + dz, 0.6, 3, 0.02, { y0: 0.06, color: [0.92, 0.92, 0.9], roof: marks });
      }
    }
    // Gehwege (zwischen Querstraßen)
    const walk = new BoxBuilder();
    let z = STREET_Z0;
    const edges = [...CROSS_STREETS.map((c) => c.zl), STREET_Z1 + CROSS_HALF];
    for (const e of edges) {
      const z1 = e - CROSS_HALF;
      for (const s of [-1, 1]) walk.box(s * (ROAD_HALF + 2.5), (z + z1) / 2, 5, z1 - z, 0.16, { color: [0.62, 0.6, 0.57], roof: walk });
      z = e + CROSS_HALF;
    }
    return { island, marks: marks.build(), walk: walk.build() };
  }, []);
  const mats = useMemo(
    () => ({
      asphalt: new THREE.MeshStandardMaterial({ color: "#5d5d5c", roughness: 1 }),
      road: new THREE.MeshStandardMaterial({ color: "#58585a", roughness: 0.95 }),
      water: new THREE.MeshStandardMaterial({ color: "#3d5868", roughness: 0.35, metalness: 0.1 }),
      land: new THREE.MeshStandardMaterial({ color: "#5e5f58", roughness: 1 }),
      plaza: new THREE.MeshStandardMaterial({ color: "#b8b2a6", roughness: 0.9 }),
      vertex: new THREE.MeshStandardMaterial({ color: "#ffffff", vertexColors: true, roughness: 0.9 }),
    }),
    [],
  );
  // Staub legt sich nach den Einstürzen auf Straßen und Gehwege
  mats.road.color.set(mixHex("#58585a", "#9d968a", dust));
  mats.asphalt.color.set(mixHex("#5d5d5c", "#97907f", dust));
  mats.vertex.color.set(mixHex("#ffffff", "#d8cbb4", dust));
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.2, 0]} material={mats.water}>
        <planeGeometry args={[40000, 40000]} />
      </mesh>
      <mesh geometry={g.island} material={mats.asphalt} position={[0, 0, 0]} receiveShadow />
      {/* New Jersey und Brooklyn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-1650 - 6000, 0, 0]} material={mats.land} receiveShadow>
        <planeGeometry args={[12000, 30000]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[1620 + 6000, 0, 0]} material={mats.land} receiveShadow>
        <planeGeometry args={[12000, 30000]} />
      </mesh>
      {/* WTC-Platz */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[WTC_PLAZA.x, 0.05, WTC_PLAZA.z]} material={mats.plaza} receiveShadow>
        <circleGeometry args={[WTC_PLAZA.r - 25, 24]} />
      </mesh>
      <group position={STREET_ORIGIN} rotation={[0, GRID_ANGLE, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, (STREET_Z0 + STREET_Z1) / 2]} material={mats.road} receiveShadow>
          <planeGeometry args={[ROAD_HALF * 2, STREET_Z1 - STREET_Z0]} />
        </mesh>
        {CROSS_STREETS.map((c) => (
          <mesh key={c.name} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, c.zl]} material={mats.road} receiveShadow>
            <planeGeometry args={[400, CROSS_HALF * 2]} />
          </mesh>
        ))}
        <mesh geometry={g.walk} material={mats.vertex} receiveShadow />
        <mesh geometry={g.marks} material={mats.vertex} />
      </group>
    </>
  );
};
