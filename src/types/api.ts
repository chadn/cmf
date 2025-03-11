export interface GoogleCalendarEvent {
    id: string
    summary: string
    description?: string
    location?: string
    start: {
        dateTime?: string
        date?: string
        timeZone?: string
    }
    end: {
        dateTime?: string
        date?: string
        timeZone?: string
    }
    htmlLink: string
    recurrence?: string[]
}

export interface GoogleCalendarResponse {
    kind: string
    etag: string
    summary: string
    description?: string
    updated: string
    timeZone: string
    accessRole: string
    items: GoogleCalendarEvent[]
}

export interface GeocodeResult {
    formatted_address: string
    geometry: {
        location: {
            lat: number
            lng: number
        }
    }
    place_id: string
    types: string[]
}

export interface GeocodeResponse {
    results: GeocodeResult[]
    status: string
}
