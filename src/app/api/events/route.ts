import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents, getEventSourceHandler } from '@/lib/api/eventSources'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { getEventsCache, setEventsCache } from '@/lib/cache'
import { EventSourceResponse } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { HttpError } from '@/types/error'

// Import event source handlers to ensure they're registered (alphabetical order)
import '@/lib/api/eventSources/facebookEvents'
import '@/lib/api/eventSources/googleCalendar'
import '@/lib/api/eventSources/plura/index'
import '@/lib/api/eventSources/protests'
// Add other event source imports here as they're implemented
// import '@/lib/api/eventSources/facebookEvents'

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

const fetchAndGeocode = async (
    eventSourceId: string,
    timeMin?: string,
    timeMax?: string
): Promise<EventSourceResponse> => {
    const startTime = performance.now()
    const { events, metadata } = await fetchEvents(eventSourceId, {
        timeMin,
        timeMax,
    })
    let ms = Math.round(performance.now() - startTime)
    const sz = JSON.stringify({ events, metadata }).length
    logr.info('api-events', `/api/events fetched ${events.length} events in ${ms}ms ${sz} bytes ${eventSourceId}`)

    // GEOCODE LOCATIONS
    const uniqueLocations = Array.from(
        new Set(events.map((event) => event.location).filter((location) => location && location.trim() !== ''))
    )
    const geocodedLocations = await batchGeocodeLocations(uniqueLocations)
    logr.info('api-events', `Geocoded ${geocodedLocations.length} of ${uniqueLocations.length} locations`)

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
    logr.info('api-events', `Events with unknown locations: ${unknownLocationsCount}`)

    // Construct the response
    const response: EventSourceResponse = {
        events: eventsWithLocationResolved,
        metadata: {
            ...metadata,
            unknownLocationsCount,
        },
        httpStatus: 200,
    }

    const sizeOfResponse = JSON.stringify(response).length
    ms = Math.round(performance.now() - startTime)

    logr.info('api-events', `/api/events response ${sizeOfResponse} bytes, ${ms}ms for fetch + geocode`, {
        totalCount: response.events.length,
        metadata: response.metadata,
    })

    return response
}

/**
 * API route handler for events from various sources
 */
export async function GET(request: NextRequest) {
    try {
        // Get event source from query parameters
        const eventSourceId = request.nextUrl.searchParams.get('id')

        if (!eventSourceId) {
            logr.info('api-events', 'Missing event source ID in request')
            return NextResponse.json({ error: 'Event source ID is required' }, { status: 400 })
        }

        // Check if we have a handler for this event source
        const handler = getEventSourceHandler(eventSourceId)
        if (!handler) {
            logr.info('api-events', `No handler found for event source: ${eventSourceId}`)
            return NextResponse.json({ error: 'Unsupported event source type' }, { status: 400 })
        }

        // Get optional date range parameters
        const timeMin = request.nextUrl.searchParams.get('timeMin') || ''
        const timeMax = request.nextUrl.searchParams.get('timeMax') || ''

        // Fetch events from the cache if available
        const startTime = performance.now()
        const cachedResponse = await getEventsCache(eventSourceId, timeMin, timeMax)
        const fetchTime = Math.round(performance.now() - startTime)
        if (cachedResponse) {
            logr.info(
                'api-events',
                `Cache hit in ${fetchTime}ms, returning ${cachedResponse.events.length} events for ${eventSourceId}`
            )
            return NextResponse.json(cachedResponse)
        }
        logr.info('api-events', `Cache miss, ${fetchTime}ms. Calling fetchAndGeocode for ${eventSourceId}`)

        // Fetch and process events
        const response = await fetchAndGeocode(eventSourceId, timeMin, timeMax)
        setEventsCache(response, eventSourceId, timeMin, timeMax)

        // Anything besides HTTP 200 should be done like: throw new Error(`HTTP 404: No events found`)
        return NextResponse.json(response)
    } catch (error) {
        logr.warn('api-events', 'Error fetching events', error)

        let statusCode = 500
        let errorMessage = 'Internal server error'

        if (error instanceof HttpError) {
            statusCode = error.statusCode
            errorMessage = error.message
        } else if (error instanceof Error) {
            // Try to extract status code from error message
            const match = error.message.match(/^HTTP (\d+): (.+)$/)
            if (match) {
                statusCode = parseInt(match[1], 10)
                errorMessage = match[2]
            } else {
                errorMessage = error.message
            }
        }

        return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }
}
