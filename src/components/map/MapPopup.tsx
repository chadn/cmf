'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'react-toastify'
import { MapMarker } from '@/types/map'
import { EventsSource } from '@/types/events'
import { formatEventDateTz, formatEventDuration } from '@/lib/utils/date'
import { logr } from '@/lib/utils/logr'
import { LOCATION_KEY_PREFIX } from '@/types/events'
import { generateGoogleCalendarUrl, downloadIcsFile } from '@/lib/utils/calendar'
import * as Popover from '@radix-ui/react-popover'
import { umamiTrack } from '@/lib/utils/umami'
import Link from 'next/link'

interface MapPopupProps {
    marker: MapMarker
    selectedEventId?: string | null
    onEventSelect?: (eventId: string) => void
    eventSources?: EventsSource[]
}

const MapPopup: React.FC<MapPopupProps> = ({ marker, selectedEventId, onEventSelect, eventSources }) => {
    const { events } = marker

    // Default to first event if no valid event is selected
    const getEventIndex = useCallback(() => {
        if (!events || events.length === 0) return 0

        if (selectedEventId) {
            const index = events.findIndex((e) => e.id === selectedEventId)
            return index >= 0 ? index : 0
        }

        return 0
    }, [events, selectedEventId])

    const [currentIndex, setCurrentIndex] = useState(getEventIndex)

    useEffect(() => {
        // Re-calculate the index whenever selectedEventId or events change
        const newIndex = getEventIndex()
        setCurrentIndex(newIndex)
        logr.info(
            'map-popup',
            `Event selection updated: ${events[newIndex]?.name} ${events[newIndex]?.tz} ${events[newIndex]?.start}`
        )
    }, [selectedEventId, events, getEventIndex])

    // Get current event (with safety checks)
    const currentEvent =
        events && events.length > 0 && currentIndex >= 0 && currentIndex < events.length ? events[currentIndex] : null

    // Extract Facebook URL from current event description (memoized)
    const facebookEventUrl = useMemo(() => {
        if (!currentEvent?.description) return null
        const fbUrlRegex = /https:\/\/www\.facebook\.com\/events\/\d+\/?/g
        const matches = currentEvent.description.match(fbUrlRegex)
        return matches ? matches[matches.length - 1] : null
    }, [currentEvent?.description])

    // Memoized calendar event handlers
    const handleGoogleCalendar = useCallback(() => {
        if (!currentEvent) return
        // TODO: use https://www.addevent.com/c/documentation/add-to-calendar-button
        const googleUrl = generateGoogleCalendarUrl(currentEvent, eventSources)
        window.open(googleUrl, '_blank', 'noopener,noreferrer')
    }, [currentEvent, eventSources])

    const handleAppleCalendar = useCallback(() => {
        if (!currentEvent) return
        downloadIcsFile(currentEvent, eventSources)
    }, [currentEvent, eventSources])

    const handleReportLocation = useCallback(() => {
        if (!currentEvent) return
        // TODO: close "Add To Cal" popup
        const locationInfo = currentEvent.resolved_location
            ? ` ll=${currentEvent.resolved_location.lat},${currentEvent.resolved_location.lng}`
            : ''
        umamiTrack('reportLocation', { eventId: currentEvent.id, badLocation: currentEvent.location + locationInfo })
        toast.success('Thank you for reporting an incorrect location. We will review and update it as needed.', {
            autoClose: 3000, // disappears after 3s
        })
    }, [currentEvent])

    // Early returns after all hooks
    if (!events || events.length === 0) {
        return <div className="p-2 text-sm bg-white text-gray-800 rounded-lg shadow">No events at this location</div>
    }

    if (currentIndex < 0 || currentIndex >= events.length) {
        setCurrentIndex(0)
        return <div className="p-2 text-sm bg-white text-gray-800 rounded-lg shadow">Loading event details...</div>
    }

    if (!currentEvent) {
        return <div className="p-2 text-sm bg-white text-gray-800 rounded-lg shadow">Event details unavailable</div>
    }

    // Handle pagination
    const goToNext = () => {
        const nextIndex = (currentIndex + 1) % events.length
        setCurrentIndex(nextIndex)
        if (onEventSelect) {
            onEventSelect(events[nextIndex].id)
        }
    }

    const goToPrev = () => {
        const prevIndex = (currentIndex - 1 + events.length) % events.length
        setCurrentIndex(prevIndex)
        if (onEventSelect) {
            onEventSelect(events[prevIndex].id)
        }
    }

    // Helper: check if start and end times are the same
    // Hack: if end == start, exact start time is not known.
    const isTimeUnknown = (startIso: string, endIso: string) => {
        if (!endIso) return true
        // TODO: Performance Optimization: can hack be to check identical strings for startIso and endIso?
        const startDate = new Date(startIso)
        const endDate = new Date(endIso)
        return startDate.getTime() === endDate.getTime()
    }

    return (
        <div className="max-w-xs bg-white text-gray-800 p-3 rounded-lg shadow">
            <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">{currentEvent.name}</h3>
            </div>

            {/* Event date and duration */}
            <p className="text-sm mb-1 text-gray-700">
                {formatEventDateTz(
                    currentEvent.start,
                    currentEvent.tz,
                    !isTimeUnknown(currentEvent.start, currentEvent.end)
                )}
                {isTimeUnknown(currentEvent.start, currentEvent.end) ? (
                    <span className="ml-2 italic text-gray-500">See event for Time</span>
                ) : (
                    <> ({formatEventDuration(currentEvent.start, currentEvent.end)})</>
                )}
            </p>

            {/* Event location skipping for now */}
            {/* <p className="text-sm mb-2 text-gray-700">{truncateLocation(currentEvent.location, 60)}</p> */}

            {/* Event description (truncated) */}
            {currentEvent.description && (
                <div className="mb-2">
                    <p className="text-xs max-h-20 overflow-y-auto text-gray-600">
                        {currentEvent.description.length > 150
                            ? `${currentEvent.description.substring(0, 150)}...`
                            : currentEvent.description}
                    </p>
                    {facebookEventUrl && (
                        <a
                            href={facebookEventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-umami-event="MarkerFBEvent"
                            className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                        >
                            FB Event
                        </a>
                    )}
                </div>
            )}

            {currentEvent.resolved_location?.status !== 'resolved' && (
                <p
                    className="text-xs mb-1 text-red-500"
                    title={`Using fake location to aggregate all events with unresolved or unknown locations.\nOriginal event location:\n${currentEvent.location}`}
                >
                    ⚠ Unresolved location
                </p>
            )}
            {/* Original event link */}
            <div className="flex justify-between items-center mb-2 text-xs">
                <a
                    href={currentEvent.original_event_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                    data-umami-event="MarkerViewOriginal"
                    title={`${LOCATION_KEY_PREFIX}${currentEvent.resolved_location?.original_location}`}
                >
                    View Original Event
                </a>

                {/* Add To Cal Popover */}
                <Popover.Root>
                    <Popover.Trigger asChild>
                        <button className="text-blue-600 hover:underline focus:outline-none">More</button>
                    </Popover.Trigger>
                    <Popover.Portal>
                        <Popover.Content
                            className="z-50 bg-white rounded-md shadow-lg border p-3 min-w-[200px]"
                            sideOffset={5}
                        >
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleGoogleCalendar}
                                    data-umami-event="MarkerGoogleCal"
                                    className="text-left text-sm text-blue-600 hover:underline focus:outline-none"
                                >
                                    Add to your Google Calendar
                                </button>

                                <button
                                    onClick={handleAppleCalendar}
                                    data-umami-event="MarkerAppleCal"
                                    className="text-left text-sm text-blue-600 hover:underline focus:outline-none"
                                >
                                    Add to your Apple Calendar (iCal ics)
                                </button>
                                <Link
                                    href={`https://www.google.com/maps/search/?api=1&query=${currentEvent.location}`}
                                    className="mb-4 mt-4 text-left text-sm text-blue-600 hover:underline focus:outline-none"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-umami-event="MarkerOpenInMaps"
                                >
                                    Open in Google Maps
                                </Link>
                                <button
                                    onClick={handleReportLocation}
                                    className="text-left text-sm text-blue-600 hover:underline focus:outline-none"
                                >
                                    Report as Incorrect Location
                                </button>
                                <span className="text-xs text-gray-500 mt-1">{currentEvent.location}</span>
                            </div>
                            <Popover.Arrow className="fill-white" />
                        </Popover.Content>
                    </Popover.Portal>
                </Popover.Root>
            </div>

            {/* Pagination controls (if multiple events) */}
            {events.length > 1 && (
                <div
                    className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200"
                    role="navigation"
                    aria-label="Event navigation"
                >
                    <button
                        onClick={goToPrev}
                        className="text-blue-600 hover:underline"
                        data-umami-event="MarkerPrev"
                        aria-label="Go to previous event"
                    >
                        Previous
                    </button>
                    <span className="text-gray-600" aria-live="polite">
                        {currentIndex + 1} of {events.length}
                    </span>
                    <button
                        onClick={goToNext}
                        className="text-blue-600 hover:underline"
                        data-umami-event="MarkerNext"
                        aria-label="Go to next event"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}

export default MapPopup
