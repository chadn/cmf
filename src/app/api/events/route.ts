import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { fetchEvents, getEventSourceHandler, initializeEventSources } from '@/lib/api/eventSources'
import { batchGeocodeLocations } from '@/lib/api/geocoding'
import { getEventsCache, setEventsCache } from '@/lib/cache'
import { EventsSourceResponse } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { HttpError } from '@/types/error'
import { getTimezoneFromLatLng, validateTzUpdateEventTimes } from '@/lib/utils/timezones'
import { stringify } from '@/lib/utils/utils-shared'
import { umamiServer } from '@/lib/utils/umami'

// Import event source handlers to register their factories (alphabetical order)
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
import { addMonths, subMonths } from 'date-fns'

// Initialize all event sources (creates handler instances from factories)
initializeEventSources()

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

const cacheOrFetchAndGeocode = async (
    eventSourceId: string,
    timeMin: string,
    timeMax: string,
    useCache: boolean,
    noExpire: boolean
): Promise<EventsSourceResponse> => {
    // Check if we have a handler for this event source
    const { handler } = getEventSourceHandler(eventSourceId)
    if (!handler) {
        logr.info('api-events', `No handler found for event source: ${eventSourceId}`)
        throw new HttpError(400, `Unsupported event source type`)
    }

    // if timeMin or timeMax parameters not supplied, use system defaults to make it easy to cache.
    if (!(timeMin && timeMax)) {
        const now = new Date()
        let msg = ''
        if (!timeMin) {
            timeMin = subMonths(now, 1).toISOString()
            msg += ` timeMin:${timeMin}`
        }
        if (!timeMax) {
            timeMax = addMonths(now, 3).toISOString()
            msg += ` timeMax:${timeMax}`
        }
        logr.info('api-events', `using defaults for${msg}`)
    }

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
            return cachedResponse
        }
        logr.info('api-events', `Cache miss, ${fetchTime}ms. Calling fetchAndGeocode for ${eventSourceId}`)
    } else {
        logr.info('api-events', `skipCache true, not using cache. Calling fetchAndGeocode for ${eventSourceId}`)
    }
    // Fetch and process events
    const response = await fetchAndGeocode(eventSourceId, timeMin, timeMax)
    const ttl = noExpire ? -1 : handler.getCacheTtl()
    setEventsCache(response, eventSourceId, ttl, timeMin, timeMax)
    response.fromCache = false
    return response
}

const fetchAndGeocode = async (
    eventSourceId: string,
    timeMin: string,
    timeMax: string
): Promise<EventsSourceResponse> => {
    // FETCH EVENTS
    const startTime = performance.now()
    const { events, source } = await fetchEvents(eventSourceId, { timeMin, timeMax })
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

    // FINALIZE EVENTS - locations, timezones, times

    // Create a map for quick lookup, and add location_tz
    const locationMap = new Map()
    geocodedLocations.forEach((location) => {
        if (location.lat && location.lng) {
            location.location_tz = getTimezoneFromLatLng(location.lat, location.lng)
        }
        locationMap.set(location.original_location, location)
    })

    // Add resolved locations to events
    const eventsWithLocationResolved = events.map((event) => {
        if (event.resolved_location?.status === 'resolved') {
            // already resolved
            return event
        }
        const resolved_location = event.location ? locationMap.get(event.location) : undefined
        if (!resolved_location) {
            logr.warn('api-events', `Location not resolved: ${event.id} :${event.location}`)
            return event
        }
        return { ...event, resolved_location }
    })
    // Make sure times are updated and accurate
    const eventsWithTimes = eventsWithLocationResolved.map((event) => {
        try {
            return validateTzUpdateEventTimes(event)
        } catch (error) {
            logr.warn('api-events', `validateTzUpdateEventTimes skipped, error: ${error} ${stringify(event)}`)
            return event
        }
    })

    // Count events with unknown locations
    const unknownLocationsCount = eventsWithTimes.filter(
        (event) => !event.resolved_location || event.resolved_location.status !== 'resolved'
    ).length
    logr.info('api-events', `Events with unknown locations: ${unknownLocationsCount}`)

    // Construct the response
    const response: EventsSourceResponse = {
        events: eventsWithTimes,
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
    return apiEvents(request)
}

/**
 * /api/events endpoing handler
 * @param request
 * @returns
 */
export async function apiEvents(request: NextRequest) {
    const startTime = performance.now()

    const umamiProps: { [key: string]: string | number | boolean | undefined } = {
        path: request.nextUrl.pathname + request.nextUrl.search,
    }

    try {
        // Get event source from query parameters
        const eventSourceId = request.nextUrl.searchParams.get('id')

        if (!eventSourceId) {
            logr.info('api-events', 'Missing event source ID in request')
            return NextResponse.json({ error: 'Event source ID is required' }, { status: 400 })
        }
        // Get optional date range parameters
        const timeMin = request.nextUrl.searchParams.get('timeMin') || ''
        const timeMax = request.nextUrl.searchParams.get('timeMax') || ''
        const useCache = !(request.nextUrl.searchParams.get('skipCache') == '1')
        const statsOnly = request.nextUrl.searchParams.get('statsOnly') == '1' // for cache warming
        const noExpire = request.nextUrl.searchParams.get('noExpire') == '1' // set TTL to not expire

        const response = await cacheOrFetchAndGeocode(eventSourceId, timeMin, timeMax, useCache, noExpire)

        if (statsOnly) {
            logr.info('api-events', `statsOnly=1, returning object with empty events`)
            response.statsOnly = true
            response.events = []
        } else {
            logr.info('api-events', `NO statsOnly=1, returning normal`)
        }
        const totalTime = Math.round(performance.now() - startTime)
        umamiProps.sec = totalTime / 1000
        umamiProps.httpStatus = 200
        umamiProps.fromCache = response.fromCache ? '1' : '0'
        umamiProps.statsOnly = response.statsOnly ? '1' : '0'
        umamiProps.totalCount = response.source.totalCount // same as response.events.length unless statsOnly
        umamiProps.eventSourceId = eventSourceId
        // https://vercel.com/docs/headers/request-headers#x-forwarded-for Vercel makes this blank, try any way.
        umamiProps.clientIp =
            request.headers.get('x-forwarded-for') || request.headers.get('x-vercel-forwarded-for') || ''
        logr.info('api-events', `/api/events: ${totalTime}ms, umamiProps: ${stringify(umamiProps)}`)
        waitUntil(umamiServer('api-events', umamiProps, umamiProps.path as string))
        return NextResponse.json(response)
    } catch (error) {
        logr.warn('api-events', 'Error fetching events', error)

        let statusCode = 500
        let errorMessage = 'Internal server error'

        // Anything besides HTTP 200 should be done like:
        // throw new HttpError(400, `Unsupported event source type`)
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
        umamiProps.httpStatus = statusCode
        umamiProps.error = errorMessage
        const totalTime = Math.round(performance.now() - startTime)
        logr.info('api-events', `/api/events: ${totalTime}ms, umamiProps: ${stringify(umamiProps)}`)
        waitUntil(umamiServer('api-events', umamiProps, umamiProps.path as string)) // waitUntil sends after response is sent        return NextResponse.json({ error: errorMessage }, { status: statusCode })
        return NextResponse.json({ error: errorMessage }, { status: statusCode })
    }
}
