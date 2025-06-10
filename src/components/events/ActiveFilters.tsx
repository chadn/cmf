'use client'

import React from 'react'
import { FilteredEvents } from '@/types/events'

interface ActiveFiltersProps {
    evts: FilteredEvents
    onClearMapFilter: () => void
    onClearSearchFilter: () => void
    onClearDateFilter: () => void
}

export default function ActiveFilters({
    evts,
    onClearMapFilter,
    onClearSearchFilter,
    onClearDateFilter,
}: ActiveFiltersProps) {
    const filterButtons = [
        {
            label: 'Map',
            numEvents: evts.mapFilteredEvents.length,
            onClick: onClearMapFilter,
            d: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        },
        {
            label: 'Search',
            numEvents: evts.searchFilteredEvents.length,
            onClick: onClearSearchFilter,
            d: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
        },
        {
            label: 'Date',
            numEvents: evts.dateFilteredEvents.length,
            onClick: onClearDateFilter,
            d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
        },
    ]
    const noFilters = filterButtons.every((filter) => filter.numEvents === 0)
    return noFilters ? null : (
        <div className="mb-0.5 md:mb-2 flex flex-wrap gap-1" role="list" aria-label="Active filters">
            {filterButtons.map(
                (filter) =>
                    filter.numEvents > 0 && (
                        <button
                            key={filter.label}
                            className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded cursor-pointer hover:bg-blue-200 transition-colors duration-150"
                            onClick={filter.onClick}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    filter.onClick()
                                }
                            }}
                            aria-label={`Clear ${filter.label} filter (${filter.numEvents} events filtered)`}
                            data-umami-event="ClearFilter"
                            data-umami-event-btn={filter.label}
                            title={`Click to clear ${filter.label} filter`}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-3 w-3 mr-1"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={filter.d} />
                            </svg>
                            {filter.numEvents} Filtered by {filter.label}
                            <span className="ml-1 text-blue-700 hover:text-blue-900" aria-hidden="true">
                                ×
                            </span>
                        </button>
                    )
            )}
        </div>
    )
}
