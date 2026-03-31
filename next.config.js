/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.r2.dev" },
      { protocol: "https", hostname: "**.cloudflarestorage.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "k.kakaocdn.net" },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to pages only, NOT to API routes
        source: "/((?!api).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' js.tosspayments.com accounts.google.com kauth.kakao.com",
              "style-src 'self' 'unsafe-inline' cdn.jsdelivr.net",
              "connect-src 'self' blob: data: api.tosspayments.com accounts.google.com *.googleapis.com kauth.kakao.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: cdn.jsdelivr.net",
              "frame-src 'self' blob: data: js.tosspayments.com accounts.google.com kauth.kakao.com",
              "object-src 'self' blob:",
              "worker-src 'self' blob:",
              "media-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
