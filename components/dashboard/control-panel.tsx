"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Define the types for the props
interface ControlPanelProps {
  onSearch: (query: string) => void;
  onDateChange: (dateRange: DateRange | undefined) => void;
  onLayerToggle: (layer: string, enabled: boolean) => void;
  onRegionChange: (region: string) => void;
  isLoading: boolean;
}

export function ControlPanel({
  onSearch,
  onDateChange,
  onLayerToggle,
  onRegionChange,
  isLoading,
}: ControlPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState<DateRange | undefined>({
    from: new Date(2025, 0, 1),
    to: new Date(),
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery) {
      onSearch(searchQuery);
    }
  };

  const handleDateChange = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onDateChange(newDate);
  };

  return (
    <div className="flex flex-col space-y-6 p-6 bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-700 h-full">
      <h2 className="text-2xl font-bold text-gray-100">BloomVision Controls</h2>

      {/* Search Section */}
      <form onSubmit={handleSearch} className="space-y-2">
        <Label htmlFor="search" className="text-gray-300">
          Location Search
        </Label>
        <div className="flex space-x-2">
          <Input
            id="search"
            placeholder="e.g., Carrizo Plain, CA"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "..." : "Search"}
          </Button>
        </div>
      </form>

      {/* Date Picker Section */}
      <div className="space-y-2">
        <Label className="text-gray-300">Date Range</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn(
                "w-full justify-start text-left font-normal bg-gray-800 border-gray-600 hover:bg-gray-700 text-white",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd, y")} -{" "}
                    {format(date.to, "LLL dd, y")}
                  </>
                ) : (
                  format(date.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={handleDateChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Layer Toggles Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-200">Map Layers</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="sentinel-toggle" className="text-gray-300">
            True Color (Sentinel)
          </Label>
          <Switch
            id="sentinel-toggle"
            onCheckedChange={(checked) => onLayerToggle("sentinel", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="modis-toggle" className="text-gray-300">
            NDVI (MODIS)
          </Label>
          <Switch
            id="modis-toggle"
            onCheckedChange={(checked) => onLayerToggle("modis", checked)}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="heatmap-toggle" className="text-gray-300">
            Bloom Heatmap
          </Label>
          <Switch
            id="heatmap-toggle"
            onCheckedChange={(checked) => onLayerToggle("heatmap", checked)}
          />
        </div>
      </div>

      {/* Region-Specific Analysis Section */}
      <div className="space-y-2">
        <Label htmlFor="region-select" className="text-gray-300">
          Region-Specific Analysis
        </Label>
        <Select onValueChange={onRegionChange}>
          <SelectTrigger
            id="region-select"
            className="bg-gray-800 border-gray-600 text-white"
          >
            <SelectValue placeholder="Select a region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ca-almonds">California Almonds</SelectItem>
            <SelectItem value="jp-cherries">Japan Cherry Blossoms</SelectItem>
            <SelectItem value="nl-tulips">Netherlands Tulips</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
