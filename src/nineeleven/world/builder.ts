import * as THREE from "three";

/** Sammelt viele Quader in wenigen BufferGeometries (Low-Poly, flache Normalen). */
export class BoxBuilder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  private quad(p: number[][], n: number[], uv: number[][], c: number[]) {
    const b = this.pos.length / 3;
    for (let i = 0; i < 4; i++) {
      this.pos.push(...p[i]);
      this.nor.push(...n);
      this.uv.push(...uv[i]);
      this.col.push(...c);
    }
    this.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
  }

  /**
   * Quader mit Mittelpunkt (cx, cz) am Boden y0, Breite w (x), Tiefe d (z), Höhe h,
   * gedreht um rot. Wände: uv in Zellen (cellW x cellH Meter), Dach optional separat.
   */
  box(
    cx: number,
    cz: number,
    w: number,
    d: number,
    h: number,
    opts: { y0?: number; rot?: number; cellW?: number; cellH?: number; u0?: number; v0?: number; color?: [number, number, number]; roof?: BoxBuilder | null; bottom?: boolean } = {},
  ) {
    const { y0 = 0, rot = 0, cellW = 3.2, cellH = 3.5, u0 = 0, v0 = 0, color = [1, 1, 1], roof = this, bottom = false } = opts;
    const c = Math.cos(rot);
    const s = Math.sin(rot);
    const P = (x: number, y: number, z: number) => [cx + x * c + z * s, y, cz - x * s + z * c];
    const N = (x: number, z: number) => [x * c + z * s, 0, -x * s + z * c];
    const hw = w / 2;
    const hd = d / 2;
    const y1 = y0 + h;
    const vTop = v0 + h / cellH;
    const sides: [number[], number[], number[], number, number[]][] = [
      // a, b (unten links/rechts von außen gesehen), Normale, Breite
      [[-hw, hd], [hw, hd], [0, 1], w, []],
      [[hw, hd], [hw, -hd], [1, 0], d, []],
      [[hw, -hd], [-hw, -hd], [0, -1], w, []],
      [[-hw, -hd], [-hw, hd], [-1, 0], d, []],
    ];
    for (const [a, b, n, len] of sides) {
      const uw = len / cellW;
      this.quad(
        [P(a[0], y0, a[1]), P(b[0], y0, b[1]), P(b[0], y1, b[1]), P(a[0], y1, a[1])],
        N(n[0], n[1]),
        [
          [u0, v0],
          [u0 + uw, v0],
          [u0 + uw, vTop],
          [u0, vTop],
        ],
        color,
      );
    }
    if (roof) {
      roof.quad(
        [P(-hw, y1, hd), P(hw, y1, hd), P(hw, y1, -hd), P(-hw, y1, -hd)],
        [0, 1, 0],
        [
          [0, 0],
          [w / 8, 0],
          [w / 8, d / 8],
          [0, d / 8],
        ],
        color,
      );
    }
    if (bottom) {
      this.quad([P(-hw, y0, -hd), P(hw, y0, -hd), P(hw, y0, hd), P(-hw, y0, hd)], [0, -1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], color);
    }
  }

  get empty() {
    return this.idx.length === 0;
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute("normal", new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute("color", new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}
