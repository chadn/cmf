import { NextRequest, NextResponse } from 'next/server'
import { fetchCalendarEvents, extractUrls } from '@/lib/api/calendar'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { CalendarEvent, CMFEvents } from '@/types/events'
import { GoogleCalendarEvent } from '@/types/api'
import { debugLog } from '@/lib/utils/debug'

// Basic debug log to verify DEBUG_LOGIC is enabled on the server
debugLog('server', 'DEBUG_LOGIC enabled on server')

// Simple API key validation
if (process.env.GOOGLE_CALENDAR_API_KEY && process.env.GOOGLE_MAPS_API_KEY) {
    debugLog(
        'api',
        '✅ API keys validation: Both Google Calendar and Maps API keys are found'
    )
} else {
    if (!process.env.GOOGLE_CALENDAR_API_KEY) {
        debugLog(
            'api',
            '❌ API keys validation: Google Calendar API key is missing'
        )
    }
    if (!process.env.GOOGLE_MAPS_API_KEY) {
        debugLog(
            'api',
            '❌ API keys validation: Google Maps API key is missing'
        )
    }
}

/**
 * API route handler for calendar events
 */
export async function GET(request: NextRequest) {
    try {
        // Get calendar ID from query parameters
        const { searchParams } = new URL(request.url)
        const calendarId = searchParams.get('id')

        if (!calendarId) {
            debugLog('calendar', 'Missing calendar ID in request')
            return NextResponse.json(
                { error: 'Calendar ID is required' },
                { status: 400 }
            )
        }

        debugLog('calendar', `Fetching calendar with ID: ${calendarId}`)

        // Get optional date range parameters
        const timeMin = searchParams.get('timeMin') || undefined
        const timeMax = searchParams.get('timeMax') || undefined

        if (timeMin && timeMax) {
            debugLog(
                'calendar',
                `Date range specified: ${timeMin} to ${timeMax}`
            )
        }

        // Fetch events from Google Calendar API
        debugLog(
            'calendar',
            `Attempting to fetch calendar with ID: ${calendarId}`
        )
        try {
            const calendarData = await fetchCalendarEvents(
                calendarId,
                timeMin,
                timeMax
            )

            debugLog(
                'calendar',
                `✅ Calendar successfully fetched: "${calendarData.summary}"`
            )
            debugLog(
                'calendar',
                `Total events in calendar: ${calendarData.items.length}`
            )

            // Transform Google Calendar events to our format
            const events: CalendarEvent[] = calendarData.items.map(
                (item: GoogleCalendarEvent) => {
                    // Handle start and end dates (could be dateTime or date)
                    const startDate =
                        item.start.dateTime || item.start.date || ''
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
            const uniqueLocations = Array.from(
                new Set(
                    events
                        .map((event) => event.location)
                        .filter(
                            (location) => location && location.trim() !== ''
                        )
                )
            )

            debugLog(
                'calendar',
                `Unique locations to geocode: ${uniqueLocations.length}`
            )

            // Geocode locations in batches
            const geocodedLocations = await batchGeocodeLocations(
                uniqueLocations
            )

            debugLog(
                'geocoding',
                `Geocoded ${geocodedLocations.length} locations`
            )

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
                (event) =>
                    !event.resolved_location ||
                    event.resolved_location.status !== 'resolved'
            ).length

            debugLog(
                'calendar',
                `Events with unknown locations: ${unknownLocationsCount}`
            )

            // Construct the response
            const response: CMFEvents = {
                events: eventsWithLocationResolved,
                total_count: eventsWithLocationResolved.length,
                unknown_locations_count: unknownLocationsCount,
                calendar_name: calendarData.summary,
                calendar_id: calendarId,
            }

            debugLog('calendar', 'API response prepared', {
                total_count: response.total_count,
                unknown_locations_count: response.unknown_locations_count,
                calendar_name: response.calendar_name,
            })

            return NextResponse.json(response)
        } catch (error) {
            debugLog(
                'calendar',
                `❌ Failed to fetch calendar with ID: ${calendarId}`,
                error
            )
            return NextResponse.json(
                { error: 'Failed to fetch calendar events' },
                { status: 500 }
            )
        }
    } catch (error) {
        debugLog('calendar', 'Error processing calendar events', error)
        console.error('Error processing calendar events:', error)
        return NextResponse.json(
            { error: 'Failed to fetch calendar events' },
            { status: 500 }
        )
    }
}
