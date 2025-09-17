/**
 * URL Processing Service - Pure business logic for URL parameter handling
 *
 * Reuses existing utility functions and provides clean interfaces for URL processing
 */

import { getDateFromUrlDateString, getStartOfDay, getEndOfDay } from '@/lib/utils/date'
import { calculateQuickFilterRange, calculateFilterDateRange } from '@/lib/utils/quickFilters'
import { logr } from '@/lib/utils/logr'
import { DateRangeIso } from '@/types/events'
import { MapViewport } from '@/types/map'
import {
    DomainFilterParams,
    DomainFilterResult,
    MapPositionParams,
    MapPositionResult,
    UrlValidationResult,
} from '@/types/urlProcessing'
import { stringify } from '@/lib/utils/utils-shared'
import { addDays } from 'date-fns'

// TODO: Import llzObjectToViewport when it's available, or create equivalent function

const pushError = (errors: string[], errorMsg: string) => {
    logr.warn('url_service', errorMsg)
    errors.push(errorMsg)
}

/**
 * Process domain filters (date and search) from URL parameters
 * Reuses existing date calculation functions
 * @param params - Domain filter parameters from URL
 * @returns Result with processed filters and any errors
 */
export function processDomainFilters(params: DomainFilterParams): DomainFilterResult {
    const { searchQuery, dateQuickFilter, filterDateRange, minDate, totalDays } = params
    const errors: string[] = []
    let resultFilterDateRange: DateRangeIso | undefined

    // Helper function for date calculations - reuse existing logic
    const getDateFromDays = (days: number): string => {
        const date = addDays(minDate, days)
        return date.toISOString()
    }

    try {
        // Process explicit filter date range first (fsd + fed)
        if (filterDateRange?.fsd && filterDateRange?.fed) {
            logr.info('url_service', `Processing explicit date filter: ${JSON.stringify(filterDateRange)}`)

            const range = calculateFilterDateRange(filterDateRange, totalDays, minDate)
            logr.info(
                'url_service',
                `processDomainFilters: calculateFilterDateRange(${stringify({ filterDateRange, totalDays, minDate })}): ${stringify(range)}`
            )
            if (!range) {
                pushError(errors, `Invalid fsd+fed filter: ${JSON.stringify(filterDateRange)}`)
            } else {
                resultFilterDateRange = {
                    startIso: getStartOfDay(range.start, minDate),
                    endIso: getEndOfDay(range.end, minDate),
                }
            }
        }
        // Process quick filter if no explicit date range
        else if (dateQuickFilter && !resultFilterDateRange) {
            logr.info('url_service', `Processing quick date filter: ${dateQuickFilter}`)

            const now = new Date()
            const todayDayValue = Math.floor((now.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24))

            // Reuse existing calculateQuickFilterRange function
            const range = calculateQuickFilterRange(dateQuickFilter, todayDayValue, totalDays, getDateFromDays)
            if (!range) {
                pushError(errors, `Unknown or invalid quick filter: ${dateQuickFilter}`)
            } else {
                resultFilterDateRange = {
                    startIso: getStartOfDay(range.start, minDate),
                    endIso: getEndOfDay(range.end, minDate),
                }
            }
        }
    } catch (error) {
        pushError(errors, `Error processing date filters: ${error instanceof Error ? error.message : String(error)}`)
    }

    const result = {
        dateRange: resultFilterDateRange,
        searchQuery: searchQuery || undefined,
        errors,
        success: errors.length === 0,
    }
    logr.info('url_service', `processDomainFilters: ${stringify(result)}`)
    return result
}

/**
 * Validate and process map positioning parameters from URL
 * Reuses existing validation and conversion functions
 * @param params - Map positioning parameters from URL
 * @returns Result with processed map position and any errors
 */
export function processMapPosition(params: MapPositionParams): MapPositionResult {
    const { selectedEventId, llz, events } = params
    const errors: string[] = []
    let viewport: MapViewport | undefined
    let validatedEventId: string | undefined
    let shouldStopUrlProcessing = false

    try {
        // Process selected event first - if valid, stop URL processing
        if (selectedEventId) {
            logr.info('url_service', `Validating selected event ID: ${selectedEventId}`)

            const event = events.find((e) => e.id === selectedEventId)
            if (!event) {
                pushError(errors, `Invalid event ID '${selectedEventId}', treating as if se wasn't present`)
                // Continue processing other URL parameters
            } else {
                validatedEventId = selectedEventId
                shouldStopUrlProcessing = true // Valid se stops further URL processing
                logr.info('url_service', `Valid event ID, stopping URL processing`)
            }
        }

        // Process llz coordinates if no valid selected event
        if (llz && !shouldStopUrlProcessing) {
            logr.info('url_service', `Processing llz coordinates: ${JSON.stringify(llz)}`)

            try {
                // TODO: Use llzObjectToViewport when available, for now create viewport manually
                viewport = {
                    latitude: llz.lat,
                    longitude: llz.lon,
                    zoom: llz.zoom,
                    bearing: 0,
                    pitch: 0,
                }
                logr.info('url_service', `Converted llz to viewport: ${JSON.stringify(viewport)}`)
            } catch (error) {
                pushError(errors, `Invalid llz coordinates: ${error instanceof Error ? error.message : String(error)}`)
            }
        }
    } catch (error) {
        pushError(errors, `Error processing map position: ${error instanceof Error ? error.message : String(error)}`)
    }

    return {
        viewport,
        selectedEventId: validatedEventId,
        llzChecked: !!llz, // Set llzChecked if llz was present in URL
        errors,
        shouldStopUrlProcessing,
    }
}

/**
 * Validate URL parameters for basic format and type checking
 * Reuses existing parsing patterns
 * @param rawParams - Raw URL parameters to validate
 * @returns Validation result with sanitized parameters and errors
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function validateUrlParameters(rawParams: Record<string, any>): UrlValidationResult {
    const errors: string[] = []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sanitizedParams: Record<string, any> = {}

    // Basic validation - could be expanded with more sophisticated checks
    try {
        // Validate eventSourceId format
        if (rawParams.es) {
            sanitizedParams.es = rawParams.es
        }

        // Validate selectedEventId format
        if (rawParams.se && typeof rawParams.se === 'string') {
            sanitizedParams.se = rawParams.se.trim()
        }

        // Validate search query
        if (rawParams.sq && typeof rawParams.sq === 'string') {
            sanitizedParams.sq = rawParams.sq.trim()
        }

        // Validate date parameters using existing date parsing
        if (rawParams.fsd) {
            try {
                const date = getDateFromUrlDateString(rawParams.fsd)
                if (date) {
                    sanitizedParams.fsd = rawParams.fsd
                } else {
                    pushError(errors, `Invalid fsd date format: ${rawParams.fsd}`)
                }
            } catch {
                pushError(errors, `Invalid fsd date: ${rawParams.fsd}`)
            }
        }

        if (rawParams.fed) {
            try {
                const date = getDateFromUrlDateString(rawParams.fed)
                if (date) {
                    sanitizedParams.fed = rawParams.fed
                } else {
                    pushError(errors, `Invalid fed date format: ${rawParams.fed}`)
                }
            } catch {
                pushError(errors, `Invalid fed date: ${rawParams.fed}`)
            }
        }

        // Validate llz coordinates
        if (rawParams.llz) {
            const llz = rawParams.llz
            if (llz && typeof llz.lat === 'number' && typeof llz.lon === 'number' && typeof llz.zoom === 'number') {
                if (
                    llz.lat >= -90 &&
                    llz.lat <= 90 &&
                    llz.lon >= -180 &&
                    llz.lon <= 180 &&
                    llz.zoom >= 1 &&
                    llz.zoom <= 22
                ) {
                    sanitizedParams.llz = llz
                } else {
                    pushError(errors, `LLZ coordinates out of valid range: ${JSON.stringify(llz)}`)
                }
            } else {
                pushError(errors, `Invalid llz format: ${JSON.stringify(llz)}`)
            }
        }
    } catch (error) {
        pushError(errors, `URL validation error: ${error instanceof Error ? error.message : String(error)}`)
    }

    return {
        isValid: errors.length === 0,
        sanitizedParams,
        errors,
    }
}
