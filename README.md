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
-   **Performance Optimized**: Caches info so often can respond in < 1 second and to reduce API calls.

## 🔗 Tech Stack

-   **Frontend**: [React](https://reactjs.org/) - React framework with SSR (Server Side Rendering)
-   **Fullstack, Hosting**: [Next.js](https://nextjs.org/) and [Vercel](https://vercel.com/docs/frameworks/nextjs)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
-   **Map**:[MapLibre GL JS](https://maplibre.org/) - Open-source maps
-   **Data Fetching**:[SWR](https://swr.vercel.app/) - Data fetching and caching
-   **Data Input**: [Google Calendar API](https://developers.google.com/calendar)
-   **Location Lookup**: [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/requests-geocoding)
-   **Caching**: [Upstash Redis](https://upstash.com/) - Serverless Redis for caching responses, geocoding, and more.
-   **Deployment**: Vercel (recommended)

## 📋 Requirements

-   Node.js 18.x or higher
-   Google Calendar API key
-   Google Maps Geocoding API key
-   (Optional) Upstash Redis account for production caching

## 🔧 Development and Running Local

See [Development](docs/development.md)

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

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
