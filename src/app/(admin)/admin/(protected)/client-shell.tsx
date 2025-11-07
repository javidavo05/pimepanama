"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function AdminClientShell({ children }: { children: ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs uppercase tracking-[0.4em] text-white/30">
        Initializing console…
      </div>
    );
  }

  return <>{children}</>;
}

