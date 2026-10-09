import type { NextConfig } from "next";
import { CASES_V } from "./content/cases-version";

const nextConfig: NextConfig = {
  images: { localPatterns: [{ pathname: "/cases/**", search: `?v=${CASES_V}` }, { pathname: "/**", search: "" }] },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: { inlineCss: true },
  async redirects() {
    return [{ source: "/", destination: "/es", permanent: false }];
  },
};

export default nextConfig;
