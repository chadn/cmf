import { Location, LOCATION_KEY_PREFIX, EVENTS_CACHE_PREFIX, EventsSourceResponse } from '@/types/events'
import * as upstashCache from './upstash'
import * as filesystemCache from './filesystem'
import { logr } from '@/lib/utils/logr'
import { getSizeOfAny, roundTimeToNearestHour } from '@/lib/utils/utils-shared'
import { waitUntil } from '@vercel/functions'

const useFilesystemCache = checkUseFilesystemCache()
const CACHE_TTL_API_GEOCODE = process.env.CACHE_TTL_API_GEOCODE
    ? parseInt(process.env.CACHE_TTL_API_GEOCODE)
    : 60 * 60 * 24 * 90 // 90 days

export async function getCacheKeys(key: string, prefix?: string): Promise<string[]> {
    if (!key) return []
    const start = performance.now()

    let results: string[] | null = null
    if (useFilesystemCache) {
        // not tested
        const cache = filesystemCache.loadCache()
        results = Object.keys(cache).filter((k) => k.startsWith(`${prefix}${key}`))
    } else {
        results = await upstashCache.redisScan<string[]>(`${prefix}${key}`)
    }

    const { bytes, sizeString } = getSizeOfAny(results, 'json') as { bytes: number; sizeString: string }
    const val = bytes > 10 ? '' : ` (${JSON.stringify(results)})`

    logr.info('cache', `getCacheKeys ${Math.round(performance.now() - start)}ms ${sizeString}${val} ${prefix}${key}`)
    return results ? results : []
}

/**
 * Generic function to get a single or multiple values from cache
 * @param key - The key or keys to retrieve
 * @param prefix - Optional prefix to prepend to the key
 * @returns Promise with the cached value or null if not found
 */
export async function getCache<T>(key: string, prefix?: string): Promise<T | null>
export async function getCache<T>(key: string[], prefix?: string): Promise<T[]>
export async function getCache<T>(key: string | string[], prefix: string = ''): Promise<T | null | T[]> {
    const start = performance.now()
    let keyForLogr = prefix + (Array.isArray(key) ? key.join(',').substring(0, 100) + '...' : key)
    if (Array.isArray(key)) keyForLogr = key.length + ' keys: ' + keyForLogr

    let ret: T | null | T[] = null

    if (Array.isArray(key)) {
        // Handle array case - return array of values
        if (useFilesystemCache) {
            // In development, use filesystem cache - which only handles Location type
            const cache = filesystemCache.loadCache()
            const results: T[] = []

            for (const k of key) {
                // We know the filesystem cache only works with Location type
                const value = cache[`${prefix}${k}`]
                if (value !== undefined && value !== null) {
                    // Cast to T since we're assuming T is Location in development mode
                    results.push(value as unknown as T)
                }
            }
            ret = results
        } else {
            // In production, use Redis cache
            const results = await upstashCache.redisMGet<T>(key, prefix)
            if (results) {
                ret = results
            }
        }
    } else {
        // Handle single key case - return single value or null
        if (useFilesystemCache) {
            // In development, use filesystem cache
            const cache = filesystemCache.loadCache()
            // We know the filesystem cache only works with Location type
            ret = (cache[`${prefix}${key}`] || null) as unknown as T | null
        } else {
            // In production, use Redis cache
            ret = await upstashCache.redisGet<T>(key, prefix)
        }
    }
    const { bytes, sizeString } = getSizeOfAny(ret, 'json') as { bytes: number; sizeString: string }
    const val = bytes > 10 ? '' : ` (${JSON.stringify(ret)})`

    logr.info('cache', `getCache ${Math.round(performance.now() - start)}ms ${sizeString}${val} ${keyForLogr}`)
    return ret
}

// The difference between these setCache definitions is that when key is an array, the value is an array of values.
// when key is a string, the value is a single value.
/**
 * Generic function to set a single value in cache
 * @param key - The key to store
 * @param value - The value to store
 * @param prefix - Optional prefix to prepend to the key
 * @param ttl - Optional time-to-live in seconds (default: 30 days)
 * @returns Promise that resolves when caching is complete
 */
export async function setCache<T>(key: string, value: T, prefix?: string, ttl?: number): Promise<void>

/**
 * Generic function to set multiple values in cache
 * @param key - The keys to store
 * @param value - The values to store
 * @param prefix - Optional prefix to prepend to the key
 * @param ttl - Optional time-to-live in seconds (default: 30 days)
 * @returns Promise that resolves when caching is complete
 */
export async function setCache<T>(key: string[], value: T[], prefix?: string, ttl?: number): Promise<void>

export async function setCache<T>(
    key: string | string[],
    value: T | T[],
    prefix: string = '',
    ttl: number = 60 * 60 * 24 * 30
): Promise<void> {
    const start = performance.now()
    let keyForLogr = prefix + (Array.isArray(key) ? key.join(',').substring(0, 100) + '...' : key)
    if (Array.isArray(key)) keyForLogr = key.length + ' keys: ' + keyForLogr
    if (useFilesystemCache) {
        // In development, use filesystem cache - which only handles Location type
        const cache = filesystemCache.loadCache()
        try {
            if (Array.isArray(key)) {
                const valueArray = value as T[]
                for (let i = 0; i < key.length; i++) {
                    // Cast to Location since filesystem cache only works with Location
                    cache[`${prefix}${key[i]}`] = valueArray[i] as unknown as Location
                }
            } else {
                // Cast to Location since filesystem cache only works with Location
                cache[`${prefix}${key}`] = value as unknown as Location
            }
            filesystemCache.saveCache(cache)
        } catch (error) {
            logr.error('cache', `Error setting cache for ${keyForLogr}: ${error}`)
        }
    } else {
        // In production, use Redis cache
        if (Array.isArray(key)) {
            const valueArray = value as T[]
            await upstashCache.redisMSet<T>(key, valueArray, prefix, ttl)
        } else {
            await upstashCache.redisSet<T>(key as string, value as T, prefix, ttl)
        }
    }
    const runtime = Math.round(performance.now() - start)
    logr.info('cache', `setCache ${runtime}ms ${getSizeOfAny(value)} ${keyForLogr}`)
}
/**
 * Generic function to set a single value in cache
 * @param key - The key to store
 * @param value - The value to store
 * @param prefix - Optional prefix to prepend to the key
 * @param ttl - Optional time-to-live in seconds (default: 30 days)
 * @returns Promise that resolves when caching is complete
export async function setCacheBg<T>(key: string, value: T, prefix?: string, ttl?: number): Promise<void>
export async function setCacheBg<T>(key: string[], value: T[], prefix?: string, ttl?: number): Promise<void>
export async function setCacheBg<T>(
    key: string | string[],
    value: T | T[],
    prefix: string = '',
    ttl: number = 60 * 60 * 24 * 30
): Promise<void> {
    const keyForLogr = prefix + (Array.isArray(key) ? key.join(',').substring(0, 100) + '...' : key)
    waitUntil(
        new Promise(async () => {
            try {
                await setCache(key, value, prefix, ttl)
                logr.info('cache', `setCacheBg success for ${keyForLogr}`)
            } catch (error) {
                logr.warn('cache', `setCacheBg failed for ${keyForLogr}`, error)
            }
        })
    )
}
*/

/**
 * Gets a location from cache
 * @param locationKey - The location string to use as a key
 * @returns Promise with the cached location or null if not found
 */
export async function getCachedLocation(locationKey: string): Promise<Location | null> {
    return getCache<Location>(locationKey, LOCATION_KEY_PREFIX)
}

/**
 * Caches a location
 * @param locationKey - The location string to use as a key
 * @param location - The resolved location data to cache
 * @returns Promise that resolves when caching is complete
 */
export async function setCacheLocation(locationKey: string, location: Location): Promise<void> {
    return setCache<Location>(locationKey, location, LOCATION_KEY_PREFIX, CACHE_TTL_API_GEOCODE)
}

/**
 * Generates a cache key for events
 */
function createEventsCacheKey(eventSourceId: string, timeMin: string = '', timeMax: string = ''): string {
    return `${eventSourceId}-${roundTimeToNearestHour(timeMin)}-${roundTimeToNearestHour(timeMax)}`
}

/**
 * Validates and parses time strings into Date objects, returns current time if invalid params
 */
function parseTimeRange(timeMin: string, timeMax: string): { timeMinDate: Date; timeMaxDate: Date } {
    const timeMinDate = timeMin ? new Date(timeMin) : new Date()
    const timeMaxDate = timeMax ? new Date(timeMax) : new Date()
    if (isNaN(timeMinDate.getTime()) || isNaN(timeMaxDate.getTime())) {
        logr.info('cache', `parseTimeRange: invalid timeMin(${timeMin}) or timeMax(${timeMax}), using current time.`)
        return parseTimeRange('', '')
    }
    return { timeMinDate, timeMaxDate }
}

/**
 * Fetches value from cache, the key used is based on params.  Trying to do 2 things
 * - fetch accurately - for specific timeMin and timeMax
 * - fetch broadly - for the eventSourceId across any cached value over cacheTtlEventSource
 * @param eventSourceId - The ID of the event source
 * @param cacheTtlEventSource - The TTL for the event source cache
 * @param timeMin - The minimum time for the event range
 * @param timeMax - The maximum time for the event range
 * @returns The cache key for the events
 */
export const getEventsCache = async (
    eventSourceId: string,
    cacheTtlEventSource: number, // in seconds
    timeMin: string = '',
    timeMax: string = ''
): Promise<EventsSourceResponse | null> => {
    // TODO: improve performance slightly. Currently code does 2 redis calls synchronously.
    // Instead, do 2 in parallel:
    // - getCacheKeys() as done now
    // - getCache() for the most recent key (calculated). If hit, return right away

    // Use provided times or default to current time if invalid
    const { timeMinDate, timeMaxDate } = parseTimeRange(timeMin, timeMax)
    const MAX_HOURS_BACK = 72 //  prevent infinite loops, 3 days seems reasonable.
    const maxHoursBack = Math.min(MAX_HOURS_BACK, Math.ceil(cacheTtlEventSource / 3600))

    logr.info('cache', `getEventsCache: Checking ${maxHoursBack} maxHoursBack for ${eventSourceId}`)

    // TODO: fetch all keys that match eventSourceId-*, then find best match for timeMin/timeMax
    const results = await getCacheKeys(`${eventSourceId}-*`, EVENTS_CACHE_PREFIX)
    logr.info(
        'cache',
        `getEventsCache: getCacheKeys Found ${results.length} keys that start with '${eventSourceId}-'\n${JSON.stringify(results)}`
    )

    // Search backwards in time for cached entries until TTL cutoff, most recent cached first
    for (let hoursBack = 0; hoursBack - 1 < maxHoursBack; hoursBack++) {
        const currentTimeMin = new Date(timeMinDate.getTime() - hoursBack * 60 * 60 * 1000)
        const currentTimeMax = new Date(timeMaxDate.getTime() - hoursBack * 60 * 60 * 1000)
        const fetchKey =
            EVENTS_CACHE_PREFIX +
            createEventsCacheKey(
                eventSourceId,
                roundTimeToNearestHour(currentTimeMin),
                roundTimeToNearestHour(currentTimeMax)
            )
        if (results.includes(fetchKey)) {
            const cachedResponse = await getCache<EventsSourceResponse>(fetchKey)
            if (cachedResponse) {
                logr.info('cache', `getEventsCache: Cache hit for ${fetchKey} (${hoursBack}h back)`)
                return cachedResponse
            }
        } else {
            //logr.info('cache', `getEventsCache: key miss for '${fetchKey}'`)
        }
    }

    logr.info('cache', `getEventsCache: No cache found for ${eventSourceId} within ${cacheTtlEventSource}s TTL`)
    return null
}

/**
 * Sets the events cache for a specific event source and time range
 * @param response - The events source response to cache
 * @param eventSourceId - The ID of the event source
 * @param cacheTtlEventSource - The cache TTL
 * @param timeMin - The minimum time for the event range
 * @param timeMax - The maximum time for the event range
 */
export const setEventsCache = async (
    response: EventsSourceResponse,
    eventSourceId: string,
    cacheTtlEventSource: number, // in seconds
    timeMin?: string,
    timeMax?: string
): Promise<void> => {
    const fetchKey = createEventsCacheKey(eventSourceId, timeMin, timeMax)
    const responseCopy = { ...response }

    // Save to cache in the background using waitUntil (don't await), log success or error.
    // 2024 https://vercel.com/changelog/waituntil-is-now-available-for-vercel-functions
    waitUntil(
        setCache<EventsSourceResponse>(fetchKey, responseCopy, EVENTS_CACHE_PREFIX, cacheTtlEventSource)
            .then(() => logr.info('api-events', `setEventsCache Done TTL=${cacheTtlEventSource}s for ${fetchKey}\n`))
            .catch((error) => logr.warn('api-events', `setEventsCache FAIL for ${fetchKey}\n`, error))
    )
}

function checkUseFilesystemCache(): boolean {
    // Determine which cache implementation to use based on environment
    let useFilesystemCache = true
    let reason = 'DEFAULT'
    if (process.env.FORCE_USE_REDIS === '1') {
        reason = 'FORCE_USE_REDIS=1'
        useFilesystemCache = false
    } else if (process.env.NODE_ENV != 'development') {
        reason = 'NODE_ENV!=development'
        useFilesystemCache = false
    }
    logr.info(
        'setup',
        `NODE_ENV='${process.env.NODE_ENV}' reason=${reason}, Using cache:`,
        useFilesystemCache ? `filesystem (${filesystemCache.LOCATIONS_CACHE_FILE})` : 'upstash redis'
    )
    return useFilesystemCache
}
