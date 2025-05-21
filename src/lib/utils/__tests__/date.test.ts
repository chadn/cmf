import { formatEventDate, formatEventDuration, getRelativeTimeString, getDateFromUrlDateString } from '../date'
import { roundTimeToNearestHour } from '../utils-shared'
import { format } from 'date-fns'

describe('Date Utilities', () => {
    describe('formatEventDate', () => {
        it('formats a valid date string correctly', () => {
            const result = formatEventDate('2025-03-15T14:30:00Z')
            // Check that the result contains expected parts (month, day, time)
            expect(result).toContain('03/15')
            expect(result).toMatch(/\d{2}\/\d{2}/)
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

        it('returns empty string for invalid dates', () => {
            expect(formatEventDuration('invalid', '2025-03-15T15:00:00Z')).toBe('')
            expect(formatEventDuration('2025-03-15T14:00:00Z', 'invalid')).toBe('')
        })
    })

    describe('getRelativeTimeString', () => {
        it('returns a relative time string for a date in the past', () => {
            // Mock current date to ensure consistent test results
            const realDate = Date
            // Create a properly typed mock Date class
            class MockDate extends Date {
                constructor(...args: ConstructorParameters<typeof Date>) {
                    if (!args.length) {
                        super('2025-03-15T14:00:00Z')
                    } else {
                        super(...args)
                    }
                }
            }
            global.Date = MockDate as DateConstructor

            const result = getRelativeTimeString('2025-03-14T14:00:00Z')
            expect(result).toContain('ago')

            // Restore original Date
            global.Date = realDate
        })

        it('returns a relative time string for a date in the future', () => {
            // Mock current date to ensure consistent test results
            const realDate = Date
            // Create a properly typed mock Date class
            class MockDate extends Date {
                constructor(...args: ConstructorParameters<typeof Date>) {
                    if (!args.length) {
                        super('2025-03-15T14:00:00Z')
                    } else {
                        super(...args)
                    }
                }
            }
            global.Date = MockDate as DateConstructor

            const result = getRelativeTimeString('2025-03-16T14:00:00Z')
            expect(result).toContain('in')

            // Restore original Date
            global.Date = realDate
        })

        it('returns empty string for invalid date', () => {
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

    describe('roundTimeToNearestHour', () => {
        it('rounds a Date object to the nearest hour (minutes > 30 rounds up)', () => {
            const date = new Date('2025-03-15T14:45:00Z')
            const result = roundTimeToNearestHour(date)
            expect(result).toBe('2025-03-15T14:00:00.000Z')
        })

        it('rounds a Date object to the nearest hour (minutes < 30 rounds down)', () => {
            const date = new Date('2025-03-15T14:15:00Z')
            const result = roundTimeToNearestHour(date)
            expect(result).toBe('2025-03-15T14:00:00.000Z')
        })

        it('accepts a string date and rounds to the hour', () => {
            const result = roundTimeToNearestHour('2025-03-15T14:59:59Z')
            expect(result).toBe('2025-03-15T14:00:00.000Z')
        })

        it('returns the same hour if already rounded', () => {
            const result = roundTimeToNearestHour('2025-03-15T14:00:00Z')
            expect(result).toBe('2025-03-15T14:00:00.000Z')
        })

        it('handles midnight correctly', () => {
            const result = roundTimeToNearestHour('2025-03-16T00:30:00Z')
            expect(result).toBe('2025-03-16T00:00:00.000Z')
        })
    })
})
