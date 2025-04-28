'use client'

import React from 'react'
import { CmfEvent } from '@/types/events'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'

interface EventDetailsProps {
    event: CmfEvent
    onClose: () => void
}

const EventDetails: React.FC<EventDetailsProps> = ({ event, onClose }) => {
    return (
        <div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
            <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-primary">{event.name}</h2>
                <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="space-y-4">
                {/* Date and time */}
                <div>
                    <h3 className="text-sm font-medium text-gray-500">Date & Time</h3>
                    <p className="mt-1">
                        {formatEventDate(event.start)}
                        {' - '}
                        {formatEventDate(event.end)} ({formatEventDuration(event.start, event.end)})
                    </p>
                </div>

                {/* Location */}
                <div>
                    <h3 className="text-sm font-medium text-gray-500">Location</h3>
                    <p className="mt-1">
                        {event.location || <span className="text-gray-400 italic">No location provided</span>}
                    </p>
                    {event.resolved_location?.status === 'unresolved' && (
                        <p className="text-xs text-error mt-1">This location could not be mapped</p>
                    )}
                </div>

                {/* Description */}
                {event.description && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Description</h3>
                        <div className="mt-1 text-sm max-h-60 overflow-y-auto">
                            {event.description.split('\n').map((line, i) => (
                                <p key={i} className="mb-2">
                                    {line}
                                </p>
                            ))}
                        </div>
                    </div>
                )}

                {/* Links in description */}
                {event.description_urls.length > 0 && (
                    <div>
                        <h3 className="text-sm font-medium text-gray-500">Links</h3>
                        <ul className="mt-1 space-y-1">
                            {event.description_urls.map((url, index) => (
                                <li key={index}>
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline text-sm break-all"
                                    >
                                        {url.length > 50 ? `${url.substring(0, 50)}...` : url}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Original event link */}
                <div className="pt-2 border-t border-gray-200">
                    <a
                        href={event.original_event_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                    >
                        View in Google Calendar
                    </a>
                </div>
            </div>
        </div>
    )
}

export default EventDetails
