'use client'

import React, { useState, useEffect } from 'react'
import { MapMarker } from '@/types/map'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'
import { truncateLocation } from '@/lib/utils/location'
import { debugLog } from '@/lib/utils/debug'

interface MapPopupProps {
    marker: MapMarker
    selectedEventId?: string | null
    onEventSelect?: (eventId: string) => void
}

const MapPopup: React.FC<MapPopupProps> = ({
    marker,
    selectedEventId,
    onEventSelect,
}) => {
    const { events } = marker

    // Default to first event if no valid event is selected
    const getInitialIndex = () => {
        if (!events || events.length === 0) return 0

        if (selectedEventId) {
            const index = events.findIndex((e) => e.id === selectedEventId)
            return index >= 0 ? index : 0
        }

        return 0
    }

    const [currentIndex, setCurrentIndex] = useState(getInitialIndex)

    useEffect(() => {
        // Re-calculate the index whenever selectedEventId or events change
        const newIndex = getInitialIndex()
        setCurrentIndex(newIndex)

        debugLog(
            'popup',
            `Event selection updated: ${events[newIndex]?.name}`,
            {
                selectedEventId,
                totalEvents: events.length,
                selectedIndex: newIndex,
            }
        )
    }, [selectedEventId, events])

    // Safety check - ensure we have events
    if (!events || events.length === 0) {
        return (
            <div className="p-2 text-sm bg-white text-gray-800 rounded shadow">
                No events at this location
            </div>
        )
    }

    // Safety check - ensure currentIndex is valid
    if (currentIndex < 0 || currentIndex >= events.length) {
        setCurrentIndex(0)
        return (
            <div className="p-2 text-sm bg-white text-gray-800 rounded shadow">
                Loading event details...
            </div>
        )
    }

    const currentEvent = events[currentIndex]

    // Final safety check
    if (!currentEvent) {
        return (
            <div className="p-2 text-sm bg-white text-gray-800 rounded shadow">
                Event details unavailable
            </div>
        )
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

    return (
        <div className="max-w-xs bg-white text-gray-800 p-3 rounded shadow">
            {/* Event title */}
            <h3 className="font-bold text-md mb-1 text-gray-900 pr-6">
                {currentEvent.name}
            </h3>

            {/* Event date and duration */}
            <p className="text-sm mb-1 text-gray-700">
                {formatEventDate(currentEvent.startDate)} (
                {formatEventDuration(
                    currentEvent.startDate,
                    currentEvent.endDate
                )}
                )
            </p>

            {/* Event location */}
            <p className="text-sm mb-2 text-gray-700">
                {truncateLocation(currentEvent.location, 60)}
            </p>

            {/* Event description (truncated) */}
            {currentEvent.description && (
                <p className="text-xs mb-2 max-h-20 overflow-y-auto text-gray-600">
                    {currentEvent.description.length > 150
                        ? `${currentEvent.description.substring(0, 150)}...`
                        : currentEvent.description}
                </p>
            )}

            {/* Original event link */}
            <a
                href={currentEvent.original_event_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline block mb-2"
            >
                View in Calendar
            </a>

            {/* Pagination controls (if multiple events) */}
            {events.length > 1 && (
                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200">
                    <button
                        onClick={goToPrev}
                        className="text-blue-600 hover:underline"
                    >
                        Previous
                    </button>
                    <span className="text-gray-600">
                        {currentIndex + 1} of {events.length}
                    </span>
                    <button
                        onClick={goToNext}
                        className="text-blue-600 hover:underline"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}

export default MapPopup
