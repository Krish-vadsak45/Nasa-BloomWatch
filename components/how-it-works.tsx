import { Satellite, TrendingUp, MapPin } from "lucide-react"
import { Card } from "@/components/ui/card"

export function HowItWorks() {
  const steps = [
    {
      icon: Satellite,
      title: "Aggregate Data",
      description: "We process near real-time imagery from NASA's Landsat, MODIS, and VIIRS satellites.",
      color: "text-primary",
    },
    {
      icon: TrendingUp,
      title: "Detect Blooms",
      description:
        "Our algorithms analyze spectral signatures and time-series data to identify the unique fingerprint of a blooming event.",
      color: "text-accent",
    },
    {
      icon: MapPin,
      title: "Provide Insights",
      description:
        "We visualize this data on an interactive map, providing actionable insights for agriculture, conservation, and public health.",
      color: "text-chart-3",
    },
  ]

  return (
    <section id="how-it-works" className="py-24 w-full flex flex-col items-center justify-center">
      <div className="w-full px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            From Pixels to{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">Petals</span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            Our advanced pipeline transforms satellite data into actionable bloom intelligence
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <Card
              key={index}
              className="group relative overflow-hidden border-border/50 bg-card/50 p-8 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="absolute right-4 top-4 text-6xl font-bold text-muted/10">
                {String(index + 1).padStart(2, "0")}
              </div>

              <div className={`mb-6 inline-flex rounded-lg bg-secondary p-3 ${step.color}`}>
                <step.icon className="h-8 w-8" />
              </div>

              <h3 className="mb-3 text-xl font-bold">{step.title}</h3>
              <p className="text-pretty text-muted-foreground">{step.description}</p>

              <div className="mt-6 h-1 w-0 bg-gradient-to-r from-primary to-accent transition-all duration-500 group-hover:w-full" />
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
