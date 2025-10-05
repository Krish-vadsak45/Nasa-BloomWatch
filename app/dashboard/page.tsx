"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { ControlPanel } from "@/components/dashboard/control-panel";
import { TimelineSlider } from "@/components/dashboard/timeline-slider";
import { BloomModal } from "@/components/dashboard/bloom-modal";
import { Feature, FeatureCollection, Point } from "geojson";
import { DateRange } from "react-day-picker";
import axios from "axios";
import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";
import center from "@turf/center";
import bboxPolygon from "@turf/bbox-polygon";
import {
  DUMMY_MODE,
  dummyChoroplethWithin,
  dummyPointsWithin,
} from "@/lib/dummy-data";

// Dynamically import the MapView component to prevent SSR issues with mapbox-gl
const MapView = dynamic(
  () => import("@/components/dashboard/map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <p className="flex h-full w-full items-center justify-center">
        Loading map...
      </p>
    ),
  }
);

// Pre-defined regions for the dropdown
const predefinedRegions = {
  "ca-almonds": {
    name: "California Central Valley",
    aoi: {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [-121.5, 37.5],
            [-119.0, 35.0],
            [-120.0, 38.0],
            [-122.5, 39.0],
            [-121.5, 37.5],
          ],
        ],
      },
    },
    dateRange: { from: new Date(2025, 1, 1), to: new Date(2025, 2, 31) },
  },
  "jp-cherries": {
    name: "Tokyo, Japan",
    aoi: {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [139.6, 35.5],
            [139.9, 35.5],
            [139.9, 35.8],
            [139.6, 35.8],
            [139.6, 35.5],
          ],
        ],
      },
    },
    dateRange: { from: new Date(2025, 2, 15), to: new Date(2025, 3, 15) },
  },
  "nl-tulips": {
    name: "Lisse, Netherlands",
    aoi: {
      type: "Feature" as const,
      properties: {},
      geometry: {
        type: "Polygon" as const,
        coordinates: [
          [
            [4.4, 52.2],
            [4.6, 52.2],
            [4.6, 52.4],
            [4.4, 52.4],
            [4.4, 52.2],
          ],
        ],
      },
    },
    dateRange: { from: new Date(2025, 3, 1), to: new Date(2025, 4, 15) },
  },
};

export default function DashboardPage() {
  const [selectedLocation, setSelectedLocation] = useState<Feature | null>(
    null
  );
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 0, 1),
    to: new Date(),
  });
  const [mapLayers, setMapLayers] = useState<{ [key: string]: boolean }>({
    sentinel: false,
    modis: false,
    heatmap: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchPoints, setSearchPoints] = useState<
    FeatureCollection<Point> | undefined
  >(undefined);
  const [ndviChoropleth, setNdviChoropleth] = useState<
    Feature | FeatureCollection | undefined
  >();
  const [bloomHeatmap, setBloomHeatmap] = useState<
    FeatureCollection<Point> | undefined
  >();

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/search?query=${encodeURIComponent(query)}`
      );
      const geojson = response.data.geojson as Feature;
      const points = response.data.points;
      setSelectedLocation(geojson);
      setSearchPoints(points);

      // Automatically analyze the center of the searched area
      if (geojson?.geometry) {
        const centerPoint = center(geojson);
        const [lng, lat] = centerPoint.geometry.coordinates;
        await handleMapClick({ lng, lat });
      }
    } catch (error) {
      // Fallback: use Mapbox forward geocoding to get coords, then center/zoom and open modal
      console.warn(
        "Primary /api/search failed; attempting Mapbox geocoding fallback",
        error
      );
      try {
        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) throw new Error("Missing NEXT_PUBLIC_MAPBOX_TOKEN");
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          query
        )}.json?limit=1&access_token=${token}`;
        const geo = await fetch(url);
        const gj = await geo.json();
        const feat = gj?.features?.[0];
        if (feat) {
          // Create an AOI from bbox if available, otherwise a small buffer around the center
          let aoi: Feature | null = null;
          if (feat.bbox && Array.isArray(feat.bbox) && feat.bbox.length === 4) {
            aoi = bboxPolygon(feat.bbox) as unknown as Feature;
          } else if (Array.isArray(feat.center) && feat.center.length === 2) {
            const [clng, clat] = feat.center;
            const delta = 0.05; // ~5km bbox
            aoi = bboxPolygon([
              clng - delta,
              clat - delta,
              clng + delta,
              clat + delta,
            ]) as unknown as Feature;
          }
          if (aoi) {
            setSelectedLocation(aoi);
            setSearchPoints(undefined);
            const [lng, lat] =
              Array.isArray(feat.center) && feat.center.length === 2
                ? feat.center
                : center(aoi).geometry.coordinates;
            await handleMapClick({ lng, lat });
          } else {
            console.warn("Geocoding return had no bbox/center for:", query);
          }
        } else {
          console.warn("No geocoding results for query:", query);
        }
      } catch (gerr) {
        console.error("Fallback geocoding failed:", gerr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
  };

  const handleLayerToggle = (layer: string, enabled: boolean) => {
    setMapLayers((prev) => ({ ...prev, [layer]: enabled }));
    // When dummy mode is ON and AOI is present, generate synthetic layers
    if (!selectedLocation) return;
    if (DUMMY_MODE) {
      if (layer === "modis") {
        if (enabled) {
          setNdviChoropleth(dummyChoroplethWithin(selectedLocation));
        } else {
          setNdviChoropleth(undefined);
        }
      }
      if (layer === "heatmap") {
        if (enabled) {
          setBloomHeatmap(dummyPointsWithin(selectedLocation, 100));
        } else {
          setBloomHeatmap(undefined);
        }
      }
    }
  };

  const handleRegionChange = (regionKey: string) => {
    const region =
      predefinedRegions[regionKey as keyof typeof predefinedRegions];
    if (region) {
      handleSearch(region.name);
      setDateRange(region.dateRange);
    }
  };

  const handleMapClick = async (coords: { lng: number; lat: number }) => {
    setIsLoading(true);
    let aoi: Feature | null = null;
    try {
      // Try to get city/region polygon first
      const r = await fetch(
        `/api/bounds?lat=${encodeURIComponent(
          coords.lat
        )}&lon=${encodeURIComponent(coords.lng)}`,
        { cache: "no-store" }
      );
      if (r.ok) {
        const data = await r.json();
        if (data?.feature?.geometry) {
          aoi = data.feature as Feature;
        }
      }
    } catch (e) {
      console.warn("City boundary fetch failed; will use rectangle", e);
    }
    // Fallback: small rectangle if no polygon found
    if (!aoi) {
      const delta = 0.03;
      aoi = bboxPolygon([
        coords.lng - delta,
        coords.lat - delta,
        coords.lng + delta,
        coords.lat + delta,
      ]) as unknown as Feature;
    }
    setSelectedLocation(aoi);
    // Refresh dummy layers for new AOI when toggles are on
    if (DUMMY_MODE) {
      if (mapLayers.modis) setNdviChoropleth(dummyChoroplethWithin(aoi));
      if (mapLayers.heatmap) setBloomHeatmap(dummyPointsWithin(aoi, 100));
    }

    try {
      const resp = await axios.post("/api/local-insights", {
        lng: coords.lng,
        lat: coords.lat,
        startDate: dateRange?.from?.toISOString(),
        endDate: dateRange?.to?.toISOString(),
      });

      const d = resp.data;
      setModalData({
        coords,
        peakBloomDate: d.peakBloomDate,
        bloomIntensity: d.bloomIntensity,
        timeSeries: (d.ndviSeries || []).map((it: any) => ({
          date: it.date,
          ndvi: it.ndvi,
          bloom_prob: it.ndvi, // simple proxy for now
        })),
        cloudSeries: d.cloudSeries,
        windSeries: d.windSeries,
        landCoverSummary: d.landCoverSummary,
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to get local insights for point:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <Navbar />
      <div className="relative flex-grow">
        <main className="w-full h-full">
          <MapView
            selectedLocation={selectedLocation}
            mapLayers={mapLayers}
            onMapClick={handleMapClick}
            ndviChoropleth={ndviChoropleth}
            bloomHeatmap={bloomHeatmap}
            searchPointsGeoJSON={searchPoints}
          />
        </main>
        <aside className="absolute top-4 left-4 z-10 w-1/4 min-w-[350px] max-w-[450px]">
          <ControlPanel
            onSearch={handleSearch}
            onDateChange={handleDateChange}
            onLayerToggle={handleLayerToggle}
            onRegionChange={handleRegionChange}
            isLoading={isLoading}
          />
        </aside>
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-1/2 px-4">
          <TimelineSlider />
        </div>
      </div>
      <BloomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        data={modalData}
      />
    </div>
  );
}
