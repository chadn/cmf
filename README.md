# Calendar Map Filter (CMF)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A visualization tool that displays calendar events on both an interactive map and a filterable list, allowing users to spatially browse and filter events based on geographic location.

## 🚀 Features

-   **Interactive Map**: View events as markers on a map with MapLibre GL JS
-   **Filterable Event List**: Sort and filter events by name, date, and location
-   **Calendar Integration**: Connect to Google Calendar (with support for Microsoft Outlook and Apple Calendar planned)
-   **Geocoding**: Automatically resolve location text to map coordinates
-   **Responsive Design**: Optimized for both desktop and mobile devices

## 🔗 Tech Stack

-   [Next.js](https://nextjs.org/) - React framework with SSR
-   [React](https://reactjs.org/) - UI library
-   [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
-   [MapLibre GL JS](https://maplibre.org/) - Open-source maps
-   [SWR](https://swr.vercel.app/) - Data fetching and caching
-   [Upstash Redis](https://upstash.com/) - Serverless Redis for caching

## 📋 Prerequisites

-   Node.js 18.x or higher
-   Google Calendar API key
-   Google Maps Geocoding API key

## 🔧 Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/cmf.git
cd cmf

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys
```

## ⚙️ Configuration

Create a `.env.local` file based on (.env.example)[.env.example] and add your API keys.

```
GOOGLE_CALENDAR_API_KEY=your_calendar_api_key
GOOGLE_MAPS_API_KEY=your_maps_api_key
UPSTASH_REDIS_REST_URL=your_upstash_url  # Optional for production
UPSTASH_REDIS_REST_TOKEN=your_upstash_token  # Optional for production
```

## 🖥️ Usage

```bash
# Development
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

Access the application at `http://localhost:3000/?gc=your_calendar_id` where `your_calendar_id` is a Google Calendar ID.

## 🚀 Deployment

This application is optimized for deployment on Vercel:

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel
```

For production deployment with caching, set up Upstash for Redis via the Vercel Marketplace.

## 📚 Documentation

-   [Product Specification](docs/product.md)
-   [Implementation Details](docs/Implementation.md)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
