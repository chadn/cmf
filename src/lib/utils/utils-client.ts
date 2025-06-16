'use client'

import { logr } from '@/lib/utils/logr'
import { umamiTrack } from '@/lib/utils/umami'
import { CmfEvent, SortField, SortDirection } from '@/types/events'
import { useRef, useCallback } from 'react'

// Custom fetcher function, basically a wrapper to log API requests and responses
export const fetcherLogr = async (url: string) => {
    try {
        const startTime = performance.now()
        logr.info('browser', `fetcherLogr request url: ${url}`)

        const response = await fetch(url)

        const data = await response.json()
        const ms = Math.round(performance.now() - startTime)
        const sizeOfResponse = JSON.stringify(data).length
        logr.info('browser', `fetcherLogr Response ${response.status}, ${sizeOfResponse} bytes in ${ms}ms, url: ${url}`)
        logr.debug('browser', `fetcherLogr Response ${response.status} url: ${url}`, data)
        data.httpStatus = response.status

        let esId = 'unknownEsId'
        try {
            // extract id=xxx from url
            esId = url.split('id=')[1]?.split('&')[0]
        } catch {} // ignore errors

        umamiTrack('ClientFetch', {
            esId: esId,
            status: response.status,
            sizeKb: Math.round(sizeOfResponse / 10240) * 10,
            sec: Math.round(ms / 1000),
            secId: Math.round(ms / 1000) + '-' + esId,
        })
        return data
    } catch (error) {
        logr.info('browser', `Error from url: ${url}`, error)
        throw error
    }
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 */
export function useDebounce<Fn extends (...args: unknown[]) => unknown>(
    func: Fn,
    wait: number
): (...args: Parameters<Fn>) => void {
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    return useCallback(
        (...args: Parameters<Fn>) => {
            if (timerRef.current) {
                clearTimeout(timerRef.current)
            }

            timerRef.current = setTimeout(() => {
                func(...args)
            }, wait)
        },
        [func, wait]
    )
}

/**
 * Compares two event objects based on a specified field and direction.
 * This function calculates the direct comparison result for a single field.
 *
 * @param eventA The first event object.
 * @param eventB The second event object.
 * @param field The field to sort by ('name', 'startDate', 'duration', 'location').
 * @param direction The sort direction ('asc' or 'desc').
 * @returns A number indicating the sort order (-1, 0, or 1).
 */
export const getComparisonResult = (
    eventA: CmfEvent,
    eventB: CmfEvent,
    field: SortField,
    direction: SortDirection
): number => {
    let comparison = 0 // Default to 0 (equal)

    switch (field) {
        case 'name':
            comparison = eventA.name.localeCompare(eventB.name)
            break
        case 'startDate':
            if (eventA.startSecs && eventB.startSecs) {
                comparison = eventA.startSecs - eventB.startSecs
            } else {
                comparison = new Date(eventA.start).getTime() - new Date(eventB.start).getTime()
            }
            break
        case 'duration':
            // Calculate duration in milliseconds for comparison
            const aDuration = new Date(eventA.end).getTime() - new Date(eventA.start).getTime()
            const bDuration = new Date(eventB.end).getTime() - new Date(eventB.start).getTime()
            comparison = aDuration - bDuration
            break
        case 'location':
            // Handle potentially undefined locations for localeCompare
            const locA = eventA.location || ''
            const locB = eventB.location || ''
            comparison = locA.localeCompare(locB)
            break
        default:
            // Should not happen if SortField is strictly typed and handled
            comparison = 0
            break
    }
    return direction === 'asc' ? comparison : -comparison
}
