/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  transpilePackages: ['@deck.gl/core', '@deck.gl/layers', '@deck.gl/react', '@deck.gl/mesh-layers'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      'mapbox-gl': 'maplibre-gl'
    };
    return config;
  }
};

module.exports = nextConfig;
