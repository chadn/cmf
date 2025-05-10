'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'

interface HeaderProps {
    headerName?: string
    eventCount?: { shown: number; total: number }
    onInfoClick?: () => void
}

function HeaderContent({ headerName, eventCount, onInfoClick }: HeaderProps) {
    // Tailwind CSS prefixes, use to increase calendar name font size as screens go bigger
    // sm: - Small screens (640px and up)
    // md: - Medium screens (768px and up)
    // lg: - Large screens (1024px and up)
    // xl: - Extra large screens (1280px and up)
    // 2xl: - 2X Extra large screens (1536px and up)

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center">
                            <span className="text-xl font-bold text-primary">CMF</span>
                        </Link>
                        <div
                            className="ml-4 flex flex-col sm:flex-row sm:items-center cursor-pointer hover:bg-gray-50 px-2 py-1 rounded transition-colors duration-150"
                            onClick={onInfoClick}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    onInfoClick?.()
                                }
                            }}
                            title="Click to scroll events to top"
                            tabIndex={0}
                            role="button"
                            aria-label="Scroll events to top"
                        >
                            <span className="text-sm sm:text-lg md:text-2xl font-semibold text-gray-800">
                                {headerName}
                            </span>
                            {eventCount && (
                                // text-sm (14px) for mobile devices
                                // md:text-2xl (1.5rem or 24px) for medium screens and up (768px and wider)
                                <span className="text-xs md:text-xl text-gray-800 sm:ml-2">
                                    Showing <span className="font-bold text-sm md:text-2xl">{eventCount.shown}</span> of{' '}
                                    <span className="font-bold text-sm md:text-2xl">{eventCount.total}</span> events
                                </span>
                            )}
                        </div>
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
