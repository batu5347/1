import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import "./lib/fonts";
import { Badge, CutDip, Grade, ReadabilityShade, SceneLabel, Subtitles, TimeHUD } from "./components/overlays";
import { GlobalDefs } from "./components/primitives";
import { SCENES, SHOTS, ShotId } from "./timeline";
import { SHOT_COMPONENTS } from "./shots";
import { HookTitle } from "./shots/Hook";
import { Finale } from "./shots/Finale";

export type ShotProps = { dur: number };

const sceneOf = (id: string) => SCENES.find((s) => s.id === id)!;

export const BlackoutVideo: React.FC = () => {
  const hudFrom = sceneOf("s2").from;
  const hudTo = sceneOf("s6").to;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <GlobalDefs />

      {/* Bildebene: alle Einstellungen in Schnittreihenfolge */}
      {SHOTS.map((shot) => {
        const Comp = SHOT_COMPONENTS[shot.id as ShotId];
        return (
          <Sequence key={shot.id} from={shot.from} durationInFrames={shot.duration} name={shot.id}>
            <Comp dur={shot.duration} />
          </Sequence>
        );
      })}

      {/* Schnitt-Abblendungen (Szenenwechsel etwas deutlicher) */}
      {SHOTS.slice(1).map((shot) => (
        <CutDip key={`dip-${shot.id}`} at={shot.from} len={SCENES.some((s) => s.from === shot.from) ? 7 : 4} />
      ))}

      <Grade />
      <ReadabilityShade />

      {/* Text- und Info-Ebene */}
      <Sequence durationInFrames={sceneOf("s1").to} name="Hook-Titel">
        <HookTitle />
      </Sequence>
      <TimeHUD from={hudFrom} to={hudTo} />
      {SCENES.filter((s) => s.label).map((s) => (
        <SceneLabel key={s.id} from={s.from} value={s.label!.value} unit={s.label!.unit} />
      ))}
      <Sequence from={sceneOf("s7").from} name="Finale-Text">
        <Finale />
      </Sequence>
      <Badge />
      <Subtitles />

      {/* Ton: Stimme + Musik/Sounddesign, vorab gemischt und auf -14 LUFS normalisiert */}
      <Audio src={staticFile("audio/mix.wav")} />
    </AbsoluteFill>
  );
};
