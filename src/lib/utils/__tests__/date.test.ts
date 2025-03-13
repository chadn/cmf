import {
    formatEventDate,
    formatEventDuration,
    getRelativeTimeString,
} from '../date'

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
            const result = formatEventDuration(
                '2025-03-15T14:00:00Z',
                '2025-03-15T16:00:00Z'
            )
            expect(result).toBe('2 hrs')
        })

        it('formats duration in days correctly', () => {
            const result = formatEventDuration(
                '2025-03-15T14:00:00Z',
                '2025-03-17T14:00:00Z'
            )
            expect(result).toBe('2 days')
        })

        it('handles singular hour correctly', () => {
            const result = formatEventDuration(
                '2025-03-15T14:00:00Z',
                '2025-03-15T15:00:00Z'
            )
            expect(result).toBe('1 hr')
        })

        it('handles singular day correctly', () => {
            const result = formatEventDuration(
                '2025-03-15T14:00:00Z',
                '2025-03-16T14:00:00Z'
            )
            expect(result).toBe('1 day')
        })

        it('returns empty string for invalid dates', () => {
            expect(formatEventDuration('invalid', '2025-03-15T15:00:00Z')).toBe(
                ''
            )
            expect(formatEventDuration('2025-03-15T14:00:00Z', 'invalid')).toBe(
                ''
            )
        })
    })

    describe('getRelativeTimeString', () => {
        it('returns a relative time string for a date in the past', () => {
            // Mock current date to ensure consistent test results
            const realDate = Date
            global.Date = class extends Date {
                constructor(...args) {
                    if (args.length === 0) {
                        return new realDate('2025-03-15T14:00:00Z')
                    }
                    return new realDate(...args)
                }
            } as any

            const result = getRelativeTimeString('2025-03-14T14:00:00Z')
            expect(result).toContain('ago')

            // Restore original Date
            global.Date = realDate
        })

        it('returns a relative time string for a date in the future', () => {
            // Mock current date to ensure consistent test results
            const realDate = Date
            global.Date = class extends Date {
                constructor(...args) {
                    if (args.length === 0) {
                        return new realDate('2025-03-15T14:00:00Z')
                    }
                    return new realDate(...args)
                }
            } as any

            const result = getRelativeTimeString('2025-03-16T14:00:00Z')
            expect(result).toContain('in')

            // Restore original Date
            global.Date = realDate
        })

        it('returns empty string for invalid date', () => {
            expect(getRelativeTimeString('invalid')).toBe('')
        })
    })
})
