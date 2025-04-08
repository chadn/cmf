'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface HeaderProps {
    calendarName?: string
    eventCount?: { shown: number; total: number }
    onInfoClick?: () => void
}

// Create a sub-component that uses useSearchParams
function HeaderContent({ calendarName, eventCount, onInfoClick }: HeaderProps) {
    const searchParams = useSearchParams()
    const calendarId = searchParams.get('gc') || ''

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <span className="text-xl font-bold text-primary">CMF</span>
                        </Link>
                        {calendarName && (
                            <div
                                className="ml-4 flex flex-col sm:flex-row sm:items-center cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors duration-150"
                                onClick={onInfoClick}
                                title="Click to scroll events to top"
                            >
                                <span className="text-sm text-gray-500">{calendarName}</span>
                                {eventCount && (
                                    <span className="text-xs text-gray-400 sm:ml-2">
                                        Showing {eventCount.shown} of {eventCount.total} events
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4"></div>
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
