import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      type: "asset/source",
    });
    return config;
  },
  turbopack: {
    rules: {
      "*.md": {
        loaders: [require.resolve("./loaders/raw-loader.cjs")],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
