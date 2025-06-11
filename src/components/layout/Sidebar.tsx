import React, { forwardRef, ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'

interface SidebarProps {
    headerName?: string
    eventCount?: { shown: number; total: number }
    children: ReactNode
    className?: string
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ headerName, eventCount, children }, ref) => {
    return (
        <Card ref={ref} className="w-full lg:w-1/2 2xl:w-2/5 flex flex-col h-full min-h-0 p-1 border-r bg-white">
            <div className="sticky top-0 z-10 bg-white pb-2 pt-2 border-b mb-2">
                <div className="flex items-center justify-between px-2">
                    <Link href="/" className="flex items-center mr-3">
                        <span className="text-lg lg:text-xl font-bold text-blue-600 hover:text-blue-800 hover:underline">
                            CMF
                        </span>
                    </Link>
                    <span className="text-md sm:text-lg lg:text-2xl font-semibold text-gray-800 mx-2">
                        {headerName}
                    </span>
                    {eventCount && (
                        <span className="text-xs lg:text-sm xl:text-md 2xl:text-lg text-gray-800 ml-2 ">
                            Showing{' '}
                            <span className="whitespace-nowrap">
                                <span className="font-bold text-sm lg:text-md xl:text-lg 2xl:text-xl">
                                    {eventCount.shown}
                                </span>{' '}
                                of{' '}
                                <span className="font-bold text-sm lg:text-md xl:text-lg 2xl:text-xl">
                                    {eventCount.total}
                                </span>
                            </span>{' '}
                            events
                        </span>
                    )}
                </div>
            </div>
            <div className="flex flex-col flex-1 min-h-0">
                <CardContent className="p-0 flex flex-col h-full min-h-0">{children}</CardContent>
            </div>
        </Card>
    )
})

Sidebar.displayName = 'Sidebar'

export default Sidebar
