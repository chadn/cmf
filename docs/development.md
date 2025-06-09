# Calendar Map Filter (CMF) Development

## 📋 Requirements

-   Node.js 18.x or higher
-   Google Calendar API key
-   Google Maps Geocoding API key
-   (Optional) Upstash Redis account for production caching

## 🚀 Getting Started

### 🔧 Installation

Clone the repository, install dependencies, and create a `.env.local` file from [.env.example](.env.example)

    ```bash
    git clone https://github.com/chadn/cmf.git
    cd cmf
    npm install
    cp .env.example .env.local
    ```

Add your API keys to the `.env.local` file. For details, see

### 🔑 Google Calendar API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project if you don't already have one.
3. Enable the Google Calendar API, Google Sheets API
   https://console.cloud.google.com/marketplace/product/google/calendar-json.googleapis.com
   https://console.cloud.google.com/apis/library/sheets.googleapis.com
4. Create an API key with appropriate restrictions
   `https://www.googleapis.com/auth/calendar.events.readonly`
5. Add the API key to your `.env.local` file

### 🔑 Google Maps Geocoding API Key

1. In the same Google Cloud project, enable the Geocoding API
2. Create a new API key to for Geocoding API
   https://developers.google.com/maps/documentation/geocoding/requests-geocoding
3. Add the API key to your `.env.local` file

### 🔧 Development

Run the development server:

```bash
npm run dev
```

Make sure [tests](tests.md) pass

```
npm test
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

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../LICENSE) file for details.
