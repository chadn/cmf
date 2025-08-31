/**
 * Date parsing utilities for event sources
 * Extracted for testability and reusability
 */

import { logr } from './logr'

/**
 * Parse 19hz.info date/time format into start and end dates
 * 
 * Handles formats like:
 * - "Fri: Aug 30 (9pm-2am)"
 * - "Sun: Aug 31 (6am-12pm)" 
 * - "Fri: Aug 30-Sun: Sep 1 (Fri: 9pm-Sun: 2am)"
 * - "Wed: Jan 28, 2026 (8pm)"
 * - "Sat: Nov 15 (11:59pm-6am)"
 * - "Mondays (9:30pm-2:30am)" - recurring events
 * - "2nd/4th Wednesdays (8pm-12am)" - specific recurring patterns
 * 
 * @param dateTimeText The date/time string to parse
 * @param recurringStart The reference date for recurring events (defaults to now)
 * @returns Object with start, end dates and recurring flag
 */
export function parse19hzDateRange(
    dateTimeText: string, 
    recurringStart: Date = new Date()
): { start: string; end: string; recurring: boolean } {
    try {
        // Handle recurring events first: "Mondays (9:30pm-2:30am)", "2nd/4th Wednesdays (8pm-12am)"
        const recurringMatch = dateTimeText.match(/^(?:(\d+)(?:st|nd|rd|th)(?:\/(\d+)(?:st|nd|rd|th))?\s+)?(\w+)s\s*\(([^)]+)\)$/)
        
        if (recurringMatch) {
            const [, occurrence1, occurrence2, dayName, timeRange] = recurringMatch
            
            // Parse the time range
            const timeMatch = timeRange.match(/(\d+)(?::(\d+))?([ap]m)(?:-(\d+)(?::(\d+))?([ap]m))?/)
            if (timeMatch) {
                const [, startHour, startMin, startAmPm, endHour, endMin, endAmPm] = timeMatch
                
                // Convert to 24-hour format
                let startHour24 = parseInt(startHour)
                const startMinute = parseInt(startMin || '0')
                
                if (startAmPm === 'pm' && startHour24 !== 12) startHour24 += 12
                if (startAmPm === 'am' && startHour24 === 12) startHour24 = 0
                
                // Find the next occurrence of this day
                const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                    .indexOf(dayName.toLowerCase())
                
                if (dayIndex !== -1) {
                    const targetDay = new Date(recurringStart)
                    
                    // Calculate days until next occurrence
                    const daysUntilTarget = (dayIndex - recurringStart.getDay() + 7) % 7
                    targetDay.setDate(recurringStart.getDate() + (daysUntilTarget || 7)) // If today is the day, use next week
                    
                    // Handle specific occurrence patterns (1st, 2nd, 3rd, 4th)
                    if (occurrence1) {
                        const occ1 = parseInt(occurrence1)
                        const monthStart = new Date(targetDay.getFullYear(), targetDay.getMonth(), 1)
                        const firstOccurrence = new Date(monthStart)
                        const firstDayIndex = monthStart.getDay()
                        const daysToFirst = (dayIndex - firstDayIndex + 7) % 7
                        firstOccurrence.setDate(1 + daysToFirst)
                        
                        // Calculate the specific occurrence (1st, 2nd, 3rd, 4th)
                        const targetOccurrence = new Date(firstOccurrence)
                        targetOccurrence.setDate(firstOccurrence.getDate() + (occ1 - 1) * 7)
                        
                        // If we have a second occurrence (e.g., "2nd/4th"), find the next one
                        if (occurrence2 && targetOccurrence < recurringStart) {
                            const occ2 = parseInt(occurrence2)
                            const secondOccurrence = new Date(firstOccurrence)
                            secondOccurrence.setDate(firstOccurrence.getDate() + (occ2 - 1) * 7)
                            
                            if (secondOccurrence > recurringStart) {
                                targetDay.setTime(secondOccurrence.getTime())
                            } else {
                                // Move to next month's first occurrence
                                const nextMonth = new Date(targetDay.getFullYear(), targetDay.getMonth() + 1, 1)
                                const nextFirstOccurrence = new Date(nextMonth)
                                const nextFirstDayIndex = nextMonth.getDay()
                                const nextDaysToFirst = (dayIndex - nextFirstDayIndex + 7) % 7
                                nextFirstOccurrence.setDate(1 + nextDaysToFirst)
                                nextFirstOccurrence.setDate(nextFirstOccurrence.getDate() + (occ1 - 1) * 7)
                                targetDay.setTime(nextFirstOccurrence.getTime())
                            }
                        } else if (targetOccurrence < recurringStart) {
                            // Move to next month
                            const nextMonth = new Date(targetDay.getFullYear(), targetDay.getMonth() + 1, 1)
                            const nextFirstOccurrence = new Date(nextMonth)
                            const nextFirstDayIndex = nextMonth.getDay()
                            const nextDaysToFirst = (dayIndex - nextFirstDayIndex + 7) % 7
                            nextFirstOccurrence.setDate(1 + nextDaysToFirst)
                            nextFirstOccurrence.setDate(nextFirstOccurrence.getDate() + (occ1 - 1) * 7)
                            targetDay.setTime(nextFirstOccurrence.getTime())
                        } else {
                            targetDay.setTime(targetOccurrence.getTime())
                        }
                    }
                    
                    // Set the time
                    const startDate = new Date(targetDay)
                    startDate.setHours(startHour24, startMinute, 0, 0)
                    
                    let endDate: Date
                    if (endHour && endAmPm) {
                        // Has end time
                        let endHour24 = parseInt(endHour)
                        const endMinute = parseInt(endMin || '0')
                        
                        if (endAmPm === 'pm' && endHour24 !== 12) endHour24 += 12
                        if (endAmPm === 'am' && endHour24 === 12) endHour24 = 0
                        
                        endDate = new Date(targetDay)
                        endDate.setHours(endHour24, endMinute, 0, 0)
                        
                        // Handle overnight events
                        if (endHour24 < startHour24 || (endHour24 === startHour24 && endMinute < startMinute)) {
                            endDate.setDate(endDate.getDate() + 1)
                        }
                    } else {
                        // Single time, default to 4-hour duration
                        endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)
                    }
                    
                    return {
                        start: startDate.toISOString(),
                        end: endDate.toISOString(),
                        recurring: true,
                    }
                }
            }
        }

        // Handle multi-day format first: "Fri: Aug 30-Sun: Sep 1 (Fri: 9pm-Sun: 2am)"
        const multiDayMatch = dateTimeText.match(/(\w+):\s*(\w+)\s+(\d+)-(\w+):\s*(\w+)\s+(\d+)(?:,\s*(\d{4}))?\s*\(([^)]+)\)/)
        
        if (multiDayMatch) {
            const [, , startMonth, startDay, , endMonth, endDay, year, timeRange] = multiDayMatch
            const eventYear = year ? parseInt(year) : new Date().getFullYear()
            
            // Parse time range like "Fri: 9pm-Sun: 2am"
            const timeMatch = timeRange.match(/(\w+):\s*(\d+)(?::(\d+))?([ap]m)-(\w+):\s*(\d+)(?::(\d+))?([ap]m)/)
            if (timeMatch) {
                const [, , startHour, startMin, startAmPm, , endHour, endMin, endAmPm] = timeMatch
                
                // Convert to 24-hour format
                let startHour24 = parseInt(startHour)
                const startMinute = parseInt(startMin || '0')
                let endHour24 = parseInt(endHour)
                const endMinute = parseInt(endMin || '0')
                
                if (startAmPm === 'pm' && startHour24 !== 12) startHour24 += 12
                if (startAmPm === 'am' && startHour24 === 12) startHour24 = 0
                if (endAmPm === 'pm' && endHour24 !== 12) endHour24 += 12
                if (endAmPm === 'am' && endHour24 === 12) endHour24 = 0
                
                // Create date objects
                const startMonthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                                       'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(startMonth.toLowerCase())
                const endMonthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(endMonth.toLowerCase())
                
                const startDate = new Date(eventYear, startMonthIndex, parseInt(startDay), startHour24, startMinute, 0)
                const endDate = new Date(eventYear, endMonthIndex, parseInt(endDay), endHour24, endMinute, 0)
                
                return {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    recurring: false,
                }
            }
        }

        // Handle single day format: "Fri: Aug 30 (9pm-2am)"
        const singleDayMatch = dateTimeText.match(/(\w+):\s*(\w+)\s+(\d+)(?:,\s*(\d{4}))?\s*\(([^)]+)\)/)
        
        if (singleDayMatch) {
            const [, , month, day, year, timeRange] = singleDayMatch
            const eventYear = year ? parseInt(year) : new Date().getFullYear()
            
            // Parse time range like "9pm-2am" or "6am-12pm" or "8pm" (single time)
            const timeMatch = timeRange.match(/(\d+)(?::(\d+))?([ap]m)(?:-(\d+)(?::(\d+))?([ap]m))?/)
            if (timeMatch) {
                const [, startHour, startMin, startAmPm, endHour, endMin, endAmPm] = timeMatch
                
                // Convert to 24-hour format
                let startHour24 = parseInt(startHour)
                const startMinute = parseInt(startMin || '0')
                
                if (startAmPm === 'pm' && startHour24 !== 12) startHour24 += 12
                if (startAmPm === 'am' && startHour24 === 12) startHour24 = 0
                
                // Create date objects
                const monthIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                                  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(month.toLowerCase())
                
                const startDate = new Date(eventYear, monthIndex, parseInt(day), startHour24, startMinute, 0)
                let endDate: Date
                
                if (endHour && endAmPm) {
                    // Has end time
                    let endHour24 = parseInt(endHour)
                    const endMinute = parseInt(endMin || '0')
                    
                    if (endAmPm === 'pm' && endHour24 !== 12) endHour24 += 12
                    if (endAmPm === 'am' && endHour24 === 12) endHour24 = 0
                    
                    endDate = new Date(eventYear, monthIndex, parseInt(day), endHour24, endMinute, 0)
                    
                    // Handle overnight events (end time before start time)
                    if (endHour24 < startHour24 || (endHour24 === startHour24 && endMinute < startMinute)) {
                        endDate.setDate(endDate.getDate() + 1)
                    }
                } else {
                    // Single time, default to 4-hour duration
                    endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)
                }
                
                return {
                    start: startDate.toISOString(),
                    end: endDate.toISOString(),
                    recurring: false,
                }
            }
        }
        
        // Fallback: use current time with 4-hour duration
        logr.warn('date-parsing', `Could not parse 19hz date format: ${dateTimeText}`)
        const now = new Date()
        const startDate = new Date(now)
        const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000)

        return {
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            recurring: false,
        }
    } catch (error) {
        logr.warn('date-parsing', `Error parsing 19hz date range: ${dateTimeText}`, error)
        const now = new Date()
        return {
            start: now.toISOString(),
            end: new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString(),
            recurring: false,
        }
    }
}