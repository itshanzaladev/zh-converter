import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the "N" dev-tools badge in the corner. Compile and runtime errors still show.
  devIndicators: false,
};

export default nextConfig;
