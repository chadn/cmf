import {
    truncateLocation,
    isLocationWithinBounds,
    calculateCenter,
    findLargestCity,
} from '../location'
import { MapBounds } from '@/types/map'
import { ResolvedLocation } from '@/types/events'

describe('Location Utilities', () => {
    describe('truncateLocation', () => {
        it('truncates a location string that exceeds the max length', () => {
            const longLocation =
                'This is a very long location string that should be truncated'
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

    describe('isLocationWithinBounds', () => {
        const bounds: MapBounds = {
            north: 40,
            south: 30,
            east: 20,
            west: 10,
        }

        it('returns true for a location within bounds', () => {
            const location: ResolvedLocation = {
                original_location: 'Test Location',
                formatted_address: 'Test Location',
                lat: 35,
                lng: 15,
                status: 'resolved',
            }
            expect(isLocationWithinBounds(location, bounds)).toBe(true)
        })

        it('returns false for a location outside bounds', () => {
            const location: ResolvedLocation = {
                original_location: 'Test Location',
                formatted_address: 'Test Location',
                lat: 45,
                lng: 25,
                status: 'resolved',
            }
            expect(isLocationWithinBounds(location, bounds)).toBe(false)
        })

        it('returns false for an unresolved location', () => {
            const location: ResolvedLocation = {
                original_location: 'Test Location',
                status: 'unresolved',
            }
            expect(isLocationWithinBounds(location, bounds)).toBe(false)
        })

        it('returns false for a location with missing coordinates', () => {
            const location: ResolvedLocation = {
                original_location: 'Test Location',
                formatted_address: 'Test Location',
                status: 'resolved',
            }
            expect(isLocationWithinBounds(location, bounds)).toBe(false)
        })
    })

    describe('calculateCenter', () => {
        it('calculates the center point of multiple locations', () => {
            const locations: ResolvedLocation[] = [
                {
                    original_location: 'Location 1',
                    formatted_address: 'Location 1',
                    lat: 10,
                    lng: 20,
                    status: 'resolved',
                },
                {
                    original_location: 'Location 2',
                    formatted_address: 'Location 2',
                    lat: 30,
                    lng: 40,
                    status: 'resolved',
                },
            ]
            const center = calculateCenter(locations)
            expect(center.latitude).toBe(20) // Average of 10 and 30
            expect(center.longitude).toBe(30) // Average of 20 and 40
        })

        it('returns default US center for empty locations array', () => {
            const center = calculateCenter([])
            expect(center.latitude).toBe(39.8283)
            expect(center.longitude).toBe(-98.5795)
        })

        it('filters out unresolved locations', () => {
            const locations: ResolvedLocation[] = [
                {
                    original_location: 'Location 1',
                    formatted_address: 'Location 1',
                    lat: 10,
                    lng: 20,
                    status: 'resolved',
                },
                {
                    original_location: 'Location 2',
                    status: 'unresolved',
                },
            ]
            const center = calculateCenter(locations)
            expect(center.latitude).toBe(10)
            expect(center.longitude).toBe(20)
        })
    })

    describe('findLargestCity', () => {
        it('returns the first resolved location when multiple are available', () => {
            const locations: ResolvedLocation[] = [
                {
                    original_location: 'New York',
                    formatted_address: 'New York, NY, USA',
                    lat: 40.7128,
                    lng: -74.006,
                    status: 'resolved',
                },
                {
                    original_location: 'Los Angeles',
                    formatted_address: 'Los Angeles, CA, USA',
                    lat: 34.0522,
                    lng: -118.2437,
                    status: 'resolved',
                },
            ]
            const result = findLargestCity(locations)
            expect(result).toEqual(locations[0])
        })

        it('returns null for empty locations array', () => {
            const result = findLargestCity([])
            expect(result).toBeNull()
        })

        it('returns null when no resolved locations are available', () => {
            const locations: ResolvedLocation[] = [
                {
                    original_location: 'Unknown Place',
                    status: 'unresolved',
                },
                {
                    original_location: 'Another Unknown',
                    status: 'unresolved',
                },
            ]
            const result = findLargestCity(locations)
            expect(result).toBeNull()
        })

        it('filters out locations without coordinates', () => {
            const locations: ResolvedLocation[] = [
                {
                    original_location: 'Incomplete Location',
                    formatted_address: 'Incomplete Location',
                    status: 'resolved',
                    // Missing lat/lng
                },
                {
                    original_location: 'Complete Location',
                    formatted_address: 'Complete Location',
                    lat: 40.7128,
                    lng: -74.006,
                    status: 'resolved',
                },
            ]
            const result = findLargestCity(locations)
            expect(result).toEqual(locations[1])
        })
    })
})
