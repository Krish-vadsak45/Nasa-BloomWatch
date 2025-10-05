"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";

interface BloomModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly data: {
    readonly coords: { lng: number; lat: number };
    readonly peakBloomDate: string | null;
    readonly bloomIntensity: number;
    readonly timeSeries: { date: string; ndvi: number; bloom_prob: number }[];
    readonly cloudSeries?: { date: string; value: number }[];
    readonly windSeries?: { date: string; value: number }[];
    readonly landCoverSummary?: { label: string; count: number }[];
  } | null;
}

export function BloomModal({ isOpen, onClose, data }: BloomModalProps) {
  if (!data) return null;

  const {
    coords,
    peakBloomDate,
    bloomIntensity,
    timeSeries,
    cloudSeries,
    windSeries,
    landCoverSummary,
  } = data;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900/80 backdrop-blur-md border-gray-700 text-white max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-cyan-400">
              Bloom Analysis
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Coordinates: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400">
                Peak Bloom Date
              </h4>
              <p className="text-xl font-semibold text-white">
                {peakBloomDate
                  ? new Date(peakBloomDate).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
            <div className="p-4 bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium text-gray-400">
                Bloom Intensity
              </h4>
              <p className="text-xl font-semibold text-white">
                {bloomIntensity.toFixed(2)} / 1.00
              </p>
            </div>
          </div>
          {/* Quick environmental context */}
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-gray-800 rounded-lg">
              <h4 className="text-xs font-medium text-gray-400">
                Avg Cloudiness
              </h4>
              <p className="text-lg font-semibold text-white">
                {cloudSeries?.length
                  ? `${(
                      cloudSeries.reduce((a, b) => a + b.value, 0) /
                      cloudSeries.length
                    ).toFixed(2)}`
                  : "-"}
              </p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <h4 className="text-xs font-medium text-gray-400">Avg Wind</h4>
              <p className="text-lg font-semibold text-white">
                {windSeries?.length
                  ? `${(
                      windSeries.reduce((a, b) => a + b.value, 0) /
                      windSeries.length
                    ).toFixed(2)} m/s`
                  : "-"}
              </p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <h4 className="text-xs font-medium text-gray-400">
                Top Land Cover
              </h4>
              <p className="text-sm font-semibold text-white">
                {landCoverSummary?.length ? landCoverSummary[0].label : "-"}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <h4 className="text-lg font-semibold mb-2 text-center text-gray-300">
              Analysis Trend
            </h4>
            <div style={{ width: "100%", height: 250 }}>
              <ResponsiveContainer>
                <LineChart data={timeSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                  <XAxis
                    dataKey="date"
                    stroke="#A0AEC0"
                    tickFormatter={(str) =>
                      new Date(str).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    }
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#8884d8"
                    domain={[0, 1]}
                    label={{
                      value: "NDVI",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#8884d8",
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#82ca9d"
                    domain={[0, 1]}
                    label={{
                      value: "Bloom Prob.",
                      angle: 90,
                      position: "insideRight",
                      fill: "#82ca9d",
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1A202C",
                      borderColor: "#4A5568",
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="ndvi"
                    stroke="#8884d8"
                    name="NDVI"
                    dot={false}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="bloom_prob"
                    stroke="#82ca9d"
                    name="Bloom Probability"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
