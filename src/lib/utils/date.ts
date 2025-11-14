import {
    format,
    formatDistance,
    parse,
    parseISO,
    isValid,
    addHours,
    addDays,
    addWeeks,
    addMonths,
    differenceInMinutes,
    differenceInHours,
    differenceInDays,
    setHours,
    startOfDay,
} from 'date-fns'
import { DateTime } from 'luxon'
import { CmfEvent, DateRangeIso } from '@/types/events'
import { isValidTimeZone } from '@/lib/utils/timezones'
import { logr } from '@/lib/utils/logr'

// Comprehensive timezone tests implemented in date.test.ts
/**
 * ============================================================================
 * DATE UTILITIES - TIMEZONE HANDLING STRATEGY
 * ============================================================================
 *
 * This module follows a clear strategy for handling dates and timezones:
 *
 * New Strategy:
 * Store timezone string in event.tz
 * Store event.startSecs and event.endSecs times as numbers, seconds since epoch
 * Store event.start and event.end  as ISO 8601 strings
 * Use extra logging to find and fix bugs
 *
 * OLD STRATEGY, led to bugs, keeping for reference for now. TODO: remove.
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
 * Formats a date for display in the UI with Timezone
 * Behavior:
 *  - If tz is valid → format in that zone.
 *  - If tz is invalid → ignore tz, use system local time.
 *  - If date invalid → return "Invalid date".
 * @param dateString - ISO string (expected in UTC, may include Z or offset)
 * @param tz - IANA timezone string (e.g., "America/Los_Angeles")
 * @returns Formatted date string: MM/DD Day hh:mm[am|pm] in specified timezone. Ex: "9/25 Thu 3:15PM PDT"
 */
export function formatEventDateTz(dateString: string, tz: string | undefined, includeTime: boolean = true): string {
    try {
        // Parse date — Luxon will respect Z or offset automatically
        const dt = DateTime.fromISO(dateString, { zone: 'utc' })
        if (!dt.isValid) return 'Invalid date'

        // Use provided timezone if valid, otherwise local
        const validTz = tz && isValidTimeZone(tz) ? tz : 'local'
        const date = dt.setZone(validTz)

        // Format
        const base = date.toFormat('M/d EEE')
        if (!includeTime) return base
        return `${base} ${date.toFormat('h:mm')}${date.toFormat('a').toLowerCase()} ${date.toFormat('ZZZZ')}`
    } catch {
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
 * @returns Formatted duration string (e.g., "15 min", "2 hrs", "3 days", "??", or "0")
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

        if (minutes < 100) {
            return `${minutes} min`
        }

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
 * @returns ISO 8601 string (remove ms) or empty string if invalid
 */
export function urlDateToIsoString(urlDateString: string): string {
    const date = getDateFromUrlDateString(urlDateString)
    if (!date) {
        // Should never happen since parseAsCmfDate should validate all url date strings
        logr.warn('date', 'Invalid date for urlDateToIsoString', { urlDateString })
        return ''
    }
    // Always return UTC ISO string for storage (with 'Z' suffix)
    return date.toISOString().replace(/\.\d\d\dZ$/, 'Z') // remove msec
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
 * If tz is invalid/missing/REINTERPRET_UTC_TO_LOCAL/UNKNOWN_TZ, fallback to UTC
 * @param iso - The event's start/end ISO strings
 * @param tz - timezone
 * @returns Date
 */
const parseEventDate = (iso: string, tz?: string): Date => {
    if (tz && tz !== 'UNKNOWN_TZ' && tz !== 'REINTERPRET_UTC_TO_LOCAL') {
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
 * - If tz is missing/invalid/REINTERPRET_UTC_TO_LOCAL/UNKNOWN_TZ, treat start/end as UTC ISO strings.
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
 * Originally for foopee
 * @param range string like "Oct 27 - Nov 3"
 * @param year
 * @returns  date objects for startDate and endDate
 */
export function parseMonthDayRange(range: string): { startDate: Date; endDate: Date } {
    const [startStr, endStr] = range.split('-').map((s) => s.trim())

    const startDate = parse(startStr, 'MMM d', new Date())
    let endDate = parse(endStr, 'MMM d', new Date())

    // If end is before start, assume it's next year
    if (endDate < startDate) {
        endDate = addMonths(endDate, 12)
    }

    return { startDate, endDate }
}

/**
 * Extract start/end times from a description string, originally for foopee.
 * Assume UTC timezone for input (description) and output (return), will adjust later.
 * - Supports "7pm til 11:30pm" or "8pm" or "7pm/8pm" (which should be 7pm)
 * - Ignores extra text before/after times
 * - "7pm til 11:30pm" → start=7pm, end=11:30pm
 * - "7pm/8pm" → start=7pm, end=+4h
 * - "8pm" → start=8pm, end=+4h
 * - Defaults to 20:01–00:01 (4h span) if no time found
 *
 * @param description - The event description containing time information
 * @param eventDate - The date of the event (used for parsing times)
 * @returns An object containing start and end time strings in UTC ISO format 
 */
export function extractEventTimes(description: string, eventDate: Date) {
    const timeRegex = /(\d{1,2}(?::\d{2})?\s*(?:am|pm))/gi;
    const matches = [...description.matchAll(timeRegex)].map((m) => m[1].toLowerCase());

    function parseTimeToUTC(timeStr: string, baseDate: Date): Date {
        const [, hStr, mStr, ampm] =
            timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i) || [];

        let hour = parseInt(hStr, 10);
        const minute = mStr ? parseInt(mStr, 10) : 0;

        if (ampm === "pm" && hour !== 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;

        return new Date(Date.UTC(
            baseDate.getUTCFullYear(),
            baseDate.getUTCMonth(),
            baseDate.getUTCDate(),
            hour,
            minute,
            0
        ));
    }

    let start: Date;
    let end: Date;

    if (/til/i.test(description) && matches.length >= 2) {
        // "7pm til 11pm"
        const [startMatch, endMatch] = matches;
        start = parseTimeToUTC(startMatch, eventDate);
        end = parseTimeToUTC(endMatch, eventDate);
        if (start > end) {
            end = addDays(end, 1);
        }
    } else if (matches.length >= 1) {
        // Single time or "7pm/8pm" → first time wins
        const startMatch = matches[0];
        start = parseTimeToUTC(startMatch, eventDate);
        end = addHours(start, 4);
    } else {
        // Default 8:01pm → +4h
        start = parseTimeToUTC("8:01pm", eventDate);
        end = addHours(start, 4);
    }

    return {
        startStr: start.toISOString(),
        endStr: end.toISOString(),
    };
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
 * BUSINESS LOGIC: Uses 4:01am REINTERPRET_UTC_TO_LOCAL time (not midnight) because users think of
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
 * Helper to get end of day (23:59:59.999) for a given day offset from a minimum date in REINTERPRET_UTC_TO_LOCAL timezone
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

/**
 * Parses date and time strings from dissent spreadsheet columns. Returns UTC ISO strings (assume UTC timezone).
 * Therefore caller should call reinterpretUtcTz() to convert to local timezone.
 * Examples
 * "10/18/2025 8:00 AM-10:00 AM"
 * "10/18/2025 12:00 AM-12:00 PM"
 * "10/18 8:30 Am"
 * "10/18 12:00 PM-2:00 PM"
 * "10/18/25 11am - 1pm"
 *
 * Example return values:
 * "10/18/25 11am - 1pm" startIso 2025-10-18T11:00:00.000Z,
 * "10/18/25 11am - 1pm"  endIso  2025-10-18T13:00:00.000Z
 *
 * @param dateString  from dissent spreadsheet column. Ex: "10/18/25"
 * @param timeString  from dissent spreadsheet column. Ex: "8:00 AM-10:00 AM"
 * @returns start and end ISO strings, empty strings if not found. Caller should call reinterpretUtcTz()
 */
export function parseDateFromDissent(dateString: string, timeString: string): { startIso: string; endIso: string } {
    let startIso = ''
    let endIso = ''

    const matches = timeString.split('-')
    const startDate = parseDateString(dateString + (matches[0] ? ' ' + matches[0].trim() : ''))

    if (startDate && !isNaN(startDate.getTime())) {
        startIso = startDate.toISOString()
        if (!timeString.trim()) {
            // Hack: Set end to be same as start for when exact start time is not known
            endIso = startIso
        } else if (matches[1]) {
            // end time is known
            const endDate = parseDateString(dateString + ' ' + matches[1].trim())
            if (endDate) {
                endIso = endDate.toISOString()
            } else {
                // Hack: Set end to be 1 minute after start for when end time is not known
                endIso = new Date(startDate.getTime() + 1000 * 60).toISOString()
            }
        } else {
            // Hack: Set end to be 1 minute after start for when end time is not known (no matches[1])
            endIso = new Date(startDate.getTime() + 1000 * 60).toISOString()
        }
    }

    return { startIso, endIso }
}

/**
 * Parses a date string in various formats into a JavaScript Date object.
 * Supports formats like:
 * - "6/14/2025 1:30 PM"
 * - "6/14/2025 1 PM"
 * - "6/14/2025" (defaults to midnight)
 * - "6/14/2025 1:30PM" (no space before AM/PM)
 * - "6/14/25 1:30 PM" (2-digit year)
 */
export function parseDateString(dateStr: string): Date | null {
    try {
        const normalized = dateStr.trim().toLowerCase()
        // Try formats in order of probable occurrence
        const dateFormats = [
            'M/d/yyyy', // 6/14/2025
            'M/d/yy', // 6/14/25
            'M/d', // 6/14
        ]
        const timeFormats = [
            ' h:mm a', // 1:30 PM
            ' h a', //    1 PM
            ' h:mma', //  1:30PM (no space before AM/PM)
            ' ha', //     1PM (no space before AM/PM)
            '', //        (no time, defaults to midnight)
        ]
        for (const d of dateFormats) {
            for (const t of timeFormats) {
                const format = d + t
                const date = DateTime.fromFormat(normalized, format, { zone: 'UTC' })
                if (date.isValid) {
                    return date.toJSDate()
                }
            }
        }
        return null
    } catch (error) {
        logr.warn('date', `parseDateString(${dateStr}) error:`, error)
        return null
    }
}

// ===== HELPER FUNCTIONS FOR STABLE E2E TEST EVENTS =====
export function getDaysFromNowAt(daysFromNow: number, hour: number, minute: number): string {
    const day = addDays(new Date(), daysFromNow)
    const date = setHours(startOfDay(day), hour)
    date.setMinutes(minute)
    return date.toISOString()
}
/**
 * Returns ISO string for the next occurrence of the specified day of the week.
 * If today is the specified day, returns the date for next week.
 * @param dayOfWeek 0 for sunday, 6 for saturday, 7 for sunday after.
 * @param hour 
 * @param minute 
 * @returns ISO string
 */
export function getDayAt(dayOfWeek: number, hour: number, minute: number): string {
    const now = new Date()
    const currentDayOfWeek = now.getDay()
    let daysFromNow = dayOfWeek - currentDayOfWeek
    if (daysFromNow < 1) {
        daysFromNow += 7
    }
    return getDaysFromNowAt(daysFromNow, hour, minute)
}
export function getTodayAt(hour: number, minute: number): string {
    return getDaysFromNowAt(0, hour, minute)
}
export  function getTomorrowAt(hour: number, minute: number): string {
    return getDaysFromNowAt(1, hour, minute)
}

/**
 * getYYYYMMDDFromIso(getDayAt(5, 12, 0))
 * @param isoString could be output from getDayAt(5, 12, 0) // 5=Friday
 * @returns date string like "2023-10-27"
 */
export function getYYYYMMDDFromIso(isoString: string): string {
    const date = new Date(isoString)
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}-${month}-${day}`
}
