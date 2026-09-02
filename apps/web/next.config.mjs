/** @type {import('next').NextConfig} */

// Content-Security-Policy tuned for this app:
// - Next.js injects inline bootstrap/hydration scripts and Tailwind emits inline
//   styles, so 'unsafe-inline' is required for script-src/style-src (Next 14 has
//   no built-in nonce for the app router without a custom server).
// - The only network dependency is the same-origin 8004scan proxy; the browser
//   never talks to 8004scan.io directly, so connect-src stays 'self'.
// - Dev only: Next's react-refresh/HMR runtime evaluates strings, so dev needs
//   'unsafe-eval' in script-src or the client bundle never initializes (pages
//   stay frozen on their server-rendered shell). Production stays strict.
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "off" },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
