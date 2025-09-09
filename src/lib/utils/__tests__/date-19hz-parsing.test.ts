/**
 * Tests for 19hz.info date parsing utility
 * Based on real examples from the 19hz events page
 */

import { parse19hzDateRange } from '../date-19hz-parsing'

describe('parse19hzDateRange', () => {
    // Helper to check if parsed dates are reasonable
    const expectValidDates = (result: { start: string; end: string; recurring: boolean }) => {
        expect(result.start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        expect(result.end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        expect(new Date(result.end).getTime()).toBeGreaterThan(new Date(result.start).getTime())
        expect(typeof result.recurring).toBe('boolean')
    }

    describe('single day events', () => {
        it('parses basic single day with time range', () => {
            const result = parse19hzDateRange('Sun: Aug 31 (6am-12pm)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getMonth()).toBe(7) // August (0-indexed)
            expect(start.getDate()).toBe(31)
            expect(start.getHours()).toBe(6)
            expect(start.getMinutes()).toBe(0)

            expect(end.getMonth()).toBe(7)
            expect(end.getDate()).toBe(31)
            expect(end.getHours()).toBe(12)
            expect(end.getMinutes()).toBe(0)

            expect(result.recurring).toBe(false)
        })

        it('parses overnight event (end time next day)', () => {
            const result = parse19hzDateRange('Fri: Aug 30 (9pm-2am)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getMonth()).toBe(7) // August
            expect(start.getDate()).toBe(30)
            expect(start.getHours()).toBe(21) // 9pm

            expect(end.getMonth()).toBe(7)
            expect(end.getDate()).toBe(31) // Next day
            expect(end.getHours()).toBe(2) // 2am

            expect(result.recurring).toBe(false)
        })

        it('parses late night event with minutes', () => {
            const result = parse19hzDateRange('Sat: Nov 15 (11:59pm-6am)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getMonth()).toBe(10) // November
            expect(start.getDate()).toBe(15)
            expect(start.getHours()).toBe(23)
            expect(start.getMinutes()).toBe(59)

            expect(end.getDate()).toBe(16) // Next day
            expect(end.getHours()).toBe(6)
            expect(end.getMinutes()).toBe(0)

            expect(result.recurring).toBe(false)
        })

        it('parses single time (no end time)', () => {
            const result = parse19hzDateRange('Fri: Sep 12 (9pm)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getMonth()).toBe(8) // September
            expect(start.getDate()).toBe(12)
            expect(start.getHours()).toBe(21)

            // Should default to 4-hour duration
            expect(end.getTime() - start.getTime()).toBe(4 * 60 * 60 * 1000)

            expect(result.recurring).toBe(false)
        })

        it('parses event with year specified', () => {
            const result = parse19hzDateRange('Wed: Jan 28, 2026 (8pm)')
            expectValidDates(result)

            const start = new Date(result.start)
            expect(start.getFullYear()).toBe(2026)
            expect(start.getMonth()).toBe(0) // January
            expect(start.getDate()).toBe(28)
            expect(start.getHours()).toBe(20)

            expect(result.recurring).toBe(false)
        })
    })

    describe('multi-day events', () => {
        it('parses multi-day event with different months', () => {
            const result = parse19hzDateRange('Fri: Aug 30-Sun: Sep 1 (Fri: 9pm-Sun: 2am)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getMonth()).toBe(7) // August
            expect(start.getDate()).toBe(30)
            expect(start.getHours()).toBe(21) // 9pm

            expect(end.getMonth()).toBe(8) // September
            expect(end.getDate()).toBe(1)
            expect(end.getHours()).toBe(2) // 2am

            expect(result.recurring).toBe(false)
        })

        it('parses multi-day event same month', () => {
            const result = parse19hzDateRange('Fri: Oct 3-Sun: Oct 5 (Fri: 8pm-Sun: 8pm)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getMonth()).toBe(9) // October
            expect(start.getDate()).toBe(3)
            expect(start.getHours()).toBe(20) // 8pm

            expect(end.getMonth()).toBe(9)
            expect(end.getDate()).toBe(5)
            expect(end.getHours()).toBe(20) // 8pm

            expect(result.recurring).toBe(false)
        })
    })

    describe('edge cases and fallbacks', () => {
        it('handles invalid input gracefully', () => {
            // Test a few key invalid cases without excessive logging
            expect(() => parse19hzDateRange('')).not.toThrow()
            expect(() => parse19hzDateRange('invalid')).not.toThrow()
            expect(() => parse19hzDateRange(null as unknown as string)).not.toThrow()
        })

        it('handles malformed dates gracefully', () => {
            const result = parse19hzDateRange('Fri: Aug 30')
            expectValidDates(result)
            expect(result.recurring).toBe(false)
        })

        it('handles leap year correctly', () => {
            const result = parse19hzDateRange('Fri: Feb 29, 2024 (9pm-2am)')
            expectValidDates(result)

            const start = new Date(result.start)
            expect(start.getFullYear()).toBe(2024)
            expect(start.getMonth()).toBe(1) // February
            expect(start.getDate()).toBe(29)
        })
    })

    describe('recurring events', () => {
        it('parses simple weekly recurring event', () => {
            const result = parse19hzDateRange('Mondays (9:30pm-2:30am)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getDay()).toBe(1) // Monday
            expect(start.getHours()).toBe(21) // 9:30pm
            expect(start.getMinutes()).toBe(30)

            expect(end.getDay()).toBe(2) // Tuesday (overnight)
            expect(end.getHours()).toBe(2) // 2:30am
            expect(end.getMinutes()).toBe(30)

            // Should be in the future
            expect(start.getTime()).toBeGreaterThan(new Date().getTime())

            expect(result.recurring).toBe(true)
        })

        it('parses single time recurring event', () => {
            const result = parse19hzDateRange('Tuesdays (10pm)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getDay()).toBe(2) // Tuesday
            expect(start.getHours()).toBe(22) // 10pm

            // Should default to 4-hour duration
            expect(end.getTime() - start.getTime()).toBe(4 * 60 * 60 * 1000)

            expect(result.recurring).toBe(true)
        })

        it('parses monthly recurring event (2nd Wednesday)', () => {
            const result = parse19hzDateRange('2nd Wednesdays (9pm-1am)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getDay()).toBe(3) // Wednesday
            expect(start.getHours()).toBe(21) // 9pm
            expect(end.getHours()).toBe(1) // 1am
            expect(result.recurring).toBe(true)
        })

        it('parses bi-weekly recurring event (2nd/4th Wednesday)', () => {
            const result = parse19hzDateRange('2nd/4th Wednesdays (8pm-12am)')
            expectValidDates(result)

            const start = new Date(result.start)
            const end = new Date(result.end)

            expect(start.getDay()).toBe(3) // Wednesday
            expect(start.getHours()).toBe(20) // 8pm
            expect(end.getHours()).toBe(0) // 12am (midnight)
            expect(result.recurring).toBe(true)
        })
    })

    describe('AM/PM handling', () => {
        it('correctly handles 12am (midnight)', () => {
            const result = parse19hzDateRange('Sat: Jan 1 (12am-6am)')
            const start = new Date(result.start)
            expect(start.getHours()).toBe(0) // 12am = 0 hours
        })

        it('correctly handles 12pm (noon)', () => {
            const result = parse19hzDateRange('Sat: Jan 1 (12pm-6pm)')
            const start = new Date(result.start)
            expect(start.getHours()).toBe(12) // 12pm = 12 hours
        })

        it('correctly handles regular PM times', () => {
            const result = parse19hzDateRange('Sat: Jan 1 (3pm-9pm)')
            const start = new Date(result.start)
            expect(start.getHours()).toBe(15) // 3pm = 15 hours
        })
    })

    describe('key parsing features', () => {
        it('correctly parses different day names', () => {
            const mondayResult = parse19hzDateRange('Mondays (9pm)')
            expect(new Date(mondayResult.start).getDay()).toBe(1) // Monday
            expect(mondayResult.recurring).toBe(true)

            const sundayResult = parse19hzDateRange('Sundays (9pm)')
            expect(new Date(sundayResult.start).getDay()).toBe(0) // Sunday
            expect(sundayResult.recurring).toBe(true)
        })

        it('correctly parses different months', () => {
            const janResult = parse19hzDateRange('Fri: Jan 15 (9pm)')
            expect(new Date(janResult.start).getMonth()).toBe(0) // January

            const decResult = parse19hzDateRange('Fri: Dec 15 (9pm)')
            expect(new Date(decResult.start).getMonth()).toBe(11) // December
        })

        it('detects overnight events correctly', () => {
            const overnightResult = parse19hzDateRange('Fri: Jan 1 (11pm-3am)')
            const start = new Date(overnightResult.start)
            const end = new Date(overnightResult.end)
            expect(end.getDate()).toBe(start.getDate() + 1) // Next day

            const sameDayResult = parse19hzDateRange('Fri: Jan 1 (9am-5pm)')
            const startSame = new Date(sameDayResult.start)
            const endSame = new Date(sameDayResult.end)
            expect(endSame.getDate()).toBe(startSame.getDate()) // Same day
        })
    })
})
