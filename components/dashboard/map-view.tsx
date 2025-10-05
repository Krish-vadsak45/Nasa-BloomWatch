"use client";

import { useEffect, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  FullscreenControl,
} from "react-map-gl/mapbox";
import type { ViewStateChangeEvent, MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { Feature, FeatureCollection, Point } from "geojson";
import { BloomModal } from "./bloom-modal";
import bbox from "@turf/bbox";

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
  readonly ndviChoropleth?: Feature | FeatureCollection;
  readonly bloomHeatmap?: FeatureCollection<Point>;
  readonly searchPointsGeoJSON?: FeatureCollection<Point>;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function MapView({
  selectedLocation,
  mapLayers,
  onMapClick,
  sentinelTileUrl,
  ndviChoropleth,
  bloomHeatmap,
  searchPointsGeoJSON,
}: MapViewProps) {
  const [viewState, setViewState] = useState({
    longitude: -100,
    latitude: 40,
    zoom: 3,
  });

  const mapRef = useRef<MapRef | null>(null);

  const [selectedBloom, setSelectedBloom] = useState<BloomData | null>(null);

  const handleMapClick = (event: any) => {
    // event.lngLat is available on mapbox-gl events
    if (event?.lngLat) {
      onMapClick({ lng: event.lngLat.lng, lat: event.lngLat.lat });
    }
  };

  // Fit map to selected AOI when it changes
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      try {
        const b = bbox(selectedLocation) as [number, number, number, number];
        const [[minLng, minLat], [maxLng, maxLat]] = [
          [b[0], b[1]],
          [b[2], b[3]],
        ];
        mapRef.current.fitBounds(
          [
            [minLng, minLat],
            [maxLng, maxLat],
          ],
          { padding: 60, duration: 1000 }
        );
      } catch (e) {
        console.warn("Failed to fit bounds for AOI", e);
      }
    }
  }, [selectedLocation]);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden">
      <Map
        ref={mapRef}
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

        {/* Search result points */}
        {searchPointsGeoJSON && searchPointsGeoJSON.features.length > 0 && (
          <Source id="search-points" type="geojson" data={searchPointsGeoJSON}>
            <Layer
              id="search-points-layer"
              type="circle"
              paint={{
                "circle-radius": 5,
                "circle-color": "#00e5ff",
                "circle-opacity": 0.9,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#00151a",
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
