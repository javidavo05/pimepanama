"use client";

import { motion, useSpring } from "framer-motion";
import { useScrollProgress } from "@/hooks/useScrollProgress";

export function ScrollProgressBar() {
  const progress = useScrollProgress();
  const smoothProgress = useSpring(progress, { stiffness: 200, damping: 40 });

  return (
    <div className="fixed left-0 top-0 z-[60] h-[2px] w-full">
      <motion.div
        className="h-full origin-left"
        style={{
          scaleX: smoothProgress,
          background: "linear-gradient(to right, #4F46E5, #2563EB, #0EA5E9)",
        }}
      />
    </div>
  );
}
