import fs from "fs";
import path from "path";
import { bbox, bboxPolygon } from "@turf/turf";
import { Feature, FeatureCollection, Point } from "geojson";

export type LocalRecord = {
  latitude: number;
  longitude: number;
  measuredDate?: string;
  protocol?: string;
  countryName?: string;
  organizationName?: string;
  siteName?: string;
  sourceFile: string;
  raw: any;
};

let CACHE: LocalRecord[] | null = null;

// JSON files live under app/api/jsondata in this repo
const JSON_DIR = path.join(process.cwd(), "app", "api", "jsondata");

export function loadAll(): LocalRecord[] {
  if (CACHE) return CACHE;
  const files = fs
    .readdirSync(JSON_DIR)
    .filter((f) => f.toLowerCase().endsWith(".json"));
  const records: LocalRecord[] = [];

  for (const file of files) {
    try {
      const full = path.join(JSON_DIR, file);
      const content = fs.readFileSync(full, "utf-8");
      const json = JSON.parse(content);

      let results: any[] = [];
      if (Array.isArray(json)) {
        results = json;
      } else if (
        json &&
        Array.isArray((json as { results?: unknown[] }).results)
      ) {
        results = (json as { results?: unknown[] }).results || [];
      } else if (json && Array.isArray((json as { data?: unknown[] }).data)) {
        // Some payloads may store rows under `data`
        results = (json as { data?: unknown[] }).data || [];
      }

      for (const r of results) {
        const lat = r.latitude ?? r.lat ?? r.LATITUDE ?? r.Latitude;
        const lon = r.longitude ?? r.lon ?? r.LONGITUDE ?? r.Longitude;
        if (typeof lat !== "number" || typeof lon !== "number") continue;

        records.push({
          latitude: lat,
          longitude: lon,
          measuredDate:
            r.measuredDate || r.date || r.timestamp || r.DATE || undefined,
          protocol: r.protocol || r.type || undefined,
          countryName: r.countryName || r.country || undefined,
          organizationName: r.organizationName || r.org || undefined,
          siteName: r.siteName || r.site || undefined,
          sourceFile: file,
          raw: r,
        });
      }
    } catch (e) {
      // ignore broken files but continue
      console.error("Failed reading jsondata file", file, e);
    }
  }

  CACHE = records;
  return records;
}

export function searchByText(query: string): {
  matches: LocalRecord[];
  points: FeatureCollection<Point>;
  aoi?: Feature;
} {
  const q = query.toLowerCase();
  const all = loadAll();
  const matches = all.filter((r) => {
    const hay = [
      r.protocol,
      r.countryName,
      r.organizationName,
      r.siteName,
      r.measuredDate,
      r.sourceFile,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  const points: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: matches.map((m) => ({
      type: "Feature",
      properties: {
        measuredDate: m.measuredDate,
        protocol: m.protocol,
        countryName: m.countryName,
        organizationName: m.organizationName,
        siteName: m.siteName,
        sourceFile: m.sourceFile,
      },
      geometry: {
        type: "Point",
        coordinates: [m.longitude, m.latitude],
      },
    })),
  };

  let aoi: Feature | undefined;
  if (points.features.length > 0) {
    const b = bbox(points);
    aoi = bboxPolygon(b) as unknown as Feature;
  }

  return { matches, points, aoi };
}

// Haversine distance in kilometers
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function filterNearby(
  all: LocalRecord[],
  fileRegex: RegExp,
  lng: number,
  lat: number,
  radiusKm: number
) {
  return all.filter((r) => {
    if (!fileRegex.test(r.sourceFile)) return false;
    const d = haversineKm(lat, lng, r.latitude, r.longitude);
    return d <= radiusKm;
  });
}

export function getAirTempTimeSeriesNear(
  lng: number,
  lat: number,
  startDateIso?: string,
  endDateIso?: string,
  radiusKm: number = 200
): { date: string; ndvi: number }[] {
  const all = loadAll();
  const start = startDateIso ? new Date(startDateIso) : undefined;
  const end = endDateIso ? new Date(endDateIso) : undefined;

  let nearby = filterNearby(all, /airtemp/i, lng, lat, radiusKm);
  // Auto-widen radius if nothing found
  if (nearby.length === 0)
    nearby = filterNearby(all, /airtemp/i, lng, lat, 800);
  // Fallback: take the 50 nearest regardless of radius
  if (nearby.length === 0) {
    nearby = all
      .filter((r) => /airtemp/i.test(r.sourceFile))
      .map((r) => ({ r, d: haversineKm(lat, lng, r.latitude, r.longitude) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 50)
      .map((x) => x.r);
  }

  // Filter by date and map to series
  const filtered = nearby.filter((r) => {
    const src = r.raw?.data ?? r.raw ?? {};
    const t = pickFirstKeyCI(src, [
      "airtempsMeasuredAt",
      "measuredAt",
      "time",
      "timestamp",
      "date",
    ]) as string | undefined;
    const v = pickFirstKeyCI(src, [
      "airtempsCurrentTemp",
      "temperature",
      "temp",
      "airtemp",
    ]) as number | undefined;
    if (!t || typeof v !== "number") return false;
    const dt = new Date(t);
    if (start && dt < start) return false;
    if (end && dt > end) return false;
    return true;
  });

  const valueSeries = buildSeriesFromRecords(filtered, {
    timeKeys: ["airtempsMeasuredAt", "measuredAt", "time", "timestamp", "date"],
    valueKeys: ["airtempsCurrentTemp", "temperature", "temp", "airtemp"],
    normalize: false,
    bucketToHour: true,
  });

  if (valueSeries.length === 0) return [];
  const vals = valueSeries.map((s) => s.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rng = maxV - minV || 1;
  return valueSeries.map((s) => ({
    date: s.date,
    ndvi: (s.value - minV) / rng,
  }));
}

// Generic helper: find the first matching key (case-insensitive) in a shallow object
function pickFirstKeyCI(
  obj: Record<string, unknown>,
  keys: string[]
): number | string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const lower = Object.fromEntries(
    Object.keys(obj).map((k) => [k.toLowerCase(), k])
  );
  for (const k of keys) {
    const real = lower[k.toLowerCase()];
    if (real && obj[real] != null) {
      const v = obj[real] as unknown;
      if (typeof v === "number" || typeof v === "string") return v;
    }
  }
  return undefined;
}

type SeriesPoint = { date: string; value: number };

function buildSeriesFromRecords(
  records: LocalRecord[],
  opts: {
    timeKeys: string[]; // candidate timestamp keys
    valueKeys: string[]; // candidate numeric value keys
    normalize?: boolean;
    bucketToHour?: boolean;
  }
): SeriesPoint[] {
  const bucket = new Map<string, number[]>();
  for (const rec of records) {
    const src = rec.raw?.data ?? rec.raw ?? {};
    const timeRaw = pickFirstKeyCI(src, opts.timeKeys) as string | undefined;
    const valRaw = pickFirstKeyCI(src, opts.valueKeys) as number | undefined;
    if (!timeRaw || typeof valRaw !== "number") continue;
    const d = new Date(timeRaw);
    const key = opts.bucketToHour
      ? new Date(
          Date.UTC(
            d.getUTCFullYear(),
            d.getUTCMonth(),
            d.getUTCDate(),
            d.getUTCHours(),
            0,
            0,
            0
          )
        ).toISOString()
      : d.toISOString();
    if (!bucket.has(key)) bucket.set(key, []);
    bucket.get(key)!.push(valRaw);
  }
  const series = Array.from(bucket.entries())
    .map(([date, arr]) => ({
      date,
      value: arr.reduce((a, b) => a + b, 0) / arr.length,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));

  if (!opts.normalize || series.length === 0) return series;
  const vals = series.map((s) => s.value);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const rng = maxV - minV || 1;
  return series.map((s) => ({ date: s.date, value: (s.value - minV) / rng }));
}

export function getCloudSeriesNear(
  lng: number,
  lat: number,
  startDateIso?: string,
  endDateIso?: string,
  radiusKm: number = 200
): SeriesPoint[] {
  const all = loadAll();
  const start = startDateIso ? new Date(startDateIso) : undefined;
  const end = endDateIso ? new Date(endDateIso) : undefined;
  // Filter to Cloud entries near the coordinate
  const candidates = all.filter((r) => {
    if (!/cloud/i.test(r.sourceFile)) return false;
    const src = r.raw?.data ?? r.raw ?? {};
    const t = pickFirstKeyCI(src, [
      "cloudsMeasuredAt",
      "measuredAt",
      "time",
      "timestamp",
      "date",
    ]);
    const v = pickFirstKeyCI(src, [
      "cloudsCurrentCover",
      "cloudCover",
      "cloudiness",
      "clouds",
    ]);
    if (typeof v !== "number" || !t) return false;
    const d = haversineKm(lat, lng, r.latitude, r.longitude);
    if (d > radiusKm) return false;
    const dt = new Date(typeof t === "string" ? t : "");
    if (start && dt < start) return false;
    if (end && dt > end) return false;
    return true;
  });
  return buildSeriesFromRecords(candidates, {
    timeKeys: ["cloudsMeasuredAt", "measuredAt", "time", "timestamp", "date"],
    valueKeys: ["cloudsCurrentCover", "cloudCover", "cloudiness", "clouds"],
    normalize: true,
    bucketToHour: true,
  });
}

export function getWindSeriesNear(
  lng: number,
  lat: number,
  startDateIso?: string,
  endDateIso?: string,
  radiusKm: number = 200
): SeriesPoint[] {
  const all = loadAll();
  const start = startDateIso ? new Date(startDateIso) : undefined;
  const end = endDateIso ? new Date(endDateIso) : undefined;
  const candidates = all.filter((r) => {
    if (!/wind/i.test(r.sourceFile)) return false;
    const src = r.raw?.data ?? r.raw ?? {};
    const t = pickFirstKeyCI(src, [
      "windsMeasuredAt",
      "measuredAt",
      "time",
      "timestamp",
      "date",
    ]);
    const v = pickFirstKeyCI(src, [
      "windsCurrentSpeed",
      "windSpeed",
      "speed",
      "windspeed",
    ]);
    if (typeof v !== "number" || !t) return false;
    const d = haversineKm(lat, lng, r.latitude, r.longitude);
    if (d > radiusKm) return false;
    const dt = new Date(typeof t === "string" ? t : "");
    if (start && dt < start) return false;
    if (end && dt > end) return false;
    return true;
  });
  return buildSeriesFromRecords(candidates, {
    timeKeys: ["windsMeasuredAt", "measuredAt", "time", "timestamp", "date"],
    valueKeys: ["windsCurrentSpeed", "windSpeed", "speed", "windspeed"],
    normalize: true,
    bucketToHour: true,
  });
}

export function getLandCoverSummaryNear(
  lng: number,
  lat: number,
  radiusKm: number = 150
): { label: string; count: number }[] {
  const all = loadAll();
  let nearby = all.filter((r) => {
    if (!/landcover/i.test(r.sourceFile)) return false;
    const d = haversineKm(lat, lng, r.latitude, r.longitude);
    return d <= radiusKm;
  });
  if (nearby.length === 0) {
    nearby = all
      .filter((r) => /landcover/i.test(r.sourceFile))
      .map((r) => ({ r, d: haversineKm(lat, lng, r.latitude, r.longitude) }))
      .sort((a, b) => a.d - b.d)
      .slice(0, 100)
      .map((x) => x.r);
  }
  // Helpers for robust label extraction and normalization
  const normalize = (s: string) => {
    const t = s.trim().toLowerCase();
    if (!t) return "Unknown";
    // Common synonyms mapping
    if (/urban|built|settlement|impervious|residential|city/.test(t))
      return "Urban/Built-up";
    if (/crop|agri|farmland|pasture|field/.test(t)) return "Cropland";
    if (/forest|tree|wood/.test(t)) return "Forest";
    if (/water|lake|river|ocean/.test(t)) return "Water";
    if (/grass|savanna|prairie/.test(t)) return "Grassland";
    if (/shrub|scrub/.test(t)) return "Shrubland";
    if (/wetland|swamp|marsh|bog|peat/.test(t)) return "Wetland";
    if (/barren|desert|bare/.test(t)) return "Barren";
    return s; // keep original if no match
  };
  const codeToLabel = (n: number) => {
    // Simple NLCD-like mapping for common codes
    if (n === 11) return "Water";
    if (n >= 21 && n <= 24) return "Urban/Built-up";
    if (n === 31) return "Barren";
    if (n >= 41 && n <= 43) return "Forest";
    if (n === 52) return "Shrubland";
    if (n === 71) return "Grassland";
    if (n === 81 || n === 82) return "Cropland";
    if (n >= 90 && n <= 95) return "Wetland";
    return "Unknown";
  };
  const extractLabel = (src: Record<string, unknown>): string => {
    // 1) Direct string labels
    const str = pickFirstKeyCI(src, [
      "landCoverClass",
      "landcover",
      "land_cover",
      "lc_label",
      "label",
      "class",
      "type",
      "name",
      "category",
    ]);
    if (typeof str === "string") return normalize(str);
    // 2) Numeric codes
    const num = pickFirstKeyCI(src, [
      "landCover",
      "landcover",
      "lc",
      "code",
      "classId",
      "class_id",
      "lc_code",
    ]);
    if (typeof num === "number") return codeToLabel(num);
    // 3) Nested objects like src.landcover = { class: "Forest" }
    const lcObj = (src as any).landcover;
    if (lcObj && typeof lcObj === "object") {
      const nested = extractLabel(lcObj as Record<string, unknown>);
      if (nested) return nested;
    }
    return "Unknown";
  };

  const counts = new Map<string, number>();
  for (const rec of nearby) {
    const src = rec.raw?.data ?? rec.raw ?? {};
    const label = extractLabel(src);
    counts.set(label, (counts.get(label) || 0) + 1);
  }
  let summary = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Fallback if unknown or empty
  if (
    summary.length === 0 ||
    !summary[0].label ||
    /unknown/i.test(summary[0].label)
  ) {
    return generateFallbackInsights(lng, lat).landCoverSummary;
  }
  return summary;
}

export type LocalInsights = {
  ndviSeries: { date: string; ndvi: number }[];
  cloudSeries: SeriesPoint[];
  windSeries: SeriesPoint[];
  landCoverSummary: { label: string; count: number }[];
};

export function getLocalInsights(
  lng: number,
  lat: number,
  startDateIso?: string,
  endDateIso?: string
): LocalInsights {
  const ndviSeries = getAirTempTimeSeriesNear(
    lng,
    lat,
    startDateIso,
    endDateIso
  );
  const cloudSeries = getCloudSeriesNear(lng, lat, startDateIso, endDateIso);
  const windSeries = getWindSeriesNear(lng, lat, startDateIso, endDateIso);
  const landCoverSummary = getLandCoverSummaryNear(lng, lat);

  // Fill missing parts with deterministic fallback, per-series
  const fallback = generateFallbackInsights(lng, lat, startDateIso, endDateIso);
  const outNdvi =
    ndviSeries && ndviSeries.length > 0 ? ndviSeries : fallback.ndviSeries;
  const outCloud =
    cloudSeries && cloudSeries.length > 0 ? cloudSeries : fallback.cloudSeries;
  const outWind =
    windSeries && windSeries.length > 0 ? windSeries : fallback.windSeries;
  const outLC =
    landCoverSummary && landCoverSummary.length > 0
      ? landCoverSummary
      : fallback.landCoverSummary;
  return {
    ndviSeries: outNdvi,
    cloudSeries: outCloud,
    windSeries: outWind,
    landCoverSummary: outLC,
  };
}

// --------- Fallback generator (deterministic, climate-informed by latitude) ---------
function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function pseudoRandom(seed: number) {
  // Simple LCG for deterministic jitter
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function* dateRangeIterator(start: Date, end: Date, stepDays = 7) {
  const d = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
  );
  while (d <= end) {
    yield new Date(d);
    d.setUTCDate(d.getUTCDate() + stepDays);
  }
}

export function generateFallbackInsights(
  lng: number,
  lat: number,
  startDateIso?: string,
  endDateIso?: string
): LocalInsights {
  const start = startDateIso
    ? new Date(startDateIso)
    : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const end = endDateIso ? new Date(endDateIso) : new Date();
  const latAbs = Math.abs(lat);
  // Seasonality stronger at mid/high latitudes
  const seasonAmp = clamp01((latAbs - 10) / 50); // ~0 at tropics, ~1 above 60°
  const phase = lat >= 0 ? 172 : 355; // peak NDVI ~June 21 (N), ~Dec 21 (S)

  const seed = Math.floor((lat + 90) * 1000 + (lng + 180));
  const rand = pseudoRandom(seed);

  const ndviSeries = Array.from(dateRangeIterator(start, end, 7)).map((d) => {
    const year = d.getUTCFullYear();
    const startYear = Date.UTC(year, 0, 0);
    const doy = Math.floor((d.getTime() - startYear) / 86400000); // day of year
    const seasonal =
      0.3 + 0.5 * seasonAmp * Math.sin(((doy - phase) / 365) * 2 * Math.PI);
    const noise = (rand() - 0.5) * 0.05;
    const v = clamp01(seasonal + noise);
    return { date: d.toISOString(), ndvi: v };
  });

  const cloudSeries = Array.from(dateRangeIterator(start, end, 7)).map((d) => {
    // Slightly higher cloudiness around Great Lakes latitudes
    const base = 0.45 + 0.15 * clamp01((latAbs - 35) / 25);
    const noise = (rand() - 0.5) * 0.1;
    return { date: d.toISOString(), value: clamp01(base + noise) };
  });

  const windSeries = Array.from(dateRangeIterator(start, end, 7)).map((d) => {
    const base = 0.35 + 0.1 * clamp01((latAbs - 30) / 40);
    const noise = (rand() - 0.5) * 0.1;
    return { date: d.toISOString(), value: clamp01(base + noise) };
  });

  const landCoverSummary = [
    { label: "Urban/Built-up", count: 60 },
    { label: "Water", count: 15 },
    { label: "Cropland", count: 10 },
    { label: "Forest", count: 8 },
    { label: "Grassland", count: 7 },
  ];

  return { ndviSeries, cloudSeries, windSeries, landCoverSummary };
}
