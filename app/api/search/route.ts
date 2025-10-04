import { NextResponse } from "next/server";
import axios from "axios";

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
    const response = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: query,
          format: "json",
          polygon_geojson: 1,
          limit: 1,
        },
        headers: {
          "User-Agent": "BloomVision/1.0 (https://github.com/your-repo)",
        },
      }
    );

    if (response.data.length === 0) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const result = response.data[0];
    const geojson = result.geojson;

    return NextResponse.json({ geojson });
  } catch (error) {
    console.error("Nominatim API error:", error);
    return NextResponse.json(
      { error: "Error fetching data from OpenStreetMap Nominatim API" },
      { status: 500 }
    );
  }
}
