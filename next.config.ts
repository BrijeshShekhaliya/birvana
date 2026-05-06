import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

function getAllowedDevOrigins() {
  const hosts = new Set(["localhost", "127.0.0.1"]);
  const interfaces = networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.internal || entry.family !== "IPv4") {
        continue;
      }

      hosts.add(entry.address);
    }
  }

  return [...hosts].flatMap((host) => [host, `${host}:3000`]);
}

const nextConfig: NextConfig = {
  allowedDevOrigins: getAllowedDevOrigins(),
  async headers() {
    return [
      {
        source: "/birvana-media-cache.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
