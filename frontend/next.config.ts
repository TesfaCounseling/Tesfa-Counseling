const DAILY = "https://*.daily.co";
const DAILY_WSS = "wss://*.daily.co";
const RENDER_API = "https://tesfa-counseling.onrender.com";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${DAILY}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${RENDER_API} ${DAILY}`,
  "font-src 'self' data:",
  `connect-src 'self' ${RENDER_API} ${DAILY} ${DAILY_WSS}`,
  `media-src 'self' blob: ${DAILY}`,
  "worker-src 'self' blob:",
  `frame-src 'self' ${DAILY}`,
].join("; ");

const PERMISSIONS_POLICY = [
  "accelerometer=()",
  `autoplay=(self "${DAILY}")`,
  `camera=(self "${DAILY}")`,
  `display-capture=(self "${DAILY}")`,
  "encrypted-media=()",
  `fullscreen=(self "${DAILY}")`,
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  `microphone=(self "${DAILY}")`,
  "midi=()",
  "payment=()",
  `picture-in-picture=(self "${DAILY}")`,
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "sync-xhr=()",
  "usb=()",
  "xr-spatial-tracking=()",
  "interest-cohort=()",
].join(", ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      { source: "/", headers: SECURITY_HEADERS },
      { source: "/:path*", headers: SECURITY_HEADERS },
    ];
  },
  async rewrites() {
    // Production/previews use Netlify [[redirects]] /api/* → Render.
    if (process.env.NETLIFY === "true") {
      return [];
    }
    const apiOrigin = process.env.API_PROXY_TARGET || "http://127.0.0.1:5050";
    return [{ source: "/api/:path*", destination: `${apiOrigin}/api/:path*` }];
  },
};

export default nextConfig;
