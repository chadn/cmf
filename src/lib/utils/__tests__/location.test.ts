import { truncateLocation, calculateMapBoundsAndViewport, generateMapMarkers, genMarkerId } from '../location'
import { MapBounds, MapMarker } from '@/types/map'
import { CmfEvent } from '@/types/events'

describe('Location and Map Utilities', () => {
    describe('truncateLocation', () => {
        it('truncates a location string that exceeds the max length', () => {
            const longLocation = 'This is a very long location string that should be truncated'
            const result = truncateLocation(longLocation, 20)
            expect(result).toBe('This is a very lo...')
            expect(result.length).toBe(20)
        })

        it('does not truncate a location string that is shorter than max length', () => {
            const shortLocation = 'Short location'
            const result = truncateLocation(shortLocation, 20)
            expect(result).toBe(shortLocation)
        })

        it('returns empty string for empty input', () => {
            expect(truncateLocation('')).toBe('')
        })

        it('uses default max length if not specified', () => {
            const longLocation = 'A'.repeat(50)
            const result = truncateLocation(longLocation)
            expect(result.length).toBe(40) // Default is 40
        })
    })

    describe('calculateMapBoundsAndViewport', () => {
        it('should return default values for empty markers array', () => {
            const result = calculateMapBoundsAndViewport([])

            expect(result.bounds).toBeNull()
            expect(result.viewport).toEqual({
                latitude: 0,
                longitude: 0,
                zoom: 1,
                bearing: 0,
                pitch: 0,
            })
        })

        it('should handle single marker correctly', () => {
            const marker: MapMarker = {
                id: '1',
                latitude: 37.7749,
                longitude: -122.4194,
                events: [],
            }

            const result = calculateMapBoundsAndViewport([marker])

            expect(result.bounds).toEqual({
                north: 37.7749,
                south: 37.7749,
                east: -122.4194,
                west: -122.4194,
            })
            expect(result.viewport).toEqual({
                latitude: 37.7749,
                longitude: -122.4194,
                zoom: expect.any(Number),
                bearing: 0,
                pitch: 0,
            })
            expect(result.viewport.zoom).toBeGreaterThanOrEqual(10)
            expect(result.viewport.zoom).toBeLessThanOrEqual(15)
        })

        it('should calculate correct bounds and viewport for multiple markers', () => {
            const markers: MapMarker[] = [
                {
                    id: '1',
                    latitude: 37.7749,
                    longitude: -122.4194,
                    events: [],
                },
                {
                    id: '2',
                    latitude: 37.7833,
                    longitude: -122.4167,
                    events: [],
                },
                {
                    id: '3',
                    latitude: 37.7935,
                    longitude: -122.4399,
                    events: [],
                },
            ]

            const result = calculateMapBoundsAndViewport(markers)

            // Check that bounds include all markers (without expecting padding)
            expect(result.bounds).toBeDefined()
            if (result.bounds) {
                expect(result.bounds.north).toBe(37.7935) // Max latitude
                expect(result.bounds.south).toBe(37.7749) // Min latitude
                expect(result.bounds.east).toBe(-122.4167) // Max longitude (east most)
                expect(result.bounds.west).toBe(-122.4399) // Min longitude (west most)
            }

            // Check viewport center is between min and max coordinates
            expect(result.viewport.latitude).toBeGreaterThan(37.7749)
            expect(result.viewport.latitude).toBeLessThan(37.7935)
            expect(result.viewport.longitude).toBeGreaterThan(-122.4399)
            expect(result.viewport.longitude).toBeLessThan(-122.4167)

            // Check zoom is within expected range
            expect(result.viewport.zoom).toBeGreaterThanOrEqual(1)
            expect(result.viewport.zoom).toBeLessThanOrEqual(15)

            // Check other viewport properties
            expect(result.viewport.bearing).toBe(0)
            expect(result.viewport.pitch).toBe(0)
        })

        it('should handle markers with same coordinates', () => {
            const markers: MapMarker[] = [
                {
                    id: '1',
                    latitude: 37.7749,
                    longitude: -122.4194,
                    events: [],
                },
                {
                    id: '2',
                    latitude: 37.7749,
                    longitude: -122.4194,
                    events: [],
                },
            ]

            const result = calculateMapBoundsAndViewport(markers)

            expect(result.bounds).toEqual({
                north: 37.7749,
                south: 37.7749,
                east: -122.4194,
                west: -122.4194,
            })
            expect(result.viewport).toEqual({
                latitude: 37.7749,
                longitude: -122.4194,
                zoom: expect.any(Number),
                bearing: 0,
                pitch: 0,
            })
            expect(result.viewport.zoom).toBeGreaterThanOrEqual(10)
            expect(result.viewport.zoom).toBeLessThanOrEqual(15)
        })
    })

    describe('calculateBoundsFromMarkers', () => {
        it('should return zero bounds for empty markers array', () => {
            const { calculateBoundsFromMarkers } = require('../location')
            const result = calculateBoundsFromMarkers([])

            expect(result).toEqual({
                north: 0,
                south: 0,
                east: 0,
                west: 0,
            })
        })

        it('should return correct bounds for single marker', () => {
            const { calculateBoundsFromMarkers } = require('../location')
            const marker: MapMarker = {
                id: '1',
                latitude: 37.7749,
                longitude: -122.4194,
                events: [],
            }

            const result = calculateBoundsFromMarkers([marker])

            expect(result).toEqual({
                north: 37.7749,
                south: 37.7749,
                east: -122.4194,
                west: -122.4194,
            })
        })

        it('should calculate correct bounds for multiple markers', () => {
            const { calculateBoundsFromMarkers } = require('../location')
            const markers: MapMarker[] = [
                {
                    id: '1',
                    latitude: 37.7749,
                    longitude: -122.4194,
                    events: [],
                },
                {
                    id: '2',
                    latitude: 37.7833,
                    longitude: -122.4167,
                    events: [],
                },
                {
                    id: '3',
                    latitude: 37.7935,
                    longitude: -122.4399,
                    events: [],
                },
            ]

            const result = calculateBoundsFromMarkers(markers)

            // Check exact bounds without padding
            expect(result.north).toBe(37.7935) // Max latitude
            expect(result.south).toBe(37.7749) // Min latitude
            expect(result.east).toBe(-122.4167) // Max longitude (east most)
            expect(result.west).toBe(-122.4399) // Min longitude (west most)
        })

        it('should handle markers with extreme values', () => {
            const { calculateBoundsFromMarkers } = require('../location')
            const markers: MapMarker[] = [
                {
                    id: '1',
                    latitude: 90, // North pole
                    longitude: 0,
                    events: [],
                },
                {
                    id: '2',
                    latitude: -90, // South pole
                    longitude: 180,
                    events: [],
                },
                {
                    id: '3',
                    latitude: 0,
                    longitude: -180,
                    events: [],
                },
            ]

            const result = calculateBoundsFromMarkers(markers)

            expect(result.north).toBe(90)
            expect(result.south).toBe(-90)
            expect(result.east).toBe(180)
            expect(result.west).toBe(-180)
        })
    })

    describe('genMarkerId', () => {
        it('should return empty string for unresolved location', () => {
            const event: CmfEvent = {
                id: '1',
                name: 'Test Event',
                original_event_url: 'https://example.com',
                description: 'Test Description',
                description_urls: [],
                start: '2023-01-01T10:00:00Z',
                end: '2023-01-01T11:00:00Z',
                location: 'Test Location',
                resolved_location: {
                    status: 'unresolved',
                    original_location: 'Test Location',
                },
            }

            expect(genMarkerId(event)).toBe('')
        })

        it('should return empty string for location without coordinates', () => {
            const event: CmfEvent = {
                id: '1',
                name: 'Test Event',
                original_event_url: 'https://example.com',
                description: 'Test Description',
                description_urls: [],
                start: '2023-01-01T10:00:00Z',
                end: '2023-01-01T11:00:00Z',
                location: 'Test Location',
                resolved_location: {
                    status: 'resolved',
                    original_location: 'Test Location',
                    formatted_address: 'Test Location',
                },
            }

            expect(genMarkerId(event)).toBe('')
        })

        it('should generate a valid marker ID from coordinates', () => {
            const event: CmfEvent = {
                id: '1',
                name: 'Test Event',
                original_event_url: 'https://example.com',
                description: 'Test Description',
                description_urls: [],
                start: '2023-01-01T10:00:00Z',
                end: '2023-01-01T11:00:00Z',
                location: 'Test Location',
                resolved_location: {
                    status: 'resolved',
                    original_location: 'Test Location',
                    formatted_address: 'Test Location',
                    lat: 37.7749,
                    lng: -122.4194,
                },
            }

            expect(genMarkerId(event)).toBe('37.774900,-122.419400')
        })
    })

    describe('generateMapMarkers', () => {
        it('should return empty array for empty events array', () => {
            const result = generateMapMarkers([])
            expect(result).toEqual([])
        })

        it('should return empty array for non-array input', () => {
            // @ts-ignore - Testing invalid input
            const result = generateMapMarkers(null)
            expect(result).toEqual([])
        })

        it('should generate markers for events with valid locations', () => {
            const events: CmfEvent[] = [
                {
                    id: '1',
                    name: 'Event 1',
                    original_event_url: 'https://example.com/1',
                    description: 'Description 1',
                    description_urls: [],
                    start: '2023-01-01T10:00:00Z',
                    end: '2023-01-01T11:00:00Z',
                    location: 'Location 1',
                    resolved_location: {
                        status: 'resolved',
                        original_location: 'Location 1',
                        formatted_address: 'Location 1',
                        lat: 37.7749,
                        lng: -122.4194,
                    },
                },
                {
                    id: '2',
                    name: 'Event 2',
                    original_event_url: 'https://example.com/2',
                    description: 'Description 2',
                    description_urls: [],
                    start: '2023-01-01T12:00:00Z',
                    end: '2023-01-01T13:00:00Z',
                    location: 'Location 2',
                    resolved_location: {
                        status: 'resolved',
                        original_location: 'Location 2',
                        formatted_address: 'Location 2',
                        lat: 37.7833,
                        lng: -122.4167,
                    },
                },
            ]

            const result = generateMapMarkers(events)

            expect(result.length).toBe(2)
            expect(result[0].id).toBe('37.774900,-122.419400')
            expect(result[0].latitude).toBe(37.7749)
            expect(result[0].longitude).toBe(-122.4194)
            expect(result[0].events.length).toBe(1)
            expect(result[0].events[0].id).toBe('1')

            expect(result[1].id).toBe('37.783300,-122.416700')
            expect(result[1].latitude).toBe(37.7833)
            expect(result[1].longitude).toBe(-122.4167)
            expect(result[1].events.length).toBe(1)
            expect(result[1].events[0].id).toBe('2')
        })

        it('should group events at the same location into a single marker', () => {
            const events: CmfEvent[] = [
                {
                    id: '1',
                    name: 'Event 1',
                    original_event_url: 'https://example.com/1',
                    description: 'Description 1',
                    description_urls: [],
                    start: '2023-01-01T10:00:00Z',
                    end: '2023-01-01T11:00:00Z',
                    location: 'Location 1',
                    resolved_location: {
                        status: 'resolved',
                        original_location: 'Location 1',
                        formatted_address: 'Location 1',
                        lat: 37.7749,
                        lng: -122.4194,
                    },
                },
                {
                    id: '2',
                    name: 'Event 2',
                    original_event_url: 'https://example.com/2',
                    description: 'Description 2',
                    description_urls: [],
                    start: '2023-01-01T12:00:00Z',
                    end: '2023-01-01T13:00:00Z',
                    location: 'Location 2',
                    resolved_location: {
                        status: 'resolved',
                        original_location: 'Location 2',
                        formatted_address: 'Location 2',
                        lat: 37.7749,
                        lng: -122.4194,
                    },
                },
            ]

            const result = generateMapMarkers(events)

            expect(result.length).toBe(1)
            expect(result[0].id).toBe('37.774900,-122.419400')
            expect(result[0].latitude).toBe(37.7749)
            expect(result[0].longitude).toBe(-122.4194)
            expect(result[0].events.length).toBe(2)
            expect(result[0].events.map((e) => e.id)).toEqual(['1', '2'])
        })

        it('should skip events without valid locations', () => {
            const events: CmfEvent[] = [
                {
                    id: '1',
                    name: 'Event 1',
                    original_event_url: 'https://example.com/1',
                    description: 'Description 1',
                    description_urls: [],
                    start: '2023-01-01T10:00:00Z',
                    end: '2023-01-01T11:00:00Z',
                    location: 'Location 1',
                    resolved_location: {
                        status: 'resolved',
                        original_location: 'Location 1',
                        formatted_address: 'Location 1',
                        lat: 37.7749,
                        lng: -122.4194,
                    },
                },
                {
                    id: '2',
                    name: 'Event 2',
                    original_event_url: 'https://example.com/2',
                    description: 'Description 2',
                    description_urls: [],
                    start: '2023-01-01T12:00:00Z',
                    end: '2023-01-01T13:00:00Z',
                    location: 'Location 2',
                    resolved_location: {
                        status: 'unresolved',
                        original_location: 'Location 2',
                    },
                },
                {
                    id: '3',
                    name: 'Event 3',
                    original_event_url: 'https://example.com/3',
                    description: 'Description 3',
                    description_urls: [],
                    start: '2023-01-01T14:00:00Z',
                    end: '2023-01-01T15:00:00Z',
                    location: 'Location 3',
                    resolved_location: {
                        status: 'resolved',
                        original_location: 'Location 3',
                        formatted_address: 'Location 3',
                        // Missing lat/lng
                    },
                },
            ]

            const result = generateMapMarkers(events)

            expect(result.length).toBe(1)
            expect(result[0].events.length).toBe(1)
            expect(result[0].events[0].id).toBe('1')
        })
    })
})
