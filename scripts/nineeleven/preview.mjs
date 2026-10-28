// Standbilder + Kontaktbogen der 9/11-Komposition.
// Aufruf: node scripts/nineeleven/preview.mjs [--sheet] [sekunden ...]
//   ohne Zeitangaben: je ein Bild pro Szene (Mitte) -> deliverables/nineeleven/kontaktbogen.jpg
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
const outDir = path.join(root, "build/nineeleven/preview");
mkdirSync(outDir, { recursive: true });

const browserExecutable = process.env.REMOTION_BROWSER || null;
const gl = process.env.REMOTION_GL || "swangle";
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const inputProps = { withAudio: false };
const composition = await selectComposition({ serveUrl, id: "NineEleven", browserExecutable, inputProps, chromiumOptions: { gl } });

const args = process.argv.slice(2);
const SCENES = [
  [0, 5, "1 Hook"],
  [5, 13, "2 Morgen"],
  [13, 21, "3 Erster Einschlag"],
  [21, 30, "4 Die Stadt begreift"],
  [30, 38, "5 Zweiter Einschlag"],
  [38, 47, "6 Ausnahmezustand"],
  [47, 55, "7 Der zweite Turm"],
  [55, 61, "8 Finale"],
];
const sheet = args.length === 0;
const times = sheet ? [2.2, 8.0, 18.6, 23.5, 34.0, 45.4, 54.2, 60.5] : args.map(Number);

const files = [];
for (const s of times) {
  const frame = Math.min(1829, Math.round(s * 30));
  const output = path.join(outDir, `t${String(frame).padStart(4, "0")}.jpg`);
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "jpeg", jpegQuality: 88, browserExecutable, inputProps, chromiumOptions: { gl } });
  files.push(output);
  console.log(`${s}s (Frame ${frame}) -> ${path.relative(root, output)} [${Date.now() - t0} ms]`);
}

if (sheet) {
  const dest = path.join(root, "deliverables/nineeleven/kontaktbogen.jpg");
  mkdirSync(path.dirname(dest), { recursive: true });
  const inputs = files.flatMap((f) => ["-i", f]);
  const label = (i) =>
    `[${i}]scale=360:640,drawbox=y=0:w=iw:h=44:color=black@0.6:t=fill,drawtext=fontfile=${path.join(root, "build/nineeleven/Inter.ttf")}:text='${SCENES[i][2]} (${times[i]}s)':x=10:y=12:fontsize=20:fontcolor=white[s${i}]`;
  const filters = files.map((_, i) => label(i)).join(";");
  const layout = files.map((_, i) => `${(i % 4) * 360}_${Math.floor(i / 4) * 640}`).join("|");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...inputs, "-filter_complex", `${filters};${files.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}`, "-q:v", "3", dest]);
  console.log(`-> ${path.relative(root, dest)}`);
}
