import { NextResponse } from "next/server";
import { searchByText } from "@/lib/local-data";
import {
  DUMMY_MODE,
  dummyAoiFromQuery,
  dummyPointsWithin,
} from "@/lib/dummy-data";
import bboxPolygon from "@turf/bbox-polygon";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query");

  if (!query) {
    return NextResponse.json(
      { error: "Query parameter is required" },
      { status: 400 }
    );
  }

  try {
    if (DUMMY_MODE) {
      const aoi = dummyAoiFromQuery(query);
      const points = dummyPointsWithin(aoi, 64);
      return NextResponse.json({
        geojson: aoi,
        points,
        matchesCount: 64,
        source: "dummy",
      });
    }
    const { aoi, points, matches } = searchByText(query);
    if (aoi) {
      return NextResponse.json({
        geojson: aoi,
        points,
        matchesCount: matches.length,
      });
    }

    // Fallback: Mapbox geocoding for general place names (e.g., "Chicago")
    const token =
      process.env.MAPBOX_ACCESS_TOKEN || process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (token) {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?limit=1&access_token=${token}`;
      const res = await fetch(url);
      if (res.ok) {
        const gj = await res.json();
        const feat = gj?.features?.[0];
        if (feat) {
          let outAoi: any = null;
          if (Array.isArray(feat.bbox) && feat.bbox.length === 4) {
            outAoi = bboxPolygon(feat.bbox);
          } else if (Array.isArray(feat.center) && feat.center.length === 2) {
            const [clng, clat] = feat.center;
            const delta = 0.05; // ~5km box
            outAoi = bboxPolygon([
              clng - delta,
              clat - delta,
              clng + delta,
              clat + delta,
            ]);
          }
          if (outAoi) {
            return NextResponse.json({
              geojson: outAoi,
              points: { type: "FeatureCollection", features: [] },
              matchesCount: 0,
              source: "geocode",
            });
          }
        }
      }
    }

    return NextResponse.json({ error: "No matching data" }, { status: 404 });
  } catch (error) {
    console.error("Local search error:", error);
    return NextResponse.json(
      { error: "Error searching local datasets" },
      { status: 500 }
    );
  }
}
