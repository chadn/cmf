# Calendar Map Filter (CMF) Development

## Table of Contents

- [Requirements](#requirements)
- [Getting Started](#getting-started)
    - [Installation](#installation)
    - [Google Calendar API Key](#google-calendar-api-key)
    - [Google Maps Geocoding API Key](#google-maps-geocoding-api-key)
    - [Run Dev Server](#run-dev-server)
    - [Production Build](#production-build)
- [HTTPS Development Server (Optional)](#https-development-server-optional)
- [Deployment](#deployment)
    - [Vercel (Recommended)](#vercel-recommended)
- [Contributing](#contributing)
- [License](#license)

## Requirements

- Node.js 18.x or higher
- Google Calendar API key
- Google Maps Geocoding API key
- (Optional) Upstash Redis account for production caching

## Getting Started

### Installation

Clone the repository, install dependencies, and create a `.env.local` file from [.env.example](.env.example)

    ```bash
    git clone https://github.com/chadn/cmf.git
    cd cmf
    npm install
    cp .env.example .env.local
    ```

Add your API keys to the `.env.local` file.

### Google Calendar API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project if you don't already have one.
3. Enable the Google Calendar API, Google Sheets API
   https://console.cloud.google.com/marketplace/product/google/calendar-json.googleapis.com
   https://console.cloud.google.com/apis/library/sheets.googleapis.com
4. Create an API key with appropriate restrictions
   `https://www.googleapis.com/auth/calendar.events.readonly`
5. Add the API key to your `.env.local` file

### Google Maps Geocoding API Key

1. In the same Google Cloud project, enable the Geocoding API
2. Create a new API key to for Geocoding API
   https://developers.google.com/maps/documentation/geocoding/requests-geocoding
3. Add the API key to your `.env.local` file

### Run Dev Server

Run the development server:

```bash
npm run dev
```

Make sure [tests](tests.md) pass, both unit and e2e (pageload)

```bash
npm test && npm run test:e2e  # run all tests

# Run just parseAsEventsSource tests from url-utils test file, url-utils.test.ts
npx jest --testPathPattern=url-utils --testNamePattern="parseAsEventsSource"
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

Build the application for production:

```bash
npm run build
```

Note: Using Next.js's built-in SWC compiler exclusively, which is faster and simpler than using Babel

Start the production server:

```bash
npm start
```

## HTTPS Development Server (Optional)

HTTPS is **not required** for most local development. However, certain browser features require a secure context (HTTPS), including:

- **Geolocation API** - The map's "locate me" button (bottom-right geolocate icon) requires HTTPS to function
- Service Workers
- Clipboard API (in some browsers)
- Media devices (camera/microphone)

If you need these features during development, you can run the dev server with HTTPS.

### Setup HTTPS (One-time)

1. **Install mkcert** (creates locally-trusted SSL certificates):
   ```bash
   brew install mkcert
   ```

2. **Install local Certificate Authority**:
   ```bash
   mkcert -install
   ```
   You'll be prompted for your system password to trust the local CA.

3. **Generate certificates** for localhost:
   ```bash
   mkdir -p .cert
   mkcert -key-file .cert/localhost-key.pem -cert-file .cert/localhost-cert.pem localhost 127.0.0.1 ::1
   ```

### Run HTTPS Dev Server

After setup, start the HTTPS development server:

```bash
npm run dev:https
```

Open [https://localhost:3000](https://localhost:3000) in your browser.

**Note**: The `.cert/` directory is gitignored and should not be committed to version control.

### Troubleshooting

- **Certificate errors**: Run `mkcert -install` again to reinstall the local CA
- **Port conflicts**: The HTTPS server uses port 3000 by default (same as HTTP dev server)
- **Mobile testing**: To test HTTPS on mobile devices on the same network, you'll need to:
  1. Find your computer's local IP address (`ifconfig | grep "inet "`)
  2. Generate certificates for that IP (`mkcert -key-file .cert/localhost-key.pem -cert-file .cert/localhost-cert.pem localhost 192.168.x.x`)
  3. Install the mkcert root CA on your mobile device

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Add your environment variables
4. Deploy

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

See the [LICENSE](../LICENSE) file for details.
