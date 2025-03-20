import { ResolvedLocation } from '@/types/events'
import * as upstashCache from './upstash'
import * as filesystemCache from './filesystem'
import { debugLog } from '../utils/debug'

// Determine which cache implementation to use based on environment
const isDevelopment = process.env.NODE_ENV === 'development'

debugLog(
    'cache',
    `NODE_ENV='${process.env.NODE_ENV}' Using cache:`,
    isDevelopment
        ? `filesystem (${filesystemCache.LOCATIONS_CACHE_FILE})`
        : 'upstash redis'
)
/**
 * Gets a location from cache
 * @param locationKey - The location string to use as a key
 * @returns Promise with the cached location or null if not found
 */
export async function getCachedLocation(
    locationKey: string
): Promise<ResolvedLocation | null> {
    if (isDevelopment) {
        return filesystemCache.getLocation(locationKey)
    } else {
        return upstashCache.getLocation(locationKey)
    }
}

/**
 * Caches a location
 * @param locationKey - The location string to use as a key
 * @param location - The resolved location data to cache
 * @returns Promise that resolves when caching is complete
 */
export async function cacheLocation(
    locationKey: string,
    location: ResolvedLocation
): Promise<void> {
    if (isDevelopment) {
        return filesystemCache.setLocation(locationKey, location)
    } else {
        return upstashCache.setLocation(locationKey, location)
    }
}

/**
 * Clears the location cache
 * @returns Promise that resolves when cache is cleared
 */
export async function clearLocationCache(): Promise<void> {
    if (isDevelopment) {
        return filesystemCache.clearLocations()
    } else {
        return upstashCache.clearLocations()
    }
}
