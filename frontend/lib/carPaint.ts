// Realistic car-paint palette (0–255), assigned deterministically per vehicle id so the
// fleet looks like a varied mix of real cars. Kept dependency-free (no three.js) so it can be
// imported by the data hook without bloating the main bundle.

type RGB = [number, number, number];

const PAINTS: RGB[] = [
  [238, 240, 243], // white
  [244, 245, 247], // pearl white
  [190, 196, 203], // silver
  [120, 126, 134], // grey
  [40, 44, 52], // black
  [188, 52, 52], // red
  [40, 86, 168], // blue
  [28, 56, 104], // navy
  [46, 96, 74], // green
  [214, 170, 66], // gold (Lagos taxi yellow-ish)
];

export function paintForId(id: string): RGB {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return PAINTS[h % PAINTS.length];
}
