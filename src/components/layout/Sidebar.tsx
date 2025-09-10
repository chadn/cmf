import React, { forwardRef, ReactNode, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import * as Popover from '@radix-ui/react-popover'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import packageJson from '../../../package.json'
import { EventsSource } from '@/types/events'
import { useQueryState } from 'nuqs'
import { parseAsEventsSource } from '@/lib/utils/location'

interface SidebarProps {
    headerName?: string
    eventCount?: { shown: number; total: number }
    eventSources?: Array<EventsSource> | null
    onShowAllDomainFltrdEvnts?: () => void
    children: ReactNode
    className?: string
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ headerName, eventCount, eventSources, onShowAllDomainFltrdEvnts, children }, ref) => {
    // Only get current es parameter when eventSources exist (optimization)
    const [currentEventSourceId] = useQueryState('es', parseAsEventsSource)

    // Memoize timezone calculation (expensive operations)
    const timezoneInfo = useMemo(() => {
        if (typeof Intl === 'undefined') return { browserTz: 'Unknown', tzOffset: '' }

        const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const offsetMin = new Date().getTimezoneOffset()
        const offsetHr = -offsetMin / 60
        const sign = offsetHr >= 0 ? '+' : '-'
        const tzOffset = ` UTC${sign}${Math.abs(offsetHr)}`

        return { browserTz, tzOffset }
    }, [])

    // Share handler
    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            alert('Link copied to clipboard!')
        } catch {
            alert('Failed to copy link.')
        }
    }

    // Memoize git SHA calculation
    const sha = useMemo(() => (process.env.GIT_COMMIT_SHA || '').substring(0, 7), [])
    return (
        <Card ref={ref} className="w-full flex flex-col h-full min-h-0 p-1 border-r bg-white">
            <div className="sticky top-0 z-10 bg-white pb-2 pt-2 border-b mb-2">
                <div className="popover-cmf flex items-center justify-between px-2">
                    <Popover.Root>
                        <Popover.Trigger asChild>
                            <Button
                                variant="ghost"
                                className="flex items-center px-2 py-1 text-lg lg:text-xl font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-200 focus:outline-none"
                            >
                                CMF
                            </Button>
                        </Popover.Trigger>
                        <Popover.Portal>
                            <Popover.Content className="z-50 w-80 max-w-[95vw] p-0 bg-white rounded-md shadow-lg border mt-2 popover-content">
                                <Popover.Close asChild>
                                    <button
                                        className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none"
                                        aria-label="Close"
                                        tabIndex={0}
                                    >
                                        <X className="w-4 h-4 text-gray-500" />
                                    </button>
                                </Popover.Close>
                                <div className="p-4 space-y-3">
                                    <div className="font-semibold text-lg mb-2">About</div>
                                    <div className="text-sm text-gray-700 mb-2">
                                        CMF, Calendar Map Filter, lets you use a map to view and filter events. You can
                                        also filter by date or search term.{' '}
                                        <a
                                            href="https://github.com/chadn/cmf/blob/main/docs/usage.md#how-to-use-cmf"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="hover:underline text-blue-700"
                                        >
                                            View Usage Doc on Github
                                        </a>
                                    </div>
                                    <div className="flex flex-col gap-2 text-blue-700  text-sm">
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>
                                                <a href="/" className="hover:underline">
                                                    Enter New Source
                                                </a>
                                            </li>
                                            <li>
                                                <button
                                                    type="button"
                                                    onClick={handleShare}
                                                    className="hover:underline cursor-pointer p-0 m-0 bg-transparent border-none text-inherit font-inherit text-blue-700 text-sm"
                                                    style={{ textAlign: 'left' }}
                                                >
                                                    Share - Copy URL to clipboard
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm">Timezone used for Times:</span>
                                        <span className="font-mono text-xs bg-gray-100 rounded px-2 py-0.5">
                                            {timezoneInfo.browserTz}
                                            {timezoneInfo.tzOffset}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm">CMF Version:</span>
                                        <span className="font-mono text-xs bg-gray-100 rounded px-2 py-0.5">
                                            {packageJson.version} {sha}
                                        </span>
                                    </div>
                                </div>
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>
                    {/* Event Source Header with Popover */}
                    {eventSources ? (
                        <Popover.Root>
                            <Popover.Trigger asChild>
                                <Button
                                    variant="ghost"
                                    className="sidebar-headerName text-md sm:text-lg lg:text-2xl font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-200 px-2 py-1 mx-2 rounded"
                                >
                                    {headerName}
                                </Button>
                            </Popover.Trigger>
                            <Popover.Portal>
                                <Popover.Content className="z-50 w-96 max-w-[95vw] p-0 bg-white rounded-md shadow-lg border mt-2 popover-content">
                                    <Popover.Close asChild>
                                        <button
                                            className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 focus:outline-none"
                                            aria-label="Close"
                                            tabIndex={0}
                                        >
                                            <X className="w-4 h-4 text-gray-500" />
                                        </button>
                                    </Popover.Close>
                                    <div className="p-4 space-y-3">
                                        <div className="font-semibold text-lg mb-3">Events Sources</div>

                                        <div className="space-y-3">
                                            {eventSources.map((source, index) => (
                                                <div key={source.id} className="border-b pb-2 last:border-b-0">
                                                    <div className="font-medium text-gray-900">
                                                        {index + 1}. {source.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600 mt-1">
                                                        {source.url && (
                                                            <a
                                                                href={source.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-600 hover:underline text-sm"
                                                            >
                                                                View Source &nbsp;
                                                            </a>
                                                        )}
                                                        Events: <span className="font-medium">{source.totalCount}</span>{' '}
                                                        {currentEventSourceId !== `${source.prefix}:${source.id}` && (
                                                            <a
                                                                href={`/?es=${source.prefix}:${source.id}`}
                                                                className="text-blue-600 hover:underline text-sm"
                                                            >
                                                                Show Only These
                                                            </a>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {eventSources.length > 1 && (
                                                <div className="pt-2 border-t text-sm text-gray-600">
                                                    <div>
                                                        Total Events:{' '}
                                                        <span className="font-medium">
                                                            {eventSources.reduce(
                                                                (sum, s) => sum + (s.totalCount || 0),
                                                                0
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Popover.Content>
                            </Popover.Portal>
                        </Popover.Root>
                    ) : (
                        <span className="text-md sm:text-lg lg:text-2xl font-semibold text-blue-600 mx-2">
                            {headerName}
                        </span>
                    )}
                    {eventCount && (
                        <button 
                            title="Click to update map to show all visible events"
                            onClick={onShowAllDomainFltrdEvnts}
                            className="num-events-visible text-blue-600 hover:text-blue-800 hover:bg-blue-200 text-xs lg:text-sm xl:text-md 2xl:text-lg ml-2 px-1 py-0.5 rounded transition-colors cursor-pointer"
                            disabled={!onShowAllDomainFltrdEvnts}
                        >
                            <span className="whitespace-nowrap">
                                <span className="font-bold text-sm lg:text-md xl:text-lg 2xl:text-xl">
                                    {eventCount.shown}
                                </span>{' '}
                                of{' '}
                                <span className="font-bold text-sm lg:text-md xl:text-lg 2xl:text-xl">
                                    {eventCount.total}
                                </span>
                            </span>{' '}
                            Visible
                        </button>
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
