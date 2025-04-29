import { logr } from '@/lib/utils/logr'
import { format, formatDistance, parseISO, isValid } from 'date-fns'
import { createParser } from 'nuqs'
import { dateQuickFilterLabels } from '@/components/events/DateQuickButtons'
/**
 * Formats a date for display in the UI
 * @param dateString - ISO date string
 * @returns Formatted date string (MM/DD Day hh:mm am/pm)
 */
export function formatEventDate(dateString: string): string {
    try {
        const date = parseISO(dateString)
        if (!isValid(date)) {
            return 'Invalid date'
        }
        return format(date, 'MM/dd EEE h:mm a')
    } catch (error) {
        logr.warn('date', 'Error formatting date:', error)
        return 'Invalid date'
    }
}

/**
 * Calculates the duration between two dates
 * @param startDateString - ISO start date string
 * @param endDateString - ISO end date string
 * @returns Formatted duration string (e.g., "2 hrs" or "3 days")
 */
export function formatEventDuration(startDateString: string, endDateString: string): string {
    try {
        const startDate = parseISO(startDateString)
        const endDate = parseISO(endDateString)

        if (!isValid(startDate) || !isValid(endDate)) {
            return ''
        }

        // Calculate duration in milliseconds
        const durationMs = endDate.getTime() - startDate.getTime()

        // Convert to hours
        const durationHours = durationMs / (1000 * 60 * 60)

        if (durationHours < 24) {
            // Less than a day, show hours
            return `${Math.round(durationHours)} hr${durationHours !== 1 ? 's' : ''}`
        } else {
            // More than a day, show days
            const durationDays = durationHours / 24
            return `${Math.round(durationDays)} day${durationDays !== 1 ? 's' : ''}`
        }
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
    try {
        const date = parseISO(dateString)
        if (!isValid(date)) {
            return ''
        }
        return formatDistance(date, new Date(), { addSuffix: true })
    } catch (error) {
        logr.warn('date', 'Error getting relative time:', error)
        return ''
    }
}

// Custom parsers to read and write values to the URL
// url params have a value of null if they do not or should not exist.
export const parseAsCmfDate = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        // valid strings can be: YYYY-MM-DD like 2025-4-30, 1d, -7d, 2w, 3m
        const validDateRegex = /^(\d{4}-\d{1,2}-\d{1,2}|-?\d{1,2}(dwm))$/
        if (queryValue.match(validDateRegex)) {
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
