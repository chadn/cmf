'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { CalendarEvent, CMFEvents } from '@/types/events'
import { MapBounds } from '@/types/map'
import { isLocationWithinBounds } from '@/lib/utils/location'

interface UseEventsProps {
    calendarId?: string
    dateRange?: { start: string; end: string }
    searchQuery?: string
    mapBounds?: MapBounds
    showUnknownLocationsOnly?: boolean
}

interface UseEventsReturn {
    events: CalendarEvent[]
    filteredEvents: CalendarEvent[]
    isLoading: boolean
    error: Error | null
    totalCount: number
    filteredCount: number
    unknownLocationsCount: number
    calendarName: string
}

/**
 * Custom hook for fetching and filtering calendar events
 */
export function useEvents({
    calendarId,
    dateRange,
    searchQuery,
    mapBounds,
    showUnknownLocationsOnly = false,
}: UseEventsProps): UseEventsReturn {
    // Fetch events from API
    const { data, error, isLoading } = useSWR<CMFEvents>(
        calendarId
            ? `/api/calendar?id=${encodeURIComponent(calendarId)}`
            : null,
        { revalidateOnFocus: false }
    )

    // Apply filters to events
    const filteredEvents = useMemo(() => {
        if (!data?.events) return []

        return data.events.filter((event) => {
            // Filter by date range if provided
            if (dateRange) {
                const eventStart = new Date(event.startDate)
                const eventEnd = new Date(event.endDate)
                const rangeStart = new Date(dateRange.start)
                const rangeEnd = new Date(dateRange.end)

                if (eventEnd < rangeStart || eventStart > rangeEnd) {
                    return false
                }
            }

            // Filter by search query if provided
            if (searchQuery && searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase()
                if (
                    !event.name.toLowerCase().includes(query) &&
                    !event.location.toLowerCase().includes(query) &&
                    !event.description.toLowerCase().includes(query)
                ) {
                    return false
                }
            }

            // Filter by map bounds if provided
            if (mapBounds && event.resolved_location) {
                if (
                    !isLocationWithinBounds(event.resolved_location, mapBounds)
                ) {
                    return false
                }
            }

            // Filter by unknown locations if requested
            if (showUnknownLocationsOnly) {
                return (
                    !event.resolved_location ||
                    event.resolved_location.status !== 'resolved'
                )
            }

            return true
        })
    }, [
        data?.events,
        dateRange,
        searchQuery,
        mapBounds,
        showUnknownLocationsOnly,
    ])

    return {
        events: data?.events || [],
        filteredEvents,
        isLoading,
        error: error || null,
        totalCount: data?.total_count || 0,
        filteredCount: filteredEvents.length,
        unknownLocationsCount: data?.unknown_locations_count || 0,
        calendarName: data?.calendar_name || '',
    }
}
