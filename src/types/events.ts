export interface CalendarEvent {
    id: string
    name: string
    startDate: string
    endDate: string
    location: string
    description: string
    description_urls: string[]
    original_event_url: string
    resolved_location?: ResolvedLocation
}

export interface ResolvedLocation {
    original_location: string
    name_address?: string
    formatted_address?: string
    lat?: number
    lng?: number
    types?: string[]
    status: 'resolved' | 'unresolved' | 'pending'
}

// TODO: Chad - needs work.  remove *_count,
// TODO: Fully Support calendarEndDate to fetch beyond 3 months out,.
export interface CMFEvents {
    events: CalendarEvent[]
    total_count: number
    unknown_locations_count: number
    calendar_name: string
    calendar_id: string
    calendar_start_date: string
    calendar_end_date: string
}
