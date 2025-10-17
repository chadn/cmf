/** @type {import('next').NextConfig} */
const nextConfig = {
    // allowedDevOrigins
    reactStrictMode: true, // set to false to more closely imitate production
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'maps.googleapis.com',
            },
        ],
    },
    // Configure environment variables that should be available on the client
    env: {
        MAPLIBRE_STYLE_URL: process.env.MAPLIBRE_STYLE_URL,
        DEBUG_LOGIC: process.env.DEBUG_LOGIC,
        GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA,
    },
    // Add webpack configuration to alias mapbox-gl to maplibre-gl
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            'mapbox-gl': 'maplibre-gl',
        }
        return config
    },
}

module.exports = nextConfig
