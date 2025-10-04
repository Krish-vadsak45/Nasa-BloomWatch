"use client";

import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { ControlPanel } from "@/components/dashboard/control-panel";
import { TimelineSlider } from "@/components/dashboard/timeline-slider";
import { BloomModal } from "@/components/dashboard/bloom-modal";
import { Feature } from "geojson";
import { DateRange } from "react-day-picker";
import axios from "axios";
import dynamic from "next/dynamic";
import "mapbox-gl/dist/mapbox-gl.css";
import center from "@turf/center";

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

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    try {
      const response = await axios.get(
        `/api/search?query=${encodeURIComponent(query)}`
      );
      const geojson = response.data.geojson as Feature;
      setSelectedLocation(geojson);

      // Automatically analyze the center of the searched area
      if (geojson && geojson.geometry) {
        const centerPoint = center(geojson);
        const [lng, lat] = centerPoint.geometry.coordinates;
        await handleMapClick({ lng, lat });
      }
    } catch (error) {
      console.error("Search failed:", error);
      // You might want to show a toast notification here
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (newDateRange: DateRange | undefined) => {
    setDateRange(newDateRange);
  };

  const handleLayerToggle = (layer: string, enabled: boolean) => {
    setMapLayers((prev) => ({ ...prev, [layer]: enabled }));
    // Here you would trigger data fetching for the layer if it's enabled
    // For example: if (layer === 'sentinel' && enabled) fetchSentinelData();
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
    // For a map click, we create a small AOI around the point
    const pointGeoJSON: Feature = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "Point",
        coordinates: [coords.lng, coords.lat],
      },
    };

    setIsLoading(true);
    try {
      // 1. Fetch NDVI data for the point
      const ndviResponse = await axios.post("/api/landsat", {
        aoi: pointGeoJSON,
        startDate: dateRange?.from?.toISOString(),
        endDate: dateRange?.to?.toISOString(),
      });

      // 2. Run bloom detection on the NDVI data
      const bloomResponse = await axios.post("/api/bloom-detect", {
        ndviSeries: ndviResponse.data.ndviSeries,
      });

      setModalData({
        coords,
        ...bloomResponse.data,
      });
      setIsModalOpen(true);
    } catch (error) {
      console.error("Failed to get bloom data for point:", error);
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
