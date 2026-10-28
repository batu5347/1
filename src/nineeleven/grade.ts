import { keyColors, keyframes } from "./lib/math";
import { EVENTS } from "./timeline";

/**
 * Farbdramaturgie: warmer, klarer Morgen -> kühler, staubiger, gedämpfter Tag.
 * Alle Werte sind Funktionen der Video-Zeit t (s).
 */
const I1 = EVENTS.impact1.t;
const I2 = EVENTS.impact2.t;
const CS = EVENTS.collapseS.t;
const CN = EVENTS.collapseN.t;

export const gradeAt = (t: number) => ({
  skyTop: keyColors(t, [
    [0, "#3b78c8"],
    [I1, "#3f79c4"],
    [I2 + 2, "#5079ae"],
    [CS, "#64778d"],
    [CS + 6, "#77797b"],
    [CN + 4, "#727780"],
    [61, "#6a727c"],
  ]),
  horizon: keyColors(t, [
    [0, "#f2dcc0"],
    [I1, "#efdcc6"],
    [I2 + 2, "#d9d2c6"],
    [CS, "#bdb5a7"],
    [CS + 6, "#a8a092"],
    [CN + 4, "#9e9a92"],
    [61, "#97989a"],
  ]),
  sunColor: keyColors(t, [
    [0, "#ffdcae"],
    [I2, "#ffe8cc"],
    [CS, "#efe0cb"],
    [CS + 6, "#d9d1c4"],
    [61, "#cfd2d6"],
  ]),
  sunIntensity: keyframes(t, [
    [0, 3.3],
    [I2, 3.0],
    [CS, 2.5],
    [CS + 6, 1.6],
    [61, 1.3],
  ]),
  hemiIntensity: keyframes(t, [
    [0, 1.9],
    [CS, 1.7],
    [61, 1.5],
  ]),
  fogBase: keyframes(t, [
    [0, 0.00011],
    [I2, 0.00014],
    [CS, 0.0002],
    [CS + 5, 0.00026],
    [61, 0.00022],
  ]),
  exposure: keyframes(t, [
    [0, 1.02],
    [CS, 0.98],
    [61, 0.9],
  ]),
  /** CSS-Filter fürs gesamte Bild */
  saturate: keyframes(t, [
    [0, 1.12],
    [I1, 1.08],
    [I2 + 3, 0.95],
    [CS + 4, 0.78],
    [61, 0.68],
  ]),
  contrast: keyframes(t, [
    [0, 1.04],
    [CS, 1.06],
    [61, 1.02],
  ]),
  /** Farbüberlagerung: warm (Orange) -> kühl (Blau-Grau) */
  warm: keyframes(t, [
    [0, 0.16],
    [I1, 0.12],
    [I2 + 3, 0.04],
    [CS, 0],
  ]),
  cool: keyframes(t, [
    [0, 0],
    [I2, 0.04],
    [CS + 4, 0.14],
    [61, 0.2],
  ]),
});
