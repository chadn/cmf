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

// Cache configuration
export const PLURA_CITY_LIST_CACHE_KEY = 'plura:citylist'
export const PLURA_CITY_CACHE_PREFIX = 'plura:city:'
export const PLURA_EVENT_CACHE_PREFIX = 'plura:event:'
export const CACHE_TTL_PLURA_SCRAPE = process.env.CACHE_TTL_PLURA_SCRAPE
    ? parseInt(process.env.CACHE_TTL_PLURA_SCRAPE)
    : 60 * 60 * 24 // 24 hours, 86400 seconds

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
 * @param cityName Name of the city
 * @param events Array of events to cache
 */
export async function setCityEventsCache(cityName: string, events: CmfEvent[], numPages: number): Promise<void> {
    try {
        if (!events || events.length === 0) return

        // Cache the list of event IDs for this city
        const eventIds = events.map((event) => event.id)
        const cityCache: PluraCityEventsCache = {
            timestamp: Date.now(),
            numPages,
            eventIds,
        }
        await setCache(convertCityNameToKey(cityName), cityCache, PLURA_CITY_CACHE_PREFIX, CACHE_TTL_PLURA_SCRAPE)

        // Make sure each individual event is cached, only cache if not already cached
        let idsToCache: string[] = []
        const cached = await getCache<CmfEvent>(eventIds, PLURA_EVENT_CACHE_PREFIX)
        if (!cached) {
            // If nothing was cached, we need to cache all event IDs
            idsToCache = eventIds
        } else {
            // Find which event IDs are not in the cached results
            const cachedIds = cached.map((event) => event.id)
            idsToCache = eventIds.filter((id) => !cachedIds.includes(id))
        }
        for (const event of events) {
            if (idsToCache.includes(event.id)) {
                await setCache(event.id, event, PLURA_EVENT_CACHE_PREFIX, CACHE_TTL_PLURA_SCRAPE)
            }
        }
        logr.info('api-es-plura', `${idsToCache.length} of ${events.length} events needed to be cached for ${cityName}`)
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error caching events for city ${cityName}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
    }
}

/**
 * Get events from cache for a specific city
 * @param cityName Name of the city
 * @returns Object with events array and flag indicating if all events were found
 */
export async function getCityEventsCache(
    cityName: string
): Promise<{ events: CmfEvent[]; numPages: number; allEventsFound: boolean }> {
    try {
        // Get the list of event IDs for this city
        const cityCache = await getCache<PluraCityEventsCache>(convertCityNameToKey(cityName), PLURA_CITY_CACHE_PREFIX)

        if (!cityCache || !Array.isArray(cityCache.eventIds) || cityCache.eventIds.length === 0) {
            return { events: [], numPages: 0, allEventsFound: false }
        }

        const eventResults = await getCache<CmfEvent>(cityCache.eventIds, PLURA_EVENT_CACHE_PREFIX)
        if (!eventResults || eventResults.length !== cityCache.eventIds.length) {
            return { events: [], numPages: 0, allEventsFound: false }
        }

        logr.info(
            'api-es-plura',
            `Found all ${eventResults.length} cached events for ${cityCache.numPages} pages ${cityName}`
        )
        return { events: eventResults, numPages: cityCache.numPages, allEventsFound: true }
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error getting events from cache for city ${cityName}: ${
                error instanceof Error ? error.message : 'Unknown error'
            }`
        )
        return { events: [], numPages: 0, allEventsFound: false }
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
