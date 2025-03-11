'use client'

import React from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import CalendarSelector from '@/components/home/CalendarSelector'

export default function HomePage() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-primary mb-2">
                            Calendar Map Filter
                        </h1>
                        <p className="text-gray-600">
                            View your Google Calendar events on an interactive
                            map
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h2 className="text-xl font-semibold mb-4">
                                Features
                            </h2>
                            <ul className="space-y-2">
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">✓</span>
                                    <span>
                                        View calendar events on an interactive
                                        map
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">✓</span>
                                    <span>
                                        Filter events by date, location, and
                                        keywords
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">✓</span>
                                    <span>
                                        Automatically geocode event locations
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">✓</span>
                                    <span>
                                        Group nearby events for easier
                                        navigation
                                    </span>
                                </li>
                                <li className="flex items-start">
                                    <span className="text-primary mr-2">✓</span>
                                    <span>
                                        Works with any public Google Calendar
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div>
                            <CalendarSelector />
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    )
}
