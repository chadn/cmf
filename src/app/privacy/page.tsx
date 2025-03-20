'use client'

import React, { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

function PrivacyContent() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>

                <div className="prose max-w-none">
                    <p className="mb-4">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Introduction
                    </h2>
                    <p>
                        Calendar Map Filter ("we", "our", or "us") respects your
                        privacy and is committed to protecting your personal
                        data. This privacy policy will inform you about how we
                        look after your personal data when you visit our website
                        and tell you about your privacy rights and how the law
                        protects you.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Data We Collect
                    </h2>
                    <p>
                        Calendar Map Filter is designed to display your Google
                        Calendar events on a map. To do this, we need to access
                        certain information:
                    </p>
                    <ul className="list-disc pl-6 mb-4">
                        <li>
                            Calendar event data (title, description, date/time,
                            location)
                        </li>
                        <li>
                            Location data (geocoded from your event locations)
                        </li>
                    </ul>
                    <p>
                        We do not store your calendar data on our servers. All
                        processing happens in your browser, and any cached
                        location data is stored either locally on your device or
                        in a secure Redis database that only you can access with
                        your unique credentials.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        How We Use Your Data
                    </h2>
                    <p>
                        We use your data solely for the purpose of displaying
                        your calendar events on a map and providing filtering
                        functionality. Specifically:
                    </p>
                    <ul className="list-disc pl-6 mb-4">
                        <li>To retrieve and display your calendar events</li>
                        <li>To geocode event locations for map display</li>
                        <li>
                            To cache geocoded locations to improve performance
                            and reduce API calls
                        </li>
                    </ul>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Third-Party Services
                    </h2>
                    <p>
                        Calendar Map Filter uses the following third-party
                        services:
                    </p>
                    <ul className="list-disc pl-6 mb-4">
                        <li>
                            Google Calendar API (to retrieve your calendar
                            events)
                        </li>
                        <li>
                            Google Maps Geocoding API (to convert addresses to
                            map coordinates)
                        </li>
                        <li>MapLibre GL JS (to display the interactive map)</li>
                        <li>
                            Upstash Redis (optional, for caching location data
                            in production)
                        </li>
                    </ul>
                    <p>
                        Each of these services has its own privacy policy, and
                        we encourage you to review them.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Data Security
                    </h2>
                    <p>
                        We have implemented appropriate security measures to
                        prevent your personal data from being accidentally lost,
                        used, or accessed in an unauthorized way. We limit
                        access to your personal data to those who have a genuine
                        business need to access it.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Your Rights
                    </h2>
                    <p>
                        Under certain circumstances, you have rights under data
                        protection laws in relation to your personal data,
                        including the right to access, correct, erase, restrict,
                        transfer, or object to the processing of your personal
                        data.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Changes to This Privacy Policy
                    </h2>
                    <p>
                        We may update our privacy policy from time to time. We
                        will notify you of any changes by posting the new
                        privacy policy on this page and updating the "Last
                        updated" date.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Contact Us
                    </h2>
                    <p>
                        If you have any questions about this privacy policy or
                        our privacy practices, please contact us at:
                    </p>
                    <p className="mb-4">Email: privacy@example.com</p>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default function PrivacyPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <PrivacyContent />
        </Suspense>
    )
}
