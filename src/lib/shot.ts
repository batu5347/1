import { SHOTS, ShotId, wordFrame } from "../timeline";

/** Frame eines Wortes relativ zum Beginn einer Einstellung. */
export const localWord = (shot: ShotId, w: string, s: string, o = 0, n = 0) =>
  wordFrame(w, s, o, n) - SHOTS.find((x) => x.id === shot)!.from;
