import { logr } from '@/lib/utils/logr'
import { CmfEvent, DateRangeIso } from '@/types/events'
import {
    format,
    formatDistance,
    parseISO,
    isValid,
    addDays,
    addWeeks,
    addMonths,
    differenceInMinutes,
    differenceInHours,
    differenceInDays,
} from 'date-fns'
import { DateTime } from 'luxon'

// Comprehensive timezone tests implemented in date.test.ts
/**
 * ============================================================================
 * DATE UTILITIES - TIMEZONE HANDLING STRATEGY
 * ============================================================================
 *
 * This module follows a clear strategy for handling dates and timezones:
 *
 * GENERAL PRINCIPLES:
 * 1. Dates should be stored WITHOUT timezone knowledge, as Date objects or
 *    ISO strings in .toISOString() format (UTC with 'Z' suffix)
 * 2. Use date-fns functions for date manipulation (e.g., addDays, subDays)
 * 3. Use date-fns/format for converting and displaying dates in local timezone
 * 4. Note date.getHours(), date.setHours(), etc. uses local timezone, but date-fns are better.
 * ============================================================================
 * TODO:
 * Instead of UTC, use ISO 8601 with offset. The following are Fully round-trippable by new Date(str).
 * 2025-09-23T04:01:00-07:00   // 4:01 AM PDT
 * 2025-09-23T12:01:00+02:00   // 12:01 PM CEST
 */

const LOCAL_DATE_REGEX = /^(\d{4})-(\d{1,2})-(\d{1,2})$/
const RELATIVE_REGEX = /^(-?\d+)([dwm])$/

/**
 * Get browser timezone information.  Used for display in About popup.
 * @returns Object with browser timezone and offset
 */
export function timezoneInfo(): { browserTz: string; tzOffset: string } {
    if (typeof Intl === 'undefined') return { browserTz: 'Unknown', tzOffset: '' }

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offsetMin = new Date().getTimezoneOffset()
    const offsetHr = -offsetMin / 60
    const sign = offsetHr >= 0 ? '+' : '-'
    const tzOffset = ` UTC${sign}${Math.abs(offsetHr)}`

    return { browserTz, tzOffset }
}

/**
 * Formats a date for display in the UI
 * TIMEZONE BEHAVIOR: Uses local timezone for display (date-fns handles timezone conversion)
 * @param dateString - ISO date string (stored without timezone knowledge, typically in UTC)
 * @returns Formatted date string: MM/DD Day hh:mm[am|pm] in local timezone
 */
export function formatEventDate(dateString: string, includeTime: boolean = true): string {
    try {
        const date = parseISO(dateString)
        if (!isValid(date)) {
            return 'Invalid date'
        }
        // date-fns/format automatically converts to local timezone for display
        // aaa is 'am' or 'pm'
        return includeTime ? format(date, 'M/d EEE h:mmaaa') : format(date, 'M/d EEE')
    } catch (error) {
        logr.warn('date', 'Error formatting date:', error)
        return 'Invalid date'
    }
}

/**
 * Calculates the duration between two dates.
 * TIMEZONE BEHAVIOR: Duration calculation uses date-fns (proper way).
 *
 * Special cases (data hacks):
 * - returns "0"  if end == start (exact start time not known).
 * - returns "??" if duration < 6 minutes (end time not known).
 *
 * @param startDateString - ISO start date string (no timezone stored)
 * @param endDateString - ISO end date string (no timezone stored)
 * @returns Formatted duration string (e.g., "2 hrs", "3 days", "??", or "0")
 */
export function formatEventDuration(startDateString: string, endDateString: string): string {
    try {
        const start = parseISO(startDateString)
        const end = parseISO(endDateString)

        if (!isValid(start) || !isValid(end)) return ''

        // Exact equality check
        if (start.getTime() === end.getTime()) return '0'

        const minutes = differenceInMinutes(end, start)

        // Hack case: very small duration
        if (minutes < 6) return '??'

        if (minutes < 60 * 24) {
            const hours = differenceInHours(end, start)
            return `${hours} hr${hours !== 1 ? 's' : ''}`
        }

        const days = differenceInDays(end, start)
        return `${days} day${days !== 1 ? 's' : ''}`
    } catch (error) {
        logr.warn('date', 'Error calculating duration:', error)
        return ''
    }
}

/**
 * Gets a relative time string (e.g., "2 days ago", "in 3 hours")
 * TIMEZONE BEHAVIOR: Uses local timezone for comparison with current time
 * @param dateString - ISO date string (stored without timezone knowledge)
 * @returns Relative time string in local timezone context
 */
export function getRelativeTimeString(dateString: string): string {
    const date = parseISO(dateString)
    if (!isValid(date)) {
        logr.warn('date', 'Invalid date for relative time', { dateString })
        return ''
    }
    // date-fns/formatDistance automatically handles timezone conversion for display
    return formatDistance(date, new Date(), { addSuffix: true })
}

/**
 * Formats a date for use in the URL
 * TIMEZONE BEHAVIOR: Converts to local timezone date (yyyy-MM-dd format)
 * @param dateIso - ISO date string (stored without timezone knowledge)
 * @returns string that is formatted for both human readability and parsing by getDateFromUrlDateString()
 */
export function formatDateForUrl(dateIso: string): string {
    // date-fns/format uses local timezone for date conversion
    const result = format(new Date(dateIso), 'yyyy-MM-dd')
    logr.info('date', ` formatDateForUrl('${dateIso}') -> '${result}'`)
    return result
}

/**
 * Returns a ISO string from a url date string that can be a date in one of these formats:
 * RFC3339 date string, YYYY-MM-DD, or a relative time string like 1d, -7d, 2w, 3m
 * TIMEZONE BEHAVIOR: Returns UTC ISO string for storage (always includes 'Z' suffix)
 * @param urlDateString - Date string in various formats.
 * @returns ISO string or empty string if invalid
 */
export function urlDateToIsoString(urlDateString: string): string {
    const date = getDateFromUrlDateString(urlDateString)
    if (!date) {
        // Should never happen since parseAsCmfDate should validate all url date strings
        logr.warn('date', 'Invalid date for urlDateToIsoString', { urlDateString })
        return ''
    }
    // Always return UTC ISO string for storage (with 'Z' suffix)
    return date.toISOString()
}

/**
 * Returns a Date object from a string that can be a date in one of these formats:
 * - RFC3339 date string (preserves timezone info)
 * - YYYY-MM-DD (interpreted in local timezone)
 * - Relative time string (1d, -7d, 2w, 3m), using local timezone
 *
 * TIMEZONE BEHAVIOR:
 * - YYYY-MM-DD → local midnight
 * - RFC3339 or ISO 8601→ preserves original timezone
 * - Relative → adds to "now" in local timezone
 * @param dateString - Date string in various formats.
 * @returns Date object or null if invalid
 */
export function getDateFromUrlDateString(dateString: string): Date | null {
    if (!dateString) return null

    // --- YYYY-MM-DD ---
    const dateMatch = LOCAL_DATE_REGEX.exec(dateString)
    if (dateMatch) {
        const [, year, month, day] = dateMatch
        const normalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        const date = parseISO(normalized) // local midnight
        return isValid(date) ? date : null
    }

    // --- RFC3339/ISO --- ex: https://ijmacd.github.io/rfc3339-iso8601/
    const parsed = new Date(dateString)
    if (!isNaN(parsed.getTime())) return parsed

    // --- Relative ---
    const relMatch = RELATIVE_REGEX.exec(dateString)
    if (relMatch) {
        const [, value, unit] = relMatch
        const num = parseInt(value, 10)
        const now = new Date()

        switch (unit) {
            case 'd':
                return addDays(now, num)
            case 'w':
                return addWeeks(now, num)
            case 'm':
                return addMonths(now, num)
            default:
                return null
        }
    }
    return null
}

/**
 * Helper to parse event date + tz and convert to UTC
 * If tz is valid, use luxon to parse the date and convert to UTC
 * If tz is invalid/missing/LOCAL/UNKNOWN, fallback to UTC
 * @param iso - The event's start/end ISO strings
 * @param tz - timezone
 * @returns Date
 */
const parseEventDate = (iso: string, tz?: string): Date => {
    if (tz && tz !== 'UNKNOWN' && tz !== 'LOCAL') {
        const dt = DateTime.fromISO(iso, { zone: tz })
        if (dt.isValid) return dt.toUTC().toJSDate()
        logr.warn('date', 'Invalid date with tz, falling back to UTC', { iso, tz })
    }
    return new Date(iso) // fallback
}

/**
 * Returns true if the event overlaps the given date range.
 *
 * TIMEZONE BEHAVIOR:
 * - If event has a valid tz, parse start/end in that timezone and convert to UTC.
 * - If tz is missing/invalid/LOCAL/UNKNOWN, treat start/end as UTC ISO strings.
 * - Range boundaries are assumed to be ISO UTC strings.
 *
 * @param event - The event with start/end ISO strings and optional tz
 * @param dateRange - Object with startIso and endIso (ISO strings, UTC)
 * @returns True if the event starts before end of range, or ends after start of range
 */
export function eventInDateRange(event: CmfEvent, dateRange: DateRangeIso): boolean {
    const eventStartUtc = parseEventDate(event.start, event.tz)
    const eventEndUtc = parseEventDate(event.end, event.tz)

    const rangeStart = new Date(dateRange.startIso)
    const rangeEnd = new Date(dateRange.endIso)

    // overlap check
    return eventStartUtc <= rangeEnd && eventEndUtc >= rangeStart
}

/**
 * Extracts date and time parts from a formatted date string
 * TIMEZONE BEHAVIOR: Uses local timezone for display formatting
 * @param dateString - ISO date string (stored without timezone knowledge)
 * @returns Object with dateDay (M/D Day) and time (hh:mm am/pm) parts in local timezone
 */
export function extractDateParts(dateString: string): { dateDay: string; time: string } {
    // formatEventDate handles timezone conversion for display
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
 * Helper to get start of day (04:01:00) for UI date filtering
 *
 * BUSINESS LOGIC: Uses 4:01am LOCAL time (not midnight) because users think of
 * 2-3am as "last night" rather than "today". When a user selects "Saturday"
 * in the date filter, they expect Friday night events (2-3am Saturday) to be
 * excluded from Saturday's results.
 *
 * TIMEZONE BEHAVIOR: Intentionally timezone-dependent. Converts 4:01am in the
 * user's local timezone to UTC for consistent user experience across locations.
 *
 * @param days - Number of days from the minimum date
 * @param minDate - The minimum date to calculate from
 * @returns ISO UTC string ('Z' suffix) representing 4:01am local time on the target day
 */
export function getStartOfDay(days: number, minDate: Date): string {
    const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
    date.setHours(4, 1, 0, 0)
    return date.toISOString()
}

/**
 * Helper to get end of day (23:59:59.999) for a given day offset from a minimum date in LOCAL timezone
 * TIMEZONE BEHAVIOR: Returns local timezone time for UI date selection
 * As documented: "11:59pm of end day in correct timezone"
 * @param days - Number of days from the minimum date
 * @param minDate - Date Object, The minimum date to calculate from
 * @returns string - ISO UTC timestamp ('Z' suffix) corresponding to 11:59:59.999 pm local time of the given day
 */
export function getEndOfDay(days: number, minDate: Date): string {
    const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
    date.setHours(23, 59, 59, 999)
    return date.toISOString()
}

// if you don't need to be at start or end of day, just use addDays(Date, numDays).
