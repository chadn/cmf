import {
    customLocationParserLatLon,
    customLocationParserDegMinSec,
    customLocationParserDegMinDecimal,
    updateResolvedLocation,
    geocodeLocation,
    batchGeocodeLocations,
} from '@/lib/api/geocoding'
import { logr } from '@/lib/utils/logr'
import axios from 'axios'
import { getCachedLocation, setCacheLocation } from '@/lib/cache'

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
    setCacheLocation: jest.fn(),
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
            process.env.GOOGLE_MAPS_API_KEY = 'test-api-key'
            ;(axios.get as jest.Mock).mockResolvedValue(mockApiResponse)
            ;(getCachedLocation as jest.Mock).mockResolvedValue(null)
        })

        it('should handle empty location string', async () => {
            const [result, source] = await geocodeLocation('')
            expect(result).toEqual({
                original_location: '',
                status: 'unresolved',
            })
            expect(source).toBe('other')
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

            const [result, source] = await geocodeLocation('Test Location')
            expect(result).toEqual(cachedLocation)
            expect(source).toBe('sCache')
            expect(axios.get).not.toHaveBeenCalled()
        })

        it('should geocode location using Google Maps API', async () => {
            const [result, source] = await geocodeLocation('Test Location')
            expect(result).toEqual({
                original_location: 'Test Location',
                formatted_address: '123 Test St',
                lat: 37.7749,
                lng: -122.4194,
                types: ['street_address'],
                status: 'resolved',
            })
            expect(source).toBe('api')
            expect(axios.get).toHaveBeenCalledWith('https://maps.googleapis.com/maps/api/geocode/json', {
                params: {
                    address: 'Test Location',
                    key: 'test-api-key',
                },
            })
            expect(setCacheLocation).toHaveBeenCalled()
        })

        it('should handle API errors', async () => {
            ;(axios.get as jest.Mock).mockRejectedValue(new Error('API Error'))

            const [result, source] = await geocodeLocation('Test Location')
            expect(result).toEqual({
                original_location: 'Test Location',
                status: 'unresolved',
            })
            expect(source).toBe('api')
            expect(logr.warn).toHaveBeenCalled()
        })

        it('should handle missing API key', async () => {
            process.env.GOOGLE_MAPS_API_KEY = undefined
            // Mock API to fail when API key is missing
            ;(axios.get as jest.Mock).mockRejectedValue(new Error('No API key'))

            const [result, source] = await geocodeLocation('Test Location')
            expect(result).toEqual({
                original_location: 'Test Location',
                status: 'unresolved',
            })
            expect(source).toBe('api')
            // Make sure the logr.warn was called with the expected arguments
            expect(logr.warn).toHaveBeenCalledWith('api-geo', 'API Error: ', expect.any(Error))
        })

        // Test custom parser source
        it('should return custom source when using a custom parser', async () => {
            const [result, source] = await geocodeLocation('37.7749,-122.4194')
            expect(result.status).toBe('resolved')
            expect(source).toBe('custom')
        })
    })

    describe('batchGeocodeLocations', () => {
        // Create a mock for geocodeLocation
        const originalModule = jest.requireActual('@/lib/api/geocoding')

        beforeEach(() => {
            process.env.GOOGLE_MAPS_API_KEY = 'test-key'

            // Mock geocodeLocation directly with jest.mock at the module level
            jest.mock('@/lib/api/geocoding', () => ({
                ...originalModule,
                geocodeLocation: jest.fn().mockImplementation((location: string) => {
                    if (location === 'cached') {
                        return Promise.resolve([
                            {
                                original_location: location,
                                status: 'resolved' as const,
                                lat: 1,
                                lng: 1,
                            },
                            'cache' as const,
                        ])
                    } else if (location === 'custom') {
                        return Promise.resolve([
                            {
                                original_location: location,
                                status: 'resolved' as const,
                                lat: 2,
                                lng: 2,
                            },
                            'custom' as const,
                        ])
                    } else {
                        return Promise.resolve([
                            {
                                original_location: location,
                                status: 'resolved' as const,
                                lat: 3,
                                lng: 3,
                            },
                            'api' as const,
                        ])
                    }
                }),
            }))
        })

        afterEach(() => {
            jest.resetModules()
        })

        it('should process locations in batches and log source stats', async () => {
            const locations = ['location1', 'cached', 'custom', 'location2']
            const results = await batchGeocodeLocations(locations)

            expect(results.length).toBe(locations.length)
            expect(logr.info).toHaveBeenCalled()
        })
    })
})
