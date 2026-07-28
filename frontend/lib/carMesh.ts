// Procedurally builds a low-poly but clearly-recognisable 3D car mesh for the deck.gl
// SimpleMeshLayer. No external glTF asset is required, so it can never 404 at runtime.
//
// Convention (deck.gl world space, metres, Z-up):
//   +X = right, +Y = forward (car nose points +Y), +Z = up.
// With getOrientation [0, -heading, 0] the nose ends up facing the compass heading.
//
// Per-vertex colours are baked in. The SimpleMeshLayer shader computes
// vColor = colors * instanceColors, so:
//   body vertices are white (1,1,1)  -> show the per-car paint colour from getColor()
//   glass / wheels are dark          -> stay dark regardless of paint colour.

import { BoxGeometry, CylinderGeometry, BufferGeometry } from "three";

type RGB = [number, number, number];

interface Part {
  geo: BufferGeometry;
  color: RGB;
}

const WHITE: RGB = [1, 1, 1]; // paint (multiplied by instance colour)
const GLASS: RGB = [0.13, 0.15, 0.2];
const TIRE: RGB = [0.05, 0.05, 0.06];
const TRIM: RGB = [0.16, 0.17, 0.19];

// box(width X, length Y, height Z) centred at (x, y, z)
function box(w: number, l: number, h: number, x: number, y: number, z: number, color: RGB): Part {
  const geo = new BoxGeometry(w, l, h).toNonIndexed();
  geo.translate(x, y, z);
  return { geo, color };
}

// wheel: a cylinder whose axle runs along X (so it rolls forward along Y)
function wheel(x: number, y: number, z: number, radius: number, thickness: number, color: RGB): Part {
  const geo = new CylinderGeometry(radius, radius, thickness, 18).toNonIndexed();
  geo.rotateZ(Math.PI / 2); // default axis +Y -> +X
  geo.translate(x, y, z);
  return { geo, color };
}

function buildCar(): { positions: Float32Array; normals: Float32Array; colors: Float32Array } {
  const parts: Part[] = [
    // lower body / chassis
    box(1.9, 4.3, 0.5, 0, 0, 0.62, WHITE),
    // upper body belt-line (slightly narrower, adds shape)
    box(1.82, 3.5, 0.3, 0, -0.05, 0.95, WHITE),
    // greenhouse / cabin (dark glass)
    box(1.55, 2.05, 0.55, 0, -0.2, 1.24, GLASS),
    // thin roof
    box(1.42, 1.7, 0.08, 0, -0.25, 1.52, GLASS),
    // front + rear bumpers
    box(1.86, 0.3, 0.4, 0, 2.12, 0.56, TRIM),
    box(1.86, 0.3, 0.4, 0, -2.12, 0.56, TRIM),
    // wheels
    wheel(-0.88, 1.42, 0.37, 0.37, 0.28, TIRE),
    wheel(0.88, 1.42, 0.37, 0.37, 0.28, TIRE),
    wheel(-0.88, -1.42, 0.37, 0.37, 0.28, TIRE),
    wheel(0.88, -1.42, 0.37, 0.37, 0.28, TIRE),
  ];

  let total = 0;
  for (const p of parts) total += p.geo.attributes.position.count;

  const positions = new Float32Array(total * 3);
  const normals = new Float32Array(total * 3);
  const colors = new Float32Array(total * 3);

  let off = 0;
  for (const p of parts) {
    const pos = p.geo.attributes.position.array as ArrayLike<number>;
    const nor = p.geo.attributes.normal.array as ArrayLike<number>;
    const count = p.geo.attributes.position.count;
    positions.set(pos, off * 3);
    normals.set(nor, off * 3);
    for (let i = 0; i < count; i++) {
      colors[(off + i) * 3] = p.color[0];
      colors[(off + i) * 3 + 1] = p.color[1];
      colors[(off + i) * 3 + 2] = p.color[2];
    }
    off += count;
    p.geo.dispose();
  }

  return { positions, normals, colors };
}

const car = buildCar();

// Mesh object in the plain form accepted by @deck.gl SimpleMeshLayer.
export const CAR_MESH = {
  positions: { value: car.positions, size: 3 },
  normals: { value: car.normals, size: 3 },
  colors: { value: car.colors, size: 3 },
};

// Per-car paint colour lives in a dependency-free module so the data hook can import it
// without pulling in three.js.
export { paintForId } from "./carPaint";
