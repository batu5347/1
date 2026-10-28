// Rendert Standbilder (Mitte jeder Einstellung oder angegebene Frames) und
// setzt sie zu einem Kontaktbogen zusammen: build/preview/contact_sheet.jpg
// Aufruf: node scripts/preview.mjs [frame frame ...]
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync, readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const outDir = path.join(root, "build/preview");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const browserExecutable = process.env.REMOTION_BROWSER || null;
const serveUrl = await bundle({ entryPoint: path.join(root, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "Blackout", browserExecutable });

let frames = process.argv.slice(2).map(Number);
if (frames.length === 0) {
  // Mitte jeder Einstellung (aus timeline.json + voiceover.json berechnet)
  const tl = JSON.parse(readFileSync(path.join(root, "src/data/timeline.json"), "utf8"));
  const vo = JSON.parse(readFileSync(path.join(root, "src/data/voiceover.json"), "utf8"));
  const bare = (t) => t.replace(/[^\p{L}\p{N}]/gu, "");
  const res = (at) =>
    typeof at === "number" ? at : vo.words.filter((w) => w.scene === at.s && bare(w.text) === at.w)[at.n ?? 0].start + (at.o ?? 0);
  const starts = tl.shots.map((s) => res(s.at));
  frames = starts.map((s, i) => Math.round(((s + (starts[i + 1] ?? 61)) / 2) * 30));
}

const files = [];
for (const frame of frames) {
  const output = path.join(outDir, `f${String(frame).padStart(4, "0")}.jpg`);
  await renderStill({ composition, serveUrl, output, frame, imageFormat: "jpeg", jpegQuality: 85, browserExecutable });
  files.push(output);
  process.stdout.write(`${frame} `);
}
const cols = 6;
const args = [];
files.forEach((f) => args.push("-i", f));
const scaled = files.map((_, i) => `[${i}]scale=270:480,drawtext=text='${frames[i]}':x=8:y=8:fontsize=22:fontcolor=yellow[s${i}]`).join(";");
const rows = Math.ceil(files.length / cols);
const layout = files.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join("|");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args, "-filter_complex", `${scaled};${files.map((_, i) => `[s${i}]`).join("")}xstack=inputs=${files.length}:layout=${layout}:fill=black`, path.join(outDir, "contact_sheet.jpg")]);
console.log(`\n-> build/preview/contact_sheet.jpg (${rows} Zeilen)`);
