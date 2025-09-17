/**
 * Date parsing utilities for event source 19hz.
 * Extracted for testability and reusability
 */

import { logr } from './logr'

// Month names for parsing
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * Convert 12-hour format to 24-hour format
 * @param hour Hour as string (1-12)
 * @param ampm Either 'am' or 'pm'
 * @returns Hour in 24-hour format (0-23)
 */
function convertToHour24(hour: string, ampm: string): number {
    let hour24 = parseInt(hour)
    if (ampm === 'pm' && hour24 !== 12) hour24 += 12
    if (ampm === 'am' && hour24 === 12) hour24 = 0
    return hour24
}

/**
 * Calculate the specific occurrence of a day in a month (1st, 2nd, 3rd, 4th)
 * @param year Year
 * @param month Month (0-11)
 * @param dayIndex Day of week (0=Sunday, 6=Saturday)
 * @param occurrence Which occurrence (1-4)
 * @returns Date of the specific occurrence
 */
function getMonthlyOccurrence(year: number, month: number, dayIndex: number, occurrence: number): Date {
    const monthStart = new Date(year, month, 1)
    const firstDayIndex = monthStart.getDay()
    const daysToFirst = (dayIndex - firstDayIndex + 7) % 7
    const firstOccurrence = new Date(monthStart)
    firstOccurrence.setDate(1 + daysToFirst)

    const targetOccurrence = new Date(firstOccurrence)
    targetOccurrence.setDate(firstOccurrence.getDate() + (occurrence - 1) * 7)
    return targetOccurrence
}

/**
 * Find the next occurrence of a recurring monthly event
 * @param recurringStart Reference date
 * @param dayIndex Day of week (0-6)
 * @param occurrence1 First occurrence (1-4)
 * @param occurrence2 Optional second occurrence (1-4)
 * @returns Next occurrence date
 */
function findNextMonthlyOccurrence(
    recurringStart: Date,
    dayIndex: number,
    occurrence1: number,
    occurrence2?: number
): Date {
    const targetDay = new Date(recurringStart)

    // Try current month first
    const currentMonth = targetDay.getMonth()
    const currentYear = targetDay.getFullYear()

    const firstOcc = getMonthlyOccurrence(currentYear, currentMonth, dayIndex, occurrence1)

    if (firstOcc >= recurringStart) {
        targetDay.setTime(firstOcc.getTime())
        return targetDay
    }

    // Check second occurrence if provided
    if (occurrence2) {
        const secondOcc = getMonthlyOccurrence(currentYear, currentMonth, dayIndex, occurrence2)
        if (secondOcc >= recurringStart) {
            targetDay.setTime(secondOcc.getTime())
            return targetDay
        }
    }

    // Move to next month
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear
    const nextMonthOcc = getMonthlyOccurrence(nextYear, nextMonth, dayIndex, occurrence1)

    targetDay.setTime(nextMonthOcc.getTime())
    return targetDay
}

/**
 * Parse 19hz.info date/time format into start and end dates
 *
 * Handles formats like:
 * - "Fri: Aug 30 (9pm-2am)"
 * - "Sun: Aug 31 (6am-12pm)"
 * - "Fri: Aug 30-Sun: Sep 1 (Fri: 9pm-Sun: 2am)"
 * - "Wed: Jan 28, 2026 (8pm)"
 * - "Sat: Nov 15 (11:59pm-6am)"
 * - "Mondays (9:30pm-2:30am)" - recurring events
 * - "2nd/4th Wednesdays (8pm-12am)" - specific recurring patterns
 *
 * @param dateTimeText The date/time string to parse
 * @param recurringStart The reference date for recurring events (defaults to now)
 * @returns Object with start, end dates and recurring flag
 */
export function parse19hzDateRange(
    dateTimeText: string,
    recurringStart: Date = new Date()
): { start: string; end: string; recurring: boolean } {
    // Input validation
    if (!dateTimeText || typeof dateTimeText !== 'string' || dateTimeText.trim() === '') {
        logr.warn('date-19hz-parsing', 'Invalid or empty dateTimeText provided')
        const now = new Date()
        return {
            start: now.toISOString(),
            end: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
            recurring: false,
        }
    }

    try {
        // Handle recurring events first: "Mondays (9:30pm-2:30am)", "2nd/4th Wednesdays (8pm-12am)"
        const recurringMatch = dateTimeText.match(
            /^(?:(\d+)(?:st|nd|rd|th)(?:\/(\d+)(?:st|nd|rd|th))?\s+)?(\w+)s\s*\(([^)]+)\)$/
        )

        if (recurringMatch) {
            const [, occurrence1, occurrence2, dayName, timeRange] = recurringMatch

            // Parse the time range
            const timeMatch = timeRange.match(/(\d+)(?::(\d+))?([ap]m)(?:-(\d+)(?::(\d+))?([ap]m))?/)
            if (timeMatch) {
                const [, startHour, startMin, startAmPm, endHour, endMin, endAmPm] = timeMatch

                // Convert to 24-hour format
                const startHour24 = convertToHour24(startHour, startAmPm)
                const startMinute = parseInt(startMin || '0')

                // Find the next occurrence of this day
                const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(
                    dayName.toLowerCase()
                )

                if (dayIndex !== -1) {
                    const targetDay = new Date(recurringStart)

                    // Calculate days until next occurrence
                    const daysUntilTarget = (dayIndex - recurringStart.getDay() + 7) % 7
                    targetDay.setDate(recurringStart.getDate() + (daysUntilTarget || 7)) // If today is the day, use next week

                    // Handle specific occurrence patterns (1st, 2nd, 3rd, 4th)
                    if (occurrence1) {
                        const occ1 = parseInt(occurrence1)
                        const occ2 = occurrence2 ? parseInt(occurrence2) : undefined
                        const nextOccurrence = findNextMonthlyOccurrence(recurringStart, dayIndex, occ1, occ2)
                        targetDay.setTime(nextOccurrence.getTime())
                    }

                    // Set the time (will be interpreted as PST/PDT by timezone setting)
                    const startDate = new Date(targetDay)
                    startDate.setHours(startHour24, startMinute, 0, 0)

                    let endDate: Date
                    if (endHour && endAmPm) {
                        // Has end time
                        const endHour24 = convertToHour24(endHour, endAmPm)
                        const endMinute = parseInt(endMin || '0')

                        endDate = new Date(targetDay)
                        endDate.setHours(endHour24, endMinute, 0, 0)

                        // Handle overnight events
                        if (endHour24 < startHour24 || (endHour24 === startHour24 && endMinute < startMinute)) {
                            endDate.setDate(endDate.getDate() + 1)
                        }
                    } else {
                        // Single time, default to 4-hour duration
                        endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)
                    }

                    return {
                        start: startDate.toISOString(),
                        end: endDate.toISOString(),
                        recurring: true,
                    }
                }
            }
        }

        // Handle multi-day format first: "Fri: Aug 30-Sun: Sep 1 (Fri: 9pm-Sun: 2am)"
        const multiDayMatch = dateTimeText.match(
            /(\w+):\s*(\w+)\s+(\d+)-(\w+):\s*(\w+)\s+(\d+)(?:,\s*(\d{4}))?\s*\(([^)]+)\)/
        )

        if (multiDayMatch) {
            const [, , startMonth, startDay, , endMonth, endDay, year, timeRange] = multiDayMatch
            const eventYear = year ? parseInt(year) : new Date().getFullYear()

            // Parse time range like "Fri: 9pm-Sun: 2am"
            const timeMatch = timeRange.match(/(\w+):\s*(\d+)(?::(\d+))?([ap]m)-(\w+):\s*(\d+)(?::(\d+))?([ap]m)/)
            if (timeMatch) {
                const [, , startHour, startMin, startAmPm, , endHour, endMin, endAmPm] = timeMatch

                // Convert to 24-hour format
                const startHour24 = convertToHour24(startHour, startAmPm)
                const startMinute = parseInt(startMin || '0')
                const endHour24 = convertToHour24(endHour, endAmPm)
                const endMinute = parseInt(endMin || '0')

                // Create date objects
                const startMonthIndex = MONTH_NAMES.indexOf(startMonth.toLowerCase())
                const endMonthIndex = MONTH_NAMES.indexOf(endMonth.toLowerCase())

                const startDate = new Date(eventYear, startMonthIndex, parseInt(startDay), startHour24, startMinute, 0)
                const endDate = new Date(eventYear, endMonthIndex, parseInt(endDay), endHour24, endMinute, 0)

                // Leave as local time, will be interpreted as PST/PDT

                return {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    recurring: false,
                }
            }
        }

        // Handle single day format: "Fri: Aug 30 (9pm-2am)"
        const singleDayMatch = dateTimeText.match(/(\w+):\s*(\w+)\s+(\d+)(?:,\s*(\d{4}))?\s*\(([^)]+)\)/)

        if (singleDayMatch) {
            const [, , month, day, year, timeRange] = singleDayMatch
            const eventYear = year ? parseInt(year) : new Date().getFullYear()

            // Parse time range like "9pm-2am" or "6am-12pm" or "8pm" (single time)
            const timeMatch = timeRange.match(/(\d+)(?::(\d+))?([ap]m)(?:-(\d+)(?::(\d+))?([ap]m))?/)
            if (timeMatch) {
                const [, startHour, startMin, startAmPm, endHour, endMin, endAmPm] = timeMatch

                // Convert to 24-hour format
                const startHour24 = convertToHour24(startHour, startAmPm)
                const startMinute = parseInt(startMin || '0')

                // Create date objects
                const monthIndex = MONTH_NAMES.indexOf(month.toLowerCase())

                const startDate = new Date(eventYear, monthIndex, parseInt(day), startHour24, startMinute, 0)

                // Leave as local time, will be interpreted as PST/PDT

                let endDate: Date

                if (endHour && endAmPm) {
                    // Has end time
                    const endHour24 = convertToHour24(endHour, endAmPm)
                    const endMinute = parseInt(endMin || '0')

                    endDate = new Date(eventYear, monthIndex, parseInt(day), endHour24, endMinute, 0)

                    // Handle overnight events (end time before start time)
                    if (endHour24 < startHour24 || (endHour24 === startHour24 && endMinute < startMinute)) {
                        endDate.setDate(endDate.getDate() + 1)
                    }

                    // Leave as local time, will be interpreted as PST/PDT
                } else {
                    // Single time, default to 4-hour duration
                    endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)
                }

                return {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    recurring: false,
                }
            }
        }

        // Fallback: use current time with 4-hour duration
        logr.warn('date-19hz-parsing', `Could not parse 19hz date format: ${dateTimeText}`)
        const now = new Date()
        const startDate = new Date(now)
        const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)

        return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            recurring: false,
        }
    } catch (error) {
        logr.warn('date-19hz-parsing', `Error parsing 19hz date range: ${dateTimeText}`, error)
        const now = new Date()
        return {
            start: now.toISOString(),
            end: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
            recurring: false,
        }
    }
}
