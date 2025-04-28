import axios from 'axios'
import { GoogleCalendarResponse } from '@/types/api'
import { parseISO, addMonths, subMonths, format } from 'date-fns'
import { logr } from '@/lib/utils/logr'

const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars'

// NOTE: This file is being maintained for backward compatibility
// New code should use the event sources system in src/lib/api/eventSources/
// @deprecated Use src/lib/api/eventSources/googleCalendar.ts instead

/**
 * Fetches events from Google Calendar API
 * @param calendarId - The ID of the Google Calendar
 * @param timeMin - Start date for events (defaults to 1 month ago)
 * @param timeMax - End date for events (defaults to 3 months from now)
 * @returns Promise with calendar events
 * @deprecated Use the EventSourceHandler system instead
 */
export async function fetchGoogleCalendarEvents(
    calendarId: string,
    timeMin?: string,
    timeMax?: string
): Promise<GoogleCalendarResponse> {
    logr.info('api-cal', '[DEPRECATED] Using legacy fetchGoogleCalendarEvents. Consider migrating to event sources.')
    if (!process.env.GOOGLE_CALENDAR_API_KEY) {
        logr.info('api-cal', 'Google Calendar API key is not configured')
        throw new Error('Google Calendar API key is not configured')
    }

    logr.info('api-cal', 'Google Calendar API key is configured')

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

    logr.info('api-cal', `fetchGoogleCalendarEvents request`, {
        calendarId: calendarId,
        timeMin: params.timeMin,
        timeMax: params.timeMax,
        apiUrl: apiUrl,
    })

    try {
        const response = await axios.get(apiUrl, { params })

        if (response.data && response.data.items) {
            logr.info('api-cal', `fetchGoogleCalendarEvents response: ${response.data.items.length} events`)
        } else {
            logr.info('api', 'fetchGoogleCalendarEvents unexpected', response)
        }
        return response.data
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        logr.info('api-cal', `fetchGoogleCalendarEvents error: ${errorMessage}`)
        console.error('Error fetching calendar events:', error)
        throw error
    }
}

/**
 * Extracts URLs from a text string
 * @param text - The text to extract URLs from
 * @returns Array of URLs found in the text
 */
export function extractUrls(text: string): string[] {
    if (!text) return []

    const urlRegex = /(https?:\/\/[^\s]+)/g
    return text.match(urlRegex) || []
}
