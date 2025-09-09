import { logr } from '@/lib/utils/logr'
import { format, formatDistance, parseISO, isValid } from 'date-fns'

/**
 * Formats a date for display in the UI
 * @param dateString - ISO date string
 * @returns Formatted date string: MM/DD Day hh:mm[am|pm] [UTC±HH]
 */
export function formatEventDate(dateString: string, includeTime: boolean = true): string {
    try {
        const date = parseISO(dateString)
        if (!isValid(date)) {
            return 'Invalid date'
        }
        // aaa is 'am' or 'pm'
        return includeTime ? format(date, 'M/d EEE h:mmaaa') : format(date, 'M/d EEE')
    } catch (error) {
        logr.warn('date', 'Error formatting date:', error)
        return 'Invalid date'
    }
}

/**
 * Calculates the duration between two dates.
 * Hack: if end == start, exact start time is not known. If 1 minute after start, end time is not known.
 * @param startDateString - ISO start date string
 * @param endDateString - ISO end date string
 * @returns Formatted duration string (e.g., "2 hrs" or "3 days")
 *         or "??" if duration is less than 6 minutes, hack for when end time is not known.
 *         or "0"  when end is same as start, hack for when exact start time not known
 */
export function formatEventDuration(startDateString: string, endDateString: string): string {
    try {
        const startDate = parseISO(startDateString)
        const endDate = parseISO(endDateString)

        // Check if either date is invalid
        if (!isValid(startDate) || !isValid(endDate)) {
            return ''
        }

        const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)

        if (durationHours < 0.1) {
            return '??'
        }

        return durationHours < 24
            ? `${Math.round(durationHours)} hr${durationHours !== 1 ? 's' : ''}`
            : `${Math.round(durationHours / 24)} day${durationHours / 24 !== 1 ? 's' : ''}`
    } catch (error) {
        logr.warn('date', 'Error calculating duration:', error)
        return ''
    }
}

/**
 * Gets a relative time string (e.g., "2 days ago", "in 3 hours")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function getRelativeTimeString(dateString: string): string {
    const date = parseISO(dateString)
    if (!isValid(date)) {
        logr.warn('date', 'Invalid date for relative time', { dateString })
        return ''
    }
    return formatDistance(date, new Date(), { addSuffix: true })
}

// Returns a date object from a string that can be a date in one of these formats
// RFC3339 date string
//  YYYY-MM-DD
// or a relative time string like 1d, -7d, 2w, 3m
export function getDateFromUrlDateString(dateString: string): Date | null {
    // Early return for empty or invalid input
    if (!dateString) return null

    // Try parsing as YYYY-MM-DD or YYYY-M-D first
    const dateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
    const dateMatch = dateString.match(dateRegex)
    if (dateMatch) {
        const [, year, month, day] = dateMatch
        const normalizedDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const date = parseISO(normalizedDate)
        return isValid(date) ? date : null
    }

    // Try parsing as a standard date (RFC3339)
    const parsedDate = new Date(dateString)
    if (!isNaN(parsedDate.getTime())) {
        return parsedDate
    }

    // Try parsing as relative time (e.g., 1d, -7d, 2w, 3m)
    const relativeRegex = /^(-?\d+)([dwm])$/
    const match = dateString.match(relativeRegex)

    if (match) {
        const [, value, unit] = match
        const numValue = parseInt(value, 10)
        const now = new Date()

        switch (unit) {
            case 'd':
                now.setDate(now.getDate() + numValue)
                break
            case 'w':
                now.setDate(now.getDate() + numValue * 7)
                break
            case 'm':
                now.setMonth(now.getMonth() + numValue)
                break
        }

        return now
    }

    return null
}

/**
 * Calculates today's value in slider units (days from minDate)
 * @param now - Current date
 * @param minDate - Minimum date for the slider
 * @returns Number of days from minDate to now
 */
export function calculateTodayValue(now: Date, minDate: Date): number {
    return Math.floor((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))
}

/**
 * Extracts date and time parts from a formatted date string
 * @param dateString - ISO date string
 * @returns Object with dateDay (M/D Day) and time (hh:mm am/pm) parts
 */
export function extractDateParts(dateString: string): { dateDay: string; time: string } {
    const fullDate = formatEventDate(dateString)
    // Split the date into parts (M/D Day and Time)
    const parts = fullDate.match(/^([\d/]+\s[A-Za-z]+)\s(.+)$/)
    if (parts && parts.length >= 3) {
        return {
            dateDay: parts[1], // M/D Day
            time: parts[2], // hh:mm am/pm
        }
    }
    return {
        dateDay: fullDate,
        time: '',
    }
}

/**
 * Summary of start and end time Logic
 * When matching events to date filter window,
 * the time chosen for start of window is 4:01am of start day in correct timezone, 
 * and end of window is 11:59pm of end day in correct timezone.  
 * Any event that ends after start of window, or starts before end of window should be included.
 * 4:01am is used because people think of Saturday 2am or 3am as Friday night, 
 * and we don't want to include friday night events when date filter starts on saturday.
 * 
 * Currently the date slider cannot pick time, only days.
 * In the future the date slider may support times, and this logic will need to account for that.
 */

/**
 * Helper to get start of day (04:01:00) for a given day offset from a minimum date
 * Using 4:01am as start of day so as not to include events that end at 2am, 3am, or 4am.
 * @param days - Number of days from the minimum date
 * @param minDate - The minimum date to calculate from
 * @returns ISO string for start of day
 */
export function getStartOfDay(days: number, minDate: Date): string {
    const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
    date.setHours(4, 1, 0, 0)
    return date.toISOString()
}

/**
 * Helper to get end of day (23:59:59) for a given day offset from a minimum date
 * @param days - Number of days from the minimum date
 * @param minDate - The minimum date to calculate from
 * @returns ISO string for end of day
 */
export function getEndOfDay(days: number, minDate: Date): string {
    const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
    date.setHours(23, 59, 59, 999)
    return date.toISOString()
}
