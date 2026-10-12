import type { NextConfig } from "next";
import { lanHostnames } from "./modules/shared/server/origins";

const nextConfig: NextConfig = {
  // A build can be sent elsewhere so it does not disturb a dev server already running.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: lanHostnames(),
  serverExternalPackages: ["pdf-parse"],
  experimental: {

    optimizePackageImports: [
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/react-fontawesome",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/modifiers",
    ],
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.pexels.com" },
      { protocol: "https", hostname: "kd-presentation-editor.s3.us-east-1.amazonaws.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "cdn.prezentaai.com" },
      { protocol: "https", hostname: "cdn.kidsemapireai.com" },
      { protocol: "https", hostname: "cdn.prezentiq.com" },
      { protocol: "https", hostname: "cdn.demostackai.com" },
      { protocol: "https", hostname: "cdn.clawbooksai.com" },
      { protocol: "https", hostname: "cdn.publishclawai.com" },
    ],
  },

  async headers() {
    return [
      
      {
        source: "/read/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/((?!read/).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
            frame-ancestors 'self'
            https://*.prezentaai.com
            http://127.0.0.1:5500
            https://*.kidsemapireai.com
            https://*.prezentiq.com
            https://*.demostackai.com
            https://*.clawbooksai.com
            https://*.publishclawai.com
          `.replace(/\s+/g, " ").trim(),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
