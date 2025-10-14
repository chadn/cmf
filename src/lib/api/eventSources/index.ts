import { EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { env } from '@/lib/config/env'
import { HttpError } from '@/types/error'

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

/**
 * Result of looking up an event source handler
 */
export interface EventSourceLookupResult {
    handler: BaseEventSourceHandler | null
    sourceId: string
}

// Type for event source factory functions
type EventSourceFactory = () => BaseEventSourceHandler

// Registry of event source factories (not yet instantiated)
const eventSourceFactories: EventSourceFactory[] = []

// Registry of instantiated event source handlers
const eventSourceHandlers: BaseEventSourceHandler[] = []

// Track if initialization has happened
let initialized = false

/**
 * Register a factory function that creates an event source handler.
 * The factory will be called during initialization.
 * This allows event source modules to register themselves without side effects.
 */
export function registerEventSourceFactory(factory: EventSourceFactory): void {
    if (initialized) {
        logr.warn('api-es', 'Attempting to register event source factory after initialization')
    }
    eventSourceFactories.push(factory)
}

/**
 * Initialize all registered event source handlers.
 * This should be called once at application startup.
 * After initialization, no new factories can be registered.
 */
export function initializeEventSources(): void {
    if (initialized) {
        logr.warn('api-es', 'Event sources already initialized, skipping')
        return
    }

    logr.info('api-es', `Initializing ${eventSourceFactories.length} event source handlers...`)

    eventSourceFactories.forEach((factory) => {
        try {
            const handler = factory()

            // Check for duplicate prefix
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
        } catch (error) {
            logr.error('api-es', `Failed to initialize event source: ${error}`)
        }
    })

    initialized = true
    logr.info('api-es', `Event sources initialized: ${eventSourceHandlers.length} handlers ready`)
}

/**
 * Get the appropriate handler for an event source, and the source ID, by parsing the event source string.
 * @param eventSourceId - The event source identifier (e.g., 'gc:calendar@gmail.com')
 * @returns Object with handler and sourceId. Handler is null if not found.
 */
export function getEventSourceHandler(eventSourceId: string): EventSourceLookupResult {
    for (const handler of eventSourceHandlers) {
        const prefix = handler.type.prefix

        //const pattern = new RegExp(`^${prefix}(?=\\b|:)`, 'i')
        if (eventSourceId.startsWith(`${prefix}:`) || eventSourceId.startsWith(`${prefix}.`)) {
            const sourceId = eventSourceId.slice(prefix.length + 1) // remove prefix + ':' or '.'
            return { handler, sourceId }
        }
    }
    return { handler: null, sourceId: '' }
}

/**
 * Fetch events from the specified event source.
 * @param eventSourceId - The event source identifier (e.g., 'gc:calendar@gmail.com')
 * @param params - Parameters for fetching events (timeMin, timeMax)
 * @returns Promise with events and source metadata
 * @throws {HttpError} If no handler is found for the event source
 */
export async function fetchEvents(
    eventSourceId: string,
    params: Omit<EventsSourceParams, 'id'>
): Promise<EventsSourceResponse> {
    const { handler, sourceId } = getEventSourceHandler(eventSourceId)

    if (!handler) {
        throw new HttpError(400, `No handler available for event source: ${eventSourceId}`)
    }
    logr.info('api-es', `Fetching events from "${handler.type.name}" with id: ${sourceId}`)

    // Note: Handlers should throw HttpError for non-200 responses, e.g.:
    // throw new HttpError(404, 'No events found')

    return handler.fetchEvents({ ...params, id: sourceId })
}
