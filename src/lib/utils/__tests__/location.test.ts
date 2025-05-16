import {
    truncateLocation,
    calculateMapBoundsAndViewport,
    generateMapMarkers,
    genMarkerId,
    calculateBoundsFromMarkers,
    calculateBoundsFromViewport,
    viewportUrlToViewport,
    parseAsZoom,
    parseAsLatLon,
    parseAsEventSource,
    viewstate2Viewport,
} from '../location'
import { MapMarker } from '@/types/map'
import { CmfEvent } from '@/types/events'
import { ExampleEventSources } from '@/lib/events/examples'

// Mock WebMercatorViewport
jest.mock('@math.gl/web-mercator', () => {
    return class WebMercatorViewport {
        constructor(options: { width: number; height: number }) {
            // Store dimensions for potential use
            this.width = options.width || 800
            this.height = options.height || 600
        }

        width: number
        height: number

        fitBounds(bounds: [[number, number], [number, number]]) {
            // Simple mock implementation that returns the center of the bounds with a fixed zoom
            const [[west, south], [east, north]] = bounds
            const latitude = (north + south) / 2
            const longitude = (east + west) / 2

            // Calculate zoom based on the bounds size
            const latDiff = Math.abs(north - south)
            const lngDiff = Math.abs(east - west)
            const maxDiff = Math.max(latDiff, lngDiff)

            // Default zoom level or calculated based on bounds
            const zoom = maxDiff === 0 ? 12 : Math.min(12, 12 - Math.log2(maxDiff * 5))

            return {
                latitude,
                longitude,
                zoom,
                bearing: 0,
                pitch: 0,
            }
        }
    }
})

// Mock the exampleEventSources for parseAsEventSource tests
jest.mock('@/lib/events/examples', () => ({
    ExampleEventSources: [
        { id: 'example:123', shortId: 'ex123' },
        { id: 'example:456', shortId: 'ex456' },
        { id: 'example:789', shortId: null }, // One without shortId
    ],
}))

// Mock the nuqs parser
jest.mock('nuqs', () => ({
    createParser: jest.fn().mockImplementation((config) => ({
        parse: config.parse,
        serialize: config.serialize,
    })),
}))

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
            const result = calculateMapBoundsAndViewport([], 800, 600)

            expect(result.bounds).toEqual({
                north: 0,
                south: 0,
                east: 0,
                west: 0,
            })
            expect(result.viewport).toEqual({
                latitude: 0,
                longitude: 0,
                zoom: expect.any(Number),
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

            const result = calculateMapBoundsAndViewport([marker], 800, 600)

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

            const result = calculateMapBoundsAndViewport(markers, 800, 600)

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

            const result = calculateMapBoundsAndViewport(markers, 800, 600)

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
            const result = calculateBoundsFromMarkers([])

            expect(result).toEqual({
                north: 0,
                south: 0,
                east: 0,
                west: 0,
            })
        })

        it('should return correct bounds for single marker', () => {
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
            // @ts-expect-error Testing invalid input
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
            ]

            const result = generateMapMarkers(events)

            expect(result.length).toBe(1)
            expect(result[0].events.length).toBe(1)
            expect(result[0].events[0].id).toBe('1')
        })

        it('should handle null events array', () => {
            // @ts-expect-error Testing null input
            const result = generateMapMarkers(null)
            expect(result).toEqual([])
        })
    })

    // New tests for functions with low coverage
    describe('calculateBoundsFromViewport', () => {
        it('should calculate bounds correctly from viewport', () => {
            const viewport = {
                latitude: 37.7749,
                longitude: -122.4194,
                zoom: 10,
                bearing: 0,
                pitch: 0,
            }

            const result = calculateBoundsFromViewport(viewport)

            // At zoom level 10, the visible area should be roughly these bounds
            expect(result.north).toBeGreaterThan(viewport.latitude)
            expect(result.south).toBeLessThan(viewport.latitude)
            expect(result.east).toBeGreaterThan(viewport.longitude)
            expect(result.west).toBeLessThan(viewport.longitude)
        })

        it('should calculate smaller bounds at higher zoom levels', () => {
            const lowZoomViewport = {
                latitude: 37.7749,
                longitude: -122.4194,
                zoom: 8,
                bearing: 0,
                pitch: 0,
            }

            const highZoomViewport = {
                latitude: 37.7749,
                longitude: -122.4194,
                zoom: 14,
                bearing: 0,
                pitch: 0,
            }

            const lowZoomBounds = calculateBoundsFromViewport(lowZoomViewport)
            const highZoomBounds = calculateBoundsFromViewport(highZoomViewport)

            // Calculate the area of each bounds
            const lowZoomArea = (lowZoomBounds.north - lowZoomBounds.south) * (lowZoomBounds.east - lowZoomBounds.west)
            const highZoomArea =
                (highZoomBounds.north - highZoomBounds.south) * (highZoomBounds.east - highZoomBounds.west)

            // Higher zoom should have smaller area (less area visible)
            expect(highZoomArea).toBeLessThan(lowZoomArea)
        })

        it('should handle extreme zoom levels', () => {
            const minZoomViewport = {
                latitude: 0,
                longitude: 0,
                zoom: 1, // Minimum zoom
                bearing: 0,
                pitch: 0,
            }

            const maxZoomViewport = {
                latitude: 0,
                longitude: 0,
                zoom: 20, // Maximum zoom
                bearing: 0,
                pitch: 0,
            }

            const minZoomBounds = calculateBoundsFromViewport(minZoomViewport)
            const maxZoomBounds = calculateBoundsFromViewport(maxZoomViewport)

            // Min zoom should show a larger area than max zoom
            const minZoomArea = (minZoomBounds.north - minZoomBounds.south) * (minZoomBounds.east - minZoomBounds.west)
            const maxZoomArea = (maxZoomBounds.north - maxZoomBounds.south) * (maxZoomBounds.east - maxZoomBounds.west)

            expect(minZoomArea).toBeGreaterThan(maxZoomArea)

            // Max zoom should show a very small area
            expect(maxZoomBounds.north - maxZoomBounds.south).toBeLessThan(0.01)
            expect(maxZoomBounds.east - maxZoomBounds.west).toBeLessThan(0.01)
        })
    })

    describe('viewportUrlToViewport', () => {
        it('should return valid viewport with valid inputs', () => {
            const result = viewportUrlToViewport(37.7749, -122.4194, 12)
            expect(result).toEqual({
                latitude: 37.7749,
                longitude: -122.4194,
                zoom: 12,
                bearing: 0,
                pitch: 0,
            })
        })

        it('should handle null inputs with defaults', () => {
            const result = viewportUrlToViewport(null, null, null)
            expect(result).toEqual({
                latitude: 0,
                longitude: 0,
                zoom: 0,
                bearing: 0,
                pitch: 0,
            })
        })

        it('should handle out of range values', () => {
            // Latitude and longitude out of range
            const result1 = viewportUrlToViewport(200, -200, 12)
            expect(result1).toEqual({
                latitude: 0, // Default when out of range
                longitude: 0, // Default when out of range
                zoom: 12,
                bearing: 0,
                pitch: 0,
            })

            // Zoom out of range
            const result2 = viewportUrlToViewport(37.7749, -122.4194, 30)
            expect(result2).toEqual({
                latitude: 37.7749,
                longitude: -122.4194,
                zoom: 0, // Default when out of range
                bearing: 0,
                pitch: 0,
            })
        })

        it('should round coordinates to 6 decimal places', () => {
            const result = viewportUrlToViewport(37.7749123456789, -122.4194987654321, 12)
            expect(result).toEqual({
                latitude: 37.774912,
                longitude: -122.419499,
                zoom: 12,
                bearing: 0,
                pitch: 0,
            })
        })
    })

    describe('viewstate2Viewport', () => {
        it('should convert ViewState to MapViewport correctly', () => {
            const viewState = {
                latitude: 37.7749123456789,
                longitude: -122.4194987654321,
                zoom: 12.3456789,
                bearing: 15,
                pitch: 30,
                padding: {
                    top: 0,
                    bottom: 0,
                    left: 0,
                    right: 0,
                },
            }

            const result = viewstate2Viewport(viewState)

            expect(result).toEqual({
                latitude: 37.774912, // Rounded to 6 decimal places
                longitude: -122.419499, // Rounded to 6 decimal places
                zoom: 12.3, // Rounded to 1 decimal place
                bearing: 15,
                pitch: 30,
            })
        })
    })

    describe('parseAsZoom', () => {
        it('should parse valid zoom values', () => {
            expect(parseAsZoom.parse('10')).toBe(10)
            expect(parseAsZoom.parse('12.5')).toBe(12.5)
        })

        it('should return null for invalid zoom values', () => {
            expect(parseAsZoom.parse('0')).toBeNull() // Below min
            expect(parseAsZoom.parse('23')).toBeNull() // Above max
            expect(parseAsZoom.parse('not-a-number')).toBeNull() // Not a number
        })

        it('should serialize zoom values correctly', () => {
            expect(parseAsZoom.serialize(10)).toBe('10') // Integer
            expect(parseAsZoom.serialize(12.5)).toBe('12.5') // Decimal
        })
    })

    describe('parseAsLatLon', () => {
        it('should parse valid latitude/longitude values', () => {
            expect(parseAsLatLon.parse('37.7749')).toBe(37.7749)
            expect(parseAsLatLon.parse('-122.4194')).toBe(-122.4194)
        })

        it('should return null for invalid latitude/longitude values', () => {
            expect(parseAsLatLon.parse('200')).toBeNull() // Above max
            expect(parseAsLatLon.parse('-200')).toBeNull() // Below min
            expect(parseAsLatLon.parse('not-a-number')).toBeNull() // Not a number
        })

        it('should serialize latitude/longitude values correctly', () => {
            expect(parseAsLatLon.serialize(37.7749)).toBe('37.77490')
            expect(parseAsLatLon.serialize(-122.4194)).toBe('-122.41940')
        })
    })

    describe('parseAsEventSource', () => {
        it('should parse valid event source IDs', () => {
            expect(parseAsEventSource.parse('facebook:123')).toBe('facebook:123')
            expect(parseAsEventSource.parse('meetup:456')).toBe('meetup:456')
        })

        it('should parse example event source shortIds', () => {
            expect(parseAsEventSource.parse('ex123')).toBe('example:123')
            expect(parseAsEventSource.parse('ex456')).toBe('example:456')
        })

        it('should return null for invalid event source IDs', () => {
            expect(parseAsEventSource.parse('invalid-format')).toBeNull()
            expect(parseAsEventSource.parse('123')).toBeNull()
        })

        it('should serialize event source IDs correctly', () => {
            // Mock the behavior of ExampleEventSources.find
            // Setup mock implementations for this test only
            const originalFind = ExampleEventSources.find
            ExampleEventSources.find = jest.fn((callback) => {
                // Return mockEventSource for example:123 and example:456
                if (callback({ id: 'example:123', shortId: 'ex123' })) {
                    return { id: 'example:123', shortId: 'ex123' }
                }
                if (callback({ id: 'example:456', shortId: 'ex456' })) {
                    return { id: 'example:456', shortId: 'ex456' }
                }
                // Return null for other cases like example:789
                return null
            }) as jest.Mock

            try {
                // Regular IDs should remain unchanged
                expect(parseAsEventSource.serialize('facebook:123')).toBe('facebook:123')

                // Example IDs with shortId should be converted to shortIds
                expect(parseAsEventSource.serialize('example:123')).toBe('ex123')
                expect(parseAsEventSource.serialize('example:456')).toBe('ex456')

                // Example without shortId should return the original ID
                expect(parseAsEventSource.serialize('example:789')).toBe('example:789')
            } finally {
                // Restore the original find method after the test
                ExampleEventSources.find = originalFind
            }
        })
    })
})
