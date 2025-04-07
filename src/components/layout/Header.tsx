'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface HeaderProps {
    calendarName?: string
}

// Create a sub-component that uses useSearchParams
function HeaderContent({ calendarName }: HeaderProps) {
    const searchParams = useSearchParams()
    const calendarId = searchParams.get('gc') || ''

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <span className="text-xl font-bold text-primary">Calendar Map Filter</span>
                        </Link>
                        {calendarName && <span className="ml-4 text-sm text-gray-500">{calendarName}</span>}
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Calendar selector - simplified version */}
                        {calendarId && (
                            <div className="text-sm">
                                <Link href="/" className="text-primary hover:underline">
                                    Change Calendar
                                </Link>
                            </div>
                        )}

                        {/* Help button */}
                        <button className="text-gray-500 hover:text-gray-700" aria-label="Help">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}

// Main component that wraps the content in a Suspense boundary
const Header: React.FC<HeaderProps> = (props) => {
    return (
        <Suspense fallback={<div className="h-16 bg-white shadow-sm" />}>
            <HeaderContent {...props} />
        </Suspense>
    )
}

export default Header
