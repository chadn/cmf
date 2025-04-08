import { MapBounds } from './map'

export type EventStatus = 'resolved' | 'unresolved'

export interface Location {
    status: EventStatus
    original_location: string
    // the rest of these are only if status === 'resolved'
    formatted_address?: string
    lat?: number
    lng?: number
    types?: string[] // google maps location types: bars, night_club, point_of_interest, restaurant, etc.
}

export interface CalendarEvent {
    id: string
    name: string
    original_event_url: string
    description: string // always exists, may be empty
    description_urls: string[] // always exists, may be empty
    start: string
    end: string
    location: string // always exists, may be empty, matches original_location
    resolved_location?: Location
    // Keep any other existing fields
}

export interface EventFilters {
    dateRange?: { start: string; end: string }
    searchQuery?: string
    mapBounds?: MapBounds
    showUnknownLocationsOnly?: boolean
}

export interface EventsState {
    events: CalendarEvent[]
    filters: EventFilters
    selectedEventId: string | null
    isLoading: boolean
    error: Error | null
}

export type EventsAction =
    | { type: 'SET_EVENTS'; payload: CalendarEvent[] }
    | { type: 'SET_FILTERS'; payload: EventFilters }
    | { type: 'SELECT_EVENT'; payload: string | null } // can be selected by map or list
    | { type: 'SET_LOADING'; payload: boolean }
    | { type: 'SET_ERROR'; payload: Error | null }

// Keep existing types for backward compatibility
export interface GoogleCalendarEvent {
    id: string
    summary: string
    description?: string
    start: {
        dateTime: string
        timeZone: string
    }
    end: {
        dateTime: string
        timeZone: string
    }
    location?: string
}

export interface EventsFilter {
    dateRange?: { start: string; end: string }
    searchQuery?: string
    mapBounds?: MapBounds
    showUnknownLocationsOnly?: boolean
}

export interface FilteredEvents {
    mapFilteredEvents: CalendarEvent[]
    searchFilteredEvents: CalendarEvent[]
    dateFilteredEvents: CalendarEvent[]
    unknownLocationsFilteredEvents: CalendarEvent[]
    // totalFiltered is all filtered out, is less than or equal to the sum of all filtered, since some events can be filtered out by multiple filters
    filteredEvents: CalendarEvent[]
    // totalShown is events that pass all filters, not filetred out. allEvents - totalFilteredEvents
    shownEvents: CalendarEvent[]
    allEvents: CalendarEvent[]
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
