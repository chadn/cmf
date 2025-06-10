import React, { forwardRef, ReactNode, KeyboardEvent } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

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
        <Card ref={ref} className="w-full md:w-1/2 lg:w-2/5 h-[40vh] md:h-full p-1 border-r bg-white">
            <div className="sticky top-0 z-10 bg-white pb-2 pt-2 border-b mb-2">
                <div className="flex items-center justify-between px-2">
                    <Link href="/" className="flex items-center mr-3">
                        <span className="text-lg md:text-xl font-bold text-blue-600 hover:text-blue-800 hover:underline">
                            CMF
                        </span>
                    </Link>
                    <span
                        className="text-md sm:text-lg md:text-2xl font-semibold text-gray-800 mx-2 cursor-pointer"
                        onClick={onInfoClick}
                        onKeyDown={handleKeyDown}
                        tabIndex={0}
                        role="button"
                        aria-label="Scroll events to top"
                    >
                        {headerName}
                    </span>
                    {eventCount && (
                        <span className="text-xs md:text-lg text-gray-800 ml-2 ">
                            Showing{' '}
                            <span className="whitespace-nowrap">
                                <span className="font-bold text-sm md:text-xl">{eventCount.shown}</span> of{' '}
                                <span className="font-bold text-sm md:text-xl">{eventCount.total}</span>
                            </span>{' '}
                            events
                        </span>
                    )}
                </div>
            </div>
            <div className="h-full overflow-auto">
                <CardContent className="p-0">{children}</CardContent>
            </div>
        </Card>
    )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
