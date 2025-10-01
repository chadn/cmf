import {
    extractVenueAndCity,
    getStateFromEventSource,
    shouldUseDefaultState,
    inferStateFromCityName,
} from '@/lib/utils/venue-parsing'
import { getCityStateFromCity } from '@/lib/utils/timezones'

// Mock the timezones module
jest.mock('@/lib/utils/timezones', () => ({
    getCityStateFromCity: jest.fn(),
}))

// Mock the logr module
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        debug: jest.fn(),
        info: jest.fn(),
    },
}))

const mockGetCityStateFromCity = getCityStateFromCity as jest.MockedFunction<typeof getCityStateFromCity>

describe('venue-parsing utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        // Set up common mock responses
        mockGetCityStateFromCity.mockImplementation((cityName: string) => {
            const cityMap: Record<string, string> = {
                'Los Angeles, CA': 'Los Angeles, CA',
                'Bay Area, CA': 'Bay Area, CA',
                'Chicago, IL': 'Chicago, IL',
                'Oregon, OR': 'Oregon, OR',
                'Las Vegas, NV': 'Las Vegas, NV',
                'Berkeley, CA': 'Berkeley, CA',
                'San Francisco, CA': 'San Francisco, CA',
            }
            return cityMap[cityName] || null
        })
    })

    describe('getStateFromEventSource', () => {
        it('should extract state from Los Angeles region', () => {
            const result = getStateFromEventSource('Los Angeles')
            expect(result).toBe('CA')
            expect(mockGetCityStateFromCity).toHaveBeenCalledWith('Los Angeles, CA')
        })

        it('should extract state from Bay Area region', () => {
            const result = getStateFromEventSource('Bay Area')
            expect(result).toBe('CA')
            expect(mockGetCityStateFromCity).toHaveBeenCalledWith('Bay Area, CA')
        })

        it('should extract state from Chicago region', () => {
            const result = getStateFromEventSource('Chicago')
            expect(result).toBe('IL')
            expect(mockGetCityStateFromCity).toHaveBeenCalledWith('Chicago, IL')
        })

        it('should return null for unknown region', () => {
            const result = getStateFromEventSource('Unknown City')
            expect(result).toBeNull()
        })

        it('should try multiple state patterns', () => {
            getStateFromEventSource('Los Angeles')
            expect(mockGetCityStateFromCity).toHaveBeenCalledWith('Los Angeles, CA')
            // Would also check IL, OR, NV patterns if CA didn't match
        })
    })

    describe('shouldUseDefaultState', () => {
        it('should return false for known cities', () => {
            mockGetCityStateFromCity.mockReturnValueOnce('Berkeley, CA')
            const result = shouldUseDefaultState('Berkeley', 'Los Angeles')
            expect(result).toBe(false)
        })

        it('should return true for unknown cities with regional context', () => {
            mockGetCityStateFromCity.mockReturnValueOnce(null) // Unknown city
            const result = shouldUseDefaultState('Highland Park', 'Los Angeles')
            expect(result).toBe(true)
        })

        it('should return false for unknown cities without regional context', () => {
            mockGetCityStateFromCity.mockReturnValueOnce(null) // Unknown city
            const result = shouldUseDefaultState('Highland Park', 'Unknown Region')
            expect(result).toBe(false)
        })
    })

    describe('inferStateFromCityName', () => {
        it('should extract state from known city', () => {
            mockGetCityStateFromCity.mockReturnValueOnce('San Francisco, CA')
            const result = inferStateFromCityName('San Francisco')
            expect(result).toBe('CA')
        })

        it('should return null for unknown city', () => {
            mockGetCityStateFromCity.mockReturnValueOnce(null)
            const result = inferStateFromCityName('Unknown City')
            expect(result).toBeNull()
        })
    })

    describe('extractVenueAndCity', () => {
        describe('Highland Park scenarios (the main fix)', () => {
            it('should use CA state for Highland Park from Los Angeles events', () => {
                mockGetCityStateFromCity.mockImplementation((cityName: string) => {
                    if (cityName === 'Highland Park') return null // Unknown city
                    if (cityName === 'Los Angeles, CA') return 'Los Angeles, CA'
                    return null
                })

                const result = extractVenueAndCity('Awesome Party @ TBA (Highland Park)', 'CA', 'Los Angeles')
                expect(result).toBe('Highland Park, CA')
            })

            it('should use IL state for Highland Park from Chicago events', () => {
                mockGetCityStateFromCity.mockImplementation((cityName: string) => {
                    if (cityName === 'Highland Park') return null // Unknown city
                    if (cityName === 'Chicago, IL') return 'Chicago, IL'
                    return null
                })

                const result = extractVenueAndCity('Jazz Night @ TBA (Highland Park)', 'IL', 'Chicago')
                expect(result).toBe('Highland Park, IL')
            })

            it('should use CA state for Highland Park from Bay Area events', () => {
                mockGetCityStateFromCity.mockImplementation((cityName: string) => {
                    if (cityName === 'Highland Park') return null // Unknown city
                    if (cityName === 'Bay Area, CA') return 'Bay Area, CA'
                    return null
                })

                const result = extractVenueAndCity('Tech Meetup @ TBA (Highland Park)', 'CA', 'Bay Area')
                expect(result).toBe('Highland Park, CA')
            })
        })

        describe('venue cache handling', () => {
            it('should return cached address when venue is found', () => {
                const venueCache = new Map([['the fillmore', 'The Fillmore, San Francisco, CA 94115']])

                const result = extractVenueAndCity(
                    'Concert @ The Fillmore (San Francisco)',
                    'CA',
                    'Bay Area',
                    venueCache
                )
                expect(result).toBe('The Fillmore, San Francisco, CA 94115')
            })

            it('should work without venue cache', () => {
                mockGetCityStateFromCity.mockImplementation((cityName: string) => {
                    if (cityName === 'San Francisco') return null
                    if (cityName === 'San Francisco, CA') return 'San Francisco, CA'
                    if (cityName === 'Bay Area, CA') return 'Bay Area, CA'
                    return null
                })

                const result = extractVenueAndCity('Concert @ The Fillmore (San Francisco)', 'CA', 'Bay Area')
                expect(result).toBe('The Fillmore, San Francisco, CA')
            })
        })

        describe('explicit state handling', () => {
            it('should use explicit state when provided', () => {
                const result = extractVenueAndCity('Event @ Venue Name (Chicago, IL)', 'CA', 'Los Angeles')
                expect(result).toBe('Venue Name, Chicago, IL')
            })

            it('should handle explicit state for TBA venues', () => {
                const result = extractVenueAndCity('Event @ TBA (Portland, OR)', 'CA', 'Los Angeles')
                expect(result).toBe('Portland, OR')
            })
        })

        describe('known city handling', () => {
            it('should use existing database for known cities', () => {
                mockGetCityStateFromCity.mockImplementation((cityName: string) => {
                    if (cityName === 'Berkeley') return 'Berkeley, CA'
                    return null
                })

                const result = extractVenueAndCity(
                    'Event @ UC Berkeley (Berkeley)',
                    'IL', // Different default state
                    'Chicago' // Different region
                )
                expect(result).toBe('UC Berkeley, Berkeley, CA')
            })
        })

        describe('ambiguous city handling', () => {
            it('should not use regional context for already known cities', () => {
                mockGetCityStateFromCity.mockImplementation((cityName: string) => {
                    if (cityName === 'Springfield') return 'Springfield, MA' // Already known
                    return null
                })

                const result = extractVenueAndCity('Event @ Venue (Springfield)', 'IL', 'Chicago')
                expect(result).toBe('Venue, Springfield, MA')
            })

            it('should use regional context for unknown ambiguous cities', () => {
                mockGetCityStateFromCity.mockImplementation((cityName: string) => {
                    if (cityName === 'Albany') return null // Unknown city
                    if (cityName === 'Los Angeles, CA') return 'Los Angeles, CA'
                    return null
                })

                const result = extractVenueAndCity('Event @ Venue (Albany)', 'CA', 'Los Angeles')
                expect(result).toBe('Venue, Albany, CA')
            })
        })

        describe('fallback patterns', () => {
            it('should handle fallback city in parentheses', () => {
                const result = extractVenueAndCity('Event Title (San Diego)', 'CA', 'Los Angeles')
                expect(result).toBe('San Diego, CA')
            })

            it('should return empty string for unrecognized patterns', () => {
                const result = extractVenueAndCity('No venue or city info', 'CA', 'Los Angeles')
                expect(result).toBe('')
            })
        })

        describe('edge cases', () => {
            it('should handle events with no parentheses', () => {
                const result = extractVenueAndCity('Event @ Some Venue', 'CA', 'Los Angeles')
                expect(result).toBe('Some Venue, CA, USA')
            })

            it('should handle TBA venue without state context', () => {
                mockGetCityStateFromCity.mockReturnValue(null)

                const result = extractVenueAndCity('Event @ TBA (Unknown City)', 'CA', 'Unknown Region')
                expect(result).toBe('Unknown City')
            })
        })
    })
})
