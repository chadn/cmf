/**
 * Interface representing URL parameters for the application
 * All parameters are optional in the URL
 */
export interface CmfUrlParams {
    // Event Source Parameters
    /**
     * Event source ID - identifies which event source(s) to display
     * Can be single ID like "gc:calendar@gmail.com" or multiple sources
     */
    es?: string | string[] | null

    // Selection Parameters
    /**
     * Selected event ID
     * Identifies a specific event that should be highlighted or selected
     */
    se?: string

    // Map Viewport Parameters
    /**
     * Zoom level (1-22)
     * Controls how close the map is zoomed in
     * 1 = zoomed all the way out (world view)
     * 22 = maximum zoom level (building detail)
     */
    z?: number | null
    /**
     * Latitude coordinate (-90.00000 to 90.00000)
     * Represents the center point of the map view
     */
    lat?: number | null
    /**
     * Longitude coordinate (-180.00000 to 180.00000)
     * Represents the center point of the map view
     */
    lon?: number | null

    // Filter Parameters
    /**
     * Search query
     * Text string to filter events by title, description, or other searchable fields
     */
    sq?: string

    // Date Range Parameters
    /**
     * Start date for event fetching from source
     * Default is -1m (1 month ago)
     * Can be in YYYY-MM-DD format or relative values like -1m, -7d
     */
    sd?: string
    /**
     * End date for event fetching from source
     * Default is 3m (3 months from now)
     * Can be in YYYY-MM-DD format or relative values like +3m, +30d
     */
    ed?: string
    /**
     * Filter start date, user can change
     * Default is sd (calendar start date)
     * Can be equal to or after sd
     */
    fsd?: string
    /**
     * Filter end date
     * Default is ed (calendar end date)
     * Can be equal to or before ed
     */
    fed?: string

    // Quick Filter Parameters
    /**
     * Date quick filter
     * Predefined date ranges like "today", "next7days", "next30days"
     * Takes precedence over fsd and fed
     */
    qf?: string | null
}
