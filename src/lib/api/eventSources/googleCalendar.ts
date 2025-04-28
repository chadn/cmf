import axios from 'axios'
import { parseISO, addMonths, subMonths, format } from 'date-fns'
import { GoogleCalendarResponse, GoogleCalendarEvent } from '@/types/api'
import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import {
    BaseEventSourceHandler,
    EventSourceParams,
    EventSourceResponse,
    EventSourceType,
    registerEventSource,
} from './index'

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars'
if (!process.env.GOOGLE_CALENDAR_API_KEY) {
    logr.warn('api-es-gc', 'Google Calendar API key is not configured')
} else {
    logr.info('api-es-gc', 'Google Calendar API key is configured')
}

export class GoogleCalendarEventSource extends BaseEventSourceHandler {
    public readonly type: EventSourceType = {
        prefix: 'gc',
        name: 'Google Calendar',
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
            events,
            metadata: {
                id: params.id,
                name: calendarData.summary,
                totalCount: events.length,
                unknownLocationsCount: 0, // This will be computed after geocoding
                type: this.type,
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

        logr.info('api-es-gc', `fetchGoogleCalendarEvents request`, {
            calendarId: calendarId,
            timeMin: params.timeMin,
            timeMax: params.timeMax,
            apiUrl: apiUrl,
        })

        try {
            const response = await axios.get(apiUrl, { params })

            if (response.data && response.data.items) {
                logr.info('api-es-gc', `fetchGoogleCalendarEvents response: ${response.data.items.length} events`)
            } else {
                logr.info('api-es-gc', 'fetchGoogleCalendarEvents unexpected', response)
            }
            return response.data
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.info('api-es-gc', `fetchGoogleCalendarEvents error: ${errorMessage}`)
            console.error('Error fetching calendar events:', error)
            throw error
        }
    }
}

// Register the Google Calendar event source
const googleCalendarEventSource = new GoogleCalendarEventSource()
registerEventSource(googleCalendarEventSource)

export default googleCalendarEventSource
