"use client"

import Link from "next/link"
import { Flower2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-md" />
            <Flower2 className="relative h-8 w-8 text-primary" />
          </div>
          <span className="bg-gradient-to-r from-primary via-accent to-chart-3 bg-clip-text text-transparent">
            BloomVision
          </span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Dashboard
          </Link>
          <Link
            href="#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            How It Works
          </Link>
          <Link
            href="#case-studies"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Case Studies
          </Link>
          <Link
            href="#data-sources"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Data Sources
          </Link>
        </div>

        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Link href="/dashboard">Launch Dashboard</Link>
        </Button>
      </div>
    </nav>
  )
}
