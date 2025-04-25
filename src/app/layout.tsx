import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { NuqsAdapter } from 'nuqs/adapters/next/app'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Calendar Map Filter',
    description: 'View calendar events on a map and filter by location',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <Script
                    src="https://umami-chad.vercel.app/script.js"
                    data-website-id="5b4eb79f-b7a7-4bea-b03b-808126201cb0"
                    strategy="afterInteractive"
                />
            </head>
            <body className={inter.className}>
                <NuqsAdapter>{children}</NuqsAdapter>
            </body>
        </html>
    )
}
