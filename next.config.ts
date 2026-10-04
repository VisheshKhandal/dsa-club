import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: { serverActions: { bodySizeLimit: "2mb" } },
  serverExternalPackages: ["mongoose", "bcrypt"],
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  async redirects() {
    return [
      { source: "/profile", destination: "/account", permanent: false },
    ];
  },
};

export default nextConfig;
