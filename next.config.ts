import type { NextConfig } from "next";
import { lanHostnames } from "./modules/shared/server/origins";


const frameAncestors = [
  "'self'",
  "https://present3d.com", "https://*.present3d.com",
  ...(process.env.FRAME_ANCESTORS || "").split(/\s+/).filter(Boolean),
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:*", "http://127.0.0.1:*"] : []),
];

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  allowedDevOrigins: lanHostnames(),
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
      { protocol: "https", hostname: "cdn.pitchoraai.com" },
      { protocol: "https", hostname: "cdn.present3d.com" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${frameAncestors.join(" ")}` }],
      },
    ];
  },
};

export default nextConfig;
