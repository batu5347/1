import { useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CamState } from "../camera";
import { gradeAt } from "../grade";
import { clockMinutes } from "../timeline";
import { sunDir } from "./geo";

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vDir = normalize(wp.xyz - cameraPosition);
  gl_Position = projectionMatrix * viewMatrix * wp;
  gl_Position.z = gl_Position.w; // immer im Hintergrund
}`;
const skyFrag = /* glsl */ `
uniform vec3 top;
uniform vec3 horizon;
uniform vec3 sunDir;
uniform vec3 sunColor;
varying vec3 vDir;
void main() {
  vec3 d = normalize(vDir);
  float h = clamp(d.y, -1.0, 1.0);
  vec3 col = mix(horizon, top, pow(max(h, 0.0), 0.55));
  col = mix(col, horizon * 0.92, smoothstep(0.0, -0.2, h));
  float s = max(dot(d, sunDir), 0.0);
  col += sunColor * (pow(s, 900.0) * 3.0 + pow(s, 12.0) * 0.18);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Himmel, Sonne, Umgebungslicht, Dunst und Kamera – alles aus Video-Zeit t */
export const Environment: React.FC<{ t: number; cam: CamState }> = ({ t, cam }) => {
  const { camera, scene, gl } = useThree();
  const g = gradeAt(t);
  const sun = sunDir(clockMinutes(t));
  const skyMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          top: { value: new THREE.Color() },
          horizon: { value: new THREE.Color() },
          sunDir: { value: new THREE.Vector3() },
          sunColor: { value: new THREE.Color() },
        },
      }),
    [],
  );
  const sky = useRef<THREE.Mesh>(null);
  const light = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const fog = useMemo(() => new THREE.FogExp2("#ffffff", 0.0001), []);

  useLayoutEffect(() => {
    const pc = camera as THREE.PerspectiveCamera;
    pc.position.set(...cam.pos);
    pc.up.set(0, 1, 0);
    pc.lookAt(...cam.look);
    pc.fov = cam.fov;
    pc.near = 0.6;
    pc.far = 16000;
    pc.updateProjectionMatrix();
    pc.updateMatrixWorld();

    skyMat.uniforms.top.value.set(g.skyTop);
    skyMat.uniforms.horizon.value.set(g.horizon);
    skyMat.uniforms.sunDir.value.set(...sun).normalize();
    skyMat.uniforms.sunColor.value.set(g.sunColor);
    sky.current?.position.copy(pc.position);

    fog.color.set(g.horizon);
    fog.density = g.fogBase + cam.fog;
    scene.fog = fog;
    gl.toneMappingExposure = g.exposure;
    gl.localClippingEnabled = true;

    const l = light.current;
    if (l) {
      const { center, size } = cam.shadow;
      l.color.set(g.sunColor);
      l.intensity = g.sunIntensity;
      l.position.set(center[0] + sun[0] * 3000, sun[1] * 3000, center[2] + sun[2] * 3000);
      l.target.position.set(...center);
      l.target.updateMatrixWorld();
      const sc = l.shadow.camera;
      sc.left = -size;
      sc.right = size;
      sc.top = size;
      sc.bottom = -size;
      sc.near = 100;
      sc.far = 6500;
      sc.updateProjectionMatrix();
      l.shadow.bias = size > 500 ? -0.0006 : -0.00025;
      l.shadow.normalBias = size > 500 ? 2.5 : 0.25;
    }
    if (hemi.current) {
      hemi.current.intensity = g.hemiIntensity;
      hemi.current.color.set(g.skyTop).lerp(new THREE.Color(g.horizon), 0.6);
    }
  });

  return (
    <>
      <mesh ref={sky} material={skyMat} frustumCulled={false} renderOrder={-10}>
        <sphereGeometry args={[9000, 32, 16]} />
      </mesh>
      <hemisphereLight ref={hemi} args={["#bcd2ee", "#8a8072", 1.2]} />
      <directionalLight ref={light} castShadow shadow-mapSize={[4096, 4096]} />
    </>
  );
};
