/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
