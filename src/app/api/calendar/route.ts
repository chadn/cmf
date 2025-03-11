import { NextRequest, NextResponse } from 'next/server'
import { fetchCalendarEvents, extractUrls } from '@/lib/api/calendar'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { CalendarEvent, CMFEvents } from '@/types/events'
import { GoogleCalendarEvent } from '@/types/api'

/**
 * API route handler for calendar events
 */
export async function GET(request: NextRequest) {
    try {
        // Get calendar ID from query parameters
        const { searchParams } = new URL(request.url)
        const calendarId = searchParams.get('id')

        if (!calendarId) {
            return NextResponse.json(
                { error: 'Calendar ID is required' },
                { status: 400 }
            )
        }

        // Get optional date range parameters
        const timeMin = searchParams.get('timeMin') || undefined
        const timeMax = searchParams.get('timeMax') || undefined

        // Fetch events from Google Calendar API
        const calendarData = await fetchCalendarEvents(
            calendarId,
            timeMin,
            timeMax
        )

        // Transform Google Calendar events to our format
        const events: CalendarEvent[] = calendarData.items.map(
            (item: GoogleCalendarEvent) => {
                // Handle start and end dates (could be dateTime or date)
                const startDate = item.start.dateTime || item.start.date || ''
                const endDate = item.end.dateTime || item.end.date || ''

                return {
                    id: item.id,
                    name: item.summary,
                    startDate,
                    endDate,
                    location: item.location || '',
                    description: item.description || '',
                    description_urls: extractUrls(item.description || ''),
                    original_event_url: item.htmlLink,
                    // Resolved location will be added later
                }
            }
        )

        // Extract unique locations for geocoding
        const uniqueLocations = [
            ...new Set(
                events
                    .map((event) => event.location)
                    .filter((location) => location && location.trim() !== '')
            ),
        ]

        // Geocode locations in batches
        const geocodedLocations = await batchGeocodeLocations(uniqueLocations)

        // Create a map for quick lookup
        const locationMap = new Map()
        geocodedLocations.forEach((location) => {
            locationMap.set(location.original_location, location)
        })

        // Add resolved locations to events
        const eventsWithLocations = events.map((event) => {
            if (event.location && locationMap.has(event.location)) {
                return {
                    ...event,
                    resolved_location: locationMap.get(event.location),
                }
            }
            return event
        })

        // Count events with unknown locations
        const unknownLocationsCount = eventsWithLocations.filter(
            (event) =>
                !event.resolved_location ||
                event.resolved_location.status !== 'resolved'
        ).length

        // Construct the response
        const response: CMFEvents = {
            events: eventsWithLocations,
            total_count: eventsWithLocations.length,
            unknown_locations_count: unknownLocationsCount,
            calendar_name: calendarData.summary,
            calendar_id: calendarId,
        }

        return NextResponse.json(response)
    } catch (error) {
        console.error('Error processing calendar events:', error)
        return NextResponse.json(
            { error: 'Failed to fetch calendar events' },
            { status: 500 }
        )
    }
}
