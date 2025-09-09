/**
 * Shared quick filter logic for date range calculations
 * Used by both DateQuickButtons (manual interactions) and DateAndSearchFilters (URL parameters)
 */

export interface QuickFilterRange {
    start: number
    end: number
}

export interface QuickFilterConfig {
    id: string
    label: string
    calculate: (todayValue: number, totalDays: number, getDateFromDays: (days: number) => string) => QuickFilterRange
}

/**
 * Calculate weekend range (Friday to Sunday)
 */
function calculateWeekendRange(todayValue: number, totalDays: number, getDateFromDays: (days: number) => string): QuickFilterRange {
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
        calculate: (todayValue) => ({ start: 0, end: todayValue > 0 ? todayValue-1 : 0 })
    },
    {
        id: 'future',
        label: 'Future',
        calculate: (todayValue, totalDays) => ({ start: todayValue, end: totalDays })
    },
    {
        id: 'today',
        label: 'Today',
        calculate: (todayValue) => ({ start: todayValue, end: todayValue })
    },
    {
        id: 'next3days',
        label: 'Next 3 days',
        calculate: (todayValue, totalDays) => ({ start: todayValue, end: Math.min(todayValue + 3, totalDays) })
    },
    {
        id: 'next7days',
        label: 'Next 7 days',
        calculate: (todayValue, totalDays) => ({ start: todayValue, end: Math.min(todayValue + 7, totalDays) })
    },
    {
        id: 'weekend',
        label: 'Weekend',
        calculate: calculateWeekendRange
    }
]

/**
 * Get quick filter configuration by ID
 */
export function getQuickFilterConfig(filterId: string): QuickFilterConfig | undefined {
    return QUICK_FILTER_CONFIGS.find(config => config.id === filterId)
}

/**
 * Calculate date range for a quick filter
 */
export function calculateQuickFilterRange(
    filterId: string,
    todayValue: number,
    totalDays: number,
    getDateFromDays: (days: number) => string
): QuickFilterRange | null {
    const config = getQuickFilterConfig(filterId)
    return config ? config.calculate(todayValue, totalDays, getDateFromDays) : null
}

/**
 * Get all quick filter configs for UI rendering
 */
export function getAllQuickFilterConfigs(): QuickFilterConfig[] {
    return QUICK_FILTER_CONFIGS
}