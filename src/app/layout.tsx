import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Script from 'next/script'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { umamiWebsiteId } from '@/lib/utils/umami'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Calendar Map Filter',
    description: 'View calendar events on a map and filter by location',
    icons: {
        icon: '/icons/favicon.ico',
    },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <Script
                    src="https://umami-chad.vercel.app/script.js"
                    data-website-id={umamiWebsiteId}
                    strategy="afterInteractive"
                />
            </head>
            <body className={inter.className}>
                <NuqsAdapter>{children}</NuqsAdapter>
            </body>
        </html>
    )
}
