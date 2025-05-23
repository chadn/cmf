# Calendar Map Filter (CMF)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

If you love maps, and have many events in your Calendar, this is for you.

A highly interactive visualization tool that displays calendar events on both an interactive map and a list, allowing users to spatially browse and filter events based on geographic location.
Users can also filter events based on date and by searching name, description, and location.

## Status

-   Work In Progress: https://cmf-chad.vercel.app/
-   See [How to Use](docs/usage.md) as well as [To Do - Features, Bugs and Known Issues](docs/todo.md)

## 🌟 Features

-   **Calendar Integration**: Connect to Google Calendar (with planned support for Facebook Events, Microsoft Outlook, and Apple Calendar)
-   **Event Sources System**: [Modular system](src/lib/api/eventSources/README.md) for fetching events, making it easy to add new event sources
-   **Interactive Map**: View all your calendar events on a MapLibre GL map
-   **Smart Filtering**: Filter events by date range, search terms, and map bounds
-   **Location Geocoding**: Automatically converts event locations to map coordinates
-   **Responsive Design**: Works on desktop and mobile devices
-   **Performance Optimized**: Caches geocoded locations to reduce API calls

## 🔗 Tech Stack

-   **Frontend**: [React](https://reactjs.org/) - React framework with SSR (Server Side Rendering)
-   **Fullstack, Hosting**: [Next.js](https://nextjs.org/) and [Vercel](https://vercel.com/docs/frameworks/nextjs)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
-   **Map**:[MapLibre GL JS](https://maplibre.org/) - Open-source maps
-   **Data Fetching**:[SWR](https://swr.vercel.app/) - Data fetching and caching
-   **Data Input**: [Google Calendar API](https://developers.google.com/calendar)
-   **Location Lookup**: [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/requests-geocoding)
-   **Caching**: [Upstash Redis](https://upstash.com/) - Serverless Redis for caching geocoding. filesystem for development.
-   **Deployment**: Vercel (recommended)

## 📋 Requirements

-   Node.js 18.x or higher
-   Google Calendar API key
-   Google Maps Geocoding API key
-   (Optional) Upstash Redis account for production caching

## 🚀 Getting Started

### 🔑 Google Calendar API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project if you don't already have one.
3. Enable the Google Calendar API
4. Create an API key with appropriate restrictions
   `https://www.googleapis.com/auth/calendar.events.readonly`
5. Add the API key to your `.env.local` file

### 🔑 Google Maps Geocoding API Key

1. In the same Google Cloud project, enable the Geocoding API
2. Create a new API key to for Geocoding API
   https://developers.google.com/maps/documentation/geocoding/requests-geocoding
3. Add the API key to your `.env.local` file

### 🔧 Installation

Clone the repository, install dependencies, and create a `.env.local` file:

    ```bash
    git clone https://github.com/chadn/cmf.git
    cd cmf
    npm install
    cp .env.example .env.local
    ```

Add your API keys to the `.env.local` file. For details, see [.env.example](.env.example)

### 🔧 Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 🔧 Production Build

Build the application for production:

```bash
npm run build
```

Note: Using Next.js's built-in SWC compiler exclusively, which is faster and simpler than using Babel

Start the production server:

```bash
npm start
```

## 🚢 Deployment

### 🚀 Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your environment variables
4. Deploy

### Netlify (not tested)

1. Push your code to GitHub
2. Import the repository in Netlify
3. Add your environment variables
4. Deploy

### AWS Amplify (not tested)

1. Push your code to GitHub
2. Import the repository in AWS Amplify
3. Add your environment variables
4. Deploy

## 📚 Documentation

For more detailed information, see the following documentation:

-   [How to Use the App](docs/usage.md)
-   [Product Specification](docs/product.md)
-   [Implementation Details](docs/Implementation.md) includes directory structure and implementation decisions.
-   [Test coverage](docs/tests.md) output of `npm test`.
-   [To Do - Features, Bugs and Known Issues](docs/todo.md)
-   [Creating your own Event Source](src/lib/api/eventSources)

## History

In 2010 I had the idea to use a map to filter Calendar events, and built a similar web app.
This original version used Google Maps and Google Calendar, so it was called GCM for Google Calendar Map.
https://chadnorwood.com/projects/gcm/

Around 2015 it stopped working.
Before 2015 Google Maps was totally free and abuse was rare. Once Google Maps started costing money I disabled GCM.

Ever since then I considered rewriting to use free maps, and finally made it happen.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
