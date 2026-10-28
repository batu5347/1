// Erzeugt src/data/germany.json: SVG-Pfad der Landesgrenze (Natural Earth via
// world-atlas, Public Domain), projizierte Städte und Lichtpunkte für die Karte.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { feature } from "topojson-client";
import { geoConicConformal, geoPath, geoContains } from "d3-geo";

const W = 900;
const H = 1150;
const topo = JSON.parse(readFileSync(new URL("../node_modules/world-atlas/countries-10m.json", import.meta.url)));
const countries = feature(topo, topo.objects.countries);
const germany = countries.features.find((f) => f.id === "276");
const neighbours = countries.features.filter((f) =>
  ["040", "056", "203", "208", "250", "442", "528", "616", "756", "380", "348", "703", "705", "826"].includes(f.id),
);

const projection = geoConicConformal().parallels([48.67, 53.67]).rotate([-10.4, 0]).fitSize([W, H], germany);
const path = geoPath(projection);
const round = (n) => Math.round(n * 10) / 10;

const cities = [
  ["Berlin", 13.405, 52.52, 3.7], ["Hamburg", 9.993, 53.551, 1.9], ["München", 11.582, 48.135, 1.5],
  ["Köln", 6.96, 50.938, 1.1], ["Frankfurt", 8.682, 50.11, 0.77], ["Stuttgart", 9.182, 48.776, 0.63],
  ["Düsseldorf", 6.773, 51.228, 0.62], ["Leipzig", 12.373, 51.34, 0.6], ["Dortmund", 7.466, 51.514, 0.59],
  ["Essen", 7.012, 51.456, 0.58], ["Bremen", 8.807, 53.079, 0.57], ["Dresden", 13.738, 51.05, 0.56],
  ["Hannover", 9.732, 52.375, 0.54], ["Nürnberg", 11.077, 49.452, 0.52], ["Duisburg", 6.762, 51.434, 0.5],
  ["Bochum", 7.216, 51.481, 0.36], ["Wuppertal", 7.15, 51.256, 0.35], ["Bielefeld", 8.532, 52.03, 0.33],
  ["Bonn", 7.098, 50.737, 0.33], ["Münster", 7.626, 51.96, 0.32], ["Mannheim", 8.466, 49.488, 0.31],
  ["Karlsruhe", 8.403, 49.007, 0.31], ["Augsburg", 10.898, 48.371, 0.3], ["Wiesbaden", 8.24, 50.078, 0.28],
  ["Kiel", 10.123, 54.323, 0.25], ["Magdeburg", 11.628, 52.12, 0.24], ["Freiburg", 7.842, 47.999, 0.23],
  ["Rostock", 12.1, 54.092, 0.21], ["Erfurt", 11.03, 50.978, 0.21], ["Kassel", 9.479, 51.312, 0.2],
  ["Saarbrücken", 6.997, 49.24, 0.18], ["Regensburg", 12.102, 49.013, 0.15], ["Würzburg", 9.953, 49.791, 0.13],
  ["Chemnitz", 12.921, 50.833, 0.24], ["Halle", 11.97, 51.482, 0.24], ["Potsdam", 13.064, 52.391, 0.18],
  ["Schwerin", 11.401, 53.629, 0.1], ["Lübeck", 10.687, 53.866, 0.22], ["Osnabrück", 8.047, 52.279, 0.16],
  ["Ulm", 9.991, 48.401, 0.13], ["Passau", 13.431, 48.574, 0.05], ["Cottbus", 14.334, 51.756, 0.1],
  ["Trier", 6.641, 49.75, 0.11], ["Göttingen", 9.935, 51.541, 0.12], ["Flensburg", 9.437, 54.793, 0.09],
];

// Deterministischer Zufall (mulberry32)
let seed = 24;
const rand = () => {
  seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = () => Math.sqrt(-2 * Math.log(rand() + 1e-9)) * Math.cos(2 * Math.PI * rand());

const lights = [];
const [[x0, y0], [x1, y1]] = path.bounds(germany);
// Lichtpunkte gehäuft um Städte, dazu ländliche Streuung.
for (const [, lon, lat, pop] of cities) {
  const n = Math.round(14 + pop * 40);
  for (let i = 0; i < n; i++) {
    const r = 0.06 + 0.11 * Math.sqrt(pop);
    const p = [lon + gauss() * r * 1.4, lat + gauss() * r];
    if (geoContains(germany, p)) lights.push(p);
  }
}
let tries = 0;
while (lights.length < 1350 && tries++ < 20000) {
  const p = projection.invert([x0 + rand() * (x1 - x0), y0 + rand() * (y1 - y0)]);
  if (geoContains(germany, p)) lights.push(p);
}

const out = {
  width: W,
  height: H,
  outline: path(germany).replace(/(\d+\.\d+)/g, (m) => String(round(+m))),
  neighbours: neighbours.map((f) => path(f)).join(" ").replace(/(\d+\.\d+)/g, (m) => String(round(+m))),
  cities: cities.map(([name, lon, lat, pop]) => {
    const [x, y] = projection([lon, lat]);
    return { name, x: round(x), y: round(y), pop };
  }),
  lights: lights.map((p) => {
    const [x, y] = projection(p);
    return { x: round(x), y: round(y), r: round(0.6 + rand() * 1.6), d: Math.round(rand() * 1000) / 1000 };
  }),
};
mkdirSync(new URL("../src/data/", import.meta.url), { recursive: true });
writeFileSync(new URL("../src/data/germany.json", import.meta.url), JSON.stringify(out));
console.log(`germany.json: ${out.outline.length} Zeichen Umriss, ${out.cities.length} Städte, ${out.lights.length} Lichter`);
