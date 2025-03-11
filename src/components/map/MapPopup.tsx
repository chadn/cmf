'use client'

import React, { useState } from 'react'
import { MapMarker } from '@/types/map'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'
import { truncateLocation } from '@/lib/utils/location'

interface MapPopupProps {
    marker: MapMarker
}

const MapPopup: React.FC<MapPopupProps> = ({ marker }) => {
    const [currentIndex, setCurrentIndex] = useState(0)
    const { events } = marker
    const currentEvent = events[currentIndex]

    // Handle pagination
    const goToNext = () => {
        setCurrentIndex((prev) => (prev + 1) % events.length)
    }

    const goToPrev = () => {
        setCurrentIndex((prev) => (prev - 1 + events.length) % events.length)
    }

    return (
        <div className="max-w-xs">
            {/* Event title */}
            <h3 className="font-bold text-md mb-1">{currentEvent.name}</h3>

            {/* Event date and duration */}
            <p className="text-sm mb-1">
                {formatEventDate(currentEvent.startDate)} (
                {formatEventDuration(
                    currentEvent.startDate,
                    currentEvent.endDate
                )}
                )
            </p>

            {/* Event location */}
            <p className="text-sm mb-2">
                {truncateLocation(currentEvent.location, 60)}
            </p>

            {/* Event description (truncated) */}
            {currentEvent.description && (
                <p className="text-xs mb-2 max-h-20 overflow-y-auto">
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
                className="text-xs text-primary hover:underline block mb-2"
            >
                View in Calendar
            </a>

            {/* Pagination controls (if multiple events) */}
            {events.length > 1 && (
                <div className="flex justify-between items-center text-xs mt-2 pt-2 border-t border-gray-200">
                    <button
                        onClick={goToPrev}
                        className="text-primary hover:underline"
                    >
                        Previous
                    </button>
                    <span>
                        {currentIndex + 1} of {events.length}
                    </span>
                    <button
                        onClick={goToNext}
                        className="text-primary hover:underline"
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    )
}

export default MapPopup
