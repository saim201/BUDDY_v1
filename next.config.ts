import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // `next dev` blocks cross-origin requests to dev-only assets, which breaks HMR
  // and the dev overlay when the app is reached through a tunnel instead of localhost.
  allowedDevOrigins: [
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.dev",
    "*.ngrok.io",
  ],
};

export default nextConfig;
