/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/request", destination: "/intake", permanent: false },
      { source: "/request/preview-inquiry", destination: "/intake/preview-inquiry", permanent: false },
      { source: "/request/preview-order", destination: "/intake/preview-order", permanent: false },
      { source: "/request/inquiry-success", destination: "/intake/inquiry-success", permanent: false },
      { source: "/request/order-form-success", destination: "/intake/order-form-success", permanent: false },
      { source: "/request/success", destination: "/intake", permanent: false },
    ];
  },
};

module.exports = nextConfig;
