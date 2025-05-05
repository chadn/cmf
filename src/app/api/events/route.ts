import { NextRequest, NextResponse } from 'next/server'
import { fetchEvents, getEventSourceHandler } from '@/lib/api/eventSources'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { getCache, setCache } from '@/lib/cache'
// Import event source handlers to ensure they're registered
import '@/lib/api/eventSources/googleCalendar'
import '@/lib/api/eventSources/protests'
// Add other event source imports here as they're implemented
// import '@/lib/api/eventSources/facebookEvents'

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

const API_CACHE_EXPIRE_MS = 1000 * 60 * 10 // 10 minutes
const TTL = 60 * 12 // 12 minutes (in seconds)
const EVENTS_CACHE_PREFIX = 'events:'

// Define the type for cached event responses
interface CachedEventResponse {
    response: {
        events: CmfEvent[]
        metadata: Record<string, any>
    }
    ms: number
}

// given a date in string or date object, return a date rounded to the nearest hour in RFC3339 format
function roundTimeToNearestHour(date: Date | string): string {
    if (!date) return ''
    const roundedDate = new Date(date)
    if (isNaN(roundedDate.getTime())) return ''
    roundedDate.setMinutes(0, 0, 0)
    return roundedDate.toISOString()
}

const fetchAndGeocode = async (eventSourceId: string, timeMin?: string, timeMax?: string) => {
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

        // Fetch events from the appropriate source or cache
        const fetchKey = `${eventSourceId}-${roundTimeToNearestHour(timeMin)}-${roundTimeToNearestHour(timeMax)}`
        logr.info('api-events', `Fetching events from cache for: ${fetchKey}`)
        const startTime = performance.now()

        // Try to get response from cache
        const cachedResponse = await getCache<CachedEventResponse>(fetchKey, EVENTS_CACHE_PREFIX)
        let ms = Math.round(performance.now() - startTime)

        // Check if we have a valid cached response
        if (cachedResponse && cachedResponse.ms > Date.now() - API_CACHE_EXPIRE_MS) {
            const st = new Date(cachedResponse.ms)
            logr.info('api-events', `Cache hit ${ms}ms on ${st.toISOString()} for ${fetchKey}`)
            return NextResponse.json(cachedResponse.response)
        }

        // If cache miss or expired, fetch from source
        if (cachedResponse) {
            logr.info('api-events', `Cache hit ${ms}ms for ${fetchKey}, but too old, not using.`)
        } else {
            logr.info('api-events', `No Cache hit ${ms}ms, calling API for ${fetchKey}`)
        }

        // Fetch and process events
        const response = await fetchAndGeocode(eventSourceId, timeMin || undefined, timeMax || undefined)

        // Save to cache in the background (don't await) but log when successful or failed
        process.nextTick(async () => {
            try {
                await setCache<CachedEventResponse>(fetchKey, { response, ms: Date.now() }, EVENTS_CACHE_PREFIX, TTL)
                logr.info('api-events', `Cached events for ${fetchKey}`)
            } catch (error) {
                logr.warn('api-events', `Failed to cache events for ${fetchKey}`, error)
            }
        })

        return NextResponse.json(response)
    } catch (error) {
        logr.warn('api-events', 'Error fetching events', error)

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
}
