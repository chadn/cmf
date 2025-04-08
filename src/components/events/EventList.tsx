'use client'

import React, { useState } from 'react'
import { FilteredEvents } from '@/types/events'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'
import { truncateLocation } from '@/lib/utils/location'
import LoadingSpinner from '@/components/common/LoadingSpinner'

interface EventListProps {
    evts: FilteredEvents
    selectedEventId: string | null
    onEventSelect: (eventId: string | null) => void
    apiIsLoading: boolean
}

type SortField = 'name' | 'startDate' | 'duration' | 'location'
type SortDirection = 'asc' | 'desc'

const EventList: React.FC<EventListProps> = ({ evts, selectedEventId, onEventSelect, apiIsLoading }) => {
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

    const shownEvents = evts.shownEvents
    if (shownEvents.length === 0) {
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
    const sortedEvents = [...shownEvents].sort((a, b) => {
        if (sortField === 'name') {
            return sortDirection === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
        } else if (sortField === 'startDate') {
            return sortDirection === 'asc'
                ? new Date(a.start).getTime() - new Date(b.start).getTime()
                : new Date(b.start).getTime() - new Date(a.start).getTime()
        } else if (sortField === 'duration') {
            const aDuration = new Date(a.end).getTime() - new Date(a.start).getTime()
            const bDuration = new Date(b.end).getTime() - new Date(b.start).getTime()
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
        return formatEventDate(dateString)
    }

    // Extract date, day and time separately for the two-line display
    const extractDateParts = (dateString: string) => {
        const fullDate = formatEventDate(dateString)
        // Split the date into parts (MM/DD Day and Time)
        const parts = fullDate.match(/^([\d/]+\s[A-Za-z]+)\s(.+)$/)
        if (parts && parts.length >= 3) {
            return {
                dateDay: parts[1], // MM/DD Day
                time: parts[2], // hh:mm am/pm
            }
        }
        return {
            dateDay: fullDate,
            time: '',
        }
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
        <div className="mt-0.5">
            <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                    <thead className="bg-gray-50">
                        <tr>
                            <th
                                scope="col"
                                className="px-1 py-0.5 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-1/2"
                                onClick={() => handleSort('name')}
                            >
                                Event Name
                                {sortField === 'name' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th
                                scope="col"
                                className="px-1 py-0.5 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-1/6"
                                onClick={() => handleSort('startDate')}
                            >
                                Start Date
                                {sortField === 'startDate' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th
                                scope="col"
                                className="px-1 py-0.5 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-1/6"
                                onClick={() => handleSort('duration')}
                            >
                                Duration
                                {sortField === 'duration' && (
                                    <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                )}
                            </th>
                            <th
                                scope="col"
                                className="px-1 py-0.5 text-left text-xxs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-1/6"
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
                                className={`cursor-pointer border-b border-gray-100 ${
                                    event.id === selectedEventId
                                        ? 'bg-blue-50 border-l-4 border-l-accent'
                                        : 'hover:bg-gray-50'
                                }`}
                                onClick={() => onEventSelect(event.id)}
                            >
                                <td className="px-1 py-0.5 w-1/2">
                                    <div className="text-xs font-medium text-primary break-words md:break-normal">
                                        {event.name.length > 120 ? `${event.name.substring(0, 120)}...` : event.name}
                                    </div>
                                    {event.resolved_location?.status === 'unresolved' && (
                                        <div className="text-xxs text-error">⚠ Unmapped</div>
                                    )}
                                </td>
                                <td className="px-1 py-0.5 whitespace-nowrap">
                                    <div className="md:hidden flex flex-col">
                                        <div className="text-xs text-gray-600">
                                            {extractDateParts(event.start).dateDay}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {extractDateParts(event.start).time}
                                        </div>
                                    </div>
                                    <div className="hidden md:block text-xs text-gray-600">
                                        {formatStartDate(event.start)}
                                    </div>
                                </td>
                                <td className="px-1 py-0.5 whitespace-nowrap">
                                    <div className="text-xs text-gray-600">
                                        {formatEventDuration(event.start, event.end)}
                                    </div>
                                </td>
                                <td className="px-1 py-0.5">
                                    <div
                                        className="text-xs text-gray-500 cursor-pointer break-words"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleLocationExpand(event.id)
                                        }}
                                    >
                                        {event.location ? (
                                            expandedLocation === event.id ? (
                                                event.location
                                            ) : (
                                                <span className="line-clamp-2 md:line-clamp-1">
                                                    {truncateLocation(event.location, 60)}
                                                </span>
                                            )
                                        ) : (
                                            <span className="text-gray-400 italic text-xxs">No location</span>
                                        )}
                                        {event.location && event.location.length > 60 && (
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
