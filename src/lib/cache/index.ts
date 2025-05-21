import { Location, LOCATION_KEY_PREFIX } from '@/types/events'
import * as upstashCache from './upstash'
import * as filesystemCache from './filesystem'
import { logr } from '../utils/logr'
import { getSizeOfAny } from '../utils/utils-shared'
// import { waitUntil } from '@vercel/functions'

const useFilesystemCache = checkUseFilesystemCache()
const CACHE_TTL_API_GEOCODE = process.env.CACHE_TTL_API_GEOCODE
    ? parseInt(process.env.CACHE_TTL_API_GEOCODE)
    : 60 * 60 * 24 * 90 // 90 days

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
            if (ttl > 1) await upstashCache.redisMSet<T>(key, valueArray, prefix, ttl)
        } else {
            if (ttl > 1) await upstashCache.redisSet<T>(key as string, value as T, prefix, ttl)
        }
    }
    const runtime = Math.round(performance.now() - start)
    if (ttl > 1) {
        logr.info('cache', `setCache ${runtime}ms ${getSizeOfAny(value)} ${keyForLogr}`)
    } else {
        logr.info('cache', `setCache SKIPPED, ${runtime}ms ${getSizeOfAny(value)} ${keyForLogr}`)
    }
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
