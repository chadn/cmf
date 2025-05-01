import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents, getEventSourceHandler } from '@/lib/api/eventSources'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'

// Import event source handlers to ensure they're registered
import '@/lib/api/eventSources/googleCalendar'
import '@/lib/api/eventSources/protests'
// Add other event source imports here as they're implemented
// import '@/lib/api/eventSources/facebookEvents'

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

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

        logr.info('api-events', `Fetching events from source: ${eventSourceId}`)

        // Get optional date range parameters
        const timeMin = request.nextUrl.searchParams.get('timeMin') || undefined
        const timeMax = request.nextUrl.searchParams.get('timeMax') || undefined

        if (timeMin && timeMax) {
            logr.info('api-events', `Date range specified: ${timeMin} to ${timeMax}`)
        }

        try {
            // Fetch events from the appropriate source
            // TODO: should searchParams be passed to fetchEvents? then each handler can decide what params it needs

            const startTime = performance.now()
            const { events, metadata } = await fetchEvents(eventSourceId, {
                timeMin,
                timeMax,
            })
            let ms = Math.round(performance.now() - startTime)
            const sz = JSON.stringify({ events, metadata }).length
            logr.info('api-events', `API fetched ${events.length} events in ${ms}ms ${sz} bytes ${eventSourceId}`)

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
            const response = {
                events: eventsWithLocationResolved,
                metadata,
            }
            const sizeOfResponse = JSON.stringify(response).length
            ms = Math.round(performance.now() - startTime)

            logr.info('api-events', `API response ${sizeOfResponse} bytes, ${ms}ms for fetch + geocode`, {
                totalCount: response.events.length,
                metadata,
            })

            return NextResponse.json(response)
        } catch (error) {
            logr.info('api-events', `❌ Failed to fetch events from source: ${eventSourceId}`)
            // Default error response
            let statusCode = 500
            let errorMessage = 'Internal server error'

            if (error instanceof Error) {
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
    } catch (error) {
        logr.warn('api-events', 'Unknown error fetching events', error)
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
    }
}
