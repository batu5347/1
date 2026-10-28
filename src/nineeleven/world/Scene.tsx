import React from "react";
import { useCurrentFrame } from "remotion";
import { cameraAt } from "../camera";
import { sstep } from "../lib/math";
import { EVENTS, FPS } from "../timeline";
import { Billboards } from "./Billboards";
import { City } from "./City";
import { fireballs, papers, smokeAndDust } from "./effects";
import { Environment } from "./Environment";
import { glowAtlas, paperAtlas, puffAtlas } from "./textures";
import { toLocal } from "./geo";
import { People } from "./People";
import { Planes } from "./Planes";
import { Props } from "./Props";
import { Towers } from "./Towers";
import { Vehicles } from "./Vehicles";

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = cameraAt(t);
  return (
    <>
      <Environment t={t} cam={cam} />
      <City dust={sstep(EVENTS.collapseS.t + 2, EVENTS.collapseS.t + 7, t) * 0.85} />
      <Towers t={t} />
      <Planes t={t} />
      <Props t={t} />
      <People t={t} camLocal={toLocal(cam.pos[0], cam.pos[2])} />
      <Vehicles t={t} />
      <Billboards items={smokeAndDust(t, cam.shot)} map={puffAtlas()} capacity={7000} renderOrder={10} />
      <Billboards items={fireballs(t)} map={glowAtlas()} capacity={400} additive renderOrder={11} />
      <Billboards items={papers(t, cam.shot)} map={paperAtlas()} capacity={200} renderOrder={12} />
    </>
  );
};
