import { getCityStateFromCity, getTimezoneFromCity } from '../timezones'

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
})
