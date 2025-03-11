'use client'

import React from 'react'
import { CalendarEvent } from '@/types/events'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'
import { truncateLocation } from '@/lib/utils/location'

interface EventListProps {
    events: CalendarEvent[]
    isLoading: boolean
    error: Error | null
    onEventSelect: (eventId: string) => void
}

const EventList: React.FC<EventListProps> = ({
    events,
    isLoading,
    error,
    onEventSelect,
}) => {
    if (isLoading) {
        return (
            <div className="p-4 text-center">
                <p>Loading events...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-4 text-center text-error">
                <p>Error loading events: {error.message}</p>
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div className="p-4 text-center">
                <p>No events found. Try adjusting your filters.</p>
            </div>
        )
    }

    return (
        <div className="mt-4">
            <h2 className="text-lg font-semibold mb-2">
                Events ({events.length})
            </h2>
            <ul className="event-list divide-y divide-gray-200">
                {events.map((event) => (
                    <li
                        key={event.id}
                        className="event-item p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => onEventSelect(event.id)}
                    >
                        <h3 className="font-medium text-primary truncate">
                            {event.name}
                        </h3>
                        <div className="text-sm text-gray-600 mt-1">
                            {formatEventDate(event.startDate)} (
                            {formatEventDuration(
                                event.startDate,
                                event.endDate
                            )}
                            )
                        </div>
                        <div className="text-sm text-gray-500 mt-1 truncate">
                            {event.location ? (
                                truncateLocation(event.location, 50)
                            ) : (
                                <span className="text-gray-400 italic">
                                    No location
                                </span>
                            )}
                        </div>
                        {event.resolved_location?.status === 'unresolved' && (
                            <div className="text-xs text-error mt-1">
                                Location could not be mapped
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
}

export default EventList
