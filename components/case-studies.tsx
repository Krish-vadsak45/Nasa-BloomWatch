import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

export function CaseStudies() {
  const studies = [
    {
      title: "California Superbloom 2023 vs. 2020",
      description:
        'Record winter precipitation led to a "superbloom" so vast it was clearly visible to NASA\'s Landsat satellites.',
      image: "/california-superbloom-antelope-valley-satellite-co.jpg",
      location: "Antelope Valley, California",
      date: "March 2023",
    },
    {
      title: "Carrizo Plain Wildflower Explosion",
      description:
        "Unprecedented rainfall transformed the arid landscape into a vibrant carpet of wildflowers visible from space.",
      image: "/carrizo-plain-wildflowers-satellite-view-colorful.jpg",
      location: "Carrizo Plain, California",
      date: "April 2023",
    },
    {
      title: "Atacama Desert Bloom Event",
      description:
        "The world's driest desert experienced a rare bloom event, detected through our spectral analysis algorithms.",
      image: "/atacama-desert-flowers-bloom-satellite-purple-pink.jpg",
      location: "Atacama Desert, Chile",
      date: "October 2022",
    },
    {
      title: "Namaqualand Spring Bloom",
      description:
        "Annual spring bloom in South Africa showcases the power of seasonal vegetation index tracking.",
      image: "/namaqualand-daisies-orange-flowers-satellite-view.jpg",
      location: "Namaqualand, South Africa",
      date: "August 2023",
    },
  ];

  return (
    <section
      id="case-studies"
      className="py-24 w-full flex flex-col items-center justify-center"
    >
      <div className="w-full px-4">
        <div className="mb-16 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Blooms Visible from{" "}
            <span className="bg-gradient-to-r from-accent to-chart-3 bg-clip-text text-transparent">
              Space
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            Real-world examples of bloom events detected and analyzed by
            BloomVision
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 w-full justify-center">
          {studies.map((study, index) => (
            <Card
              key={index}
              className="group overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
            >
              <div className="relative overflow-hidden">
                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(
                    study.location.split(",")[0].trim()
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={study.image || "/placeholder.svg"}
                    alt={study.title}
                    className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                  />
                </a>
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <span className="rounded-full bg-primary/20 px-3 py-1 text-xs font-medium text-primary backdrop-blur-sm">
                    {study.location}
                  </span>
                  <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent backdrop-blur-sm">
                    {study.date}
                  </span>
                </div>
              </div>

              <CardHeader>
                <CardTitle className="text-xl">{study.title}</CardTitle>
                <CardDescription className="text-pretty">
                  {study.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <a
                  href={`https://en.wikipedia.org/wiki/${encodeURIComponent(
                    study.location.split(",")[0].trim()
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    className="group/btn w-full justify-between"
                  >
                    Learn More
                    <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
