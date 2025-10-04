"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { Play, Pause } from "lucide-react"

export function TimelineSlider() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [timeValue, setTimeValue] = useState([3])

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]

  return (
    <Card className="border-border/50 bg-card/50 p-6 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Timeline</h3>
          <p className="text-xs text-muted-foreground">
            Viewing: <span className="font-medium text-foreground">{months[timeValue[0]]}</span> 2024
          </p>
        </div>
        <Button size="icon" variant="outline" onClick={() => setIsPlaying(!isPlaying)} className="h-10 w-10">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-2">
        <Slider value={timeValue} onValueChange={setTimeValue} max={5} step={1} className="w-full" />
        <div className="flex justify-between text-xs text-muted-foreground">
          {months.map((month, i) => (
            <span key={i} className={timeValue[0] === i ? "font-medium text-primary" : ""}>
              {month}
            </span>
          ))}
        </div>
      </div>
    </Card>
  )
}
