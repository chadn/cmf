/**
 * Plura Events Source - Main class and exports
 *
 * This module provides the main PluraEventsSource class that interacts with the Plura
 * event platform. It coordinates the scraping process by delegating to specialized modules:
 * - scraper.ts: Contains all HTML scraping and event extraction functionality
 * - cache.ts: Handles caching of events and city lists
 * - utils.ts: Provides utility functions for date parsing, URL normalization, etc.
 * - types.ts: Defines shared interfaces and types
 */

import { CmfEvent, EventSourceParams, EventSourceResponse, EventSourceType } from '@/types/events'
import { BaseEventSourceHandler, registerEventSource } from '../index'
import { logr } from '@/lib/utils/logr'
import { PluraEventScrapeStats } from './types'
import { getCachedEvents, getCityEventsCache, setCachedCityMap, setCachedEvents, setCityEventsCache } from './cache'
import { processCityPageWithPagination, getCityNamesCacheOrWeb } from './scraper'
import { convertCityNameToKey } from './utils'

/**
 * Plura Events Source Handler
 * Scrapes events from plura.io and heyplura.com
 */
export class PluraEventsSource extends BaseEventSourceHandler {
    // deDupedCmfEvents uses CmfEvent.id as key, using a Record for faster lookup. Note Record is POJO, and is JSON serializable unlike Map().
    public deDupedCmfEvents: Record<string, CmfEvent> = {}
    public eventIdsToCityMap: Record<string, string[]> = {} // internal cache of CmfEvent.id -> city names
    public cityToEventIdsMap: Record<string, string[]> = {} // internal cache of city name -> CmfEvent.id's
    public cityPagesCount: Record<string, number> = {} // internal cache of total pages per city
    // if fetchEventDetailstrue, fetch event details from the event page, otherwise just scrape the city page
    private fetchEventDetails: boolean = false
    public totalPages: number = 0
    public readonly type: EventSourceType = {
        prefix: 'plura',
        name: 'Plura Community Events',
    }

    constructor() {
        super()
    }

    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        const cityToScrape = params.id || 'all'
        const returnEvents: Record<string, CmfEvent> = {} //  our key is eventId, val is CMF Event
        const resp: EventSourceResponse = {
            httpStatus: 200,
            events: [],
            metadata: {
                id: cityToScrape,
                name: `Plura Events - ${cityToScrape !== 'all' ? cityToScrape : 'Global'}`,
                type: this.type,
                totalCount: 0,
                unknownLocationsCount: 0,
            },
        }
        logr.info('api-es-plura', `fetchEvents(city=${cityToScrape}), fetchEventDetails=${this.fetchEventDetails}`)

        // Architecture summary
        // When fetching all events initially, there's no cache, we go city by city, page by page.  Each page has 30 events. Lots of duplicates.
        // After initial, cache has eventids at city level, and event details at individual event cache value.
        // Because initial is slow, it may not finish and only cache some data, need to be smart about our approach.
        // The goal of the cache is to enable super fast response once everything is cached.  That means minimizing number of cache lookups.
        // It should also be fast as possible for partial cache.
        //
        try {
            const eventIdsToFetch: Record<string, boolean> = {}
            const cityNames = cityToScrape === 'all' ? await getCityNamesCacheOrWeb() : [cityToScrape]
            const retEventIds = await this.getEventIdsFromCities(cityNames)
            logr.info('api-es-plura', `fetchEvents: got ${retEventIds.length} event IDs from cities`)

            // Now we just fetch events from cache that we don't have in this.deDupedCmfEvents, which will
            // be the ones that were in city cache, not part of fetchCityEvents, which adds to deDupedCmfEvents.
            for (const eventId of retEventIds) {
                if (!(eventId in this.deDupedCmfEvents)) {
                    eventIdsToFetch[eventId] = true
                }
            }
            logr.info(
                'api-es-plura',
                `fetchEvents: need to fetch ${Object.keys(eventIdsToFetch).length} events from cache`
            )

            // Now for any event we need but is not in this.deDupedCmfEvents, go get it.
            const cachedEvents = await getCachedEvents(Object.keys(eventIdsToFetch))
            logr.info('api-es-plura', `fetchEvents: got ${cachedEvents?.length || 0} events from cache`)

            for (const eventId of retEventIds) {
                const cachedEvent = cachedEvents?.find((e) => e?.id === eventId)
                if (cachedEvent) {
                    returnEvents[eventId] = cachedEvent
                    this.deDupedCmfEvents[eventId] = cachedEvent
                    logr.debug('api-es-plura', `fetchEvents: found event ${eventId} in cache`)
                } else if (eventId in this.deDupedCmfEvents) {
                    returnEvents[eventId] = this.deDupedCmfEvents[eventId]
                    logr.debug('api-es-plura', `fetchEvents: found event ${eventId} in deDupedCmfEvents`)
                } else {
                    const eventCities = this.eventIdsToCityMap[eventId] || []
                    logr.warn(
                        'api-es-plura',
                        `BUG. not found in deDupedCmfEvents or cache, ${eventCities.length} cities: ${eventId} ${eventCities}`
                    )
                }
            }
            await setCachedCityMap(this.eventIdsToCityMap)
            resp.metadata.totalCount = Object.keys(returnEvents).length
        } catch (error) {
            const err = error as { response?: { status?: number; statusText?: string } }
            logr.error('api-es-plura', `Error in fetchEvents: ${error instanceof Error ? error.message : err}`, error)
            throw new Error(`HTTP ${err.response?.status || 500}: ${err.response?.statusText || 'Unknown error'}`)
        }

        const stats = this.computeStats()
        logr.info('api-es-plura', `fetchEvents Done. Overall (not request) stats: ${JSON.stringify(stats)}`)

        if (Object.keys(returnEvents).length === 0) {
            throw new Error(`HTTP 503: No events found`)
        }
        resp.events = Object.values(returnEvents)
        return resp
    }

    async getEventIdsFromCities(cityNames: string[]): Promise<string[]> {
        const retEventIds: string[] = []
        const citiesNotCached: string[] = []
        const deDupedCmfEvents: Record<string, CmfEvent> = {}

        const cityCache = await getCityEventsCache(cityNames)
        if (!cityCache) {
            logr.info('api-es-plura', `getEventIdsFromCities: cache not found for any cities`)
            citiesNotCached.push(...cityNames)
        } else {
            for (let i = 0; i < cityCache.length; i++) {
                if (cityCache[i] && 'eventIds' in cityCache[i]) {
                    const cityEventIds = cityCache[i].eventIds
                    retEventIds.push(...cityEventIds)
                    logr.info(
                        'api-es-plura',
                        `getEventIdsFromCities: found ${cityEventIds.length} cached events for ${cityNames[i]}`
                    )
                } else {
                    logr.info('api-es-plura', `getEventIdsFromCities: cache not found for ${cityNames[i]}`)
                    citiesNotCached.push(cityNames[i])
                }
            }
        }
        logr.info(
            'api-es-plura',
            `getEventIdsFromCities: fetching ${citiesNotCached.length} cities using fetchCityEvents`
        )
        // hack to make sure oakland is last so events without location wll be oakland
        // TODO: remove once we figure out events without location
        if (citiesNotCached.includes('Oakland, CA')) {
            citiesNotCached.push(citiesNotCached.splice(citiesNotCached.indexOf('Oakland, CA'), 1)[0])
        }
        for (const cityName of citiesNotCached) {
            const cityCmfEvents = await this.fetchCityEvents(cityName)
            for (const event of cityCmfEvents) {
                deDupedCmfEvents[event.id] = event
            }
            const cityEventIds = cityCmfEvents.map((event) => event.id)
            retEventIds.push(...cityEventIds)
            logr.info('api-es-plura', `getEventIdsFromCities: fetched ${cityEventIds.length} events for ${cityName}`)
        }
        await setCachedEvents(Object.values(deDupedCmfEvents))

        const uniqueSortedEventIds = [...new Set(retEventIds)].sort()
        logr.info(
            'api-es-plura',
            `getEventIdsFromCities: have ${uniqueSortedEventIds.length} unique of ${retEventIds.length} eventIds`
        )

        return uniqueSortedEventIds
    }

    /**
     * Scrape events for a specific city from the web (no get cache). Set to cache, update deDupedCmfEvents and stats.
     * @param cityName City to fetch events from (may include events outside this city)
     * updates this.deDupedCmfEvents, this.cityPagesCount, this.eventIdsToCityMap, this.cityToEventIdsMap
     * @returns Array of events
     */
    async fetchCityEvents(cityName: string): Promise<CmfEvent[]> {
        logr.debug('api-es-plura', `fetchCityEvents(${cityName}) starting`)
        const origNumEvents = Object.keys(this.deDupedCmfEvents).length
        try {
            const fetched = await processCityPageWithPagination(cityName)
            // for each event in fetched.deDupedEventsCity, add to this.deDupedCmfEvents
            for (const eventId of Object.keys(fetched.deDupedEventsCity)) {
                this.deDupedCmfEvents[eventId] = fetched.deDupedEventsCity[eventId] // write over existing if any
            }
            const numNewEvents = Object.keys(this.deDupedCmfEvents).length - origNumEvents
            logr.info(
                'api-es-plura',
                `fetchCityEvents(${cityName}) found ${
                    Object.keys(fetched.deDupedEventsCity).length
                } events, ${numNewEvents} new, over ${fetched.totalPages} pages`
            )

            // NOTE we are just caching eventIds, not events, in setCityEventsCache
            await setCityEventsCache(cityName, Object.keys(fetched.deDupedEventsCity), fetched.totalPages)

            // Update internal stats
            this.cityPagesCount[cityName] = fetched.totalPages
            this.cityToEventIdsMap[convertCityNameToKey(cityName)] = Object.keys(fetched.deDupedEventsCity)
            for (const eventId of Object.keys(fetched.deDupedEventsCity)) {
                ;(this.eventIdsToCityMap[eventId] ??= []).push(cityName)
                const numCities = this.eventIdsToCityMap[eventId]?.length
                logr.info('api-es-plura', `fetchCityEvents(${cityName}) now in ${numCities} cities: ${eventId}`)
            }
            return Object.values(fetched.deDupedEventsCity)
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error in fetchCityEvents: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            throw error
        }
    }

    computeStats() {
        const stats: PluraEventScrapeStats = {
            totalCities: Object.keys(this.cityToEventIdsMap).length,
            totalUniqueEvents: Object.keys(this.deDupedCmfEvents).length,
            totalEventsIncludingDuplicates: 0,
            totalPages: this.totalPages,
        }
        for (const cityName of Object.keys(this.cityPagesCount)) {
            stats.totalPages += this.cityPagesCount[cityName]
        }
        for (const cityEvents of Object.values(this.cityToEventIdsMap)) {
            stats.totalEventsIncludingDuplicates += cityEvents.length
        }
        return stats
    }
}

// Create and register the event source
const pluraEventsSource = new PluraEventsSource()
registerEventSource(pluraEventsSource)

export { pluraEventsSource }

export function knownCitiesAsKeys(cityName: string = ''): string[] {
    const cityKeys = Object.keys(pluraEventsSource.cityToEventIdsMap)
    if (cityName) {
        return cityKeys.filter((cityKey) => cityKey.includes(convertCityNameToKey(cityName)))
    }
    return cityKeys
}
