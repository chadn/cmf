'use client'

import React, { useState } from 'react'
import { CalendarEvent } from '@/types/events'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'
import { truncateLocation } from '@/lib/utils/location'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface EventListProps {
    events: CalendarEvent[]
    selectedEventId: string | null
    onEventSelect: (eventId: string | null) => void
    apiIsLoading: boolean
}

type SortField = 'name' | 'startDate' | 'duration' | 'location'
type SortDirection = 'asc' | 'desc'

const EventList: React.FC<EventListProps> = ({ events, selectedEventId, onEventSelect, apiIsLoading }) => {
    const [sortField, setSortField] = useState<SortField>('startDate')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [expandedLocation, setExpandedLocation] = useState<string | null>(null)

    if (apiIsLoading) {
        return (
            <div className="p-2 text-center text-xs">
                <p>Loading events...</p>
            </div>
        )
    }

    if (events.length === 0) {
        return (
            <div className="p-4 text-center">
                {apiIsLoading ? (
                    <div className="flex justify-center">
                        <LoadingSpinner size="medium" />
                    </div>
                ) : (
                    <p className="text-gray-500">No events found</p>
                )}
            </div>
        )
    }

    // Sort events based on the selected field and direction
    const sortedEvents = [...events].sort((a, b) => {
        if (sortField === 'name') {
            return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        } else if (sortField === 'startDate') {
            return sortDirection === 'asc'
                ? new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
                : new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        } else if (sortField === 'duration') {
            const aDuration = new Date(a.endDate).getTime() - new Date(a.startDate).getTime()
            const bDuration = new Date(b.endDate).getTime() - new Date(b.startDate).getTime()
            return sortDirection === 'asc' ? aDuration - bDuration : bDuration - aDuration
        } else if (sortField === 'location') {
            return sortDirection === 'asc'
                ? (a.location || '').localeCompare(b.location || '')
                : (b.location || '').localeCompare(a.location || '')
        }
        return 0
    })

    // Toggle sort when a column header is clicked
    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setSortField(field)
            setSortDirection('asc')
        }
    }

    // Format the start date according to specs: "MM/DD Day hh:mm am/pm"
    const formatStartDate = (dateString: string) => {
        const date = new Date(dateString)
        return formatEventDate(dateString)
    }

    // Toggle expanded location
    const toggleLocationExpand = (eventId: string) => {
        if (expandedLocation === eventId) {
            setExpandedLocation(null)
        } else {
            setExpandedLocation(eventId)
        }
    }

    return (
        <div className="mt-1">
            <h2 className="text-sm font-semibold mb-1 flex justify-between items-center">
                <span>Events ({events.length})</span>
            </h2>

            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-1 py-1 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('name')}
                            >
                                Event Name
                                {sortField === 'name' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th
                                scope="col"
                                className="px-1 py-1 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('startDate')}
                            >
                                Start Date
                                {sortField === 'startDate' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th
                                scope="col"
                                className="px-1 py-1 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('duration')}
                            >
                                Duration
                                {sortField === 'duration' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th
                                scope="col"
                                className="px-1 py-1 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                                onClick={() => handleSort('location')}
                            >
                                Location
                                {sortField === 'location' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {sortedEvents.map((event) => (
                            <tr
                                key={event.id}
                                className="hover:bg-gray-50 cursor-pointer border-b border-gray-100"
                                onClick={() => onEventSelect(event.id)}
                            >
                                <td className="px-1 py-1">
                                    <div className="text-xs font-medium text-primary">
                                        {event.name.length > 60 ? `${event.name.substring(0, 60)}...` : event.name}
                                    </div>
                                    {event.resolved_location?.status === 'unresolved' && (
                                        <div className="text-xxs text-error">⚠ Unmapped</div>
                                    )}
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-xs text-gray-600">{formatStartDate(event.startDate)}</div>
                                </td>
                                <td className="px-1 py-1 whitespace-nowrap">
                                    <div className="text-xs text-gray-600">
                                        {formatEventDuration(event.startDate, event.endDate)}
                                    </div>
                                </td>
                                <td className="px-1 py-1">
                                    <div
                                        className="text-xs text-gray-500 cursor-pointer"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleLocationExpand(event.id)
                                        }}
                                    >
                                        {event.location ? (
                                            expandedLocation === event.id ? (
                                                event.location
                                            ) : (
                                                truncateLocation(event.location, 40)
                                            )
                                        ) : (
                                            <span className="text-gray-400 italic text-xxs">No location</span>
                                        )}
                                        {event.location && event.location.length > 40 && (
                                            <span className="ml-1 text-blue-500 text-xxs">
                                                {expandedLocation === event.id ? '(less)' : '(more)'}
                                            </span>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default EventList
