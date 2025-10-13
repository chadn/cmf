import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import 'react-toastify/dist/ReactToastify.css'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { ToastContainer } from 'react-toastify'
import { UmamiScript } from '@/components/home/UmamiScript'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
    title: 'Calendar Map Filter',
    description: 'View calendar events on a map and filter by location',
    icons: {
        icon: '/icons/favicon.ico',
    },
}

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <UmamiScript />
            </head>
            <body className={inter.className}>
                <NuqsAdapter>{children}</NuqsAdapter>
                <ToastContainer />
            </body>
        </html>
    )
}
