import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Comentamos output: export para usar SSR en Vercel
  // output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
