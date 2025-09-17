/**
 * URL Processing Type Definitions
 *
 * Types for URL parameter processing, validation, and transformation
 */

import { CmfEvent, DateRangeIso } from './events'
import { MapViewport } from './map'

/**
 * Raw URL parameters as they come from useQueryStates hooks - not directly from URL
 * useQueryStates hooks do validation in url-utils.ts
 * @interface CurrentUrlState
 */
export interface CurrentUrlState {
    /** Event source ID(s) - raw from es parameter */
    // Can be single ID like "gc:calendar@gmail.com" or multiple sources
    es: string | string[] | null
    /** Selected event ID - raw from se parameter */
    // Identifies a specific event that should be highlighted or selected,
    se: string
    /** Search query - raw from sq parameter */
    // Text string to filter events by title, description, or other searchable fields
    sq: string
    /** Date quick filter - raw from qf parameter (e.g., "today", "weekend") */
    //  redefined date ranges like "today", "next7days", "next30days"
    // Not parsed from url if fsd and fed are present
    qf: string | null
    /** Raw explicit date range from URL */
    /** App start date - raw from sd parameter */
    //  Start date for event fetching from source
    //  Default is -1m (1 month ago)
    //  Can be in YYYY-MM-DD format or relative values like -1m, -7d
    sd: string
    /** App end date - raw from ed parameter */
    // Default is 3m (3 months from now)
    // Can be in YYYY-MM-DD format or relative values like +3m, +30d
    ed: string
    /** Filter start date - raw from fsd parameter */
    // Filter start date, user can change
    // Default is sd (calendar start date), Can be equal to or after sd
    // Can be in YYYY-MM-DD format or relative values like -1d, +30d
    fsd: string | null
    /** Filter end date - raw from fed parameter */
    // Default is ed (calendar end date) Can be equal to or before ed
    // Can be in YYYY-MM-DD format or relative values like -1d, +30d
    fed: string | null

    /** Raw location/zoom coordinates from llz parameter */
    /**
     * llz in url is string. Ex: llz=lat,long,zoom
     *
     * Latitude coordinate (-90.00000 to 90.00000)
     * Longitude coordinate (-180.00000 to 180.00000)
     * Represents the center point of the map view
     *
     * Zoom level (1-22)
     * Controls how close the map is zoomed in
     * 1 = zoomed all the way out (world view)
     * 22 = maximum zoom level (building detail)
     */
    llz: { lat: number; lon: number; zoom: number } | null
    // Date slider range computed from other date parameters: sd, ed, fsd, fed.
    dateSliderRange: DateRangeIso | undefined
}

/**
 * Parameters for domain filter processing
 * @interface DomainFilterParams
 */
export interface DomainFilterParams {
    /** Raw search query string from URL (sq parameter) */
    searchQuery?: string
    /** Raw quick filter string from URL (qf parameter, e.g., "today", "weekend") */
    dateQuickFilter?: string | null
    /** Raw explicit date range from URL */
    filterDateRange?: { fsd?: string; fed?: string }
    /** Calculated minimum date for the app's date range */
    minDate: Date
    /** Total days in the app's date range */
    totalDays: number
}

/**
 * Result of processing domain filters from URL parameters
 * @interface DomainFilterResult
 */
export interface DomainFilterResult {
    /** Processed date range filter (ISO strings) */
    dateRange?: DateRangeIso
    /** Processed search query string */
    searchQuery?: string
    /** Any errors encountered during processing */
    errors: string[]
    /** Whether processing completed without errors */
    success: boolean
}

/**
 * Parameters for map positioning processing
 * @interface MapPositionParams
 */
export interface MapPositionParams {
    /** Raw selected event ID from URL (se parameter) */
    selectedEventId?: string
    /** Raw location/zoom coordinates from URL (llz parameter) */
    llz?: { lat: number; lon: number; zoom: number } | null
    /** All available events for validation */
    events: CmfEvent[]
}

/**
 * Result of processing map positioning parameters from URL
 * @interface MapPositionResult
 */
export interface MapPositionResult {
    /** Calculated viewport if llz coordinates provided */
    viewport?: MapViewport
    /** Validated event ID if se parameter provided */
    selectedEventId?: string
    /** Whether llz coordinates were present in URL */
    llzChecked: boolean
    /** Any errors encountered during processing */
    errors: string[]
    /** True if valid se found - stops further URL processing per Implementation.md rules */
    shouldStopUrlProcessing: boolean
}

/**
 * Result of URL parameter validation
 * @interface UrlValidationResult
 */
export interface UrlValidationResult {
    /** Whether all URL parameters are valid */
    isValid: boolean
    /** Cleaned and validated parameters */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sanitizedParams: Record<string, any>
    /** Any validation errors found */
    errors: string[]
}

/**
 * Complete URL processing result combining all phases
 * @interface UrlProcessingResult
 */
export interface UrlProcessingResult {
    domainFilters: DomainFilterResult
    mapPosition: MapPositionResult
    /** Overall validation results */
    validation: UrlValidationResult
    /** Whether entire URL processing succeeded */
    success: boolean
    /** All errors from all phases */
    allErrors: string[]
}

export interface DateConfig {
    minDate: Date
    maxDate: Date
    totalDays: number
    fsdDays: number
    fedDays: number
}
