import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Supabase Storage (업로드 이미지)
      {
        protocol: "https",
        hostname: "hemrldwsnovlpmripbuv.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // Google OAuth 프로필 이미지
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      // GitHub OAuth 프로필 이미지
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
