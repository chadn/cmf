'use client'

import { logr } from '@/lib/utils/logr'
import { umamiTrack } from '@/lib/utils/umami'
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
            sizeKb: Math.round(sizeOfResponse / 1024),
            sec: Math.round(ms / 100) / 10,
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
