"use client";

import type { ReactNode } from "react";

export default function AdminClientShell({ children }: { children: ReactNode }) {
  return (
    <div suppressHydrationWarning>{children}</div>
  );
}

