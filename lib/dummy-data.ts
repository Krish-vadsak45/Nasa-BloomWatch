import bboxPolygon from "@turf/bbox-polygon";
import { Feature, FeatureCollection, Point, Polygon } from "geojson";

export const DUMMY_MODE =
  (process.env.NEXT_PUBLIC_DUMMY_MODE || process.env.DUMMY_MODE) === "true";

function hashCode(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0; // force 32-bit
  }
  return Math.abs(h);
}

export function dummyChoroplethWithin(
  aoi: Feature,
  nx = 10,
  ny = 10
): FeatureCollection<Polygon> {
  const [minLng, minLat, maxLng, maxLat] =
    (aoi as any).bbox ||
    ((): [number, number, number, number] => {
      const coords = (aoi.geometry as any).coordinates;
      let ring: any[] = [];
      if (Array.isArray(coords)) {
        if (aoi.geometry.type === "Polygon") {
          ring = coords[0] || [];
        } else if (aoi.geometry.type === "MultiPolygon") {
          ring = coords?.[0]?.[0] || [];
        }
      }
      let mnLng = 180,
        mnLat = 90,
        mxLng = -180,
        mxLat = -90;
      for (const pair of ring) {
        const lng = pair[0];
        const lat = pair[1];
        if (lng < mnLng) mnLng = lng;
        if (lng > mxLng) mxLng = lng;
        if (lat < mnLat) mnLat = lat;
        if (lat > mxLat) mxLat = lat;
      }
      return [mnLng, mnLat, mxLng, mxLat];
    })();

  const dx = (maxLng - minLng) / nx;
  const dy = (maxLat - minLat) / ny;
  const features: Feature<Polygon>[] = [];
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const x0 = minLng + i * dx;
      const x1 = x0 + dx;
      const y0 = minLat + j * dy;
      const y1 = y0 + dy;
      const ndvi = (i + j) / (nx + ny); // 0..1 gradient
      const poly: Feature<Polygon> = {
        type: "Feature",
        properties: { ndvi },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [x0, y0],
              [x1, y0],
              [x1, y1],
              [x0, y1],
              [x0, y0],
            ],
          ],
        },
      };
      features.push(poly);
    }
  }
  return { type: "FeatureCollection", features };
}
export function dummyAoiFromQuery(query: string): Feature {
  const h = hashCode(query);
  // map hash to a pseudo coord, avoid oceans by biasing to mid-latitudes
  const lng = (h % 36000) / 100 - 180;
  const latRaw = (Math.floor(h / 36000) % 12000) / 100 - 60;
  const lat = Math.max(-60, Math.min(60, latRaw));
  const delta = 0.2; // ~20km box
  return bboxPolygon([
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ]) as unknown as Feature;
}

export function dummyAoiFromPoint(lng: number, lat: number): Feature {
  const delta = 0.15; // ~15km box
  return bboxPolygon([
    lng - delta,
    lat - delta,
    lng + delta,
    lat + delta,
  ]) as unknown as Feature;
}

export function dummyPointsWithin(
  aoi: Feature,
  count = 50
): FeatureCollection<Point> {
  // simple grid sampling inside bbox, no strict polygon check for simplicity
  const [minLng, minLat, maxLng, maxLat] =
    (aoi as any).bbox ||
    ((): [number, number, number, number] => {
      const coords = (aoi.geometry as any).coordinates;
      // fallback: compute bbox from first linear ring of Polygon/MultiPolygon
      let ring: any[] = [];
      if (Array.isArray(coords)) {
        if (aoi.geometry.type === "Polygon") {
          ring = coords[0] || [];
        } else if (aoi.geometry.type === "MultiPolygon") {
          ring = coords?.[0]?.[0] || [];
        }
      }
      let mnLng = 180,
        mnLat = 90,
        mxLng = -180,
        mxLat = -90;
      for (const pair of ring) {
        const lng = pair[0];
        const lat = pair[1];
        if (lng < mnLng) mnLng = lng;
        if (lng > mxLng) mxLng = lng;
        if (lat < mnLat) mnLat = lat;
        if (lat > mxLat) mxLat = lat;
      }
      return [mnLng, mnLat, mxLng, mxLat];
    })();

  const features: Feature<Point>[] = [] as any;
  const nx = Math.max(5, Math.floor(Math.sqrt(count)));
  const ny = nx;
  for (let i = 0; i < nx; i++) {
    for (let j = 0; j < ny; j++) {
      const lng = minLng + ((i + 0.5) / nx) * (maxLng - minLng);
      const lat = minLat + ((j + 0.5) / ny) * (maxLat - minLat);
      features.push({
        type: "Feature",
        properties: {
          intensity: ((i + j) % 10) / 10,
        },
        geometry: { type: "Point", coordinates: [lng, lat] },
      });
    }
  }
  return { type: "FeatureCollection", features };
}
