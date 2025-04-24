/**
 * Interface representing URL parameters for the application
 * All parameters are optional in the URL
 */
export interface UrlParams {
    // Map Viewport Parameters
    /**
     * Latitude coordinate (-90.00000 to 90.00000)
     * Represents the center point of the map view
     */
    lat: number | null
    /**
     * Longitude coordinate (-180.00000 to 180.00000)
     * Represents the center point of the map view
     */
    lon: number | null
    /**
     * Zoom level (0-22)
     * Controls how close the map is zoomed in
     * 0 = zoomed all the way out (world view)
     * 22 = maximum zoom level (building detail)
     */
    zoom: number | null

    // Date Range Parameters
    /**
     * Calendar start date
     * Default is -1m (1 month ago)
     * Can be in YYYY-MM-DD format or relative values like -7 (days)
     */
    csd: string | null
    /**
     * Calendar end date
     * Default is 3m (3 months from now)
     * Can be in YYYY-MM-DD format or relative values like +30 (days)
     */
    ced: string | null
    /**
     * Filter start date
     * Default is csd (calendar start date)
     * Can be equal to or after csd
     */
    fsd: string | null
    /**
     * Filter end date
     * Default is ced (calendar end date)
     * Can be equal to or before ced
     */
    fed: string | null

    // Selection Parameters
    /**
     * Selected event ID
     * Identifies a specific event that should be highlighted or selected
     */
    se: string | null

    // Content Source Parameters
    /**
     * Google Calendar ID
     * Identifies which Google Calendar to display
     */
    gc: string | null
    /**
     * Facebook Calendar ID/info
     * Identifies which Facebook Calendar to display
     */
    fbc: string | null

    // Filter Parameters
    /**
     * Search query
     * Text string to filter events by title, description, or other searchable fields
     */
    sq: string | null
}
