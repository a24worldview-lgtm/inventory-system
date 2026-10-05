import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ホームフォルダにも package-lock.json があり、Next.js がそちらをプロジェクトの場所と誤認して
  // 古いCSSを配信していたため、このフォルダをプロジェクトの場所として明示する
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
