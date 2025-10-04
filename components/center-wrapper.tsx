"use client";

import { usePathname } from "next/navigation";
import React from "react";

export function CenterWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";

  // Keep dashboard (and any nested dashboard routes) full-bleed
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard) return <>{children}</>;

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center">
      <div className="w-full px-1 sm:px-2 lg:px-4">
        <div className="flex min-h-screen w-full flex-col items-center justify-center gap-8 py-12">
          {children}
        </div>
      </div>
    </div>
  );
}
