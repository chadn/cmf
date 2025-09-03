import React, { forwardRef, ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import * as Popover from '@radix-ui/react-popover'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface SidebarProps {
    headerName?: string
    eventCount?: { shown: number; total: number }
    children: ReactNode
    className?: string
}

const Sidebar = forwardRef<HTMLDivElement, SidebarProps>(({ headerName, eventCount, children }, ref) => {
    // Get browser timezone and offset
    const browserTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Unknown'
    let tzOffset = ''
    if (typeof Intl !== 'undefined') {
        const offsetMin = new Date().getTimezoneOffset()
        const offsetHr = -offsetMin / 60
        const sign = offsetHr >= 0 ? '+' : '-'
        tzOffset = ` UTC${sign}${Math.abs(offsetHr)}`
    }
    // Share handler
    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href)
            alert('Link copied to clipboard!')
        } catch {
            alert('Failed to copy link.')
        }
    }
    return (
        <Card ref={ref} className="w-full flex flex-col h-full min-h-0 p-1 border-r bg-white">
            <div className="sticky top-0 z-10 bg-white pb-2 pt-2 border-b mb-2">
                <div className="flex items-center justify-between px-2">
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
                                        CMF lets you use a map to view and filter events. You can also filter by date or
                                        search term.
                                    </div>
                                    <div className="flex flex-col gap-2 text-blue-700  text-sm">
                                        <ul className="list-disc pl-5 space-y-1">
                                            <li>
                                                <a href="/" className="hover:underline">
                                                    Enter New Source
                                                </a>
                                            </li>
                                            <li>
                                                <a
                                                    href="https://github.com/chadn/cmf/blob/main/docs/usage.md#how-to-use-cmf"
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="hover:underline"
                                                >
                                                    View Usage Doc on Github
                                                </a>
                                            </li>
                                            <li>
                                                <button
                                                    type="button"
                                                    onClick={handleShare}
                                                    className="hover:underline cursor-pointer p-0 m-0 bg-transparent border-none text-inherit font-inherit text-blue-700 text-sm"
                                                    style={{ textAlign: 'left' }}
                                                >
                                                    Copy URL to clipboard
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="text-sm">Timezone used for Times:</span>
                                        <span className="font-mono text-xs bg-gray-100 rounded px-2 py-0.5">
                                            {browserTz}
                                            {tzOffset}
                                        </span>
                                    </div>
                                </div>
                            </Popover.Content>
                        </Popover.Portal>
                    </Popover.Root>
                    <span className="text-md sm:text-lg lg:text-2xl font-semibold text-gray-800 mx-2">
                        {headerName}
                    </span>
                    {eventCount && (
                        <span className="num-events-showing text-xs lg:text-sm xl:text-md 2xl:text-lg text-gray-800 ml-2 ">
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
