import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";

/** Ein Partikel: Position, Größe (m), Farbe (sRGB 0..1), Deckkraft, Drehung, Atlas-Variante */
export type P = { x: number; y: number; z: number; s: number; r: number; g: number; b: number; a: number; rot: number; v: number };

const vert = /* glsl */ `
attribute vec3 iPos;
attribute vec4 iCol;
attribute vec3 iMisc; // size, rot, variant
varying vec2 vUv;
varying vec4 vCol;
varying float vDepth;
void main() {
  vec4 mv = modelViewMatrix * vec4(iPos, 1.0);
  float c = cos(iMisc.y), s = sin(iMisc.y);
  vec2 q = vec2(position.x * c - position.y * s, position.x * s + position.y * c) * iMisc.x;
  mv.xy += q;
  gl_Position = projectionMatrix * mv;
  float v = iMisc.z;
  vec2 cell = vec2(mod(v, 2.0), floor(v / 2.0));
  vUv = (uv + cell) * 0.5;
  vCol = iCol;
  vDepth = -mv.z;
}`;
const frag = /* glsl */ `
uniform sampler2D map;
uniform vec3 fogColor;
uniform float fogDensity;
uniform float additive;
varying vec2 vUv;
varying vec4 vCol;
varying float vDepth;
void main() {
  vec4 t = texture2D(map, vUv);
  float a = t.a * vCol.a;
  if (a < 0.004) discard;
  vec3 col = vCol.rgb * mix(0.78, 1.12, t.r);
  float f = 1.0 - exp(-fogDensity * fogDensity * vDepth * vDepth);
  col = mix(col, fogColor, f * (1.0 - additive));
  a *= mix(1.0, 1.0 - f, additive);
  gl_FragColor = vec4(col, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

const tmp = new THREE.Vector3();
const lin = new THREE.Color();

/**
 * Kamera-ausgerichtete Partikel (instanziert). Sortierung von hinten nach vorne,
 * damit normale Alpha-Überblendung von Rauch/Staub korrekt aussieht.
 */
export const Billboards: React.FC<{ items: P[]; map: THREE.Texture; capacity: number; additive?: boolean; renderOrder?: number }> = ({
  items,
  map,
  capacity,
  additive = false,
  renderOrder = 10,
}) => {
  const { camera, scene } = useThree();
  const { geo, mat, aPos, aCol, aMisc } = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute("position", base.getAttribute("position"));
    g.setAttribute("uv", base.getAttribute("uv"));
    const aPos = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    const aCol = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    const aMisc = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    for (const a of [aPos, aCol, aMisc]) a.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute("iPos", aPos);
    g.setAttribute("iCol", aCol);
    g.setAttribute("iMisc", aMisc);
    g.instanceCount = 0;
    const m = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        map: { value: map },
        fogColor: { value: new THREE.Color() },
        fogDensity: { value: 0 },
        additive: { value: additive ? 1 : 0 },
      },
    });
    return { geo: g, mat: m, aPos, aCol, aMisc };
  }, [capacity, map, additive]);

  useLayoutEffect(() => {
    camera.updateMatrixWorld();
    const cp = camera.position;
    const fwd = camera.getWorldDirection(tmp.set(0, 0, 0)).clone();
    // nur Partikel vor der Kamera; nach Tiefe sortieren
    const vis: { p: P; d: number }[] = [];
    for (const p of items) {
      if (p.a <= 0.003 || p.s <= 0.01) continue;
      const dx = p.x - cp.x;
      const dy = p.y - cp.y;
      const dz = p.z - cp.z;
      const d = dx * fwd.x + dy * fwd.y + dz * fwd.z;
      if (d < -p.s) continue;
      vis.push({ p, d });
    }
    if (!additive) vis.sort((a, b) => b.d - a.d);
    const n = Math.min(capacity, vis.length);
    const P3 = aPos.array as Float32Array;
    const C4 = aCol.array as Float32Array;
    const M3 = aMisc.array as Float32Array;
    for (let i = 0; i < n; i++) {
      const { p } = vis[i];
      P3[i * 3] = p.x;
      P3[i * 3 + 1] = p.y;
      P3[i * 3 + 2] = p.z;
      lin.setRGB(p.r, p.g, p.b, THREE.SRGBColorSpace);
      C4[i * 4] = lin.r;
      C4[i * 4 + 1] = lin.g;
      C4[i * 4 + 2] = lin.b;
      C4[i * 4 + 3] = Math.min(1, p.a);
      M3[i * 3] = p.s;
      M3[i * 3 + 1] = p.rot;
      M3[i * 3 + 2] = p.v;
    }
    aPos.needsUpdate = aCol.needsUpdate = aMisc.needsUpdate = true;
    geo.instanceCount = n;
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      mat.uniforms.fogColor.value.copy(fog.color);
      mat.uniforms.fogDensity.value = fog.density;
    }
  });

  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={renderOrder} />;
};
