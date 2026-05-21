/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com"
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push(({ request }, callback) => {
        if (request === "firebase" || request?.startsWith("firebase/") || request?.startsWith("@firebase/")) {
          return callback(null, `commonjs ${request}`);
        }

        return callback();
      });
    }

    return config;
  }
};

export default nextConfig;
