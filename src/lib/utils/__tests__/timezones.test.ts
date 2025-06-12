import { getCityStateFromCity, getTimezoneFromCity, convertWallTimeToZone, parseDateString } from '../timezones'

describe('timezones utilities', () => {
    describe('getCityStateFromCity', () => {
        it('should return a city name that includes the search string', () => {
            // Test exact matches
            expect(getCityStateFromCity('OAKLAND')).toBe('Oakland, CA')
            expect(getCityStateFromCity('san francisco')).toBe('San Francisco, CA')
            expect(getCityStateFromCity('vista')).toBe('Vista, CA')

            // Test partial matches - these will match the first key in the object that contains the string
            const oaklandResult = getCityStateFromCity('oakland')
            expect(oaklandResult.includes('Oakland')).toBeTruthy()

            const sanFranciscoResult = getCityStateFromCity('FRANCISCO')
            expect(sanFranciscoResult.includes('Francisco')).toBeTruthy()

            // Test case insensitivity
            const oaklandUpperResult = getCityStateFromCity('OAKLAND')
            expect(oaklandUpperResult.toLowerCase().includes('oakland')).toBeTruthy()
        })

        it('should return empty string when no match is found', () => {
            expect(getCityStateFromCity('nonexistentcityname')).toBe('')
        })

        it('should handle empty strings by returning empty string', () => {
            const result = getCityStateFromCity('')
            expect(result).toBe('')
            const result2 = getCityStateFromCity('   ')
            expect(result2).toBe('')
        })

        it('should handle cities with the same prefix consistently', () => {
            // We know 'portland, or' is in the data
            const result = getCityStateFromCity('portland')
            expect(result.includes('Portland')).toBeTruthy()
        })
    })

    // A basic test for getTimezoneFromCity just to cover both functions
    describe('getTimezoneFromCity', () => {
        it('should return the correct timezone for a city', () => {
            expect(getTimezoneFromCity('OAKLAND, CA')).toBe('America/Los_Angeles')
            expect(getTimezoneFromCity('new york, ny')).toBe('America/New_York')
        })

        it('should default to America/Los_Angeles when city is not found', () => {
            expect(getTimezoneFromCity('nonexistent')).toBe('America/Los_Angeles')
        })
    })

    describe('convertWallTimeToZone', () => {
        it('should preserve wall time when converting between timezones', () => {
            // Test converting from UTC to Pacific Time
            const utcTime = '2024-06-10T17:00:00.000Z' // output Date().toISOString()
            const result = convertWallTimeToZone(utcTime, 'America/Los_Angeles')
            expect(result).toBe('2024-06-10T17:00:00-07:00')

            // Test converting from UTC to Eastern Time
            const result2 = convertWallTimeToZone(utcTime, 'America/New_York')
            expect(result2).toBe('2024-06-10T17:00:00-04:00')
        })

        it('should handle different times of day correctly', () => {
            // Test early morning
            const earlyMorning = '2024-06-10T05:00:00Z'
            const result = convertWallTimeToZone(earlyMorning, 'America/Los_Angeles')
            expect(result).toBe('2024-06-10T05:00:00-07:00')

            // Test late night
            const lateNight = '2024-06-10T23:00:00Z'
            const result2 = convertWallTimeToZone(lateNight, 'America/Los_Angeles')
            expect(result2).toBe('2024-06-10T23:00:00-07:00')
        })

        it('should handle different dates correctly', () => {
            // Test a date in winter (different DST)
            const winterDate = '2024-01-10T17:00:00Z'
            const result = convertWallTimeToZone(winterDate, 'America/Los_Angeles')
            expect(result).toBe('2024-01-10T17:00:00-08:00')
        })
    })

    describe('parseDateString', () => {
        it('should parse dates with minutes', () => {
            const date = parseDateString('6/14/2025 1:30 PM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-14T13:30:00.000Z')
        })

        it('should parse dates without minutes', () => {
            const date = parseDateString('6/14/2025 1 PM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-14T13:00:00.000Z')
        })

        it('should parse dates without time', () => {
            const date = parseDateString('6/14/2025')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-14T00:00:00.000Z')
        })

        it('should parse dates without space before AM/PM', () => {
            const date = parseDateString('6/14/2025 1:30PM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-14T13:30:00.000Z')
        })

        it('should parse dates with single digit month and day', () => {
            const date = parseDateString('6/1/2025 1:30 PM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-01T13:30:00.000Z')
        })

        it('should parse dates with double digit month and day', () => {
            const date = parseDateString('12/25/2025 1:30 PM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-12-25T13:30:00.000Z')
        })

        it('should handle AM times', () => {
            const date = parseDateString('6/14/2025 11:30 AM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-14T11:30:00.000Z')
        })

        it('should handle midnight (12 AM)', () => {
            const date = parseDateString('6/14/2025 12:00 AM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-14T00:00:00.000Z')
        })

        it('should handle noon (12 PM)', () => {
            const date = parseDateString('6/14/2025 12:00 PM')
            expect(date).toBeInstanceOf(Date)
            expect(date?.toISOString()).toBe('2025-06-14T12:00:00.000Z')
        })

        it('should return null for invalid dates', () => {
            expect(parseDateString('invalid date')).toBeNull()
            expect(parseDateString('13/45/2025 1:30 PM')).toBeNull() // Invalid month/day
            expect(parseDateString('6/14/2025 25:30 PM')).toBeNull() // Invalid hour
            expect(parseDateString('6/14/2025 1:99 PM')).toBeNull() // Invalid minutes
        })

        it('should handle edge cases', () => {
            // Test with leading zeros
            const date1 = parseDateString('06/14/2025 01:30 PM')
            expect(date1).toBeInstanceOf(Date)
            expect(date1?.toISOString()).toBe('2025-06-14T13:30:00.000Z')

            // Test with different year formats
            const date2 = parseDateString('6/14/25 1:30 PM')
            expect(date2).toBeInstanceOf(Date)
            expect(date2?.toISOString()).toBe('2025-06-14T13:30:00.000Z')
        })
    })
})
