import { Redis } from '@upstash/redis'
import { logr } from '@/lib/utils/logr'

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
 * Generic function to get a value from Redis
 * @param key - The key to retrieve
 * @param prefix - Optional prefix to prepend to the key
 * @returns Promise with the cached value or null if not found
 */
export async function redisGet<T>(key: string, prefix: string = ''): Promise<T | null> {
    try {
        // Skip if Upstash is not configured
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            return null
        }

        if (!key) {
            return null
        }

        const client = getRedisClient()
        const cacheKey = prefix ? `${prefix}${key}` : key
        const cachedData = await client.get(cacheKey)

        return (cachedData as T) || null
    } catch (error) {
        logr.warn('cache', 'redisGet error', error)
        return null
    }
}

/**
 * Generic function to get multiple values from Redis
 * @param keys - The keys to retrieve
 * @param prefix - Optional prefix to prepend to the key
 * @returns Promise with the cached value or null if not found
 */
export async function redisMGet<T>(keys: string[], prefix: string = ''): Promise<T[] | null> {
    try {
        // Skip if Upstash is not configured
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            return null
        }

        if (!keys.length) {
            return null
        }

        const client = getRedisClient()
        const cacheKeys = keys.map((key) => (prefix ? `${prefix}${key}` : key))
        const cachedData = await client.mget(cacheKeys)

        return (cachedData as T[]) || null
    } catch (error) {
        logr.warn('cache', 'redisMGet error', error)
        return null
    }
}

/**
 * Generic function to set a value in Redis
 * @param key - The key to store
 * @param value - The value to store
 * @param prefix - Optional prefix to prepend to the key
 * @param ttl - Optional time-to-live in seconds (default: 30 days)
 * @returns Promise that resolves when the operation is complete
 */
export async function redisSet<T>(
    key: string,
    value: T,
    prefix: string = '',
    ttl: number = 60 * 60 * 24 * 30
): Promise<void> {
    try {
        // Skip if Upstash is not configured
        if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
            return
        }

        if (!key || value === undefined) {
            return
        }

        const client = getRedisClient()

        // TODO: update to support client.mset(cacheKeys, values)
        // Cache with the specified expiration time
        await client.set(`${prefix}${key}`, value, { ex: ttl })
    } catch (error) {
        logr.warn('cache', 'redisSet error', error)
    }
}
