import type { EventsSource } from '@/types/events'
import { ExampleEventSource } from '@/lib/events/examples'

/**
 * Determines the appropriate header name based on event source configuration
 */
export function determineHeaderName(
    eventSources: EventsSource[] | null,
    exampleEventsSources: ExampleEventSource[]
): string {
    // First lets see if we match a shortId, then use that
    // Note that we must use window.location.search to get es value before it is changed by parseAsEventsSource
    const matches = window.location.search.match(/(?:[?&]es=)([^&]+)/)
    if (matches && matches[1]) {
        const shortId = matches[1]
        const exampleSource = exampleEventsSources.find((es) => es.shortId === shortId)
        if (exampleSource) {
            return exampleSource.name
        }
    }

    // if not matching shortId, check for single event source
    if (eventSources && eventSources.length === 1 && eventSources[0].name) {
        // Trim long names
        let headerName = eventSources[0].name.replace(/Google Calendar:/, '').trim()
        console.log('CHAD', headerName)
        headerName = headerName.length > 22 ? headerName.slice(0, 20) + '...' : headerName
        return headerName
    }

    if (eventSources && eventSources.length > 1) {
        return 'Various Event Sources'
    }
    // default name - should not happen since called only during processing-events state and all event sources should have a name
    return 'Calendar Map Filter Sources'
}
