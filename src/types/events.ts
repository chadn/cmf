import { MapBounds } from './map'

export type EventStatus = 'resolved' | 'unresolved'
export const LOCATION_KEY_PREFIX = 'location:'
export const EVENTS_CACHE_PREFIX = 'events:'

export interface Location {
    status: EventStatus
    original_location: string
    // the rest of these are only if status === 'resolved'
    formatted_address?: string
    lat?: number
    lng?: number
    types?: string[] // google maps location types: bars, night_club, point_of_interest, restaurant, etc.
}

export interface CmfEvent {
    id: string
    name: string
    original_event_url: string
    description: string // always exists, may be empty
    description_urls: string[] // always exists, may be empty
    start: string
    end: string
    location: string // always exists, may be empty, matches original_location
    resolved_location?: Location
    note?: string // for internal use, eg 'plura'
    // Keep any other existing fields
}

export interface EventFilters {
    dateRange?: { start: string; end: string }
    searchQuery?: string
    mapBounds?: MapBounds
    showUnknownLocationsOnly?: boolean
}

export interface EventsState {
    events: CmfEvent[]
    filters: EventFilters
    selectedEventId: string | null
    isLoading: boolean
    error: Error | null
}

export type EventsAction =
    | { type: 'SET_EVENTS'; payload: CmfEvent[] }
    | { type: 'SET_FILTERS'; payload: EventFilters }
    | { type: 'SELECT_EVENT'; payload: string | null } // can be selected by map or list
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: Error | null }
    | { type: 'CLEAR_ERROR' }

export interface EventSourceType {
    prefix: string // must be unique, eg 'gc' for 'gc:1234567890'
    name: string
}

export interface EventSourceParams {
    id: string
    timeMin?: string
    timeMax?: string
    [key: string]: string | undefined
}

export interface EventSourceResponseMetadata {
    id: string
    name: string
    totalCount: number
    unknownLocationsCount: number
    type: EventSourceType
}

export interface EventSourceResponse {
    events: CmfEvent[]
    metadata: EventSourceResponseMetadata
    httpStatus: number
}

export interface EventsFilter {
    dateRange?: { start: string; end: string }
    searchQuery?: string
    mapBounds?: MapBounds
    showUnknownLocationsOnly?: boolean
}

export interface FilteredEvents {
    mapFilteredEvents: CmfEvent[]
    searchFilteredEvents: CmfEvent[]
    dateFilteredEvents: CmfEvent[]
    unknownLocationsFilteredEvents: CmfEvent[]
    // totalFiltered is all filtered out, is less than or equal to the sum of all filtered, since some events can be filtered out by multiple filters
    filteredEvents: CmfEvent[]
    // totalShown is events that pass all filters, not filetred out. allEvents - totalFilteredEvents
    shownEvents: CmfEvent[]
    allEvents: CmfEvent[]
}

export interface FilterStats {
    mapFilteredCount: number
    searchFilteredCount: number
    dateFilteredCount: number
    unknownLocationsFilteredCount: number
    totalFilteredCount: number
    totalShownCount: number
    totalEventsCount: number
}
