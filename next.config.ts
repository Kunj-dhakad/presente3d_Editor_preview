import type { NextConfig } from "next";
import { lanHostnames } from "./modules/shared/server/origins";

/**
 * Pages that may put this app in an iframe: the PHP app's domains. Add more
 * with FRAME_ANCESTORS (space separated). In development a PHP app on
 * localhost (XAMPP, `php -S`) may frame it too.
 */
const frameAncestors = [
  "'self'",
  "https://pitchoraai.com", "https://*.pitchoraai.com",
  "https://*.prezentaai.com",
  "https://*.kidsemapireai.com",
  "https://*.prezentiq.com",
  "https://*.demostackai.com",
  "https://*.clawbooksai.com",
  "https://*.publishclawai.com",
  ...(process.env.FRAME_ANCESTORS || "").split(/\s+/).filter(Boolean),
  ...(process.env.NODE_ENV !== "production" ? ["http://localhost:*", "http://127.0.0.1:*"] : []),
];

const nextConfig: NextConfig = {
  // A build can be sent elsewhere so it does not disturb a dev server already running.
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
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: `frame-ancestors ${frameAncestors.join(" ")}` }],
      },
    ];
  },
};

export default nextConfig;
