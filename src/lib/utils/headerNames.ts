import type { EventsSource } from '@/types/events'
import { ExampleEventSource } from '@/lib/events/examples'
/**
 * Determines the appropriate header name based on event source configuration
 */
export function determineHeaderName(
    eventSourceId: string | string[] | null,
    eventSources: EventsSource[] | null,
    exampleEventsSources: ExampleEventSource[]
): string {
    // Default name for multiple sources (common) and for single source with no name (shouldn't happen)
    let headerName = 'Calendar Map Filter Sources'

    if (eventSources && eventSources.length === 1 && eventSources[0].name) {
        headerName = eventSources[0].name
    }

    // Handle array of event sources (when using shortId that expands to multiple sources)
    if (Array.isArray(eventSourceId)) {
        // Check if this array matches an example shortcut
        const eventSourceIdString = eventSourceId.join(',')
        const exampleSource = exampleEventsSources.find((es) => es.id === eventSourceIdString)
        if (exampleSource) {
            headerName = exampleSource.name
        }
        // If no matching example and multiple sources, keep the default 'Calendar Map Filter Sources'
    } else if (eventSources && eventSources.length > 1) {
        // Multiple sources but not an array eventSourceId - keep default name
        headerName = 'Calendar Map Filter Sources'
    } else {
        // Handle single event source
        const exampleSource = exampleEventsSources.find((es) => es.id === eventSourceId)
        if (exampleSource) {
            headerName = exampleSource.name
        }
    }

    return headerName
}
