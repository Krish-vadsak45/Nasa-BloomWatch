import { NextResponse } from "next/server";

interface NdviDataPoint {
  date: string;
  ndvi: number;
}

interface BloomDetectRequestBody {
  ndviSeries: NdviDataPoint[];
}

const SPIKE_THRESHOLD = 0.1; // NDVI increase threshold
const MOVING_AVERAGE_WINDOW = 2; // Number of data points to average

export async function POST(request: Request) {
  try {
    const { ndviSeries }: BloomDetectRequestBody = await request.json();

    if (!ndviSeries || ndviSeries.length < MOVING_AVERAGE_WINDOW) {
      return NextResponse.json(
        { error: "Insufficient NDVI data provided" },
        { status: 400 }
      );
    }

    // 1. Data Smoothing (Simple Moving Average)
    const smoothedSeries: NdviDataPoint[] = [];
    for (let i = 0; i <= ndviSeries.length - MOVING_AVERAGE_WINDOW; i++) {
      const window = ndviSeries.slice(i, i + MOVING_AVERAGE_WINDOW);
      const sum = window.reduce((acc, val) => acc + val.ndvi, 0);
      smoothedSeries.push({
        date: ndviSeries[i + MOVING_AVERAGE_WINDOW - 1].date,
        ndvi: sum / MOVING_AVERAGE_WINDOW,
      });
    }

    // 2. Spike Detection
    let peakDate: string | null = null;
    let maxSpike = 0;

    for (let i = 1; i < smoothedSeries.length; i++) {
      const spike = smoothedSeries[i].ndvi - smoothedSeries[i - 1].ndvi;
      if (spike > SPIKE_THRESHOLD && spike > maxSpike) {
        maxSpike = spike;
        peakDate = smoothedSeries[i].date;
      }
    }

    // 3. Intensity Scoring
    // Scale the intensity based on the magnitude of the largest detected spike.
    const bloomIntensity = Math.min(maxSpike / (SPIKE_THRESHOLD * 2), 1.0);

    // 4. Generate Time Series with Bloom Probability
    const timeSeries = ndviSeries.map((point, i) => {
      let bloom_prob = 0;
      if (i > 0) {
        const increase = point.ndvi - ndviSeries[i - 1].ndvi;
        if (increase > 0) {
          bloom_prob = Math.min(increase / SPIKE_THRESHOLD, 1.0);
        }
      }
      return { ...point, bloom_prob };
    });

    return NextResponse.json({
      peakBloomDate: peakDate,
      bloomIntensity,
      timeSeries,
    });
  } catch (error) {
    console.error("Bloom detection error:", error);
    return NextResponse.json(
      { error: "Error analyzing NDVI data" },
      { status: 500 }
    );
  }
}
