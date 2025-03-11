import axios from 'axios'
import { GoogleCalendarResponse } from '@/types/api'
import { parseISO, addMonths, subMonths, format } from 'date-fns'

const GOOGLE_CALENDAR_API_BASE =
    'https://www.googleapis.com/calendar/v3/calendars'

/**
 * Fetches events from Google Calendar API
 * @param calendarId - The ID of the Google Calendar
 * @param timeMin - Start date for events (defaults to 1 month ago)
 * @param timeMax - End date for events (defaults to 3 months from now)
 * @returns Promise with calendar events
 */
export async function fetchCalendarEvents(
    calendarId: string,
    timeMin?: string,
    timeMax?: string
): Promise<GoogleCalendarResponse> {
    if (!process.env.GOOGLE_CALENDAR_API_KEY) {
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

    try {
        const response = await axios.get(
            `${GOOGLE_CALENDAR_API_BASE}/${encodeURIComponent(
                calendarId
            )}/events`,
            { params }
        )
        return response.data
    } catch (error) {
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
