import {
    customLocationParserLatLon,
    customLocationParserDegMinSec,
    customLocationParserDegMinDecimal,
    updateResolvedLocation,
    geocodeLocation,
    batchGeocodeLocations,
} from '../geocoding'
import { logr } from '@/lib/utils/logr'
import axios from 'axios'
import { getCachedLocation, cacheLocation } from '@/lib/cache'

// Mock dependencies
jest.mock('axios')
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        info: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}))
jest.mock('@/lib/cache', () => ({
    getCachedLocation: jest.fn(),
    cacheLocation: jest.fn(),
}))

// Mock API response data
const mockGeocodeResult = {
    formatted_address: '123 Test St',
    geometry: {
        location: {
            lat: 37.7749,
            lng: -122.4194,
        },
        location_type: 'ROOFTOP',
        viewport: {
            northeast: {
                lat: 37.7762489697085,
                lng: -122.4180510302915,
            },
            southwest: {
                lat: 37.7735510302915,
                lng: -122.4207489697085,
            },
        },
    },
    types: ['street_address'],
    place_id: 'test_place_id',
}

describe('geocoding', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('customLocationParserLatLon', () => {
        it('should parse valid latitude and longitude', () => {
            const result = customLocationParserLatLon('37.774929,-122.419418')
            expect(result).toEqual({
                original_location: '37.774929,-122.419418',
                formatted_address: '37.774929,-122.419418',
                lat: 37.774929,
                lng: -122.419418,
                status: 'resolved',
            })
        })

        it('should handle spaces in input', () => {
            const result = customLocationParserLatLon(' 37.774929, -122.419418 ')
            expect(result).toEqual({
                original_location: ' 37.774929, -122.419418 ',
                formatted_address: '37.774929,-122.419418',
                lat: 37.774929,
                lng: -122.419418,
                status: 'resolved',
            })
        })

        it('should return false for invalid input', () => {
            expect(customLocationParserLatLon('invalid')).toBe(false)
            expect(customLocationParserLatLon('37.774929')).toBe(false)
            expect(customLocationParserLatLon('37.774929,abc')).toBe(false)
        })
    })

    describe('customLocationParserDegMinSec', () => {
        it('should parse valid degrees, minutes, seconds format', () => {
            const result = customLocationParserDegMinSec('41°07\'16.0"N 1°00\'16.9"E')
            expect(result).toEqual({
                original_location: '41°07\'16.0"N 1°00\'16.9"E',
                formatted_address: '41.121111,1.004694',
                lat: 41.121111,
                lng: 1.004694,
                status: 'resolved',
            })
        })

        it('should handle different hemisphere combinations', () => {
            const result = customLocationParserDegMinSec('41°07\'16.0"S 1°00\'16.9"W')
            expect(result).toEqual({
                original_location: '41°07\'16.0"S 1°00\'16.9"W',
                formatted_address: '-41.121111,-1.004694',
                lat: -41.121111,
                lng: -1.004694,
                status: 'resolved',
            })
        })

        it('should return false for invalid input', () => {
            expect(customLocationParserDegMinSec('invalid')).toBe(false)
            expect(customLocationParserDegMinSec('41°07\'16.0"N')).toBe(false)
            expect(customLocationParserDegMinSec('41°07\'16.0"X 1°00\'16.9"E')).toBe(false)
        })
    })

    describe('customLocationParserDegMinDecimal', () => {
        it('should parse valid degrees and decimal minutes format', () => {
            const result = customLocationParserDegMinDecimal('N 41° 07.266 E 001° 00.281')
            expect(result).toEqual({
                original_location: 'N 41° 07.266 E 001° 00.281',
                formatted_address: '41.121100,1.004683',
                lat: 41.1211,
                lng: 1.004683,
                status: 'resolved',
            })
        })

        it('should handle different hemisphere combinations', () => {
            const result = customLocationParserDegMinDecimal('S 41° 07.266 W 001° 00.281')
            expect(result).toEqual({
                original_location: 'S 41° 07.266 W 001° 00.281',
                formatted_address: '-41.121100,-1.004683',
                lat: -41.1211,
                lng: -1.004683,
                status: 'resolved',
            })
        })

        it('should return false for invalid input', () => {
            expect(customLocationParserDegMinDecimal('invalid')).toBe(false)
            expect(customLocationParserDegMinDecimal('N 41° 07.266')).toBe(false)
            expect(customLocationParserDegMinDecimal('X 41° 07.266 E 001° 00.281')).toBe(false)
        })
    })

    describe('updateResolvedLocation', () => {
        it('should update location with API data', () => {
            const result = {
                original_location: 'Test Location',
                status: 'unresolved' as const,
            }
            const updated = updateResolvedLocation(result, mockGeocodeResult)
            expect(updated).toEqual({
                original_location: 'Test Location',
                formatted_address: '123 Test St',
                lat: 37.7749,
                lng: -122.4194,
                types: ['street_address'],
                status: 'resolved',
            })
        })

        it('should handle invalid API data', () => {
            const result = {
                original_location: 'Test Location',
                status: 'unresolved' as const,
            }
            const apiData = {} as any
            const updated = updateResolvedLocation(result, apiData)
            expect(updated).toEqual({
                original_location: 'Test Location',
                status: 'unresolved',
            })
            expect(logr.info).toHaveBeenCalled()
        })
    })

    describe('geocodeLocation', () => {
        const mockApiResponse = {
            data: {
                results: [mockGeocodeResult],
            },
        }

        beforeEach(() => {
            process.env.GOOGLE_MAPS_API_KEY = 'test-key'
            ;(axios.get as jest.Mock).mockResolvedValue(mockApiResponse)
            ;(getCachedLocation as jest.Mock).mockResolvedValue(null)
        })

        it('should handle empty location string', async () => {
            const result = await geocodeLocation('')
            expect(result).toEqual({
                original_location: '',
                status: 'unresolved',
            })
        })

        it('should use cached location if available', async () => {
            const cachedLocation = {
                original_location: 'Test Location',
                formatted_address: '123 Test St',
                lat: 37.7749,
                lng: -122.4194,
                status: 'resolved' as const,
            }
            ;(getCachedLocation as jest.Mock).mockResolvedValue(cachedLocation)

            const result = await geocodeLocation('Test Location')
            expect(result).toEqual(cachedLocation)
            expect(axios.get).not.toHaveBeenCalled()
        })

        it('should geocode location using Google Maps API', async () => {
            const result = await geocodeLocation('Test Location')
            expect(result).toEqual({
                original_location: 'Test Location',
                formatted_address: '123 Test St',
                lat: 37.7749,
                lng: -122.4194,
                types: ['street_address'],
                status: 'resolved',
            })
            expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: 'Test Location',
                    key: 'test-key',
                },
            })
            expect(cacheLocation).toHaveBeenCalled()
        })

        it('should handle API errors', async () => {
            ;(axios.get as jest.Mock).mockRejectedValue(new Error('API Error'))

            const result = await geocodeLocation('Test Location')
            expect(result).toEqual({
                original_location: 'Test Location',
                status: 'unresolved',
            })
            expect(logr.warn).toHaveBeenCalled()
        })

        it('should handle missing API key', async () => {
            process.env.GOOGLE_MAPS_API_KEY = undefined

            const result = await geocodeLocation('Test Location')
            expect(result).toEqual({
                original_location: 'Test Location',
                status: 'unresolved',
            })
            expect(logr.warn).toHaveBeenCalled()
        })
    })

    describe('batchGeocodeLocations', () => {
        it('should geocode multiple locations', async () => {
            const locations = ['Location 1', 'Location 2']
            const mockResult = {
                original_location: 'Test',
                formatted_address: '123 Test St',
                lat: 37.7749,
                lng: -122.4194,
                status: 'resolved' as const,
            }
            ;(getCachedLocation as jest.Mock).mockResolvedValue(mockResult)

            const results = await batchGeocodeLocations(locations)
            expect(results).toHaveLength(2)
            expect(results[0]).toEqual(mockResult)
            expect(results[1]).toEqual(mockResult)
        })
    })
})
