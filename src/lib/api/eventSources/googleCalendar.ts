import { axiosGet } from '@/lib/utils/utils-server'
import { addMonths, subMonths, format } from 'date-fns'
import { GoogleCalendarResponse, GoogleCalendarEvent } from '@/types/googleApi'
import { CmfEvent, EventSourceParams, EventSourceResponse, EventSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSource } from './index'

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars'
const GOOGLE_CALENDAR_PUBLIC_URL_BASE = 'https://calendar.google.com/calendar/embed?src='
if (!process.env.GOOGLE_CALENDAR_API_KEY) {
    logr.warn('api-es-gc', 'Google Calendar API key is not configured')
} else {
    logr.info('api-es-gc', 'Google Calendar API key is configured')
}

export class GoogleCalendarEventSource extends BaseEventSourceHandler {
    public readonly type: EventSource = {
        prefix: 'gc',
        name: 'Google Calendar',
        url: '', // assigned to apiUrl below
    }
    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        const calendarData = await this.fetchGoogleCalendarEvents(params.id, params.timeMin, params.timeMax)

        // Transform Google Calendar events to our format
        const events: CmfEvent[] = calendarData.items.map((gcEvt: GoogleCalendarEvent) => {
            // Handle start and end dates (could be dateTime or date)
            const startDate = gcEvt.start.dateTime || gcEvt.start.date || ''
            const endDate = gcEvt.end.dateTime || gcEvt.end.date || ''

            return {
                id: gcEvt.id,
                name: gcEvt.summary,
                start: startDate,
                end: endDate,
                location: gcEvt.location || '',
                description: gcEvt.description || '',
                description_urls: this.extractUrls(gcEvt.description || ''),
                original_event_url: gcEvt.htmlLink,
                // Resolved location will be added later
            }
        })

        return {
            httpStatus: 200,
            events,
            source: {
                ...this.type,
                id: params.id,
                name: `Google Calendar: ${calendarData.summary}`,
                totalCount: events.length,
                unknownLocationsCount: 0, // This will be computed after geocoding
            },
        }
    }

    /**
     * Fetches events from Google Calendar API
     * @param calendarId - The ID of the Google Calendar
     * @param timeMin - Start date for events (defaults to 1 month ago)
     * @param timeMax - End date for events (defaults to 3 months from now)
     * @returns Promise with calendar events
     */
    private async fetchGoogleCalendarEvents(
        calendarId: string,
        timeMin?: string,
        timeMax?: string
    ): Promise<GoogleCalendarResponse> {
        if (!process.env.GOOGLE_CALENDAR_API_KEY) {
            logr.error('api-es-gc', 'Google Calendar API key is not configured, not fetching events')
            throw new Error('Google Calendar API key is not configured')
        }

        // Default time range: 1 month ago to 3 months from now
        const now = new Date()
        const defaultTimeMin = format(subMonths(now, 1), "yyyy-MM-dd'T'00:00:00'Z'")
        const defaultTimeMax = format(addMonths(now, 3), "yyyy-MM-dd'T'23:59:59'Z'")

        const params = {
            key: process.env.GOOGLE_CALENDAR_API_KEY,
            timeMin: timeMin || defaultTimeMin,
            timeMax: timeMax || defaultTimeMax,
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 2500, // Maximum allowed by the API
        }

        const apiUrl = `${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(calendarId)}/events`
        this.type.url = `${GOOGLE_CALENDAR_PUBLIC_URL_BASE}${encodeURIComponent(calendarId)}`

        logr.info('api-es-gc', `fetchGoogleCalendarEvents request`, {
            calendarId: calendarId,
            timeMin: params.timeMin,
            timeMax: params.timeMax,
            apiUrl: apiUrl,
        })

        // will throw if error, 'HTTP 500: ...
        const response = await axiosGet(apiUrl, params)

        if (response.data && response.data.items) {
            logr.info('api-es-gc', `fetchGoogleCalendarEvents response: ${response.data.items.length} events`)
        } else {
            logr.info('api-es-gc', 'fetchGoogleCalendarEvents unexpected', response)
        }
        return response.data
    }
}

// Register the Google Calendar event source
const googleCalendarEventSource = new GoogleCalendarEventSource()
registerEventSource(googleCalendarEventSource)

export default googleCalendarEventSource
