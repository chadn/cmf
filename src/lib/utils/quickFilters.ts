/**
 * Shared quick filter logic for date range calculations
 * Used by both DateQuickButtons (manual interactions) and DateAndSearchFilters (URL parameters)
 */

import { differenceInCalendarDays, startOfDay } from 'date-fns'
import { getDateFromUrlDateString } from './date'
//import {logr} from './logr'
//import { stringify } from './utils-shared'

export interface DateRangeInNumbers {
    start: number
    end: number
}

export interface QuickFilterConfig {
    id: string
    label: string
    calculate: (todayValue: number, totalDays: number, getDateFromDays: (days: number) => string) => DateRangeInNumbers
}

/**
 * Calculate weekend range (Friday to Sunday)
 */
function calculateWeekendRange(
    todayValue: number,
    totalDays: number,
    getDateFromDays: (days: number) => string
): DateRangeInNumbers {
    const today = new Date(getDateFromDays(todayValue))
    const dayOfWeek = today.getDay()

    let daysToFriday = 0
    if (dayOfWeek === 0) {
        // Sunday
        daysToFriday = 5
    } else if (dayOfWeek < 5) {
        // Monday-Thursday
        daysToFriday = 5 - dayOfWeek
    } // Friday-Saturday: use today

    const fridayValue = Math.min(todayValue + daysToFriday, totalDays)
    const sundayValue = Math.min(fridayValue + 2, totalDays)

    return { start: fridayValue, end: sundayValue }
}

/**
 * Configuration for all quick filters
 */
export const QUICK_FILTER_CONFIGS: QuickFilterConfig[] = [
    {
        id: 'past',
        label: 'Past',
        calculate: (todayValue) => ({ start: 0, end: todayValue > 0 ? todayValue - 1 : 0 }),
    },
    {
        id: 'future',
        label: 'Future',
        calculate: (todayValue, totalDays) => ({ start: todayValue, end: totalDays }),
    },
    {
        id: 'today',
        label: 'Today',
        calculate: (todayValue) => ({ start: todayValue, end: todayValue }),
    },
    {
        id: 'next3days',
        label: 'Next 3 days',
        calculate: (todayValue, totalDays) => ({ start: todayValue, end: Math.min(todayValue + 3, totalDays) }),
    },
    {
        id: 'next7days',
        label: 'Next 7 days',
        calculate: (todayValue, totalDays) => ({ start: todayValue, end: Math.min(todayValue + 7, totalDays) }),
    },
    {
        id: 'weekend',
        label: 'Weekend',
        calculate: calculateWeekendRange,
    },
]

/**
 * Get quick filter configuration by ID
 */
export function getQuickFilterConfig(filterId: string): QuickFilterConfig | undefined {
    return QUICK_FILTER_CONFIGS.find((config) => config.id === filterId)
}

/**
 * Calculate date range for a quick filter
 */
export function calculateQuickFilterRange(
    filterId: string,
    todayValue: number,
    totalDays: number,
    getDateFromDays: (days: number) => string
): DateRangeInNumbers | null {
    const config = getQuickFilterConfig(filterId)
    return config ? config.calculate(todayValue, totalDays, getDateFromDays) : null
}

/**
 * Get all quick filter configs for UI rendering
 */
export function getAllQuickFilterConfigs(): QuickFilterConfig[] {
    return QUICK_FILTER_CONFIGS
}

/**
 * Calculate date range from filter start/end dates (fsd/fed parameters)
 * Converts URL date strings like "2025-09-20" to day numbers in the date slider range
 * @param filterDates - The filter dates to calculate the range for
 * @param totalDays - The total number of days in the date slider range
 * @param minDate - The minimum date in the date slider range.  Should be close to noon so not affected by UTC vs local time
 * @returns The date range in numbers
 */
export function calculateFilterDateRange(
    filterDates: { fsd?: string; fed?: string },
    totalDays: number,
    minDate: Date
): DateRangeInNumbers | null {
    const { fsd, fed } = filterDates
    if (!fsd || !fed) return null

    try {
        const startDate = getDateFromUrlDateString(fsd)
        const endDate = getDateFromUrlDateString(fed)
        //const minDate = parseISO(minDateIso)

        //logr.info('url_service', `calculateFilterDateRange:1 ${stringify({startDate, endDate, minDate})}`)
        if (!startDate || !endDate) return null

        // Normalize both to start of day (local TZ)
        const startDay = differenceInCalendarDays(startOfDay(startDate), startOfDay(minDate))
        const endDay = differenceInCalendarDays(startOfDay(endDate), startOfDay(minDate))

        //logr.info('url_service', `calculateFilterDateRange:2 ${stringify({startDay, endDay})}`)

        // Validate bounds
        if (startDay < 0 || endDay < 0 || startDay > totalDays || endDay > totalDays) {
            return null
        }
        if (startDay > endDay) return null

        return { start: startDay, end: endDay }
    } catch {
        return null
    }
}
