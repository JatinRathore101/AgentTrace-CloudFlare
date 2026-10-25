import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

  // Silences weird warnings about detecting multiple lockfiles
  outputFileTracingRoot: path.join(__dirname, "./"),
};

export default nextConfig;
