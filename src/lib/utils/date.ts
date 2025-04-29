import { logr } from '@/lib/utils/logr'
import { format, formatDistance, parseISO, isValid } from 'date-fns'

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
        logr.warn('date','Error formatting date:', error)
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
        logr.warn('date','Error calculating duration:', error)
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
        logr.warn('date','Error getting relative time:', error)
        return ''
    }
}
