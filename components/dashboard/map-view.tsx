"use client";

import { useState } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  FullscreenControl,
} from "react-map-gl/mapbox";
import type { ViewStateChangeEvent } from "react-map-gl/mapbox";
import type { MapMouseEvent } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Feature } from "geojson";
import { BloomModal } from "./bloom-modal";

type BloomData = {
  coords: { lng: number; lat: number };
  peakDate: string | null;
  intensity: number;
  ndviSeries: { date: string; ndvi: number }[];
};

// Define the types for the props
interface MapViewProps {
  readonly selectedLocation: Feature | null;
  readonly mapLayers: { [key: string]: boolean };
  readonly onMapClick: (coords: { lng: number; lat: number }) => void;
  readonly sentinelTileUrl?: string;
  readonly ndviChoropleth?: Feature;
  readonly bloomHeatmap?: Feature;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function MapView({
  selectedLocation,
  mapLayers,
  onMapClick,
  sentinelTileUrl,
  ndviChoropleth,
  bloomHeatmap,
}: MapViewProps) {
  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 3,
  });

  const [selectedBloom, setSelectedBloom] = useState<BloomData | null>(null);

  const handleMapClick = (event: any) => {
    // event.lngLat is available on mapbox-gl events
    if (event && event.lngLat) {
      onMapClick({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    }
  };

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <Map
        initialViewState={viewState}
        onMove={(evt: ViewStateChangeEvent) => setViewState(evt.viewState)}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleMapClick}
      >
        <NavigationControl />
        <FullscreenControl />

        {/* AOI Layer */}
        {selectedLocation && (
          <Source id="aoi-source" type="geojson" data={selectedLocation}>
            <Layer
              id="aoi-fill"
              type="fill"
              paint={{
                "fill-color": "#088",
                "fill-opacity": 0.2,
              }}
            />
            <Layer
              id="aoi-outline"
              type="line"
              paint={{
                "line-color": "#0dd",
                "line-width": 2,
              }}
            />
          </Source>
        )}

        {/* Sentinel Raster Layer */}
        {mapLayers.sentinel && sentinelTileUrl && (
          <Source
            id="sentinel-source"
            type="raster"
            tiles={[sentinelTileUrl]}
            tileSize={256}
          >
            <Layer
              id="sentinel-layer"
              type="raster"
              paint={{ "raster-opacity": 0.85 }}
            />
          </Source>
        )}

        {/* NDVI Choropleth Layer */}
        {mapLayers.modis && ndviChoropleth && (
          <Source id="ndvi-source" type="geojson" data={ndviChoropleth}>
            <Layer
              id="ndvi-layer"
              type="fill"
              paint={{
                "fill-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "ndvi"],
                  0,
                  "#d73027",
                  0.2,
                  "#fc8d59",
                  0.4,
                  "#fee08b",
                  0.6,
                  "#d9ef8b",
                  0.8,
                  "#91cf60",
                  1,
                  "#1a9850",
                ],
                "fill-opacity": 0.6,
              }}
            />
          </Source>
        )}

        {/* Bloom Heatmap Layer */}
        {mapLayers.heatmap && bloomHeatmap && (
          <Source id="heatmap-source" type="geojson" data={bloomHeatmap}>
            <Layer
              id="heatmap-layer"
              type="circle"
              paint={{
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["get", "intensity"],
                  0,
                  2,
                  5,
                  8,
                  10,
                  15,
                ],
                "circle-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "intensity"],
                  0,
                  "rgba(254,224,139,0.2)",
                  2.5,
                  "#fee08b",
                  5,
                  "#fc8d59",
                  7.5,
                  "#d73027",
                  10,
                  "#b30000",
                ],
                "circle-opacity": 0.8,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#fff",
              }}
            />
          </Source>
        )}
      </Map>

      {/* Bloom Detail Modal */}
      <BloomModal
        isOpen={!!selectedBloom}
        onClose={() => setSelectedBloom(null)}
        data={
          selectedBloom
            ? {
                coords: selectedBloom.coords,
                peakBloomDate: selectedBloom.peakDate,
                bloomIntensity: selectedBloom.intensity,
                timeSeries: selectedBloom.ndviSeries.map((item) => ({
                  date: item.date,
                  ndvi: item.ndvi,
                  bloom_prob: 0, // Provide a default or computed value for bloom_prob
                })),
              }
            : null
        }
      />
    </div>
  );
}
