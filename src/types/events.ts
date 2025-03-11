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
    formatted_address?: string
    lat?: number
    lng?: number
    status: 'resolved' | 'unresolved' | 'pending'
}

export interface CMFEvents {
    events: CalendarEvent[]
    total_count: number
    unknown_locations_count: number
    calendar_name: string
    calendar_id: string
}
