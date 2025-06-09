import React, { forwardRef, ReactNode, KeyboardEvent } from 'react'
import Link from 'next/link'

interface SidebarProps {
    headerName?: string
    eventCount?: { shown: number; total: number }
    onInfoClick?: () => void
    children: ReactNode
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ headerName, eventCount, onInfoClick, children }, ref) => {
    // Keyboard accessibility handler
    const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
        if ((e.key === 'Enter' || e.key === ' ') && onInfoClick) {
            e.preventDefault()
            onInfoClick()
        }
    }
    return (
        <div ref={ref} className="w-full md:w-1/2 lg:w-2/5 h-[40vh] md:h-full overflow-auto p-1 border-r bg-white">
            <div className="sticky top-0 z-10 bg-white pb-2 pt-2 border-b mb-2">
                <div className="flex items-center justify-between px-2">
                    <Link href="/" className="flex items-center mr-3">
                        <span className="text-lg md:text-xl font-bold text-primary">CMF</span>
                    </Link>
                    <span
                        className="text-md sm:text-lg md:text-2xl font-semibold text-gray-800 cursor-pointer mx-2"
                        onClick={onInfoClick}
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                        role="button"
                        aria-label="Scroll events to top"
                    >
                        {headerName}
                    </span>
                    {eventCount && (
                        <span className="text-xs md:text-lg text-gray-800 ml-2 whitespace-nowrap">
                            Showing <span className="font-bold text-sm md:text-xl">{eventCount.shown}</span> of{' '}
                            <span className="font-bold text-sm md:text-xl">{eventCount.total}</span> events
                        </span>
                    )}
                </div>
            </div>
            {children}
        </div>
    )
})

/*
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

*/

Sidebar.displayName = 'Sidebar'

export default Sidebar
