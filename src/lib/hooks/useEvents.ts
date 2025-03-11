'use client'

import { useState, useEffect, useMemo } from 'react'
import useSWR from 'swr'
import { CalendarEvent, CMFEvents } from '@/types/events'
import { MapBounds } from '@/types/map'
import { isLocationWithinBounds } from '@/lib/utils/location'
import { debugLog, clientDebug } from '@/lib/utils/debug'

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

// Custom fetcher function that uses clientDebug
const fetcher = async (url: string) => {
    clientDebug.log('api', `Request to: ${url}`)
    try {
        const response = await fetch(url)
        const data = await response.json()
        clientDebug.log(
            'api',
            `Response from: ${url} (${response.status})`,
            data
        )
        return data
    } catch (error) {
        clientDebug.error('api', `Error from: ${url}`, error)
        throw error
    }
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
    // Log when the hook is called with a calendar ID
    useEffect(() => {
        if (calendarId) {
            debugLog(
                'events',
                `useEvents hook called with calendar ID: "${calendarId}"`
            )
        } else {
            debugLog('events', 'useEvents hook called without a calendar ID')
        }
    }, [calendarId])

    // Construct the API URL
    const apiUrl = calendarId
        ? `/api/calendar?id=${encodeURIComponent(calendarId)}`
        : null

    // Log the API URL being used
    useEffect(() => {
        if (apiUrl) {
            debugLog('events', `API URL for calendar data: "${apiUrl}"`)
        }
    }, [apiUrl])

    // Fetch events from API
    const { data, error, isLoading } = useSWR<CMFEvents>(apiUrl, fetcher, {
        revalidateOnFocus: false,
        onSuccess: (data) => {
            debugLog(
                'events',
                `✅ Calendar data fetched successfully: "${data.calendar_name}"`,
                {
                    calendarId: data.calendar_id,
                    totalEvents: data.total_count,
                    unknownLocations: data.unknown_locations_count,
                }
            )
            clientDebug.log('events', 'Calendar data fetched successfully', {
                calendarName: data.calendar_name,
                totalEvents: data.total_count,
            })
        },
        onError: (err) => {
            debugLog(
                'events',
                `❌ Error fetching calendar data for ID: "${calendarId}"`,
                {
                    error: err.message,
                    apiUrl,
                }
            )
            clientDebug.error(
                'events',
                `Error fetching calendar data for ID: "${calendarId}"`,
                err
            )
        },
    })

    // Apply filters to events
    const filteredEvents = useMemo(() => {
        if (!data?.events) return []

        debugLog('events', 'Applying filters to events', {
            totalEvents: data.events.length,
            dateRange: dateRange
                ? `${dateRange.start} to ${dateRange.end}`
                : 'none',
            searchQuery: searchQuery || 'none',
            mapBoundsApplied: !!mapBounds,
            showUnknownLocationsOnly,
        })

        let dateFiltered = 0
        let searchFiltered = 0
        let boundsFiltered = 0
        let unknownLocationsFiltered = 0

        const filtered = data.events.filter((event) => {
            // Filter by date range if provided
            if (dateRange) {
                const eventStart = new Date(event.startDate)
                const eventEnd = new Date(event.endDate)
                const rangeStart = new Date(dateRange.start)
                const rangeEnd = new Date(dateRange.end)

                if (eventEnd < rangeStart || eventStart > rangeEnd) {
                    dateFiltered++
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
                    searchFiltered++
                    return false
                }
            }

            // Filter by map bounds if provided
            if (mapBounds && event.resolved_location) {
                if (
                    !isLocationWithinBounds(event.resolved_location, mapBounds)
                ) {
                    boundsFiltered++
                    return false
                }
            }

            // Filter by unknown locations if requested
            if (showUnknownLocationsOnly) {
                const isUnknown =
                    !event.resolved_location ||
                    event.resolved_location.status !== 'resolved'

                if (!isUnknown) {
                    unknownLocationsFiltered++
                    return false
                }
                return isUnknown
            }

            return true
        })

        debugLog('events', 'Filters applied', {
            originalCount: data.events.length,
            filteredCount: filtered.length,
            dateFiltered,
            searchFiltered,
            boundsFiltered,
            unknownLocationsFiltered,
        })

        return filtered
    }, [
        data?.events,
        dateRange,
        searchQuery,
        mapBounds,
        showUnknownLocationsOnly,
    ])

    // Log when the return values change
    useEffect(() => {
        if (data && !isLoading) {
            debugLog('events', 'Events hook return values updated', {
                totalEvents: data.events.length,
                filteredEvents: filteredEvents.length,
                calendarName: data.calendar_name,
            })
        }
    }, [data, filteredEvents, isLoading])

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
