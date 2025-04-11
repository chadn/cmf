'use client'

import React from 'react'
import { FilteredEvents } from '@/types/events'

interface ActiveFiltersProps {
    evts: FilteredEvents
    isMapOfAllEvents: boolean
    onClearMapFilter: () => void
    onClearSearchFilter: () => void
    onClearDateFilter: () => void
}

export default function ActiveFilters({
    evts,
    isMapOfAllEvents,
    onClearMapFilter,
    onClearSearchFilter,
    onClearDateFilter,
}: ActiveFiltersProps) {
    return (
        <div className="mb-0.5 flex flex-wrap gap-1">
            {!isMapOfAllEvents && evts.mapFilteredEvents.length > 0 && (
                <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4"
                        />
                    </svg>
                    {evts.mapFilteredEvents.length} Filtered by Map
                    <button
                        onClick={onClearMapFilter}
                        className="ml-1 text-blue-700 hover:text-blue-900"
                        aria-label="Remove map filter"
                    >
                        ×
                    </button>
                </div>
            )}
            {evts.searchFilteredEvents.length > 0 && (
                <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                    </svg>
                    {evts.searchFilteredEvents.length} Filtered by Search
                    <button
                        onClick={onClearSearchFilter}
                        className="ml-1 text-blue-700 hover:text-blue-900"
                        aria-label="Remove search filter"
                    >
                        ×
                    </button>
                </div>
            )}
            {evts.dateFilteredEvents.length > 0 && (
                <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-3 w-3 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                    {evts.dateFilteredEvents.length} Filtered by Date
                    <button
                        onClick={onClearDateFilter}
                        className="ml-1 text-blue-700 hover:text-blue-900"
                        aria-label="Remove date filter"
                    >
                        ×
                    </button>
                </div>
            )}
        </div>
    )
}
