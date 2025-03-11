/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        domains: ['maps.googleapis.com'],
    },
    // Configure environment variables that should be available on the client
    env: {
        MAPLIBRE_STYLE_URL: process.env.MAPLIBRE_STYLE_URL,
    },
}

module.exports = nextConfig
