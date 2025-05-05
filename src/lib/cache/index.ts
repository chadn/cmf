import { Location } from '@/types/events'
import * as upstashCache from './upstash'
import * as filesystemCache from './filesystem'
import { logr } from '../utils/logr'

const LOCATION_KEY_PREFIX = 'location:'

// Determine which cache implementation to use based on environment
const isDevelopment = process.env.NODE_ENV === 'development'

logr.log(
    'setup',
    `NODE_ENV='${process.env.NODE_ENV}' Using cache:`,
    isDevelopment ? `filesystem (${filesystemCache.LOCATIONS_CACHE_FILE})` : 'upstash redis'
)

// TODO: create simple getCache and setCache that can call redisGet and redisSet

/**
 * Generic function to get a value from cache
 * @param key - The key to retrieve
 * @param prefix - Optional prefix to prepend to the key
 * @returns Promise with the cached value or null if not found
 */
export async function getCache<T>(key: string, prefix: string = ''): Promise<T | null> {
    if (isDevelopment) {
        // In development, use filesystem cache
        const cache = filesystemCache.loadCache()
        return (cache[key] as unknown as T) || null
    } else {
        // In production, use Redis cache
        return upstashCache.redisGet<T>(key, prefix)
    }
}

/**
 * Generic function to set a value in cache
 * @param key - The key to store
 * @param value - The value to store
 * @param prefix - Optional prefix to prepend to the key
 * @param ttl - Optional time-to-live in seconds (default: 30 days)
 * @returns Promise that resolves when caching is complete
 */
export async function setCache<T>(
    key: string,
    value: T,
    prefix: string = '',
    ttl: number = 60 * 60 * 24 * 30
): Promise<void> {
    if (isDevelopment) {
        // In development, use filesystem cache
        const cache = filesystemCache.loadCache()
        cache[key] = value as unknown as Location
        filesystemCache.saveCache(cache)
    } else {
        // In production, use Redis cache
        await upstashCache.redisSet<T>(key, value, prefix, ttl)
    }
}

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
export async function cacheLocation(locationKey: string, location: Location): Promise<void> {
    return setCache<Location>(locationKey, location, LOCATION_KEY_PREFIX)
}
