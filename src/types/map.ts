import { CalendarEvent } from './events'

export interface MapViewport {
    latitude: number
    longitude: number
    zoom: number
    bearing: number
    pitch: number
}

export interface MapBounds {
    north: number
    south: number
    east: number
    west: number
}

export interface MapMarker {
    id: string
    latitude: number
    longitude: number
    events: CalendarEvent[]
}
