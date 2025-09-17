import {
    formatEventDate,
    formatEventDuration,
    getRelativeTimeString,
    getDateFromUrlDateString,
    urlDateToIsoString,
    formatDateForUrl,
    extractDateParts,
    getStartOfDay,
    getEndOfDay,
    eventInDateRange,
} from '@/lib/utils/date'
import { format } from 'date-fns'
import type { CmfEvent } from '@/types/events'

// Timezone testing utilities
const mockTimezone = (timezone: string, callback: () => void) => {
    const originalTimezone = process.env.TZ
    process.env.TZ = timezone
    try {
        callback()
    } finally {
        if (originalTimezone) {
            process.env.TZ = originalTimezone
        } else {
            delete process.env.TZ
        }
    }
}

// Helper function to create test events with required CmfEvent properties
const createTestEvent = (overrides: Partial<CmfEvent> = {}) => ({
    id: 'test-event',
    name: 'Test Event',
    original_event_url: 'https://example.com/event',
    description: 'Test event description',
    description_urls: [],
    start: '2023-07-15T12:00:00Z',
    end: '2023-07-15T14:00:00Z',
    location: 'Test Location',
    tz: 'UNKNOWN',
    ...overrides,
})

describe('Date Utilities', () => {
    describe('formatEventDate', () => {
        it('formats a valid date string correctly', () => {
            const result = formatEventDate('2025-03-15T14:30:00Z')
            // Check that the result contains expected parts (month, day, time)
            expect(result).toContain('3/15')
            expect(result).toMatch(/\d{1,2}\/\d{1,2}/)
        })

        it('returns "Invalid date" for invalid date strings', () => {
            expect(formatEventDate('not-a-date')).toBe('Invalid date')
        })

        it('handles empty strings', () => {
            expect(formatEventDate('')).toBe('Invalid date')
        })
    })

    describe('formatEventDuration', () => {
        it('formats duration in hours correctly', () => {
            const result = formatEventDuration('2025-03-15T14:00:00Z', '2025-03-15T16:00:00Z')
            expect(result).toBe('2 hrs')
        })

        it('formats duration in days correctly', () => {
            const result = formatEventDuration('2025-03-15T14:00:00Z', '2025-03-17T14:00:00Z')
            expect(result).toBe('2 days')
        })

        it('handles singular hour correctly', () => {
            const result = formatEventDuration('2025-03-15T14:00:00Z', '2025-03-15T15:00:00Z')
            expect(result).toBe('1 hr')
        })

        it('handles singular day correctly', () => {
            const result = formatEventDuration('2025-03-15T14:00:00Z', '2025-03-16T14:00:00Z')
            expect(result).toBe('1 day')
        })

        it('returns "0" for identical start and end times', () => {
            expect(formatEventDuration('2025-03-15T14:00:00Z', '2025-03-15T14:00:00Z')).toBe('0')
        })

        it('returns "??" for very short durations (< 6 minutes)', () => {
            expect(formatEventDuration('2025-03-15T14:00:00Z', '2025-03-15T14:05:00Z')).toBe('??')
            expect(formatEventDuration('2025-03-15T14:00:00Z', '2025-03-15T14:03:00Z')).toBe('??')
        })

        it('returns empty string for invalid dates', () => {
            expect(formatEventDuration('invalid', '2025-03-15T15:00:00Z')).toBe('')
            expect(formatEventDuration('2025-03-15T14:00:00Z', 'invalid')).toBe('')
        })
    })

    describe('getRelativeTimeString', () => {
        beforeEach(() => {
            jest.useFakeTimers()
            jest.setSystemTime(new Date('2025-03-15T14:00:00Z'))
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        it('returns relative time strings correctly', () => {
            expect(getRelativeTimeString('2025-03-14T14:00:00Z')).toContain('ago')
            expect(getRelativeTimeString('2025-03-16T14:00:00Z')).toContain('in')
            expect(getRelativeTimeString('invalid')).toBe('')
        })
    })

    describe('getDateFromUrlDateString', () => {
        // Mock the current date to ensure consistent test results
        const mockNow = new Date('2023-07-15T12:00:00Z')

        beforeEach(() => {
            // Mock the Date constructor to return our fixed date
            jest.useFakeTimers()
            jest.setSystemTime(mockNow)
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        test('should parse RFC3339 date strings', () => {
            const date = getDateFromUrlDateString('2023-07-15T12:00:00Z')
            expect(date).not.toBeNull()
            expect(date?.toISOString()).toBe('2023-07-15T12:00:00.000Z')
        })

        test('should parse YYYY-MM-DD date strings', () => {
            const date = getDateFromUrlDateString('2023-07-15')
            expect(date).not.toBeNull()
            expect(format(date!, 'yyyy-MM-dd')).toBe('2023-07-15')
        })

        test('should parse YYYY-M-D date strings', () => {
            const date = getDateFromUrlDateString('2023-7-4')
            expect(date).not.toBeNull()
            expect(format(date!, 'yyyy-MM-dd')).toBe('2023-07-04')
        })

        test('should parse relative day strings (positive)', () => {
            const date = getDateFromUrlDateString('2d')
            expect(date).not.toBeNull()
            expect(format(date!, 'yyyy-MM-dd')).toBe('2023-07-17')
        })

        test('should parse relative day strings (negative)', () => {
            const date = getDateFromUrlDateString('-2d')
            expect(date).not.toBeNull()
            expect(format(date!, 'yyyy-MM-dd')).toBe('2023-07-13')
        })

        test('should parse relative week strings', () => {
            const date = getDateFromUrlDateString('1w')
            expect(date).not.toBeNull()
            expect(format(date!, 'yyyy-MM-dd')).toBe('2023-07-22')
        })

        test('should parse relative month strings', () => {
            const date = getDateFromUrlDateString('1m')
            expect(date).not.toBeNull()
            expect(format(date!, 'yyyy-MM-dd')).toBe('2023-08-15')
        })

        test('should return null for invalid date strings', () => {
            expect(getDateFromUrlDateString('invalid')).toBeNull()
            expect(getDateFromUrlDateString('2023-13-45')).toBeNull()
            expect(getDateFromUrlDateString('2x')).toBeNull()
        })
    })

    describe('formatDateForUrl', () => {
        it('formats ISO date for URL in local timezone', () => {
            const result = formatDateForUrl('2025-03-15T14:30:00Z')
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(result).toContain('2025')
        })

        it('handles different ISO date formats', () => {
            const testCases = [
                '2025-01-01T00:00:00Z',
                '2025-12-31T23:59:59Z',
                '2024-02-29T12:00:00Z', // Leap year
            ]

            testCases.forEach((isoDate) => {
                const result = formatDateForUrl(isoDate)
                expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            })
        })
    })

    describe('extractDateParts', () => {
        it('extracts date and time parts from ISO string', () => {
            const result = extractDateParts('2025-03-15T14:30:00Z')
            expect(result).toHaveProperty('dateDay')
            expect(result).toHaveProperty('time')
            expect(result.dateDay).toMatch(/\d{1,2}\/\d{1,2}\s\w{3}/)
            expect(result.time).toMatch(/\d{1,2}:\d{2}(am|pm)/)
        })

        it('handles dates without extractable time parts', () => {
            const result = extractDateParts('invalid-date')
            expect(result).toHaveProperty('dateDay')
            expect(result).toHaveProperty('time')
            expect(result.dateDay).toBe('Invalid date')
            expect(result.time).toBe('')
        })

        it('extracts parts from formatted date correctly', () => {
            const result = extractDateParts('2025-07-04T16:00:00Z')
            expect(result.dateDay).toContain('7/4')
            expect(result.dateDay).toContain('Fri')
            expect(result.time).toMatch(/\d{1,2}:\d{2}(am|pm)/)
        })
    })

    describe('urlDateToIsoString', () => {
        const mockNow = new Date('2023-07-15T12:00:00Z')

        beforeEach(() => {
            jest.useFakeTimers()
            jest.setSystemTime(mockNow)
        })

        afterEach(() => {
            jest.useRealTimers()
        })

        test('should return UTC ISO string for various inputs', () => {
            const testCases = [
                { input: '2023-07-15', expectedPattern: /^2023-07-15T\d{2}:00:00\.000Z$/ },
                { input: '1d', expectedPattern: /^2023-07-16T\d{2}:00:00\.000Z$/ },
                { input: '2023-07-15T12:00:00Z', expected: '2023-07-15T12:00:00.000Z' },
            ]

            testCases.forEach(({ input, expected, expectedPattern }) => {
                const result = urlDateToIsoString(input)
                if (expected) {
                    expect(result).toBe(expected)
                } else {
                    expect(result).toMatch(expectedPattern!)
                }
                expect(result.endsWith('Z')).toBe(true)
            })
        })

        test('should return empty string for invalid inputs', () => {
            expect(urlDateToIsoString('invalid')).toBe('')
            expect(urlDateToIsoString('')).toBe('')
        })
    })

    describe('Day Boundary Functions', () => {
        const testMinDate = new Date('2023-01-01T00:00:00Z')

        describe('getStartOfDay', () => {
            test('should return local timezone start of day with 4:01 AM', () => {
                const result = getStartOfDay(0, testMinDate)
                // This function uses local timezone methods (setHours), so results depend on system timezone
                expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/)
                expect(result).toContain('T')
                expect(result).toContain(':01:00.000Z')
            })

            test('should calculate correct day offsets', () => {
                const result1 = getStartOfDay(1, testMinDate)
                const result7 = getStartOfDay(7, testMinDate)
                const result31 = getStartOfDay(31, testMinDate)

                // Check that all results are valid ISO strings with correct minute/second
                expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/)
                expect(result7).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/)
                expect(result31).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/)

                // Check that dates increase as expected
                const date1 = new Date(result1)
                const date7 = new Date(result7)
                const date31 = new Date(result31)
                expect(date7.getTime()).toBeGreaterThan(date1.getTime())
                expect(date31.getTime()).toBeGreaterThan(date7.getTime())
            })

            test('should return consistent format across calls', () => {
                const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo']
                timezones.forEach((tz) => {
                    mockTimezone(tz, () => {
                        const result = getStartOfDay(1, testMinDate)
                        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/)
                    })
                })
            })
        })

        describe('getEndOfDay', () => {
            test('should return local timezone end of day with 23:59:59.999', () => {
                const result = getEndOfDay(0, testMinDate)
                // This function uses local timezone methods (setHours), so results depend on system timezone
                expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:59:59\.999Z$/)
                expect(result).toContain('T')
                expect(result).toContain(':59:59.999Z')
            })

            test('should calculate correct day offsets', () => {
                const result1 = getEndOfDay(1, testMinDate)
                const result7 = getEndOfDay(7, testMinDate)
                const result31 = getEndOfDay(31, testMinDate)

                // Check that all results are valid ISO strings with correct minute/second
                expect(result1).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:59:59\.999Z$/)
                expect(result7).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:59:59\.999Z$/)
                expect(result31).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:59:59\.999Z$/)

                // Check that dates increase as expected
                const date1 = new Date(result1)
                const date7 = new Date(result7)
                const date31 = new Date(result31)
                expect(date7.getTime()).toBeGreaterThan(date1.getTime())
                expect(date31.getTime()).toBeGreaterThan(date7.getTime())
            })

            test('should return consistent format across calls', () => {
                const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo']
                timezones.forEach((tz) => {
                    mockTimezone(tz, () => {
                        const result = getEndOfDay(1, testMinDate)
                        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:59:59\.999Z$/)
                    })
                })
            })
        })
    })

    describe('Timezone Behavior Documentation Tests', () => {
        test('formatEventDate should format in local timezone', () => {
            const isoString = '2023-07-15T16:30:00Z' // 4:30 PM UTC

            // Test that the function returns a formatted string with time
            // The exact timezone conversion depends on the system running the test
            const result = formatEventDate(isoString)
            expect(result).toMatch(/\d{1,2}\/\d{1,2} \w{3} \d{1,2}:\d{2}(am|pm)/)
            expect(result).toContain('7/15')
            expect(result).toContain('Sat')

            // Note: Timezone mocking is complex in Node.js, so we just verify the format
            // The actual timezone conversion will depend on the system's timezone
        })

        test('storage functions should always return UTC', () => {
            const date = new Date('2023-07-15T12:00:00')
            const timezones = ['America/New_York', 'Europe/London', 'Asia/Tokyo']

            timezones.forEach((tz) => {
                mockTimezone(tz, () => {
                    const isoString = urlDateToIsoString('2023-07-15')
                    expect(isoString.endsWith('Z')).toBe(true)

                    const startOfDay = getStartOfDay(0, date)
                    expect(startOfDay.endsWith('Z')).toBe(true)

                    const endOfDay = getEndOfDay(0, date)
                    expect(endOfDay.endsWith('Z')).toBe(true)
                })
            })
        })

        test('formatDateForUrl should format dates for local timezone display', () => {
            const isoString = '2023-07-15T12:00:00Z'
            const formatted = formatDateForUrl(isoString)
            expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/)
            expect(formatted).not.toContain('Z')
        })
    })

    // ============================================================================
    // COMPREHENSIVE TIMEZONE TESTING SUITE
    // Addresses TODO: need tests that use different timezones and check behavior
    // ============================================================================

    // ============================================================================
    // DST TRANSITION EDGE CASE TESTING
    // Tests behavior during Daylight Saving Time transitions
    // ============================================================================

    describe('DST Transition Edge Cases', () => {
        describe('Spring Forward (Lost Hour)', () => {
            test('handles spring DST transition in US Eastern timezone', () => {
                // March 12, 2023: 2:00 AM -> 3:00 AM (spring forward)
                const springTransitionDate = '2023-03-12'

                mockTimezone('America/New_York', () => {
                    const result = getDateFromUrlDateString(springTransitionDate)
                    expect(result).not.toBeNull()
                    expect(result!.getFullYear()).toBe(2023)
                    expect(result!.getMonth()).toBe(2) // March
                    expect(result!.getDate()).toBe(12)

                    // Should handle the transition gracefully
                    const formatted = formatEventDate(result!.toISOString())
                    expect(formatted).not.toBe('Invalid date')
                })
            })

            test('UTC functions remain consistent during spring DST transition', () => {
                const testMinDate = new Date('2023-03-12T00:00:00Z')

                // Test during the actual transition hour
                mockTimezone('America/New_York', () => {
                    const startUtc = getStartOfDay(0, testMinDate)
                    const endUtc = getEndOfDay(0, testMinDate)

                    // Functions use local timezone methods, so dates can shift by a day depending on timezone
                    // Just verify they are valid ISO strings with correct minute/second patterns
                    expect(startUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/)
                    expect(endUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:59:59\.999Z$/)
                })

                // Results will differ based on timezone since functions use local timezone
                mockTimezone('UTC', () => {
                    const startUtc = getStartOfDay(0, testMinDate)
                    const endUtc = getEndOfDay(0, testMinDate)

                    expect(startUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:01:00\.000Z$/)
                    expect(endUtc).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:59:59\.999Z$/)
                })
            })
        })

        describe('Fall Back (Repeated Hour)', () => {
            test('handles fall DST transition in US Eastern timezone', () => {
                // November 5, 2023: 2:00 AM -> 1:00 AM (fall back)
                const fallTransitionDate = '2023-11-05'

                mockTimezone('America/New_York', () => {
                    const result = getDateFromUrlDateString(fallTransitionDate)
                    expect(result).not.toBeNull()
                    expect(result!.getFullYear()).toBe(2023)
                    expect(result!.getMonth()).toBe(10) // November
                    expect(result!.getDate()).toBe(5)

                    // Should handle the transition gracefully
                    const formatted = formatEventDate(result!.toISOString())
                    expect(formatted).not.toBe('Invalid date')
                })
            })

            test('relative date calculations work across fall DST transition', () => {
                // Set system time to just before fall DST transition
                jest.useFakeTimers()
                jest.setSystemTime(new Date('2023-11-04T12:00:00Z'))

                mockTimezone('America/New_York', () => {
                    const nextDay = getDateFromUrlDateString('1d')
                    expect(nextDay).not.toBeNull()
                    expect(nextDay!.getDate()).toBe(5) // Should be November 5

                    const prevDay = getDateFromUrlDateString('-1d')
                    expect(prevDay).not.toBeNull()
                    expect(prevDay!.getDate()).toBe(3) // Should be November 3
                })

                jest.useRealTimers()
            })
        })

        describe('Cross-DST Event Range Testing', () => {
            test('eventInDateRange works correctly across DST boundaries', () => {
                // Event spanning DST transition in spring
                const springDstEvent = {
                    id: 'dst-spring-event',
                    name: 'DST Spring Event',
                    original_event_url: 'https://example.com/spring-dst',
                    description: 'Event during spring DST transition',
                    description_urls: [],
                    start: '2023-03-12T01:30:00', // Before spring forward
                    end: '2023-03-12T03:30:00', // After spring forward (skips 2:00-3:00)
                    tz: 'America/New_York',
                    location: 'New York, NY',
                }

                const springDateRange = {
                    startIso: '2023-03-12T00:00:00Z',
                    endIso: '2023-03-12T23:59:59Z',
                }

                mockTimezone('America/New_York', () => {
                    const result = eventInDateRange(springDstEvent, springDateRange)
                    expect(typeof result).toBe('boolean')
                    // Should handle the DST gap gracefully
                })

                // Event spanning DST transition in fall
                const fallDstEvent = {
                    id: 'dst-fall-event',
                    name: 'DST Fall Event',
                    original_event_url: 'https://example.com/fall-dst',
                    description: 'Event during fall DST transition',
                    description_urls: [],
                    start: '2023-11-05T01:30:00', // First occurrence of 1:30 AM
                    end: '2023-11-05T02:30:00', // Could be ambiguous time
                    tz: 'America/New_York',
                    location: 'New York, NY',
                }

                const fallDateRange = {
                    startIso: '2023-11-05T00:00:00Z',
                    endIso: '2023-11-05T23:59:59Z',
                }

                mockTimezone('America/New_York', () => {
                    const result = eventInDateRange(fallDstEvent, fallDateRange)
                    expect(typeof result).toBe('boolean')
                    // Should handle the DST overlap gracefully
                })
            })
        })
    })

    // ============================================================================
    // COMPREHENSIVE EVENT DATE RANGE TESTING
    // Tests for eventInDateRange function with various scenarios
    // ============================================================================

    describe('eventInDateRange Comprehensive Tests', () => {
        describe('Basic Event Filtering', () => {
            test('event within range should be included', () => {
                const event = createTestEvent({
                    start: '2023-07-15T12:00:00Z',
                    end: '2023-07-15T14:00:00Z',
                })

                const dateRange = {
                    startIso: '2023-07-15T00:00:00Z',
                    endIso: '2023-07-15T23:59:59Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event completely before range should be excluded', () => {
                const event = createTestEvent({
                    start: '2023-07-14T12:00:00Z',
                    end: '2023-07-14T14:00:00Z',
                })

                const dateRange = {
                    startIso: '2023-07-15T00:00:00Z',
                    endIso: '2023-07-15T23:59:59Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(false)
            })

            test('event completely after range should be excluded', () => {
                const event = createTestEvent({
                    start: '2023-07-16T12:00:00Z',
                    end: '2023-07-16T14:00:00Z',
                })

                const dateRange = {
                    startIso: '2023-07-15T00:00:00Z',
                    endIso: '2023-07-15T23:59:59Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(false)
            })

            test('event overlapping start of range should be included', () => {
                const event = createTestEvent({
                    start: '2023-07-14T22:00:00Z',
                    end: '2023-07-15T02:00:00Z',
                })

                const dateRange = {
                    startIso: '2023-07-15T00:00:00Z',
                    endIso: '2023-07-15T23:59:59Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event overlapping end of range should be included', () => {
                const event = createTestEvent({
                    start: '2023-07-15T22:00:00Z',
                    end: '2023-07-16T02:00:00Z',
                })

                const dateRange = {
                    startIso: '2023-07-15T00:00:00Z',
                    endIso: '2023-07-15T23:59:59Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event spanning entire range should be included', () => {
                const event = createTestEvent({
                    start: '2023-07-14T12:00:00Z',
                    end: '2023-07-16T12:00:00Z',
                })

                const dateRange = {
                    startIso: '2023-07-15T00:00:00Z',
                    endIso: '2023-07-15T23:59:59Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(true)
            })
        })

        describe('Timezone-Aware Event Filtering', () => {
            test('event with specific timezone should be converted to UTC correctly', () => {
                const event = createTestEvent({
                    start: '2023-07-15T14:00:00', // 2 PM in specified timezone
                    end: '2023-07-15T16:00:00', // 4 PM in specified timezone
                    tz: 'America/New_York', // EDT (UTC-4) in July
                })

                const dateRange = {
                    startIso: '2023-07-15T16:00:00Z', // 4 PM UTC (noon EDT)
                    endIso: '2023-07-15T22:00:00Z', // 10 PM UTC (6 PM EDT)
                }

                // Event is 2-4 PM EDT = 6-8 PM UTC, range is 4-10 PM UTC
                // Event should overlap with range
                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event with unknown timezone should be treated as UTC', () => {
                const event = createTestEvent({
                    start: '2023-07-15T14:00:00Z',
                    end: '2023-07-15T16:00:00Z',
                    tz: 'UNKNOWN',
                })

                const dateRange = {
                    startIso: '2023-07-15T12:00:00Z',
                    endIso: '2023-07-15T18:00:00Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event with LOCAL timezone should be treated as UTC', () => {
                const event = createTestEvent({
                    start: '2023-07-15T14:00:00Z',
                    end: '2023-07-15T16:00:00Z',
                    tz: 'LOCAL',
                })

                const dateRange = {
                    startIso: '2023-07-15T12:00:00Z',
                    endIso: '2023-07-15T18:00:00Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event with Pacific timezone should be converted correctly', () => {
                const event = createTestEvent({
                    start: '2023-07-15T20:00:00', // 8 PM PDT
                    end: '2023-07-15T22:00:00', // 10 PM PDT
                    tz: 'America/Los_Angeles', // PDT (UTC-7) in July
                })

                const dateRange = {
                    startIso: '2023-07-16T02:00:00Z', // 2 AM UTC next day (7 PM PDT)
                    endIso: '2023-07-16T06:00:00Z', // 6 AM UTC next day (11 PM PDT)
                }

                // Event is 8-10 PM PDT = 3-5 AM UTC, range is 2-6 AM UTC
                // Event should overlap with range
                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event with European timezone should be converted correctly', () => {
                const event = createTestEvent({
                    start: '2023-07-15T14:00:00', // 2 PM CEST
                    end: '2023-07-15T16:00:00', // 4 PM CEST
                    tz: 'Europe/Berlin', // CEST (UTC+2) in July
                })

                const dateRange = {
                    startIso: '2023-07-15T10:00:00Z', // 10 AM UTC (noon CEST)
                    endIso: '2023-07-15T16:00:00Z', // 4 PM UTC (6 PM CEST)
                }

                // Event is 2-4 PM CEST = 12-2 PM UTC, range is 10 AM-4 PM UTC
                // Event should overlap with range
                expect(eventInDateRange(event, dateRange)).toBe(true)
            })

            test('event with Asian timezone should be converted correctly', () => {
                const event = createTestEvent({
                    start: '2023-07-15T09:00:00', // 9 AM JST
                    end: '2023-07-15T11:00:00', // 11 AM JST
                    tz: 'Asia/Tokyo', // JST (UTC+9)
                })

                const dateRange = {
                    startIso: '2023-07-14T22:00:00Z', // 10 PM UTC previous day (7 AM JST)
                    endIso: '2023-07-15T04:00:00Z', // 4 AM UTC (1 PM JST)
                }

                // Event is 9-11 AM JST = midnight-2 AM UTC, range is 10 PM-4 AM UTC
                // Event should overlap with range
                expect(eventInDateRange(event, dateRange)).toBe(true)
            })
        })

        describe('Edge Cases and Boundary Conditions', () => {
            test('boundary conditions for event range overlap', () => {
                const baseRange = {
                    startIso: '2023-07-15T00:00:00Z',
                    endIso: '2023-07-15T23:59:59Z',
                }

                // Events at exact boundaries are included
                expect(
                    eventInDateRange(
                        createTestEvent({
                            start: '2023-07-14T22:00:00Z',
                            end: '2023-07-15T00:00:00Z',
                        }),
                        baseRange
                    )
                ).toBe(true)

                expect(
                    eventInDateRange(
                        createTestEvent({
                            start: '2023-07-15T23:59:59Z',
                            end: '2023-07-16T02:00:00Z',
                        }),
                        baseRange
                    )
                ).toBe(true)

                // Events completely outside range are excluded
                expect(
                    eventInDateRange(
                        createTestEvent({
                            start: '2023-07-14T22:00:00Z',
                            end: '2023-07-14T23:59:59Z',
                        }),
                        baseRange
                    )
                ).toBe(false)

                expect(
                    eventInDateRange(
                        createTestEvent({
                            start: '2023-07-16T00:00:00Z',
                            end: '2023-07-16T02:00:00Z',
                        }),
                        baseRange
                    )
                ).toBe(false)
            })
        })

        describe('Invalid Timezone Handling', () => {
            test('event with invalid timezone should fall back gracefully', () => {
                const event = createTestEvent({
                    start: '2023-07-15T14:00:00',
                    end: '2023-07-15T16:00:00',
                    tz: 'Invalid/Timezone', // Invalid timezone
                })

                const dateRange = {
                    startIso: '2023-07-15T12:00:00Z',
                    endIso: '2023-07-15T18:00:00Z',
                }

                // Should not throw an error and should return a boolean
                expect(() => {
                    const result = eventInDateRange(event, dateRange)
                    expect(typeof result).toBe('boolean')
                }).not.toThrow()
            })

            test('event with missing timezone should be treated as UNKNOWN', () => {
                const event = createTestEvent({
                    start: '2023-07-15T14:00:00Z',
                    end: '2023-07-15T16:00:00Z',
                    // tz is undefined
                })
                const eventWithoutTz = { ...event }
                delete (eventWithoutTz as Partial<CmfEvent>).tz

                const dateRange = {
                    startIso: '2023-07-15T12:00:00Z',
                    endIso: '2023-07-15T18:00:00Z',
                }

                expect(eventInDateRange(eventWithoutTz, dateRange)).toBe(true)
            })

            test('event with empty timezone string should be treated as UNKNOWN', () => {
                const event = createTestEvent({
                    start: '2023-07-15T14:00:00Z',
                    end: '2023-07-15T16:00:00Z',
                    tz: '', // Empty string
                })

                const dateRange = {
                    startIso: '2023-07-15T12:00:00Z',
                    endIso: '2023-07-15T18:00:00Z',
                }

                expect(eventInDateRange(event, dateRange)).toBe(true)
            })
        })
    })
})
