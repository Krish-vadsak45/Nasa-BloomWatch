import { NextResponse } from "next/server";
import {
  DUMMY_MODE,
  dummyAoiFromPoint,
  dummyAoiFromQuery,
} from "@/lib/dummy-data";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const UA =
  process.env.NOMINATIM_USER_AGENT ||
  "BloomVision/1.0 (contact: you@example.com)";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  try {
    if (DUMMY_MODE) {
      if (query) {
        const feature = dummyAoiFromQuery(query);
        return NextResponse.json({ feature });
      }
      if (lat && lon) {
        const feature = dummyAoiFromPoint(parseFloat(lon!), parseFloat(lat!));
        return NextResponse.json({ feature });
      }
    }
    let url: string | null = null;
    if (query) {
      url = `${NOMINATIM_BASE}/search?format=geojson&polygon_geojson=1&limit=1&q=${encodeURIComponent(
        query
      )}`;
    } else if (lat && lon) {
      const zoom = searchParams.get("zoom") || "10"; // city/locality level
      url = `${NOMINATIM_BASE}/reverse?format=geojson&polygon_geojson=1&lat=${encodeURIComponent(
        lat
      )}&lon=${encodeURIComponent(lon)}&zoom=${encodeURIComponent(zoom)}`;
    }

    if (!url) {
      return NextResponse.json(
        { error: "Provide query or lat/lon" },
        { status: 400 }
      );
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
      },
      // Nominatim discourages aggressive caching; keep it fresh in dev
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream error ${res.status}` },
        { status: 502 }
      );
    }
    const data = await res.json();

    // For search, geometry is under features[0].geometry; for reverse, under features[0] or top-level 'geometry'
    let feature: any | null = null;
    if (data && Array.isArray(data.features) && data.features.length > 0) {
      feature = data.features[0];
    } else if (data && data.type && data.geometry) {
      feature = data; // reverse can return a Feature-like object
    }

    if (!feature || !feature.geometry) {
      return NextResponse.json(
        { error: "No boundary geometry found" },
        { status: 404 }
      );
    }

    // Only accept Polygon/MultiPolygon
    if (!/Polygon$/i.test(feature.geometry.type)) {
      return NextResponse.json(
        { error: "Boundary is not a polygon" },
        { status: 404 }
      );
    }

    // Normalize shape to a standard Feature
    const out = {
      type: "Feature",
      properties: feature.properties || {},
      geometry: feature.geometry,
    };
    return NextResponse.json({ feature: out });
  } catch (e) {
    console.error("/api/bounds error", e);
    return NextResponse.json(
      { error: "Failed to fetch bounds" },
      { status: 500 }
    );
  }
}
