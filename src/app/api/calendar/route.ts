import { NextRequest, NextResponse } from 'next/server'
import { fetchCalendarEvents, extractUrls } from '@/lib/api/calendar'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { CalendarEvent } from '@/types/events'
import { GoogleCalendarEvent } from '@/types/api'
import { logr } from '@/lib/utils/logr'

logr.info('api-cal', 'DEBUG enabled on server, api calendar route')

// Simple API key validation
if (process.env.GOOGLE_CALENDAR_API_KEY && process.env.GOOGLE_MAPS_API_KEY) {
    logr.info('api-cal', '✅ API keys validation: Both Google Calendar and Maps API keys are found')
} else {
    if (!process.env.GOOGLE_CALENDAR_API_KEY) {
        logr.info('api-cal', '❌ API keys validation: Google Calendar API key is missing')
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
        logr.info('api-cal', '❌ API keys validation: Google Maps API key is missing')
    }
}

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

/**
 * API route handler for calendar events
 */
export async function GET(request: NextRequest) {
    try {
        // Get calendar ID from query parameters
        const calendarId = request.nextUrl.searchParams.get('id')

        if (!calendarId) {
            logr.info('api-cal', 'Missing calendar ID in request')
            return NextResponse.json({ error: 'Calendar ID is required' }, { status: 400 })
        }

        logr.info('api-cal', `Fetching calendar with ID: ${calendarId}`)

        // Get optional date range parameters
        const timeMin = request.nextUrl.searchParams.get('timeMin') || undefined
        const timeMax = request.nextUrl.searchParams.get('timeMax') || undefined

        if (timeMin && timeMax) {
            logr.info('api-cal', `Date range specified: ${timeMin} to ${timeMax}`)
        }

        // Fetch events from Google Calendar API
        logr.info('api-cal', `Attempting to fetch calendar with ID: ${calendarId}`)
        try {
            const calendarData = await fetchCalendarEvents(calendarId, timeMin, timeMax)

            logr.info('api-cal', `✅ Calendar successfully fetched: "${calendarData.summary}"`)
            logr.info('api-cal', `Total events in calendar: ${calendarData.items.length}`)

            // Transform Google Calendar events to our format
            const events: CalendarEvent[] = calendarData.items.map((item: GoogleCalendarEvent) => {
                // Handle start and end dates (could be dateTime or date)
                const startDate = item.start.dateTime || item.start.date || ''
                const endDate = item.end.dateTime || item.end.date || ''

                return {
                    id: item.id,
                    name: item.summary,
                    start: startDate,
                    end: endDate,
                    location: item.location || '',
                    description: item.description || '',
                    description_urls: extractUrls(item.description || ''),
                    original_event_url: item.htmlLink,
                    // Resolved location will be added later
                }
            })

            // Extract unique locations for geocoding
            const uniqueLocations = Array.from(
                new Set(events.map((event) => event.location).filter((location) => location && location.trim() !== ''))
            )

            logr.info('api-cal', `Unique locations to geocode: ${uniqueLocations.length}`)

            // Geocode locations in batches
            const geocodedLocations = await batchGeocodeLocations(uniqueLocations)

            logr.info('api-cal', `Geocoded ${geocodedLocations.length} locations`)

            // Create a map for quick lookup
            const locationMap = new Map()
            geocodedLocations.forEach((location) => {
                locationMap.set(location.original_location, location)
            })

            // Add resolved locations to events
            const eventsWithLocationResolved = events.map((event) => {
                if (event.location && locationMap.has(event.location)) {
                    return {
                        ...event,
                        resolved_location: locationMap.get(event.location),
                    }
                }
                return event
            })

            // Count events with unknown locations
            const unknownLocationsCount = eventsWithLocationResolved.filter(
                (event) => !event.resolved_location || event.resolved_location.status !== 'resolved'
            ).length

            logr.info('api-cal', `Events with unknown locations: ${unknownLocationsCount}`)

            // Construct the response
            const response = {
                events: eventsWithLocationResolved,
                calendar: {
                    name: calendarData.summary,
                    id: calendarId,
                    totalCount: eventsWithLocationResolved.length,
                    unknownLocationsCount: unknownLocationsCount,
                },
            }

            logr.info('api-cal', 'API response prepared', {
                totalCount: response.calendar.totalCount,
                unknownLocationsCount: response.calendar.unknownLocationsCount,
                calendarName: response.calendar.name,
            })

            return NextResponse.json(response)
        } catch (error) {
            logr.info('api-cal', `❌ Failed to fetch calendar with ID: ${calendarId}`, error)
            return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 })
        }
    } catch (error) {
        logr.info('api-cal', 'Error processing calendar events', error)
        console.error('Error processing calendar events:', error)
        return NextResponse.json({ error: 'Failed to fetch calendar events' }, { status: 500 })
    }
}
