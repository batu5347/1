import { clamp, easeInOut, easeOut, lerp, sstep, Vec3, vlerp } from "./lib/math";
import { COLLAPSE_DUR, EVENTS, shotAt, ShotId } from "./timeline";
import { toWorld } from "./world/geo";

export type CamState = {
  pos: Vec3;
  look: Vec3;
  fov: number;
  /** Zusätzliche Dunst-/Staubdichte dieser Einstellung (FogExp2) */
  fog: number;
  /** Mittelpunkt und halbe Kantenlänge des Schattenbereichs */
  shadow: { center: Vec3; size: number };
  shot: ShotId;
};

const L = toWorld;
const TOWERS_MID: Vec3 = [6, 250, 95];
const NORTH_TOP: Vec3 = [0, 330, 0];

type ShotDef = (p: number, local: number, t: number) => Omit<CamState, "shot">;

const streetShadow = (zl: number): CamState["shadow"] => ({ center: L(0, 0, zl + 70), size: 170 });
const wideShadow: CamState["shadow"] = { center: [150, 0, 0], size: 1400 };

const DEFS: Record<ShotId, ShotDef> = {
  // 0–5 s: Straßenecke, Kran-Bewegung nach oben, Taxi fährt dicht vorbei
  hook: (p) => {
    const e = easeInOut(p);
    return {
      pos: vlerp(L(8.6, 1.7, -662), L(7.2, 17, -646), e),
      look: vlerp(L(-1, 14, -420), TOWERS_MID, easeInOut(clamp(p * 1.15))),
      fov: lerp(60, 50, e),
      fog: 0,
      shadow: streetShadow(-640),
    };
  },
  // Gehweg, Menschen auf dem Weg zur Arbeit, Taxi hält an der Kreuzung
  morning: (p) => ({
    pos: vlerp(L(9.6, 1.66, -652), L(9.3, 1.68, -637), p),
    look: vlerp(L(1.5, 7, -560), L(0.5, 16, -500), p),
    fov: 54,
    fog: 0,
    shadow: streetShadow(-620),
  }),
  // Kamera richtet sich auf den Nordturm
  tiltNorth: (p) => ({
    pos: vlerp(L(5, 1.6, -615), L(4.6, 1.6, -611), p),
    look: vlerp(L(0, 22, -470), NORTH_TOP, easeInOut(p)),
    fov: lerp(52, 30, easeInOut(p)),
    fog: 0,
    shadow: streetShadow(-600),
  }),
  // 08:46 – Blick zum Nordturm (Tele), Einschlag, danach langsam weiter
  impact1: (_p, _l, t) => {
    const after = sstep(EVENTS.impact1.t + 0.5, EVENTS.impact1.t + 6, t);
    return {
      pos: vlerp(L(4.6, 1.6, -611), L(4.4, 1.6, -607), after),
      look: vlerp([16, 360, -30], [18, 352, 20], after),
      fov: lerp(33, 40, after),
      fog: 0,
      shadow: streetShadow(-590),
    };
  },
  // Menschen bleiben stehen und schauen nach oben
  lookUp: (p) => ({
    pos: vlerp(L(10.2, 1.45, -585), L(9.8, 1.5, -589), p),
    look: vlerp(L(2, 14, -480), L(-1, 52, -420), easeInOut(p)),
    fov: 54,
    fog: 0.00004,
    shadow: streetShadow(-560),
  }),
  // Querstraße, Rauch steigt aus dem Nordturm
  smokeStreet: (p) => ({
    pos: vlerp(L(-6.2, 2.2, -512), L(-5, 5.2, -500), easeInOut(p)),
    look: vlerp([10, 300, 30], [30, 320, 60], p),
    fov: 40,
    fog: 0.00005,
    shadow: streetShadow(-500),
  }),
  // 09:03 – erhöhte Perspektive aus Nordosten auf beide Türme, danach Rückfahrt
  impact2: (_p, _l, t) => {
    const back = easeOut(clamp((t - EVENTS.impact2.t - 0.6) / 4.5));
    return {
      pos: vlerp([700, 255, -520], [880, 265, -700], back),
      look: vlerp([4, 292, 92], [10, 282, 100], back),
      fov: lerp(27, 34, back),
      fog: 0.00005,
      shadow: wideShadow,
    };
  },
  // Rauch in den Straßen, Menschen verlassen das Viertel, Einsatzfahrzeuge
  evac: (p) => ({
    pos: vlerp(L(-1.2, 1.7, -452), L(-1.2, 1.72, -463), p),
    look: vlerp(L(0, 18, -250), L(0, 30, -230), p),
    fov: 50,
    fog: 0.00045,
    shadow: streetShadow(-440),
  }),
  // 09:59 – entfernte, erhöhte Perspektive: Einsturz des Südturms
  collapseS: (p) => ({
    pos: vlerp([1250, 190, -1450], [1210, 186, -1400], p),
    look: [40, 200, 110],
    fov: 25,
    fog: 0.0001,
    shadow: wideShadow,
  }),
  // Staubwolke rollt durch die Straßenschlucht
  dustStreet: (p, local) => ({
    pos: vlerp(L(2.5, 1.7, -655), L(2.2, 1.7, -660), p),
    look: L(0, 12, -420),
    fov: 52,
    fog: 0.0003 + sstep(1.6, 3.3, local) * 0.016,
    shadow: streetShadow(-620),
  }),
  // 10:28 – entfernte Perspektive (Nordwesten): der Nordturm steht allein im Rauch
  collapseN: (p) => ({
    pos: vlerp([-1350, 150, -1650], [-1320, 146, -1610], p),
    look: [10, 210, 40],
    fov: 24,
    fog: 0.00002,
    shadow: wideShadow,
  }),
  // Finale: leere, staubige Straße
  finaleStreet: (p) => ({
    pos: vlerp(L(0.5, 1.8, -705), L(0.4, 1.85, -695), p),
    look: vlerp(L(0, 22, -420), L(0, 26, -410), p),
    fov: 52,
    fog: 0.0042,
    shadow: streetShadow(-680),
  }),
  // Skyline ohne Türme, vom Hudson aus (Jersey City), letzter Frame ruhig
  skyline: (p) => {
    const e = easeOut(clamp(p / 0.62));
    return {
      pos: vlerp([-1700, 24, 520], [-1640, 22, 505], e),
      look: [40, 150, 230],
      fov: 34,
      fog: 0.0,
      shadow: wideShadow,
    };
  },
};

/** Kontrollierte Erschütterung nach Einschlägen/Einstürzen */
const shakeAmount = (t: number) => {
  const pulse = (t0: number, amp: number, decay: number) => (t >= t0 ? amp * Math.exp(-(t - t0) * decay) : 0);
  const rumble = (t0: number, dur: number, amp: number) => (t >= t0 && t <= t0 + dur + 1 ? amp * Math.sin((Math.PI * (t - t0)) / (dur + 1)) : 0);
  return (
    pulse(EVENTS.impact1.t + 0.22, 1, 2.6) +
    pulse(EVENTS.impact2.t + 0.12, 1.1, 2.4) +
    rumble(EVENTS.collapseS.t, COLLAPSE_DUR.S, 0.35) +
    rumble(EVENTS.collapseN.t, COLLAPSE_DUR.N, 0.3)
  );
};

export const cameraAt = (t: number): CamState => {
  const s = shotAt(t);
  const st = DEFS[s.id](s.p, s.local, t);
  const k = shakeAmount(t);
  if (k > 0.001) {
    const d = Math.hypot(st.look[0] - st.pos[0], st.look[1] - st.pos[1], st.look[2] - st.pos[2]);
    const amp = k * d * 0.006;
    st.look = [
      st.look[0] + amp * Math.sin(t * 47.1) * Math.cos(t * 13.3),
      st.look[1] + amp * Math.sin(t * 39.7 + 1.1),
      st.look[2] + amp * Math.cos(t * 43.3 + 0.4),
    ];
  }
  return { ...st, shot: s.id };
};
