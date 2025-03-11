import { Redis } from '@upstash/redis'
import { ResolvedLocation } from '@/types/events'

// Cache key prefix
const LOCATION_KEY_PREFIX = 'location:'

// Initialize Redis client
let redis: Redis | null = null

function getRedisClient(): Redis {
    if (!redis) {
        // Check if Upstash credentials are available
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            throw new Error('Upstash Redis credentials are not configured')
        }

        redis = new Redis({
            url: process.env.KV_REST_API_URL,
            token: process.env.KV_REST_API_TOKEN,
        })
    }
    return redis
}

/**
 * Gets a location from the Upstash Redis cache
 * @param locationKey - The location string to use as a key
 * @returns Promise with the cached location or null if not found
 */
export async function getLocation(
    locationKey: string
): Promise<ResolvedLocation | null> {
    try {
        // Skip if Upstash is not configured
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            return null
        }

        const client = getRedisClient()
        const cacheKey = `${LOCATION_KEY_PREFIX}${locationKey}`
        const cachedData = await client.get(cacheKey)

        return (cachedData as ResolvedLocation) || null
    } catch (error) {
        console.error('Error getting location from Redis cache:', error)
        return null
    }
}

/**
 * Caches a location to Upstash Redis
 * @param locationKey - The location string to use as a key
 * @param location - The resolved location data to cache
 * @returns Promise that resolves when caching is complete
 */
export async function setLocation(
    locationKey: string,
    location: ResolvedLocation
): Promise<void> {
    try {
        // Skip if Upstash is not configured
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            return
        }

        const client = getRedisClient()
        const cacheKey = `${LOCATION_KEY_PREFIX}${locationKey}`

        // Cache with a 30-day expiration
        await client.set(cacheKey, location, { ex: 60 * 60 * 24 * 30 })
    } catch (error) {
        console.error('Error setting location in Redis cache:', error)
    }
}

/**
 * Clears all location entries from the Upstash Redis cache
 * @returns Promise that resolves when cache is cleared
 */
export async function clearLocations(): Promise<void> {
    try {
        // Skip if Upstash is not configured
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            return
        }

        const client = getRedisClient()

        // Find all keys with the location prefix
        const keys = await client.keys(`${LOCATION_KEY_PREFIX}*`)

        if (keys.length > 0) {
            // Delete all location keys
            await client.del(...keys)
        }
    } catch (error) {
        console.error('Error clearing locations from Redis cache:', error)
    }
}
