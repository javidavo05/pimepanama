"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function AdminClientShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs uppercase tracking-[0.4em] text-white/30">
        Initializing console…
      </div>
    );
  }

  return <>{children}</>;
}

