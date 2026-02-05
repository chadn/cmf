/**
 * Tests for 19hz.info date parsing utility
 * Based on real examples from the 19hz events page
 */

import { parse19hzDateRange } from '@/lib/utils/date-19hz-parsing'
import { DateTime } from 'luxon'

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

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.month).toBe(8) // August (Luxon uses 1-12)
            expect(start.day).toBe(31)
            expect(start.hour).toBe(6)
            expect(start.minute).toBe(0)

            expect(end.month).toBe(8)
            expect(end.day).toBe(31)
            expect(end.hour).toBe(12)
            expect(end.minute).toBe(0)

            expect(result.recurring).toBe(false)
        })

        it('parses overnight event (end time next day)', () => {
            const result = parse19hzDateRange('Fri: Aug 30 (9pm-2am)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.month).toBe(8) // August (Luxon uses 1-12)
            expect(start.day).toBe(30)
            expect(start.hour).toBe(21) // 9pm

            expect(end.month).toBe(8)
            expect(end.day).toBe(31) // Next day
            expect(end.hour).toBe(2) // 2am

            expect(result.recurring).toBe(false)
        })

        it('parses late night event with minutes', () => {
            const result = parse19hzDateRange('Sat: Nov 15 (11:59pm-6am)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.month).toBe(11) // November (Luxon uses 1-12)
            expect(start.day).toBe(15)
            expect(start.hour).toBe(23)
            expect(start.minute).toBe(59)

            expect(end.day).toBe(16) // Next day
            expect(end.hour).toBe(6)
            expect(end.minute).toBe(0)

            expect(result.recurring).toBe(false)
        })

        it('parses single time (no end time)', () => {
            const result = parse19hzDateRange('Fri: Sep 12 (9pm)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })

            expect(start.month).toBe(9) // September (Luxon uses 1-12)
            expect(start.day).toBe(12)
            expect(start.hour).toBe(21)

            // Should default to 4-hour duration
            expect(new Date(result.end).getTime() - new Date(result.start).getTime()).toBe(4 * 60 * 60 * 1000)

            expect(result.recurring).toBe(false)
        })

        it('parses event with year specified', () => {
            const result = parse19hzDateRange('Wed: Jan 28, 2026 (8pm)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            expect(start.year).toBe(2026)
            expect(start.month).toBe(1) // January (Luxon uses 1-12)
            expect(start.day).toBe(28)
            expect(start.hour).toBe(20)

            expect(result.recurring).toBe(false)
        })
    })

    describe('multi-day events', () => {
        it('parses multi-day event with different months', () => {
            const result = parse19hzDateRange('Fri: Aug 30-Sun: Sep 1 (Fri: 9pm-Sun: 2am)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.month).toBe(8) // August (Luxon uses 1-12)
            expect(start.day).toBe(30)
            expect(start.hour).toBe(21) // 9pm

            expect(end.month).toBe(9) // September (Luxon uses 1-12)
            expect(end.day).toBe(1)
            expect(end.hour).toBe(2) // 2am

            expect(result.recurring).toBe(false)
        })

        it('parses multi-day event same month', () => {
            const result = parse19hzDateRange('Fri: Oct 3-Sun: Oct 5 (Fri: 8pm-Sun: 8pm)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.month).toBe(10) // October (Luxon uses 1-12)
            expect(start.day).toBe(3)
            expect(start.hour).toBe(20) // 8pm

            expect(end.month).toBe(10)
            expect(end.day).toBe(5)
            expect(end.hour).toBe(20) // 8pm

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

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            expect(start.year).toBe(2024)
            expect(start.month).toBe(2) // February (Luxon uses 1-12)
            expect(start.day).toBe(29)
        })
    })

    describe('recurring events', () => {
        it('parses simple weekly recurring event', () => {
            const result = parse19hzDateRange('Mondays (9:30pm-2:30am)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.weekday).toBe(1) // Monday (Luxon uses 1-7)
            expect(start.hour).toBe(21) // 9:30pm
            expect(start.minute).toBe(30)

            expect(end.weekday).toBe(2) // Tuesday (overnight)
            expect(end.hour).toBe(2) // 2:30am
            expect(end.minute).toBe(30)

            // Should be in the future
            expect(new Date(result.start).getTime()).toBeGreaterThan(new Date().getTime())

            expect(result.recurring).toBe(true)
        })

        it('parses single time recurring event', () => {
            const result = parse19hzDateRange('Tuesdays (10pm)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })

            expect(start.weekday).toBe(2) // Tuesday (Luxon uses 1-7)
            expect(start.hour).toBe(22) // 10pm

            // Should default to 4-hour duration
            expect(new Date(result.end).getTime() - new Date(result.start).getTime()).toBe(4 * 60 * 60 * 1000)

            expect(result.recurring).toBe(true)
        })

        it('parses monthly recurring event (2nd Wednesday)', () => {
            const result = parse19hzDateRange('2nd Wednesdays (9pm-1am)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.weekday).toBe(3) // Wednesday (Luxon uses 1-7)
            expect(start.hour).toBe(21) // 9pm
            expect(end.hour).toBe(1) // 1am
            expect(result.recurring).toBe(true)
        })

        it('parses bi-weekly recurring event (2nd/4th Wednesday)', () => {
            const result = parse19hzDateRange('2nd/4th Wednesdays (8pm-12am)')
            expectValidDates(result)

            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })

            expect(start.weekday).toBe(3) // Wednesday (Luxon uses 1-7)
            expect(start.hour).toBe(20) // 8pm
            expect(end.hour).toBe(0) // 12am (midnight)
            expect(result.recurring).toBe(true)
        })
    })

    describe('AM/PM handling', () => {
        it('correctly handles 12am (midnight)', () => {
            const result = parse19hzDateRange('Sat: Jan 1 (12am-6am)')
            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            expect(start.hour).toBe(0) // 12am = 0 hours
        })

        it('correctly handles 12pm (noon)', () => {
            const result = parse19hzDateRange('Sat: Jan 1 (12pm-6pm)')
            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            expect(start.hour).toBe(12) // 12pm = 12 hours
        })

        it('correctly handles regular PM times', () => {
            const result = parse19hzDateRange('Sat: Jan 1 (3pm-9pm)')
            const start = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            expect(start.hour).toBe(15) // 3pm = 15 hours
        })
    })

    describe('key parsing features', () => {
        it('correctly parses different day names', () => {
            const mondayResult = parse19hzDateRange('Mondays (9pm)')
            expect(DateTime.fromISO(mondayResult.start, { zone: 'America/Los_Angeles' }).weekday).toBe(1) // Monday (Luxon uses 1-7)
            expect(mondayResult.recurring).toBe(true)

            const sundayResult = parse19hzDateRange('Sundays (9pm)')
            expect(DateTime.fromISO(sundayResult.start, { zone: 'America/Los_Angeles' }).weekday).toBe(7) // Sunday (Luxon uses 1-7, Sunday is 7)
            expect(sundayResult.recurring).toBe(true)
        })

        it('correctly parses different months', () => {
            const janResult = parse19hzDateRange('Fri: Jan 15 (9pm)')
            expect(DateTime.fromISO(janResult.start, { zone: 'America/Los_Angeles' }).month).toBe(1) // January (Luxon uses 1-12)

            const decResult = parse19hzDateRange('Fri: Dec 15 (9pm)')
            expect(DateTime.fromISO(decResult.start, { zone: 'America/Los_Angeles' }).month).toBe(12) // December (Luxon uses 1-12)
        })

        it('detects overnight events correctly', () => {
            const overnightResult = parse19hzDateRange('Fri: Jan 1 (11pm-3am)')
            const start = DateTime.fromISO(overnightResult.start, { zone: 'America/Los_Angeles' })
            const end = DateTime.fromISO(overnightResult.end, { zone: 'America/Los_Angeles' })
            expect(end.day).toBe(start.day + 1) // Next day

            const sameDayResult = parse19hzDateRange('Fri: Jan 1 (9am-5pm)')
            const startSame = DateTime.fromISO(sameDayResult.start, { zone: 'America/Los_Angeles' })
            const endSame = DateTime.fromISO(sameDayResult.end, { zone: 'America/Los_Angeles' })
            expect(endSame.day).toBe(startSame.day) // Same day
        })
    })

    describe('timezone handling', () => {
        it('demonstrates timezone differences correctly - different moments in time', () => {
            const input = 'Fri: Aug 30 (9pm-2am)'

            // Parse same input in different timezones - these should be different moments
            const resultLA = parse19hzDateRange(input, new Date(), 'America/Los_Angeles')
            const resultNY = parse19hzDateRange(input, new Date(), 'America/New_York')

            // Convert to UTC to compare the actual moments
            const startLA_UTC = DateTime.fromISO(resultLA.start).toUTC()
            const startNY_UTC = DateTime.fromISO(resultNY.start).toUTC()

            // These should be different moments - 3 hours apart
            const diffHours = startNY_UTC.diff(startLA_UTC, 'hours').hours
            expect(diffHours).toBe(-3) // NY event is 3 hours earlier than LA event

            // Verify the local times
            const startLA_Local = DateTime.fromISO(resultLA.start, { zone: 'America/Los_Angeles' })
            const startNY_Local = DateTime.fromISO(resultNY.start, { zone: 'America/New_York' })

            // Both should show 9pm in their respective timezones
            expect(startLA_Local.hour).toBe(21) // 9pm PDT
            expect(startNY_Local.hour).toBe(21) // 9pm EDT

            // But the UTC times should be different
            expect(startLA_UTC.hour).toBe(4) // 9pm PDT = 4am UTC (next day)
            expect(startNY_UTC.hour).toBe(1) // 9pm EDT = 1am UTC (next day)

            // Verify end times too
            const endLA_UTC = DateTime.fromISO(resultLA.end).toUTC()
            const endNY_UTC = DateTime.fromISO(resultNY.end).toUTC()

            const endDiffHours = endNY_UTC.diff(endLA_UTC, 'hours').hours
            expect(endDiffHours).toBe(-3) // End times also 3 hours apart
        })

        it('works with UTC timezone parameter', () => {
            const input = 'Fri: Aug 30 (9pm-2am)'
            const resultUTC = parse19hzDateRange(input, new Date(), 'UTC')

            // When parsing in UTC, 9pm should be 9pm UTC
            const startUTC = DateTime.fromISO(resultUTC.start).toUTC()
            expect(startUTC.hour).toBe(21) // 9pm UTC

            // Compare with LA timezone
            const resultLA = parse19hzDateRange(input, new Date(), 'America/Los_Angeles')
            const startLA_UTC = DateTime.fromISO(resultLA.start).toUTC()

            // UTC event should be different from LA event
            const diffHours = startUTC.diff(startLA_UTC, 'hours').hours
            expect(diffHours).toBe(-7) // UTC 9pm is 7 hours earlier than LA 9pm (9pm PDT = 4am UTC next day)
        })

        it('handles PST vs PDT correctly for different dates', () => {
            // Test date in PST (January)
            const winterResult = parse19hzDateRange('Fri: Jan 15 (9pm-2am)')
            const winterStart = DateTime.fromISO(winterResult.start, { zone: 'America/Los_Angeles' })
            expect(winterStart.hour).toBe(21) // 9pm PST
            expect(winterStart.month).toBe(1) // January
            expect(winterStart.day).toBe(15)

            // Test date in PDT (August)
            const summerResult = parse19hzDateRange('Fri: Aug 15 (9pm-2am)')
            const summerStart = DateTime.fromISO(summerResult.start, { zone: 'America/Los_Angeles' })
            expect(summerStart.hour).toBe(21) // 9pm PDT
            expect(summerStart.month).toBe(8) // August
            expect(summerStart.day).toBe(15)
        })

        it('produces different UTC times for PST vs PDT', () => {
            // January (PST = UTC-8)
            const winterResult = parse19hzDateRange('Fri: Jan 15 (9pm-2am)')
            const winterStartUTC = DateTime.fromISO(winterResult.start).toUTC()
            expect(winterStartUTC.hour).toBe(5) // 9pm PST = 5am UTC next day

            // August (PDT = UTC-7)
            const summerResult = parse19hzDateRange('Fri: Aug 15 (9pm-2am)')
            const summerStartUTC = DateTime.fromISO(summerResult.start).toUTC()
            expect(summerStartUTC.hour).toBe(4) // 9pm PDT = 4am UTC next day
        })

        it('demonstrates what the old broken implementation would produce', () => {
            // This test shows what WOULD happen with the old broken implementation
            // vs what happens with our timezone-aware implementation

            const input = 'Fri: Aug 30 (9pm-2am)'

            // Our fixed implementation: always creates dates in America/Los_Angeles
            const fixedResult = parse19hzDateRange(input)
            const fixedStartUTC = DateTime.fromISO(fixedResult.start).toUTC()

            // Should be 4am UTC (9pm PDT = 4am UTC next day)
            expect(fixedStartUTC.hour).toBe(4)

            // Simulate what the OLD broken implementation would produce in different system timezones
            const brokenBehaviorSimulation = {
                // System in UTC: new Date(2025, 7, 30, 21, 0) would create 9pm UTC
                UTC: DateTime.fromObject({ year: 2025, month: 8, day: 30, hour: 21 }, { zone: 'UTC' }).toUTC(),

                // System in LA: new Date(2025, 7, 30, 21, 0) would create 9pm PDT
                'America/Los_Angeles': DateTime.fromObject(
                    { year: 2025, month: 8, day: 30, hour: 21 },
                    { zone: 'America/Los_Angeles' }
                ).toUTC(),

                // System in NY: new Date(2025, 7, 30, 21, 0) would create 9pm EDT
                'America/New_York': DateTime.fromObject(
                    { year: 2025, month: 8, day: 30, hour: 21 },
                    { zone: 'America/New_York' }
                ).toUTC(),
            }

            // The broken implementation would give DIFFERENT UTC results depending on system timezone:
            expect(brokenBehaviorSimulation['UTC'].hour).toBe(21) // 9pm UTC
            expect(brokenBehaviorSimulation['America/Los_Angeles'].hour).toBe(4) // 9pm PDT = 4am UTC next day
            expect(brokenBehaviorSimulation['America/New_York'].hour).toBe(1) // 9pm EDT = 1am UTC next day

            // Our fixed implementation always gives the LA result (4am UTC) regardless of system timezone
            expect(fixedStartUTC.hour).toBe(brokenBehaviorSimulation['America/Los_Angeles'].hour)

            // Demonstrate that broken behavior in UTC would give wrong time
            expect(brokenBehaviorSimulation['UTC'].hour).not.toBe(fixedStartUTC.hour)

            // Demonstrate that broken behavior in NY would give wrong time
            expect(brokenBehaviorSimulation['America/New_York'].hour).not.toBe(fixedStartUTC.hour)
        })

        it('handles recurring events with correct timezone', () => {
            const result = parse19hzDateRange('Mondays (9pm-2am)')

            // Should be Monday 9pm in America/Los_Angeles
            const startInLA = DateTime.fromISO(result.start, { zone: 'America/Los_Angeles' })
            expect(startInLA.weekday).toBe(1) // Monday
            expect(startInLA.hour).toBe(21) // 9pm

            // End should be Tuesday 2am in America/Los_Angeles
            const endInLA = DateTime.fromISO(result.end, { zone: 'America/Los_Angeles' })
            expect(endInLA.weekday).toBe(2) // Tuesday
            expect(endInLA.hour).toBe(2) // 2am

            expect(result.recurring).toBe(true)
        })
    })
})
