import { EventsSourceParams, EventsSourceResponse, EventsSource, CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventsSource } from './index'
import { parseIcsContent } from '@/lib/utils/icsParser'
import axios from 'axios'
import { HttpError } from '@/types/error'

/**
 * Facebook Events source handler implementation
 */
export class FacebookEventsSource extends BaseEventSourceHandler {
    // Event source format: 'fb:${facebookUid}-${facebookKey}'
    // https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
    public readonly type: EventsSource = {
        prefix: 'fb',
        name: 'Facebook Events',
        url: '', // assigned to icsUrl below
    }

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        if (!params.id || !params.id.includes('-')) {
            logr.warn('api-es-fb', 'Invalid Facebook event source ID format', { id: params.id })
            throw new Error('Invalid Facebook event source ID format')
        }

        const [uid, key] = params.id.split('-')
        const icsUrl = `https://www.facebook.com/events/ical/upcoming/?uid=${uid}&key=${key}`
        this.type.url = icsUrl

        // ICS Feed URL https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
        logr.info('api-es-fb', `Fetching Facebook events (note cannot customize timeMin/timeMax)`, icsUrl)

        try {
            const response = await axios.get(icsUrl)

            if (!response.data) {
                logr.warn('api-es-fb', 'Empty response from Facebook Events')
                throw new HttpError(404, 'Empty response from Facebook Events')
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
                source: {
                    ...this.type,
                    id: params.id,
                    name: 'Facebook Events',
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
                throw new HttpError(error.response?.status || 500, error.response?.statusText || 'Unknown error')
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.error('api-es-fb', `Failed to fetch Facebook events: ${errorMessage}`, error)
            throw new HttpError(500, errorMessage)
        }
    }
}

// Register the Facebook Events source
const facebookEventsSource = new FacebookEventsSource()
registerEventsSource(facebookEventsSource)

export default facebookEventsSource
