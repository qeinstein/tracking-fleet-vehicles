// Lagos State districts — must mirror the backend LagosDistrict enum (name, prefix, centre).
// The whole fleet lives inside Lagos so a viewer always sees a dense, realistic population of cars.

export interface District {
  code: string; // matches the middle segment of a vehicle id, e.g. LAG-IKJ-0001 -> "IKJ"
  name: string;
  center: [number, number]; // [lon, lat]
}

export const DISTRICTS: District[] = [
  { code: "IKJ", name: "Ikeja", center: [3.3515, 6.6018] },
  { code: "VIL", name: "Victoria Island", center: [3.4219, 6.4281] },
  { code: "LEK", name: "Lekki", center: [3.541, 6.4478] },
  { code: "YAB", name: "Yaba", center: [3.3711, 6.5095] },
  { code: "SUR", name: "Surulere", center: [3.3556, 6.5006] },
  { code: "APA", name: "Apapa", center: [3.3595, 6.4489] },
  { code: "IKO", name: "Ikorodu", center: [3.5105, 6.6194] },
  { code: "OSH", name: "Oshodi", center: [3.3488, 6.5551] },
  { code: "AGE", name: "Agege", center: [3.3204, 6.6155] },
  { code: "FES", name: "Festac", center: [3.287, 6.4667] },
  { code: "AJA", name: "Ajah", center: [3.5719, 6.4676] },
  { code: "GBA", name: "Gbagada", center: [3.3897, 6.5486] },
];

const BY_CODE: Record<string, District> = Object.fromEntries(
  DISTRICTS.map((d) => [d.code, d])
);

const BY_NAME: Record<string, District> = Object.fromEntries(
  DISTRICTS.map((d) => [d.name, d])
);

/** Derive the district name from a vehicle id such as "LAG-IKJ-0001". */
export function districtFromId(id: string): string {
  const parts = id.split("-");
  const code = parts.length >= 2 ? parts[1] : "";
  return BY_CODE[code]?.name ?? "Lagos";
}

export function districtByName(name: string): District | undefined {
  return BY_NAME[name];
}

// Lagos State metropolitan bounding box. The camera is clamped to this so the map
// never zooms/pans out of Lagos — there is always something on screen.
export const LAGOS_BOUNDS = {
  minLon: 3.05,
  maxLon: 3.7,
  minLat: 6.393,
  maxLat: 6.702,
};

export const LAGOS_CENTER: [number, number] = [3.37, 6.55];
