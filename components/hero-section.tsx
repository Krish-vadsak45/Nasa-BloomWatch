import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";

export function HeroSection() {
  return (
    <section className="relative min-h-[90vh] w-full overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="/california-superbloom-satellite-view-vibrant-flowe.jpg"
          alt="California Superbloom from Space"
          className="h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
      </div>

      {/* Animated Grid Overlay */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="h-full w-full bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex w-full flex-col items-center justify-center text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm">
          <Sparkles className="h-4 w-4" />
          NASA Space Apps Challenge 2024
        </div>

        <h1 className="mb-6 max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
          Witness the{" "}
          <span className="bg-gradient-to-r from-primary via-accent to-chart-3 bg-clip-text text-transparent">
            Planet's Pulse
          </span>
        </h1>
        <p className="mb-10 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl">
          Using NASA Earth observation data to visualize and predict plant
          blooming events across the globe
        </p>

        <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/dashboard">
              Launch the Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="#how-it-works">Learn More</Link>
          </Button>
        </div>

        {/* Floating Stats */}
        <div className="mt-16 px-44 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-border/50 bg-card/50 p-6 backdrop-blur-sm text-center">
            <div className="text-3xl font-bold text-primary">3+</div>
            <div className="text-sm text-muted-foreground">NASA Satellites</div>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-6 backdrop-blur-sm text-center">
            <div className="text-3xl font-bold text-accent">Real-time</div>
            <div className="text-sm text-muted-foreground">Data Processing</div>
          </div>
          <div className="rounded-lg border border-border/50 bg-card/50 p-6 backdrop-blur-sm text-center">
            <div className="text-3xl font-bold text-chart-3">Global</div>
            <div className="text-sm text-muted-foreground">Coverage</div>
          </div>
        </div>
      </div>
    </section>
  );
}
