import { EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { env } from '@/lib/config/env'

/**
 * Base class for event source handlers that provides common functionality
 */
export abstract class BaseEventSourceHandler {
    abstract type: EventsSource
    abstract fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse>

    getCacheTtl(): number {
        // in seconds, if >0 and httpStatus=200, cache this response for that many seconds
        return env.CACHE_TTL_API_EVENTSOURCE
    }

    /**
     * Extracts URLs from a text string
     * @param text - The text to extract URLs from
     * @returns Array of URLs found in the text
     */
    extractUrls(text: string): string[] {
        if (!text) return []

        const urlRegex = /(https?:\/\/[^\s]+)/g
        return text.match(urlRegex) || []
    }
}

// Registry of event source handlers
const eventSourceHandlers: BaseEventSourceHandler[] = []

/**
 * Register a new event source handler
 */
export function registerEventsSource(handler: BaseEventSourceHandler): void {
    // check existing handlers for duplicate prefix
    const existingHandler = eventSourceHandlers.find((h) => h.type.prefix === handler.type.prefix)
    if (existingHandler) {
        logr.error(
            'api-es',
            `Prefix ${existingHandler.type.prefix} already registered for "${existingHandler.type.name}", not registering "${handler.type.name}"`
        )
        return
    }
    eventSourceHandlers.push(handler)
    logr.info('api-es', `Registered event source handler: ${handler.type.prefix}: "${handler.type.name}"`)
}

/**
 * Get the appropriate handler for an event source, and the source ID, by parsing the event source string
 */
export function getEventSourceHandler(eventSourceId: string): [BaseEventSourceHandler, string] | [null, ''] {
    for (const handler of eventSourceHandlers) {
        if (handler.type.prefix === eventSourceId.slice(0, handler.type.prefix.length)) {
            return [handler, eventSourceId.slice(handler.type.prefix.length + 1)]
        }
    }
    return [null, '']
}

/**
 * Fetch events from the specified event source
 */
export async function fetchEvents(
    eventSourceId: string,
    params: Omit<EventsSourceParams, 'id'>
): Promise<EventsSourceResponse> {
    const [handler, sourceId] = getEventSourceHandler(eventSourceId)

    if (!handler) {
        throw new Error(`No handler available for event source: ${eventSourceId}`)
    }
    logr.info('api-es', `Fetching events from "${handler.type.name}" with id: ${sourceId}`)

    // Returning anything besides HTTP 200 should be done like: throw new HttpError(404, 'No events found')

    return handler.fetchEvents({ ...params, id: sourceId })
}
