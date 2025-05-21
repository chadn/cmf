import {
    normalizeUrl,
    convertCityNameToUrl,
    convertCityNameToKey,
    convertUrlToCityName,
    improveLocation,
    parsePluraDateString,
} from '../utils'
import { logr } from '@/lib/utils/logr'
import { PluraDomain } from '../types'

// Mock the logr module
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}))

describe('Plura Utils', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('normalizeUrl', () => {
        it('should normalize heyplura URLs to plra.io format', () => {
            const url = 'https://heyplura.com/events/city/Oakland_CA'
            const normalized = normalizeUrl(url)
            expect(normalized).toBe('https://plra.io/events/city/Oakland_CA')
        })

        it('should leave plra.io URLs unchanged', () => {
            const url = 'https://plra.io/events/city/Oakland_CA'
            const normalized = normalizeUrl(url)
            expect(normalized).toBe(url)
        })

        it('should leave other URLs unchanged', () => {
            const url = 'https://example.com/events'
            const normalized = normalizeUrl(url)
            expect(normalized).toBe(url)
        })
    })

    describe('convertCityNameToUrl', () => {
        it('should convert city name to URL with option 1 (default)', () => {
            const cityName = 'Oakland, CA'
            const url = convertCityNameToUrl(cityName)
            expect(url).toBe(`${PluraDomain}/events/city/Oakland_CA`)
        })

        it('should convert city name to URL with option 2', () => {
            const cityName = 'Oakland, CA'
            const url = convertCityNameToUrl(cityName, '', 2)
            expect(url).toBe(`${PluraDomain}/events/city/Oakland__CA`)
        })

        it('should handle spaces in city names', () => {
            const cityName = 'San Francisco, CA'
            const url = convertCityNameToUrl(cityName)
            expect(url).toBe(`${PluraDomain}/events/city/San%20Francisco_CA`)
        })

        it('should use custom domain if provided', () => {
            const cityName = 'Oakland, CA'
            const domain = 'https://example.com'
            const url = convertCityNameToUrl(cityName, domain)
            expect(url).toBe('https://example.com/events/city/Oakland_CA')
        })
    })

    describe('convertCityNameToKey', () => {
        it('should convert city name to lowercase with underscores', () => {
            const cityName = 'Oakland, CA'
            const key = convertCityNameToKey(cityName)
            expect(key).toBe('oakland_ca')
        })

        it('should handle multiple spaces', () => {
            const cityName = 'San   Francisco,  CA'
            const key = convertCityNameToKey(cityName)
            expect(key).toBe('san francisco_ca')
        })
    })

    describe('convertUrlToCityName', () => {
        it('should extract city name from URL', () => {
            const url = 'https://plra.io/events/city/Oakland_CA'
            const cityName = convertUrlToCityName(url)
            expect(cityName).toBe('Oakland, CA')
        })

        it('should handle URLs with encoded spaces', () => {
            const url = 'https://plra.io/events/city/San%20Francisco_CA'
            const cityName = convertUrlToCityName(url)
            expect(cityName).toBe('San Francisco, CA')
        })

        it('should return empty string for empty input', () => {
            expect(convertUrlToCityName('')).toBe('')
        })

        it('should return the URL with underscores converted to commas', () => {
            const url = 'invalid_url'
            const cityName = convertUrlToCityName(url)
            expect(cityName).toBe('invalid, url')
        })
    })

    describe('improveLocation', () => {
        it('should return "zoom online" if location is empty', () => {
            const result = improveLocation('', 'Oakland, CA')
            expect(result).toBe('zoom online')
        })

        it('should return location with city suffix appended if city is known', () => {
            const result = improveLocation('Oakland', 'Oakland, CA')
            expect(result).toBe('Oakland, CA')
        })

        it('should append city suffix if necessary', () => {
            const result = improveLocation('Downtown', 'Oakland, CA')
            expect(result).toBe('Downtown, CA')
        })

        it('should not append city suffix if location already has it', () => {
            const result = improveLocation('Downtown, CA', 'Oakland, CA')
            expect(result).toBe('Downtown, CA')
        })
    })

    describe('parsePluraDateString', () => {
        it('should parse date string with day of week', () => {
            const { startDate, endDate } = parsePluraDateString('Wednesday, May 14th at 1:30pm America/Los_Angeles')

            expect(startDate).not.toBeNull()
            if (startDate) {
                // Verify the date components are correct
                expect(startDate.getMonth()).toBe(4) // May is month 4 (0-indexed)
                expect(startDate.getDate()).toBe(14)
                expect(startDate.getHours()).toBe(13) // 1:30pm = 13:30
                expect(startDate.getMinutes()).toBe(30)
            }

            // Verify end date is 1 hour after start date
            expect(endDate).not.toBeNull()
            if (startDate && endDate) {
                const diff = endDate.getTime() - startDate.getTime()
                expect(diff).toBe(3600000) // 1 hour in milliseconds
            }
        })

        it('should handle different timezones correctly', () => {
            const { startDate } = parsePluraDateString('Aug 2nd at 8pm Europe/Lisbon')

            expect(startDate).not.toBeNull()
            if (startDate) {
                // Verify the date components are correct
                expect(startDate.getMonth()).toBe(7) // August is month 7 (0-indexed)
                expect(startDate.toISOString()).toBe('2025-08-02T19:00:00.000Z')
            }
        })

        it('should parse date string with year', () => {
            const { startDate } = parsePluraDateString('May 14th, 2023 at 1:30pm America/Los_Angeles')

            expect(startDate).not.toBeNull()
            if (startDate) {
                expect(startDate.getFullYear()).toBe(2023)
                expect(startDate.getMonth()).toBe(4) // May
                expect(startDate.getDate()).toBe(14)
                expect(startDate.getHours()).toBe(13) // 1:30pm
                expect(startDate.getMinutes()).toBe(30)
            }
        })

        it('should use current year if not specified', () => {
            const currentYear = new Date().getFullYear()
            const { startDate } = parsePluraDateString('May 14th at 1:30pm America/Los_Angeles')

            expect(startDate).not.toBeNull()
            if (startDate) {
                expect(startDate.getFullYear()).toBe(currentYear)
                expect(startDate.getMonth()).toBe(4) // May
                expect(startDate.getDate()).toBe(14)
                expect(startDate.getHours()).toBe(13)
                expect(startDate.getMinutes()).toBe(30)
            }
        })

        it('should use UTC if no timezone specified', () => {
            const { startDate } = parsePluraDateString('May 14th at 1:30pm')

            expect(startDate).not.toBeNull()
            if (startDate) {
                expect(startDate.getMonth()).toBe(4) // May
                expect(startDate.toISOString()).toBe('2025-05-14T13:30:00.000Z')
            }
        })

        it('should return null for invalid date string', () => {
            const { startDate, endDate } = parsePluraDateString('Invalid date string')

            expect(startDate).toBeNull()
            expect(endDate).toBeNull()
        })

        it('should return null for empty input', () => {
            const { startDate, endDate } = parsePluraDateString('')

            expect(startDate).toBeNull()
            expect(endDate).toBeNull()
        })
    })
})
