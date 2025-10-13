import React, { forwardRef, ReactNode, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import * as Popover from '@radix-ui/react-popover'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import packageJson from '@/../package.json'
import { EventsSource } from '@/types/events'
import { buildShareUrl, ShareUrlParams } from '@/lib/utils/url-utils'
import { timezoneInfo } from '@/lib/utils/timezones'
import { toast } from 'react-toastify'

interface SidebarProps {
    headerName?: string
    eventCount?: { shown: number; total: number }
    eventSources?: Array<EventsSource> | null
    onResetMapToVisibleEvents?: () => void
    children: ReactNode
    className?: string
    llzChecked?: boolean
    onLlzCheckedChange?: (checked: boolean) => void
    preferQfChecked?: boolean
    onPreferQfCheckedChange?: (checked: boolean) => void
    // Current URL state for building Share URL - matches ShareUrlParams
    currentUrlState?: ShareUrlParams['currentUrlState']
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(
    (
        {
            headerName,
            eventCount,
            eventSources,
            onResetMapToVisibleEvents,
            children,
            llzChecked,
            onLlzCheckedChange,
            preferQfChecked,
            onPreferQfCheckedChange,
            currentUrlState,
        },
        ref
    ) => {
        // Only get current es parameter when eventSources exist (optimization)

        // Memoize timezone calculation (expensive operations)
        const timezoneInfoData = useMemo(() => timezoneInfo(), [])

        const handleShare = async () => {
            try {
                // Build custom Share URL based on preferences
                const shareUrl = buildShareUrl({
                    currentUrlState,
                    preferQfChecked,
                    llzChecked,
                    baseUrl: window.location.href,
                })
                //throw new Error('Test error')
                await navigator.clipboard.writeText(shareUrl)
                toast.success('Link copied to clipboard!', {
                    autoClose: 3000, // disappears after 3s
                })
            } catch {
                toast.error('Failed to copy link.', {
                    autoClose: 3000, // disappears after 3s
                })
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
                                    data-umami-event="CmfButton"
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
                                        <div className="font-semibold text-lg mb-2 flex items-center gap-2">
                                            <Image
                                                src="/images/blue-marker-green-map.png"
                                                alt="Map icon"
                                                className="w-8 h-8"
                                                width={32}
                                                height={32}
                                            />
                                            About
                                        </div>
                                        <div className="text-sm text-gray-700 mb-2">
                                            CMF, Calendar Map Filter, lets you use a map to view and filter events. You
                                            can also filter by date or search term. <br />
                                            <a
                                                href="https://chadn.github.io/cmf/usage.html#how-to-use-cmf"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:underline text-blue-700"
                                                data-umami-event="UsageDocClicked"
                                            >
                                                View Usage Doc on Github
                                            </a>
                                        </div>
                                        <div className="flex flex-col gap-2 text-blue-700  text-sm">
                                            <ul className="list-disc pl-5 space-y-1">
                                                <li>
                                                    <Link
                                                        href="/"
                                                        className="hover:underline"
                                                        data-umami-event="EnterSource1Clicked"
                                                    >
                                                        Enter New Event Source
                                                    </Link>
                                                </li>
                                                <li>
                                                    <button
                                                        type="button"
                                                        onClick={handleShare}
                                                        className="hover:underline cursor-pointer p-0 m-0 bg-transparent border-none text-inherit font-inherit text-blue-700 text-sm"
                                                        style={{ textAlign: 'left' }}
                                                        data-umami-event="ShareClicked"
                                                    >
                                                        Share - Copy URL to Clipboard
                                                    </button>
                                                </li>
                                            </ul>
                                        </div>
                                        {onLlzCheckedChange && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="llz-checkbox"
                                                    checked={llzChecked || false}
                                                    onChange={(e) => onLlzCheckedChange(e.target.checked)}
                                                    className="text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <label
                                                    htmlFor="llz-checkbox"
                                                    className="text-sm cursor-pointer"
                                                    title="LLZ is Lat,Long,Zoom. Recommend no llz in URL to let map auto zoom to show visible events"
                                                >
                                                    Add llz in URL (Remember map view)
                                                </label>
                                            </div>
                                        )}
                                        {onPreferQfCheckedChange && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    id="prefer-qf-checkbox"
                                                    checked={preferQfChecked !== false}
                                                    onChange={(e) => onPreferQfCheckedChange(e.target.checked)}
                                                    className="text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                                />
                                                <label
                                                    htmlFor="prefer-qf-checkbox"
                                                    className="text-sm cursor-pointer"
                                                    title="When checked, uses quick filter (qf) in URL. When unchecked, uses specific start/end dates (fsd/fed) in URL - better if link will be used for more than a day."
                                                >
                                                    Prefer qf over fsd & fed
                                                </label>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-sm">Timezone used for Times:</span>
                                            <span className="font-mono text-xs bg-gray-100 rounded px-2 py-0.5">
                                                {timezoneInfoData.browserTz}
                                                {timezoneInfoData.tzOffset}
                                                {timezoneInfoData.tzAbbrev && ` (${timezoneInfoData.tzAbbrev})`}
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
                                        title="Click to view event source details"
                                        data-umami-event="EventsSourceButton"
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
                                            <div className="font-semibold items-center text-lg mb-3">
                                                {eventSources.length} Events Sources:
                                            </div>

                                            <div className="space-y-3 max-h-80 overflow-y-auto">
                                                {eventSources.map((source, index) => (
                                                    <div key={source.id} className="border-b pb-2 last:border-b-0">
                                                        <div className="font-medium text-gray-900">
                                                            {index + 1}. {source.name}
                                                        </div>
                                                        <div className="text-sm text-gray-600 mt-1">
                                                            {source.url && (
                                                                <a
                                                                    href={source.url}
                                                                    title="Click to open new window showing event source web page"
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline text-sm"
                                                                    data-umami-event="ViewSourceClicked"
                                                                    data-umami-event-sourceName={source.name}
                                                                >
                                                                    View Source
                                                                </a>
                                                            )}{' '}
                                                            Events:{' '}
                                                            <span className="font-medium">{source.totalCount}</span>{' '}
                                                            {eventSources.length > 1 && (
                                                                <a
                                                                    href={`/?es=${source.prefix}:${source.id}`}
                                                                    title="Click to reload with just this event source"
                                                                    className="text-blue-600 hover:underline text-sm"
                                                                    data-umami-event="ShowOnlyTheseClicked"
                                                                    data-umami-event-sourceName={source.name}
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
                                            <div>
                                                <Link
                                                    href="/"
                                                    className="text-blue-600 hover:underline"
                                                    data-umami-event="EnterSource2Clicked"
                                                >
                                                    Enter New Event Source
                                                </Link>
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
                                title="Click to center map on visible events"
                                onClick={onResetMapToVisibleEvents}
                                className="num-events-visible text-blue-600 hover:text-blue-800 hover:bg-blue-200 text-xs lg:text-sm xl:text-md 2xl:text-lg ml-2 px-1 py-0.5 rounded transition-colors cursor-pointer"
                                disabled={!onResetMapToVisibleEvents}
                                data-umami-event="VisibleButton"
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
    }
)

Sidebar.displayName = 'Sidebar'

export default Sidebar
