import { Composition } from "remotion";
import { BlackoutVideo } from "./BlackoutVideo";
import { NineElevenVideo } from "./nineeleven/NineElevenVideo";
import * as NE from "./nineeleven/timeline";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./timeline";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Blackout"
      component={BlackoutVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    {/* POV: Du bist in New York am 11. September 2001 – exakt 61 s / 1830 Frames */}
    <Composition
      id="NineEleven"
      component={NineElevenVideo}
      durationInFrames={NE.TOTAL_FRAMES}
      fps={NE.FPS}
      width={NE.WIDTH}
      height={NE.HEIGHT}
      defaultProps={{ withAudio: true }}
    />
  </>
);
