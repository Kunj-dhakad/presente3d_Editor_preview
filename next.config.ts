import type { NextConfig } from "next";
import { lanHostnames } from "./modules/shared/server/origins";

const nextConfig: NextConfig = {
  // Let `next dev` be opened from this machine's Network URL (http://192.168.x.x:3000).
  allowedDevOrigins: lanHostnames(),
  // Keep the PDF parser's worker and native Node dependencies resolvable.
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    // lucide-react and react-icons are already in Next's default list; these
    // are not, and they're imported across many components.
    optimizePackageImports: [
      "@fortawesome/free-solid-svg-icons",
      "@fortawesome/react-fontawesome",
      "@dnd-kit/core",
      "@dnd-kit/sortable",
      "@dnd-kit/modifiers",
    ],
  },

  images: {
    // Authenticated media routes require the browser's session cookie.
    unoptimized: true,
    // `domains` has been deprecated since Next 13.
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
      // Published books are meant to be embedded anywhere (the publish page
      // hands out an <iframe> snippet), so the reader may be framed by any site.
      {
        source: "/read/:path*",
        headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        // Everything else keeps the allow-list below.
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
