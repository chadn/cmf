# Calendar Map Filter (CMF)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

If you love maps, and have many events in your Calendar, this is for you.

CMF is a fast, interactive tool for exploring events on a map and in a list.
Designed for data lovers, it lets you filter by date, location, or search term—and instantly see counts, numbers, and visuals update as you adjust filters.
Built for high responsiveness and clarity, CMF makes it easy to explore, analyze, and share event data.

## Status

-   Work In Progress: https://cmf.chadnorwood.com/

## 🌟 Features

-   **Event Sources System**: [Modular system](src/lib/api/eventSources/README.md) for fetching events, from Google Calendar, Facebook Events, or custom websites.
-   **Interactive Map**: Use the map to **View** and **Filter** events on a MapLibre GL map
-   **Smart Filtering**: Filter events by date range, search terms, and map bounds
-   **Sortable Event List**: Organize events by name, date, duration, or location with both primary and secondary sorting.
-   **Location Geocoding**: Automatically converts event locations to map coordinates
-   **Responsive Design**: Works on desktop and mobile devices
-   **Performance Optimized**: Uses Redis cache, enabling < 1 second response most of time, and reduces API calls.

## 🔗 Tech Stack

-   **Frontend**: [React](https://reactjs.org/) - React framework with SSR (Server Side Rendering)
-   **Fullstack, Hosting**: [Next.js](https://nextjs.org/) and [Vercel](https://vercel.com/docs/frameworks/nextjs)
-   **Language**: [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript
-   **Map**:[MapLibre GL JS](https://maplibre.org/) - Open-source maps SDKs using OpenStreetMap Data
-   **Data Fetching**:[SWR](https://swr.vercel.app/) - Data fetching and caching
-   **Data Input**: [Google Calendar API](https://developers.google.com/calendar) among others
-   **Location Lookup**: [Google Maps Geocoding API](https://developers.google.com/maps/documentation/geocoding/requests-geocoding)
-   **Caching**: [Upstash Redis](https://upstash.com/) - Serverless Redis for caching responses, geocoding, and more.
-   **Deployment**: Vercel
-   **Analytics**: Umami deployed on separate Vercel project with analytics data stored on private Supabase PostgreSQL 17.4

## Requirements

-   Node.js 18.x or higher
-   Google Calendar API key
-   Google Maps Geocoding API key
-   (Optional) Upstash Redis account for production caching

## Development and Running Local

See [Development](docs/development.md)

## 📚 Documentation

-   [How to Use the App](docs/usage.md)
-   [Development Setup](docs/development.md)
-   [CHANGELOG](CHANGELOG.md) log of changes with each new version
-   [Implementation Details](docs/Implementation.md) - architecture and technical decisions
-   [Architecture Decision Records (ADR)](docs/adr/README.md) - key architectural decisions and rationale
-   [Test Coverage](docs/tests.md) - Manual testing and current test statistics
-   [Feature Backlog](docs/todo.md) - planned features, bugs, and known issues todo.
-   [Creating your own Event Source](src/lib/api/eventSources)

See [docs/README.md](docs/README.md) for full documentation overview

## History

In 2010 I had the idea to use a map to filter Calendar events, and built a similar web app.
This original version used Google Maps and Google Calendar, so it was called GCM for Google Calendar Map.
https://chadnorwood.com/projects/gcm/

Around 2015 it stopped working - Before 2015 Google Maps was totally free and abuse was rare. Once Google Maps started costing money I disabled GCM.

Ever since then I considered rewriting to use free maps, and finally made it happen.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
