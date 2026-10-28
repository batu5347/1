import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

const faces: [string, string, string][] = [
  ["Oswald", "oswald-latin-500-normal.woff2", "500"],
  ["Oswald", "oswald-latin-600-normal.woff2", "600"],
  ["Oswald", "oswald-latin-700-normal.woff2", "700"],
  ["Inter", "inter-latin-500-normal.woff2", "500"],
  ["Inter", "inter-latin-700-normal.woff2", "700"],
  ["Inter", "inter-latin-800-normal.woff2", "800"],
  ["Inter", "inter-latin-900-normal.woff2", "900"],
  ["JetBrains Mono", "jetbrains-mono-latin-500-normal.woff2", "500"],
  ["JetBrains Mono", "jetbrains-mono-latin-700-normal.woff2", "700"],
];

for (const [family, file, weight] of faces) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: "woff2" });
}
