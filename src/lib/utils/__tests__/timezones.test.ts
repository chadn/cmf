import {
    getCityStateFromCity,
    getTimezoneFromCity,
    reinterpretUtcTz,
    getTimezoneFromLatLng,
    timezoneInfo,
} from '@/lib/utils/timezones'
import { parseDateString } from '@/lib/utils/date'

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

    describe('getTimezoneFromLatLng', () => {
        it('should return timezone for valid coordinates', () => {
            // San Francisco coordinates
            expect(getTimezoneFromLatLng(37.7749, -122.4194)).toBe('America/Los_Angeles')

            // New York coordinates
            expect(getTimezoneFromLatLng(40.7128, -74.006)).toBe('America/New_York')

            // London coordinates
            expect(getTimezoneFromLatLng(51.5074, -0.1278)).toBe('Europe/London')
        })

        it('should return UNKNOWN_TZ for invalid coordinates', () => {
            // Invalid latitude (out of range)
            expect(getTimezoneFromLatLng(999, -122.4194)).toBe('UNKNOWN_TZ')

            // Invalid longitude (out of range)
            expect(getTimezoneFromLatLng(37.7749, 999)).toBe('UNKNOWN_TZ')
        })
    })

    describe('timezoneInfo', () => {
        it('should return browser timezone information', () => {
            const info = timezoneInfo()

            expect(info).toHaveProperty('browserTz')
            expect(info).toHaveProperty('tzOffset')
            expect(info).toHaveProperty('tzAbbrev')

            expect(typeof info.browserTz).toBe('string')
            expect(typeof info.tzOffset).toBe('string')
            expect(typeof info.tzAbbrev).toBe('string')

            // Verify offset format (e.g., ' UTC-7' or ' UTC+0')
            expect(info.tzOffset).toMatch(/^ UTC[+-]\d+(\.\d+)?$/)
        })

        it('should handle environments without Intl', () => {
            const originalIntl = global.Intl
            // @ts-expect-error - intentionally deleting Intl for testing
            delete global.Intl

            const info = timezoneInfo()
            expect(info.browserTz).toBe('Unknown')
            expect(info.tzOffset).toBe('')
            expect(info.tzAbbrev).toBe('')

            global.Intl = originalIntl
        })
    })

    describe('reinterpretUtcTz', () => {
        describe('string input/output', () => {
            it('should convert UTC time to target timezone correctly', () => {
                // Test reinterpreting UTC wall time as Pacific Time
                // '2024-06-10T17:00:00Z' wall time (17:00) → '2024-06-10T17:00:00-07:00' (same wall time, different timezone)
                const utcTime = '2024-06-10T17:00:00Z'
                const result = reinterpretUtcTz(utcTime, 'America/Los_Angeles')
                expect(result).toBe('2024-06-10T17:00:00-07:00')

                // Test reinterpreting UTC wall time as Eastern Time
                // '2024-06-10T17:00:00Z' wall time (17:00) → '2024-06-10T17:00:00-04:00' (same wall time, different timezone)
                const result2 = reinterpretUtcTz(utcTime, 'America/New_York')
                expect(result2).toBe('2024-06-10T17:00:00-04:00')
            })

            it('should handle different times of day correctly', () => {
                // Test early morning - preserve wall time
                // '2024-06-10T05:00:00Z' wall time (05:00) → '2024-06-10T05:00:00-07:00' (same wall time)
                const earlyMorning = '2024-06-10T05:00:00Z'
                const result = reinterpretUtcTz(earlyMorning, 'America/Los_Angeles')
                expect(result).toBe('2024-06-10T05:00:00-07:00')

                // Test late night - preserve wall time
                // '2024-06-10T23:00:00Z' wall time (23:00) → '2024-06-10T23:00:00-07:00' (same wall time)
                const lateNight = '2024-06-10T23:00:00Z'
                const result2 = reinterpretUtcTz(lateNight, 'America/Los_Angeles')
                expect(result2).toBe('2024-06-10T23:00:00-07:00')
            })

            it('should handle different dates correctly (winter vs summer DST)', () => {
                // Test a date in winter (PST, UTC-8) - preserve wall time
                // '2024-01-10T17:00:00Z' wall time (17:00) → '2024-01-10T17:00:00-08:00' (same wall time, winter offset)
                const winterDate = '2024-01-10T17:00:00Z'
                const result = reinterpretUtcTz(winterDate, 'America/Los_Angeles')
                expect(result).toBe('2024-01-10T17:00:00-08:00')
            })
        })

        describe('number input/output', () => {
            it('should convert epoch seconds to new timezone', () => {
                // Test reinterpreting wall time from UTC to Pacific Time
                // 1718048400 = 2024-06-10T17:00:00Z (UTC wall time 17:00)
                // Reinterpret as 2024-06-10T17:00:00-07:00 (LA wall time 17:00)
                // LA is UTC-7, so 17:00 LA = 24:00 UTC = 1718074800 epoch
                const utcTimeSeconds = 1718048400
                const result = reinterpretUtcTz(utcTimeSeconds, 'America/Los_Angeles')
                expect(typeof result).toBe('number')
                expect(result).toBe(1718073600) // 2024-06-10T17:00:00-07:00 = 2024-06-11T00:00:00Z

                // Test reinterpreting from UTC to Eastern Time
                // 1718048400 = 2024-06-10T17:00:00Z (UTC wall time 17:00)
                // Reinterpret as 2024-06-10T17:00:00-04:00 (NY wall time 17:00)
                // NY is UTC-4, so 17:00 NY = 21:00 UTC = 1718053200 epoch
                const result2 = reinterpretUtcTz(utcTimeSeconds, 'America/New_York')
                expect(typeof result2).toBe('number')
                expect(result2).toBe(1718062800) // 2024-06-10T17:00:00-04:00 = 2024-06-10T21:00:00Z
            })

            it('should handle different epoch times correctly', () => {
                // Test early morning: 1717995600 = 2024-06-10T05:00:00Z (UTC wall time 05:00)
                // Reinterpret as 2024-06-10T05:00:00-07:00 (LA wall time 05:00)
                // 05:00 LA = 12:00 UTC = 1718020800 epoch
                const earlyMorningSeconds = 1717995600
                const result = reinterpretUtcTz(earlyMorningSeconds, 'America/Los_Angeles')
                expect(typeof result).toBe('number')
                expect(result).toBe(1718020800) // 2024-06-10T05:00:00-07:00 = 2024-06-10T12:00:00Z

                // Test late night: 1718060400 = 2024-06-10T23:00:00Z (UTC wall time 23:00)
                // Reinterpret as 2024-06-10T23:00:00-07:00 (LA wall time 23:00)
                // 23:00 LA = 06:00 UTC next day = 1718085600 epoch
                const lateNightSeconds = 1718060400
                const result2 = reinterpretUtcTz(lateNightSeconds, 'America/Los_Angeles')
                expect(typeof result2).toBe('number')
                expect(result2).toBe(1718085600) // 2024-06-10T23:00:00-07:00 = 2024-06-11T06:00:00Z
            })

            it('should handle winter dates correctly (different DST)', () => {
                // Test a date in winter: 1704902400 = 2024-01-10T17:00:00Z (UTC wall time 17:00)
                // Reinterpret as 2024-01-10T17:00:00-08:00 (LA wall time 17:00, winter PST is UTC-8)
                // 17:00 LA = 01:00 UTC next day = 1704931200 epoch
                const winterDateSeconds = 1704902400
                const result = reinterpretUtcTz(winterDateSeconds, 'America/Los_Angeles')
                expect(typeof result).toBe('number')
                expect(result).toBe(1704931200) // 2024-01-10T17:00:00-08:00 = 2024-01-11T01:00:00Z
            })

            it('should handle fractional seconds correctly', () => {
                // Test with fractional seconds (should be floored)
                // 1718038800.789 = ~2024-06-10T14:20:00.789Z (UTC wall time ~14:20)
                // Reinterpret as 2024-06-10T14:20:00-07:00 (LA wall time 14:20)
                // 14:20 LA = 21:20 UTC = 1718064000 epoch
                const fractionalSeconds = 1718038800.789
                const result = reinterpretUtcTz(fractionalSeconds, 'America/Los_Angeles')
                expect(typeof result).toBe('number')
                expect(result).toBe(1718064000) // 2024-06-10T14:20:00-07:00 floored
            })
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
