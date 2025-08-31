/**
 * Tests for 19hz.info date parsing utility
 * Based on real examples from the 19hz events page
 */

import { parse19hzDateRange } from '../date-parsing'

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
        it('handles unparseable format gracefully', () => {
            const result = parse19hzDateRange('Mondays (9:30pm-2:30am)')
            expectValidDates(result)
            // Should fall back to current time + 4 hours
        })

        it('handles invalid input gracefully', () => {
            const result = parse19hzDateRange('invalid date format')
            expectValidDates(result)
            // Should fall back to current time + 4 hours
        })

        it('handles empty string gracefully', () => {
            const result = parse19hzDateRange('')
            expectValidDates(result)
            // Should fall back to current time + 3 hours (error case)
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
            
            // Should be the 2nd Wednesday of some month
            const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
            const firstWednesday = new Date(monthStart)
            const firstWedOffset = (3 - monthStart.getDay() + 7) % 7
            firstWednesday.setDate(1 + firstWedOffset)
            const secondWednesday = new Date(firstWednesday)
            secondWednesday.setDate(firstWednesday.getDate() + 7)
            
            expect(start.getDate()).toBe(secondWednesday.getDate())
            
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
            
            // Should be either 2nd or 4th Wednesday
            const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
            const firstWednesday = new Date(monthStart)
            const firstWedOffset = (3 - monthStart.getDay() + 7) % 7
            firstWednesday.setDate(1 + firstWedOffset)
            
            const secondWednesday = new Date(firstWednesday)
            secondWednesday.setDate(firstWednesday.getDate() + 7)
            
            const fourthWednesday = new Date(firstWednesday)
            fourthWednesday.setDate(firstWednesday.getDate() + 21)
            
            const isSecondOrFourth = start.getDate() === secondWednesday.getDate() || 
                                   start.getDate() === fourthWednesday.getDate()
            expect(isSecondOrFourth).toBe(true)
            
            expect(result.recurring).toBe(true)
        })

        it('parses 1st occurrence recurring event', () => {
            const result = parse19hzDateRange('1st Wednesdays (6pm-9pm)')
            expectValidDates(result)
            
            const start = new Date(result.start)
            
            expect(start.getDay()).toBe(3) // Wednesday
            expect(start.getHours()).toBe(18) // 6pm
            
            // Should be the 1st Wednesday of some month
            const monthStart = new Date(start.getFullYear(), start.getMonth(), 1)
            const firstWednesday = new Date(monthStart)
            const firstWedOffset = (3 - monthStart.getDay() + 7) % 7
            firstWednesday.setDate(1 + firstWedOffset)
            
            expect(start.getDate()).toBe(firstWednesday.getDate())
            
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
})