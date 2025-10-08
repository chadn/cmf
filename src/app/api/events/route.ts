import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents, getEventSourceHandler } from '@/lib/api/eventSources'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { getEventsCache, setEventsCache } from '@/lib/cache'
import { EventsSourceResponse } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { HttpError } from '@/types/error'
import { convertUtcToTimeZone, getTimezoneFromLatLng } from '@/lib/utils/timezones'

// Import event source handlers to ensure they're registered (alphabetical order)
import '@/lib/api/eventSources/19hz'
import '@/lib/api/eventSources/dissent-google-sheets'
import '@/lib/api/eventSources/facebookEvents'
import '@/lib/api/eventSources/foopee'
import '@/lib/api/eventSources/googleCalendar'
import '@/lib/api/eventSources/mobilize'
import '@/lib/api/eventSources/nokings'
import '@/lib/api/eventSources/plura/index'
import '@/lib/api/eventSources/protests'
import '@/lib/api/eventSources/testSource'

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

const fetchAndGeocode = async (
    eventSourceId: string,
    timeMin?: string,
    timeMax?: string
): Promise<EventsSourceResponse> => {
    const startTime = performance.now()
    const { events, source } = await fetchEvents(eventSourceId, {
        timeMin,
        timeMax,
    })
    let ms = Math.round(performance.now() - startTime)
    const sz = JSON.stringify({ events, source }).length
    logr.info('api-events', `/api/events fetched ${events.length} events in ${ms}ms ${sz} bytes ${eventSourceId}`)

    // GEOCODE LOCATIONS
    const uniqueLocations = Array.from(
        new Set(
            events
                // skip events with resolved status
                .filter((event) => event.resolved_location?.status !== 'resolved')
                // skip invalid or blank locations
                .map((event) => event.location?.trim())
                .filter((location): location is string => !!location)
        )
    )
    const geocodedLocations = await batchGeocodeLocations(uniqueLocations)
    logr.info(
        'api-events',
        `Geocoded/unique/total: ${geocodedLocations.length}/${uniqueLocations.length}/${events.length}`
    )

    // Create a map for quick lookup
    const locationMap = new Map()
    geocodedLocations.forEach((location) => {
        locationMap.set(location.original_location, location)
    })

    // Add resolved locations to events
    const eventsWithLocationResolved = events.map((event) => {
        // Always populate startSecs for reliable sorting
        event.startSecs = Math.round(new Date(event.start).getTime() / 1000)

        if (event.location && locationMap.has(event.location)) {
            const resolved_location = locationMap.get(event.location)
            if (event.tz === 'CONVERT_UTC_TO_LOCAL' && resolved_location) {
                event.tz = getTimezoneFromLatLng(resolved_location.lat, resolved_location.lng)
                if (event.tz == 'UNKNOWN_TZ') {
                    // TODO: try another way - get or guess timezone from address?
                }
                if (event.tz != 'UNKNOWN_TZ') {
                    event.start = convertUtcToTimeZone(event.start, event.tz)
                    event.end = convertUtcToTimeZone(event.end, event.tz)
                    // Recalculate startSecs after timezone conversion
                    event.startSecs = Math.round(new Date(event.start).getTime() / 1000)
                }
            }
            return {
                ...event,
                resolved_location: resolved_location,
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
    const response: EventsSourceResponse = {
        events: eventsWithLocationResolved,
        source: {
            ...source,
            unknownLocationsCount,
        },
        httpStatus: 200,
    }

    const sizeOfResponse = JSON.stringify(response).length
    ms = Math.round(performance.now() - startTime)

    logr.info('api-events', `/api/events response ${sizeOfResponse} bytes, ${ms}ms for fetch + geocode`, {
        totalCount: response.events.length,
        source: response.source,
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
        const [handler] = getEventSourceHandler(eventSourceId)
        if (!handler) {
            logr.info('api-events', `No handler found for event source: ${eventSourceId}`)
            return NextResponse.json({ error: 'Unsupported event source type' }, { status: 400 })
        }

        // Get optional date range parameters
        const timeMin = request.nextUrl.searchParams.get('timeMin') || ''
        const timeMax = request.nextUrl.searchParams.get('timeMax') || ''
        const useCache = !(request.nextUrl.searchParams.get('skipCache') == '1')

        if (useCache) {
            // Fetch events from the cache if available
            const startTime = performance.now()
            const cachedResponse = await getEventsCache(eventSourceId, handler.getCacheTtl(), timeMin, timeMax)
            const fetchTime = Math.round(performance.now() - startTime)
            if (cachedResponse) {
                logr.info(
                    'api-events',
                    `Cache hit in ${fetchTime}ms, returning ${cachedResponse.events.length} events for ${eventSourceId}`
                )
                cachedResponse.fromCache = true
                return NextResponse.json(cachedResponse)
            }
            logr.info('api-events', `Cache miss, ${fetchTime}ms. Calling fetchAndGeocode for ${eventSourceId}`)
        } else {
            logr.info('api-events', `skipCache true, not using cache. Calling fetchAndGeocode for ${eventSourceId}`)
        }
        // Fetch and process events
        const response = await fetchAndGeocode(eventSourceId, timeMin, timeMax)
        setEventsCache(response, eventSourceId, handler.getCacheTtl(), timeMin, timeMax)
        response.fromCache = false

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
