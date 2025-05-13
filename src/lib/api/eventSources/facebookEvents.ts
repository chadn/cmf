import { EventSourceParams, EventSourceResponse, EventSourceType, CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSource } from './index'
import { parseIcsContent } from '@/lib/utils/icsParser'
import axios from 'axios'

/**
 * Facebook Events source handler implementation
 */
export class FacebookEventsSource extends BaseEventSourceHandler {
    // Event source format: 'fb:${facebookUid}-${facebookKey}'
    // https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
    public readonly type: EventSourceType = {
        prefix: 'fb',
        name: 'Facebook Events',
    }

    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        if (!params.id || !params.id.includes('-')) {
            logr.warn('api-es-fb', 'Invalid Facebook event source ID format', { id: params.id })
            throw new Error('Invalid Facebook event source ID format')
        }

        const [uid, key] = params.id.split('-')
        const icsUrl = `https://www.facebook.com/events/ical/upcoming/?uid=${uid}&key=${key}`

        // ICS Feed URL https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
        logr.info('api-es-fb', `Fetching Facebook events (note cannot customize timeMin/timeMax)`, icsUrl)

        try {
            const response = await axios.get(icsUrl)

            if (!response.data) {
                logr.warn('api-es-fb', 'Empty response from Facebook Events')
                throw new Error('Empty response from Facebook Events')
            }

            const parsedEvents = parseIcsContent(response.data)
            logr.info('api-es-fb', `Parsed ${parsedEvents.length} events from Facebook`)

            const cmfEvents: CmfEvent[] = parsedEvents
                .filter(
                    (event) =>
                        (!params.timeMin || event.startTime.toISOString() >= params.timeMin) &&
                        (!params.timeMax || event.endTime.toISOString() <= params.timeMax)
                )
                .map((event) => ({
                    id: event.id,
                    name: event.summary,
                    start: event.startTime.toISOString(),
                    end: event.endTime.toISOString(),
                    location: event.location || '',
                    description: event.description || '',
                    description_urls: this.extractUrls(event.description || ''),
                    original_event_url: event.url || '',
                }))

            logr.info('api-es-fb', `Returning ${cmfEvents.length} filtered Facebook events`)

            return {
                httpStatus: 200,
                events: cmfEvents,
                metadata: {
                    id: params.id,
                    name: 'Facebook Events',
                    type: this.type,
                    totalCount: cmfEvents.length,
                    unknownLocationsCount: 0,
                },
            }
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logr.error('api-es-fb', `Facebook events HTTP error: ${error.response?.statusText}`, {
                    status: error.response?.status,
                    data: error.response?.data,
                })
                throw new Error(`HTTP ${error.response?.status || 500}: ${error.response?.statusText}`)
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.error('api-es-fb', `Failed to fetch Facebook events: ${errorMessage}`, error)
            throw new Error(`HTTP 500: ${errorMessage}`)
        }
    }
}

// Register the Facebook Events source
const facebookEventsSource = new FacebookEventsSource()
registerEventSource(facebookEventsSource)

export default facebookEventsSource
