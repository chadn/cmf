export type EventStatus = 'resolved' | 'unresolved'
export const LOCATION_KEY_PREFIX = 'location:'
export const EVENTS_CACHE_PREFIX = 'events:'
export type SortField = 'name' | 'startDate' | 'duration' | 'location'
export type SortDirection = 'asc' | 'desc'

export interface Location {
    status: EventStatus
    original_location: string
    // the rest of these are only if resolved by geocoder API, status === 'resolved'
    formatted_address?: string
    lat?: number // latitude, -90 to +90 North Pole, at most 6 decimal places (4.3 inches at equator, less if closer to poles).
    lng?: number // longitude, -180 to +180, at most 6 decimal places (4.3 inches).
    types?: string[] // google maps location types: bars, night_club, point_of_interest, restaurant, etc.
    location_tz?: string
}
// more on latitude and longitude accuracy - 6 decimals (4 inches) is more accurate than GPS usually gives (2 feet).
// "On April 20, 2021, the global average URE across all satellites was ≤0.643 m (2.1 ft.), 95% of the time.
// To be clear, URE is not user accuracy. User accuracy depends on a combination of satellite geometry, URE, and local factors such as
// signal blockage (buildings, bridges, trees, indoors), atmospheric conditions, and receiver design features/quality.
//  https://www.gps.gov/index.php/gps-accuracy-0

// CmfEvent attributes are all strings or numbers (or arrays/objects of those) for json export compatibility
export interface CmfEvent {
    id: string
    name: string
    original_event_url: string
    description: string // always exists, may be empty
    description_urls: string[] // always exists, may be empty. NOT USED: Consider removing.
    start: string // ISO string. ex: 2025-11-13T21:00:00.000Z or 2025-11-13T13:00:00-08:00
    end: string // ISO string. Hack: if same as start, exact start time is not known. If 1 minute after start, end time is not known.
    startSecs?: number // start time in seconds since epoch
    endSecs?: number //     end time in seconds since epoch
    tz?: string // ex: 'America/Los_Angeles'; 'UNKNOWN_TZ' if location not found.  'UNKNOWN_TZ|REINTERPRET_UTC_TO_LOCAL' if using UTC but time is actually local.
    location: string // always exists, may be empty, matches original_location
    resolved_location?: Location
    note?: string // for internal use, eg 'plura'
    src?: number // source index when 2 or more event sources: 1 for first source, 2 for second, etc.
    // TODO: add CmfEvent.timeKnown (2=start+end time known, 1=start known, end unknown, 0=start and end times unknown)
}

export interface CmfEvents {
    allEvents: CmfEvent[]
    visibleEvents: CmfEvent[] // events that pass all filters
    hiddenCounts: {
        byMap: number
        bySearch: number
        byDate: number
        byLocationFilter: number
    }
}

export interface EventsSource {
    prefix: string // must be unique, eg 'gc' for 'gc:1234567890'
    name: string
    url: string
    // Runtime fields added when processing API responses:
    id?: string // the '1234567890' in 'gc:1234567890'
    totalCount?: number
    unknownLocationsCount?: number
}

export interface EventsSourceParams {
    id: string
    timeMin?: string
    timeMax?: string
    [key: string]: string | undefined
}

export interface EventsSourceResponse {
    events: CmfEvent[]
    source: EventsSource
    httpStatus: number
    fromCache?: boolean
    statsOnly?: boolean
}

export interface DateRangeIso {
    startIso: string // store as ISO string, use date-fns/format to display in user's local timezone
    endIso: string // store as ISO string, use date-fns/format to display in user's local timezone
}

export interface DomainFilters {
    dateRange?: DateRangeIso
    searchQuery?: string
    showUnknownLocationsOnly?: boolean
}
