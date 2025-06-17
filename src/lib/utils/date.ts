import { logr } from '@/lib/utils/logr'
import { format, formatDistance, parseISO, isValid } from 'date-fns'
import { createParser } from 'nuqs'
import { dateQuickFilterLabels } from '@/components/events/DateQuickButtons'

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
        return includeTime ? format(date, 'MM/dd EEE h:mmaaa') : format(date, 'MM/dd EEE')
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

// Custom parsers to read and write values to the URL
// url params have a value of null if they do not or should not exist.
export const parseAsCmfDate = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        if (getDateFromUrlDateString(queryValue)) {
            return queryValue
        }
        return null
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        return value
    },
})

export const parseAsDateQuickFilter = createParser({
    parse(queryValue) {
        logr.info('date', 'parseAsDateQuickFilter parse queryValue:', queryValue)
        if (!queryValue) return null

        // Convert the query value to lowercase with no spaces for comparison
        const normalizedQueryValue = queryValue.toLowerCase().replace(/\s+/g, '')

        // Check if any of the labels match when normalized
        const matchingLabel = dateQuickFilterLabels.find(
            (label) => label.toLowerCase().replace(/\s+/g, '') === normalizedQueryValue
        )

        if (matchingLabel) {
            return normalizedQueryValue
        }

        // if queryValue is not a value from quickFilterLabels, return null
        return null
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        logr.info('date', 'parseAsDateQuickFilter serialize queryValue:', value)
        return value
    },
})
