import * as THREE from "three";
import { rng } from "../lib/math";

const cache = new Map<string, THREE.Texture>();
const memo = (key: string, make: () => THREE.Texture) => {
  let t = cache.get(key);
  if (!t) {
    t = make();
    cache.set(key, t);
  }
  return t;
};

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return [c, c.getContext("2d")!] as const;
};

const finish = (c: HTMLCanvasElement, repeat = true, srgb = true) => {
  const t = new THREE.CanvasTexture(c);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
};

export type FacadeStyle = "brick" | "stone" | "concrete" | "glass" | "dark";
const FACADES: Record<FacadeStyle, { wall: string; win: string; frame?: string; ww: number; wh: number }> = {
  brick: { wall: "#9a5a44", win: "#2c3440", frame: "#d8cfc0", ww: 0.42, wh: 0.55 },
  stone: { wall: "#cbbda2", win: "#344050", frame: "#e9e2d2", ww: 0.4, wh: 0.55 },
  concrete: { wall: "#a7a7a2", win: "#3a4654", ww: 0.6, wh: 0.45 },
  glass: { wall: "#5d6f80", win: "#7f97ad", ww: 0.86, wh: 0.7 },
  dark: { wall: "#33373d", win: "#4f5c6b", ww: 0.8, wh: 0.66 },
};

/** Eine Fassaden-Zelle (1 Fensterachse x 1 Geschoss), wird gekachelt. */
export const facadeTexture = (style: FacadeStyle) =>
  memo(`facade-${style}`, () => {
    const f = FACADES[style];
    const [c, g] = canvas(64, 64);
    g.fillStyle = f.wall;
    g.fillRect(0, 0, 64, 64);
    const w = 64 * f.ww;
    const h = 64 * f.wh;
    const x = (64 - w) / 2;
    const y = 64 * 0.18;
    if (f.frame) {
      g.fillStyle = f.frame;
      g.fillRect(x - 3, y - 3, w + 6, h + 6);
    }
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, f.win);
    grad.addColorStop(1, "#1d232b");
    g.fillStyle = grad;
    g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,0.10)";
    g.fillRect(x, y, w * 0.35, h);
    // Gesims
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.fillRect(0, 60, 64, 4);
    return finish(c);
  });

/**
 * Fassade der Twin Towers: schmale Fenster zwischen eng stehenden Aluminium-Stützen.
 * Eine Textur-Kachel = 1 Stütze (u) x gesamte Höhe (v) mit Technikgeschossen.
 */
export const towerTexture = () =>
  memo("tower", () => {
    const H = 2048;
    const [c, g] = canvas(32, H);
    g.fillStyle = "#c9cdd1";
    g.fillRect(0, 0, 32, H);
    const floors = 110;
    const fh = H / floors;
    // Fensterschlitz
    for (let f = 0; f < floors; f++) {
      const y = H - (f + 1) * fh;
      const mech = [7, 8, 41, 42, 75, 76, 108, 109].includes(f);
      if (f < 3) continue; // Lobby (unten separat)
      g.fillStyle = mech ? "#8c939a" : f % 2 ? "#4b5866" : "#526070";
      g.fillRect(9, y + 1, 14, fh - 1.2);
    }
    // Lobby-Bögen unten
    g.fillStyle = "#e2e4e6";
    g.fillRect(0, H - fh * 7, 32, fh * 7);
    g.fillStyle = "#3a4450";
    g.fillRect(4, H - fh * 5.2, 24, fh * 5.2);
    g.fillStyle = "#e2e4e6";
    g.beginPath();
    g.moveTo(4, H - fh * 5.2);
    g.lineTo(16, H - fh * 6.6);
    g.lineTo(28, H - fh * 5.2);
    g.fill();
    // Glanzkante
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(0, 0, 3, H);
    const t = finish(c);
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  });

/** Weiche Rauch-/Staubwolke mit unregelmäßigem Rand (Graustufen, Alpha im Kanal A) */
export const puffTexture = (variant = 0) =>
  memo(`puff-${variant}`, () => {
    const S = 128;
    const [c, g] = canvas(S, S);
    const r = rng(17 + variant * 31);
    g.clearRect(0, 0, S, S);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2;
      const d = Math.pow(r(), 0.7) * S * 0.24;
      const x = S / 2 + Math.cos(a) * d;
      const y = S / 2 + Math.sin(a) * d;
      const rad = S * (0.12 + r() * 0.16);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const shade = Math.round(205 + r() * 50);
      gr.addColorStop(0, `rgba(${shade},${shade},${shade},0.55)`);
      gr.addColorStop(0.6, `rgba(${shade},${shade},${shade},0.25)`);
      gr.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
      g.fillStyle = gr;
      g.fillRect(0, 0, S, S);
    }
    return finish(c, false, false);
  });

/** Grüne New Yorker Straßennamensschilder */
export const signTexture = (text: string) =>
  memo(`sign-${text}`, () => {
    const [c, g] = canvas(512, 96);
    g.fillStyle = "#0f6b3c";
    g.fillRect(0, 0, 512, 96);
    g.strokeStyle = "#f2f2f2";
    g.lineWidth = 5;
    g.strokeRect(6, 6, 500, 84);
    g.fillStyle = "#f6f6f6";
    g.font = "bold 58px 'Inter', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 52);
    return finish(c, false);
  });

/** Ladenschild / Markise */
export const awningTexture = (text: string, bg: string, fg = "#f5efe2") =>
  memo(`awning-${text}-${bg}`, () => {
    const [c, g] = canvas(512, 128);
    g.fillStyle = bg;
    g.fillRect(0, 0, 512, 128);
    g.fillStyle = "rgba(0,0,0,0.18)";
    g.fillRect(0, 104, 512, 24);
    g.fillStyle = fg;
    g.font = "bold 54px 'Oswald', 'Inter', Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, 256, 56);
    return finish(c, false);
  });

/** Fußgängerampel (2001 noch mit Schrift „WALK“ / „DONT WALK“) */
export const walkSignTexture = (walk: boolean) =>
  memo(`walk-${walk}`, () => {
    const [c, g] = canvas(128, 128);
    g.fillStyle = "#141414";
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = walk ? "#e8f4f0" : "#ff7a1a";
    g.font = "bold 30px Arial, sans-serif";
    g.textAlign = "center";
    g.fillText(walk ? "WALK" : "DONT", 64, 56);
    if (!walk) g.fillText("WALK", 64, 92);
    return finish(c, false);
  });

/** Papier-Blatt (fällt im Finale durch die Straßen) */
export const paperTexture = () =>
  memo("paper", () => {
    const [c, g] = canvas(32, 40);
    g.fillStyle = "#f1eee6";
    g.fillRect(0, 0, 32, 40);
    g.fillStyle = "#b9b4a8";
    for (let i = 0; i < 7; i++) g.fillRect(4, 6 + i * 4.5, 18 + (i % 3) * 3, 1.4);
    return finish(c, false);
  });

/** 2x2-Atlas aus vier unterschiedlichen Wolken-Formen (für Rauch/Staub) */
export const puffAtlas = () =>
  memo("puff-atlas", () => {
    const [c, g] = canvas(256, 256);
    for (let v = 0; v < 4; v++) {
      const src = (puffTexture(v) as THREE.CanvasTexture).image as HTMLCanvasElement;
      // Zelle (v % 2, floor(v / 2)) – UV-Ursprung unten links
      g.drawImage(src, (v % 2) * 128, (1 - Math.floor(v / 2)) * 128, 128, 128);
    }
    return finish(c, false, false);
  });

/** Weiches Glühen für Feuer (additiv) */
export const glowAtlas = () =>
  memo("glow-atlas", () => {
    const [c, g] = canvas(256, 256);
    const r = rng(5);
    for (let v = 0; v < 4; v++) {
      const ox = (v % 2) * 128;
      const oy = (1 - Math.floor(v / 2)) * 128;
      for (let i = 0; i < 10; i++) {
        const x = ox + 64 + (r() - 0.5) * 50;
        const y = oy + 64 + (r() - 0.5) * 50;
        const gr = g.createRadialGradient(x, y, 0, x, y, 22 + r() * 30);
        gr.addColorStop(0, "rgba(255,255,255,0.55)");
        gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr;
        g.fillRect(ox, oy, 128, 128);
      }
    }
    return finish(c, false, false);
  });

/** Papier-Atlas (4 gleiche Zellen, damit derselbe Billboard-Shader nutzbar ist) */
export const paperAtlas = () =>
  memo("paper-atlas", () => {
    const [c, g] = canvas(64, 64);
    for (let v = 0; v < 4; v++) {
      const ox = (v % 2) * 32;
      const oy = Math.floor(v / 2) * 32;
      g.fillStyle = v % 2 ? "#f3f0e8" : "#e9e4d8";
      g.fillRect(ox + 6, oy + 3, 20, 26);
      g.fillStyle = "#b4afa3";
      for (let i = 0; i < 5; i++) g.fillRect(ox + 9, oy + 7 + i * 4, 12 + (i % 2) * 3, 1);
    }
    return finish(c, false, false);
  });
