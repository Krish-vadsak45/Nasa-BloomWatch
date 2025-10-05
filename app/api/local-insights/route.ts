import { NextResponse } from "next/server";
import { getLocalInsights } from "@/lib/local-data";

export async function POST(request: Request) {
  try {
    const { lng, lat, startDate, endDate } = await request.json();
    if (typeof lng !== "number" || typeof lat !== "number") {
      return NextResponse.json(
        { error: "lng and lat are required" },
        { status: 400 }
      );
    }

    const insights = getLocalInsights(lng, lat, startDate, endDate);

    // Heuristic peak bloom: pick max NDVI date if present
    let peakBloomDate: string | null = null;
    let bloomIntensity = 0;
    if (insights.ndviSeries.length > 0) {
      const max = insights.ndviSeries.reduce(
        (a, b) => (b.ndvi > a.ndvi ? b : a),
        insights.ndviSeries[0]
      );
      peakBloomDate = max.date;
      bloomIntensity = max.ndvi; // 0..1 already
    }

    return NextResponse.json({
      coords: { lng, lat },
      peakBloomDate,
      bloomIntensity,
      ndviSeries: insights.ndviSeries,
      cloudSeries: insights.cloudSeries,
      windSeries: insights.windSeries,
      landCoverSummary: insights.landCoverSummary,
    });
  } catch (e) {
    console.error("local-insights error", e);
    return NextResponse.json(
      { error: "Failed to compute local insights" },
      { status: 500 }
    );
  }
}
