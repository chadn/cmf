/**
 * Plura Events Source - Cache Module
 *
 * This module handles all caching operations for Plura events:
 * - Caching city lists
 * - Caching events for specific cities
 * - Retrieving cached events
 *
 * The cache uses a two-level approach:
 * 1. City-level cache: Stores a list of event IDs for each city
 * 2. Event-level cache: Stores individual event details
 *
 * This approach allows for efficient retrieval of events by city while
 * avoiding duplicate storage of event data.
 */

import { CmfEvent } from '@/types/events'
import { getCache, setCache } from '@/lib/cache'
import { logr } from '@/lib/utils/logr'
import { PluraCitiesListCache, PluraCityEventsCache } from './types'
import { convertCityNameToKey } from './utils'
import { getSizeOfAny } from '@/lib/utils/utils-shared'

// Cache configuration
export const PLURA_CITY_LIST_CACHE_KEY = 'plura:other:citylist'
export const PLURA_EVENT_IDS_TO_CITY_MAP_CACHE_KEY = 'plura:other:citymap'
export const PLURA_CITY_CACHE_PREFIX = 'plura:city:'
export const PLURA_EVENT_CACHE_PREFIX = 'plura:event:'
export const CACHE_TTL_PLURA_SCRAPE = process.env.CACHE_TTL_PLURA_SCRAPE
    ? parseInt(process.env.CACHE_TTL_PLURA_SCRAPE)
    : 60 * 60 * 24 // 24 hours, 86400 seconds

// https://upstash.com/docs/redis/troubleshooting/max_request_size_exceeded
const UPSTASH_SIZE_LIMIT = 1024 * 1024 // 1MB in bytes for free plan

/**
 * Get city list from cache
 * @returns Record of city names or null if not found
 */
export async function getCityListCache(): Promise<Record<string, string> | null> {
    try {
        const cachedCityList = await getCache<PluraCitiesListCache>(PLURA_CITY_LIST_CACHE_KEY)

        if (cachedCityList && Object.keys(cachedCityList.cityNames).length) {
            logr.info(
                'api-es-plura',
                `getCityListCache returning ${Object.keys(cachedCityList.cityNames).length} cities`
            )
            return cachedCityList.cityNames
        }
        return null
    } catch (error) {
        logr.warn(
            'api-es-plura',
            `Error getting city list from cache: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return null
    }
}

/**
 * Cache city list
 * @param cityNames Array of city Names to cache
 */
export async function setCityListCache(cityNames: Record<string, string>): Promise<void> {
    try {
        if (!Object.keys(cityNames).length) return

        await setCache(
            PLURA_CITY_LIST_CACHE_KEY,
            { cityNames, timestamp: Date.now() } as PluraCitiesListCache,
            '', // no prefix
            CACHE_TTL_PLURA_SCRAPE
        )

        logr.info('api-es-plura', `setCityListCache ${Object.keys(cityNames).length} cityNames`)
    } catch (error) {
        logr.warn(
            'api-es-plura',
            `Error caching city list: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
    }
}

/**
 * Cache events for a specific city, intelligently splitting into city and event caches, avoiding duplicates.
 */
export async function setCityEventsCache(cityName: string, eventIds: string[], numPages: number): Promise<void> {
    try {
        if (!eventIds || eventIds.length === 0) return

        // Cache the list of event IDs for this city
        const cityCache: PluraCityEventsCache = {
            timestamp: Date.now(),
            numPages,
            eventIds,
        }
        await setCache(convertCityNameToKey(cityName), cityCache, PLURA_CITY_CACHE_PREFIX, CACHE_TTL_PLURA_SCRAPE)
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error caching events for city ${cityName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
    }
}

/**
 * Get city events cache
 * @param cityNames Array of city names
 * @returns Array of city events cache or null if not found
 */
export async function getCityEventsCache(cityNames: string[]): Promise<PluraCityEventsCache[] | null> {
    try {
        const cityKeys = cityNames.map((cityName) => convertCityNameToKey(cityName))
        const cityCache = await getCache<PluraCityEventsCache>(cityKeys, PLURA_CITY_CACHE_PREFIX)
        logr.info(
            'api-es-plura',
            `getCityEventsCache(${cityNames.length}...${cityNames[0]}) returning ${cityCache.length}`
        )
        return cityCache
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error getting event ids from cache for cities ${cityNames.join(', ')}: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`
        )
        return null
    }
}

/**
 * Fetch a single event from cache or return null
 * @param eventId Event ID to fetch
 * @returns CmfEvent or null if not found
 */
export async function getCachedEvent(eventId: string): Promise<CmfEvent | null> {
    try {
        return await getCache<CmfEvent>(eventId, PLURA_EVENT_CACHE_PREFIX)
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error getting event from cache ${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return null
    }
}

/**
 * Fetch multiple events  from cache or return null
 * @param eventIds Event IDs  to fetch
 * @returns CmfEvents or null if not found / error
 */
export async function getCachedEvents(eventIds: string[]): Promise<CmfEvent[] | null> {
    try {
        // If request size is under limit, fetch all at once
        const requestKeys = eventIds.map((id) => `${PLURA_EVENT_CACHE_PREFIX}${id}`)
        const totalSize = getSizeOfAny(requestKeys, 'bytes') as number
        if (totalSize < UPSTASH_SIZE_LIMIT * 0.9) {
            return await getCache<CmfEvent>(eventIds, PLURA_EVENT_CACHE_PREFIX)
        }

        // Calculate number of batches needed based on size
        const numBatches = Math.ceil(totalSize / UPSTASH_SIZE_LIMIT)
        const batchSize = Math.floor(eventIds.length / numBatches)

        // Split into batches and fetch in parallel
        const batches = []
        for (let i = 0; i < eventIds.length; i += batchSize) {
            batches.push(eventIds.slice(i, i + batchSize))
        }
        logr.info(
            'api-es-plura',
            `getCachedEvents: split ${eventIds.length} into ${numBatches} batches of ${batchSize} events`
        )

        const fromCache = await Promise.all(batches.map((batch) => getCache<CmfEvent>(batch, PLURA_EVENT_CACHE_PREFIX)))
        const results = fromCache.flat().filter(Boolean)
        logr.info('api-es-plura', `getCachedEvents(${eventIds.length}): found ${results.length} events in cache`)
        return results
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error getting values for ${eventIds.length} events from cache: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`
        )
        return null
    }
}

/**
 * Cache multiple events
 * @param events Array of events to cache
 */
export async function setCachedEvents(events: CmfEvent[]): Promise<void> {
    try {
        if (!events || events.length === 0) return

        // Calculate total size of events
        const totalSize = getSizeOfAny(events, 'bytes') as number
        const logSize = `cached ${events.length} events (${totalSize} bytes)`
        if (totalSize < UPSTASH_SIZE_LIMIT * 0.9) {
            // If under size limit, cache all at once
            await setCache(
                events.map((e) => e.id),
                events,
                PLURA_EVENT_CACHE_PREFIX,
                CACHE_TTL_PLURA_SCRAPE
            )
            logr.info('api-es-plura', `setCachedEvents: ${logSize} in single batch`)
            return
        }

        // Split into batches based on size
        const numBatches = Math.ceil(totalSize / UPSTASH_SIZE_LIMIT)
        const batchSize = Math.floor(events.length / numBatches)

        // Cache in batches
        for (let i = 0; i < events.length; i += batchSize) {
            const batch = events.slice(i, i + batchSize)
            await setCache(
                batch.map((e) => e.id),
                batch,
                PLURA_EVENT_CACHE_PREFIX,
                CACHE_TTL_PLURA_SCRAPE
            )
        }
        logr.info('api-es-plura', `setCachedEvents: ${logSize} in ${numBatches} batches`)
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error caching ${events.length} events: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
    }
}

/**
 * Cache the event IDs to city map
 * @param eventIdsToCityMap Event IDs to city map
 */
export async function setCachedCityMap(eventIdsToCityMap: Record<string, string[]>): Promise<void> {
    await setCache(PLURA_EVENT_IDS_TO_CITY_MAP_CACHE_KEY, eventIdsToCityMap, '', CACHE_TTL_PLURA_SCRAPE)
}
