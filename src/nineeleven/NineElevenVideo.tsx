import { ThreeCanvas } from "@remotion/three";
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";
import "../lib/fonts";
import { ClockHUD, Disclaimer, EventLabels, FinaleText, Grade, HookTitle, Subtitles } from "./components/Overlays";
import { gradeAt } from "./grade";
import { FPS, HEIGHT, WIDTH } from "./timeline";
import { Scene } from "./world/Scene";

export const NineElevenVideo: React.FC<{ withAudio?: boolean }> = ({ withAudio = true }) => {
  const frame = useCurrentFrame();
  const g = gradeAt(frame / FPS);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <AbsoluteFill style={{ filter: `saturate(${g.saturate}) contrast(${g.contrast})` }}>
        <ThreeCanvas
          width={WIDTH}
          height={HEIGHT}
          dpr={1}
          shadows={{ type: THREE.PCFSoftShadowMap }}
          gl={{ antialias: true, powerPreference: "high-performance", preserveDrawingBuffer: true }}
          camera={{ fov: 50, near: 0.6, far: 16000, position: [0, 2, 0] }}
        >
          <Scene />
        </ThreeCanvas>
      </AbsoluteFill>
      <Grade />
      <HookTitle />
      <ClockHUD />
      <Disclaimer />
      <EventLabels />
      <Subtitles />
      <FinaleText />
      {withAudio && <Audio src={staticFile("nineeleven/audio/mix.wav")} />}
    </AbsoluteFill>
  );
};
