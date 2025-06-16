'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { MapMarker } from '@/types/map'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'
import { logr } from '@/lib/utils/logr'
import { LOCATION_KEY_PREFIX } from '@/types/events'

interface MapPopupProps {
    marker: MapMarker
    selectedEventId?: string | null
    onEventSelect?: (eventId: string) => void
}

const MapPopup: React.FC<MapPopupProps> = ({ marker, selectedEventId, onEventSelect }) => {
    const { events } = marker

    // Default to first event if no valid event is selected
    const getInitialIndex = useCallback(() => {
        if (!events || events.length === 0) return 0

        if (selectedEventId) {
            const index = events.findIndex((e) => e.id === selectedEventId)
            return index >= 0 ? index : 0
        }

        return 0
    }, [events, selectedEventId])

    const [currentIndex, setCurrentIndex] = useState(getInitialIndex)

    useEffect(() => {
        // Re-calculate the index whenever selectedEventId or events change
        const newIndex = getInitialIndex()
        setCurrentIndex(newIndex)

        logr.info('map-popup', `Event selection updated: ${events[newIndex]?.name}`, {
            eventIndex: newIndex,
            totalEvents: events.length,
        })
    }, [selectedEventId, events, getInitialIndex])

    // Safety check - ensure we have events
    if (!events || events.length === 0) {
        return <div className="p-2 text-sm bg-white text-gray-800 rounded-lg shadow">No events at this location</div>
    }

    // Safety check - ensure currentIndex is valid
    if (currentIndex < 0 || currentIndex >= events.length) {
        setCurrentIndex(0)
        return <div className="p-2 text-sm bg-white text-gray-800 rounded-lg shadow">Loading event details...</div>
    }

    const currentEvent = events[currentIndex]

    // Final safety check
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
    const isTimeUnknown = (start: string, end: string) => {
        if (!end) return true
        const startDate = new Date(start)
        const endDate = new Date(end)
        return startDate.getTime() === endDate.getTime()
    }

    return (
        <div className="max-w-xs bg-white text-gray-800 p-3 rounded-lg shadow">
            <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">{currentEvent.name}</h3>
            </div>

            {/* Event date and duration */}
            <p className="text-sm mb-1 text-gray-700">
                {formatEventDate(currentEvent.start, !isTimeUnknown(currentEvent.start, currentEvent.end), true)}
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
                <p className="text-xs mb-2 max-h-20 overflow-y-auto text-gray-600">
                    {currentEvent.description.length > 150
                        ? `${currentEvent.description.substring(0, 150)}...`
                        : currentEvent.description}
                </p>
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
            <a
                href={currentEvent.original_event_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline block mb-2"
                title={`${LOCATION_KEY_PREFIX}${currentEvent.resolved_location?.original_location}`}
            >
                View Original Event
            </a>

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
                        aria-label="Go to previous event"
                    >
                        Previous
                    </button>
                    <span className="text-gray-600" aria-live="polite">
                        {currentIndex + 1} of {events.length}
                    </span>
                    <button onClick={goToNext} className="text-blue-600 hover:underline" aria-label="Go to next event">
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}

export default MapPopup
