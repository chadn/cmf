'use client'

import React, { useState, useRef, useEffect } from 'react'
import { FilteredEvents, SortField, SortDirection } from '@/types/events'
import { formatEventDate, formatEventDuration } from '@/lib/utils/date'
import { truncateLocation } from '@/lib/utils/location'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { getComparisonResult } from '@/lib/utils/utils-client'

interface EventListProps {
    evts: FilteredEvents
    selectedEventId: string | null
    onEventSelect: (eventId: string | null) => void
    apiIsLoading: boolean
}

const EventList: React.FC<EventListProps> = ({ evts, selectedEventId, onEventSelect, apiIsLoading }) => {
    const [sortField, setSortField] = useState<SortField>('startDate')
    const [prevSortField, setPrevSortField] = useState<SortField>('location')
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
    const [prevSortDirection, setPrevSortDirection] = useState<SortDirection>('desc')
    const [expandedLocation, setExpandedLocation] = useState<string | null>(null)

    // Support scolling event list to the selected event
    const rowRefs = useRef<{ [key: string]: HTMLTableRowElement | null }>({})
    const tbodyContainerRef = useRef<HTMLDivElement | null>(null)
    useEffect(() => {
        if (selectedEventId && rowRefs.current[selectedEventId] && tbodyContainerRef.current) {
            const row = rowRefs.current[selectedEventId]
            const container = tbodyContainerRef.current
            if (row && container) {
                const rowRect = row.getBoundingClientRect()
                // Only scroll if the row is not already fully visible: top of row is above container, or bottom of row is below container
                if (
                    rowRect.top < container.offsetTop ||
                    rowRect.bottom > container.offsetTop + container.clientHeight
                ) {
                    const offset = row.offsetTop - 12 // 12px padding from top of container
                    container.scrollTo({ top: Math.max(0, offset), behavior: 'smooth' })
                }
            }
        }
    }, [selectedEventId])

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

    const sortedEvents = [...shownEvents].sort((a, b) => {
        let result = getComparisonResult(a, b, sortField, sortDirection)
        if (result === 0) {
            result = getComparisonResult(a, b, prevSortField, prevSortDirection)
        }
        return result
    })

    // Toggle sort when a column header is clicked
    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            setPrevSortField(sortField)
            setPrevSortDirection(sortDirection)
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
    const wdth = {
        name: 'w-[50%] md:w-1/2',
        start: 'w-[18%] md:w-1/6',
        dur: 'w-[10%] md:w-1/12',
        loc: 'w-[22%] md:w-1/4',
    }

    return (
        <div className="flex flex-col flex-1 min-h-0 mt-0.5 md:mt-2">
            {/* Fixed header table */}
            <table className="w-full text-xs border-collapse table-fixed">
                <thead className="bg-blue-100 hover:bg-blue-200 text-left text-xxs font-medium text-blue-800 uppercase tracking-wider cursor-pointer">
                    <tr>
                        <th
                            scope="col"
                            className={`px-1 py-0.5 ${wdth.name}`}
                            onClick={() => handleSort('name')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleSort('name')
                                }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-sort={
                                sortField === 'name'
                                    ? sortDirection === 'asc'
                                        ? 'ascending'
                                        : 'descending'
                                    : undefined
                            }
                        >
                            Event Name
                            {sortField === 'name' && (
                                <span className="ml-1" aria-hidden="true">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                            )}
                        </th>
                        <th
                            scope="col"
                            className={`px-1 py-0.5 ${wdth.start}`}
                            onClick={() => handleSort('startDate')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleSort('startDate')
                                }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-sort={
                                sortField === 'startDate'
                                    ? sortDirection === 'asc'
                                        ? 'ascending'
                                        : 'descending'
                                    : undefined
                            }
                        >
                            Start Date
                            {sortField === 'startDate' && (
                                <span className="ml-1" aria-hidden="true">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                            )}
                        </th>
                        <th
                            scope="col"
                            className={`px-1 py-0.5 ${wdth.dur}`}
                            onClick={() => handleSort('duration')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleSort('duration')
                                }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-sort={
                                sortField === 'duration'
                                    ? sortDirection === 'asc'
                                        ? 'ascending'
                                        : 'descending'
                                    : undefined
                            }
                        >
                            {/* Note sidebar is on top up to lg, has extra width from md to lg, so use Duration for md to lg*/}
                            <span className="inline md:hidden lg:inline 2xl:hidden">Dur.</span>
                            <span className="hidden md:inline lg:hidden 2xl:inline">Duration</span>
                            {sortField === 'duration' && (
                                <span className="ml-1" aria-hidden="true">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                            )}
                        </th>
                        <th
                            scope="col"
                            className={`px-1 py-0.5 ${wdth.loc}`}
                            onClick={() => handleSort('location')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleSort('location')
                                }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-sort={
                                sortField === 'location'
                                    ? sortDirection === 'asc'
                                        ? 'ascending'
                                        : 'descending'
                                    : undefined
                            }
                        >
                            Location
                            {sortField === 'location' && (
                                <span className="ml-1" aria-hidden="true">
                                    {sortDirection === 'asc' ? '↑' : '↓'}
                                </span>
                            )}
                        </th>
                    </tr>
                </thead>
            </table>
            {/* Scrollable tbody */}
            <div className="flex-1 min-h-0 overflow-y-auto" ref={tbodyContainerRef}>
                <table className="w-full text-xs border-collapse table-fixed">
                    <tbody className="bg-white divide-y divide-gray-100">
                        {sortedEvents.map((event) => (
                            <tr
                                key={event.id}
                                ref={(el) => {
                                    rowRefs.current[event.id] = el
                                }}
                                className={`cursor-pointer border-b border-gray-100 ${
                                    event.id === selectedEventId
                                        ? 'bg-green-200 border-l-4 border-l-green-500'
                                        : 'hover:bg-blue-100'
                                }`}
                                onClick={() => onEventSelect(event.id)}
                            >
                                <td className={`px-1 py-0.5 ${wdth.name}`}>
                                    <div className="text-xs font-medium text-primary break-words md:break-normal w-48 sm:w-56 md:w-auto">
                                        {event.name.length > 120 ? `${event.name.substring(0, 120)}...` : event.name}
                                    </div>
                                </td>
                                <td className={`px-1 py-0.5 whitespace-nowrap ${wdth.start}`}>
                                    {/* Note sidebar is skinny below md, has extra width from md to lg, skinny till xl*/}
                                    <div className="md:hidden lg:block 2xl:hidden flex flex-col">
                                        <div className="text-xs text-gray-600">
                                            {extractDateParts(event.start).dateDay}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {extractDateParts(event.start).time}
                                        </div>
                                    </div>
                                    <div className="hidden md:block lg:hidden 2xl:block text-xs text-gray-600">
                                        {formatStartDate(event.start)}
                                    </div>
                                </td>
                                <td className={`px-1 py-0.5 whitespace-nowrap ${wdth.dur}`}>
                                    <div className="text-xs text-gray-600">
                                        {formatEventDuration(event.start, event.end)}
                                    </div>
                                </td>
                                <td className={`px-1 py-0.5 ${wdth.loc}`}>
                                    <div
                                        className="text-xs text-gray-500 cursor-pointer break-words"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            toggleLocationExpand(event.id)
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                toggleLocationExpand(event.id)
                                            }
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        aria-expanded={expandedLocation === event.id}
                                        aria-label={
                                            expandedLocation === event.id
                                                ? 'Show less location details'
                                                : 'Show more location details'
                                        }
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
                                        {event.resolved_location?.status === 'unresolved' && (
                                            <div className="text-xxs text-error">⚠ Unresolved location</div>
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
