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
import { getCityEventsCache, setCityEventsCache } from './cache'
import { processCityPageWithPagination, scrapeCityNames } from './scraper'
import { convertCityNameToKey } from './utils'

/**
 * Plura Events Source Handler
 * Scrapes events from plura.io and heyplura.com
 */
export class PluraEventsSource extends BaseEventSourceHandler {
    // deDupedCmfEvents uses CmfEvent.id as key, using a Record for faster lookup. Note Record is POJO, and is JSON serializable unlike Map().
    private deDupedCmfEvents: Record<string, CmfEvent> = {}
    private eventIdsToCityMap: Record<string, string[]> = {} // internal cache of CmfEvent.id -> city names
    public cityToEventIdsMap: Record<string, string[]> = {} // internal cache of city name -> CmfEvent.id's
    // if fetchEventDetailstrue, fetch event details from the event page, otherwise just scrape the city page
    private fetchEventDetails: boolean = false
    private totalPages: number = 0
    public readonly type: EventSourceType = {
        prefix: 'plura',
        name: 'Plura Community Events',
    }

    constructor() {
        super()
    }

    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        const cityToScrape = params.id || 'all'
        logr.info('api-es-plura', `fetchEvents(city=${cityToScrape}), fetchEventDetails=${this.fetchEventDetails}`)

        // Use the appropriate scraper function based on cityToScrape
        const events = await (cityToScrape === 'all' ? this.fetchAllEvents() : this.fetchCityEvents(cityToScrape))
        const stats = this.computeStats()
        logr.info('api-es-plura', `fetchEvents Done. Overall (not request) stats: ${JSON.stringify(stats)}`)
        return {
            httpStatus: 200,
            events,
            metadata: {
                id: cityToScrape,
                name: `Plura Events - ${cityToScrape !== 'all' ? cityToScrape : 'Global'}`,
                type: this.type,
                totalCount: events.length,
                unknownLocationsCount: 0, // This will be computed after geocoding
            },
        }
    }

    /**
     * fetches events for all cities with deduplication. this.deDupedCmfEvents is updated in fetchCityEvents
     * @returns Object containing deduplicated events array and updated scraping statistics
     */
    async fetchAllEvents(): Promise<CmfEvent[]> {
        try {
            const cityNames = await scrapeCityNames()
            logr.info('api-es-plura', `fetchAllEvents from ${cityNames.length} cities`)

            for (const cityName of cityNames) {
                await this.fetchCityEvents(cityName)
            }
            logr.info('api-es-plura', `Found ${Object.keys(this.deDupedCmfEvents).length} unique events`)
            return Object.values(this.deDupedCmfEvents)
        } catch (error: unknown) {
            logr.warn(
                'api-es-plura',
                `Error in fetchAllEvents: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return Object.values(this.deDupedCmfEvents)
        }
    }

    /**
     * Scrape events for a specific city.  Updates stats.
     * @param cityName City to fetch events from (may include events outside this city)
     * @returns Array of events
     */
    async fetchCityEvents(cityName: string): Promise<CmfEvent[]> {
        logr.debug('api-es-plura', `fetchCityEvents(${cityName}) starting`)
        try {
            let deDupedEventsCity: Record<string, CmfEvent> = {}
            // Try to get from cache first
            const { events, allEventsFound, numPages } = await getCityEventsCache(cityName)
            if (allEventsFound) {
                if (numPages && numPages > 0) this.totalPages += numPages
                // convert events array to a record for faster lookup and stats
                deDupedEventsCity = events.reduce((acc, event) => {
                    acc[event.id] = event
                    return acc
                }, {} as Record<string, CmfEvent>)
            } else {
                const { deDupedEventsCity, totalPages } = await processCityPageWithPagination(cityName)
                this.totalPages += totalPages
                await setCityEventsCache(cityName, Object.values(deDupedEventsCity), totalPages)
            }
            // Update internal maps and deduplicated events
            for (const eventId of Object.keys(deDupedEventsCity)) {
                if (!this.eventIdsToCityMap[eventId]) {
                    this.eventIdsToCityMap[eventId] = []
                }
                this.eventIdsToCityMap[eventId].push(cityName)
                if (eventId in this.deDupedCmfEvents) {
                    // debug because this is expected
                    logr.debug('api-es-plura', `fetchCityEvents: duplicate ${eventId} in ${cityName}`)
                } else {
                    this.deDupedCmfEvents[eventId] = deDupedEventsCity[eventId]
                }
            }
            this.cityToEventIdsMap[convertCityNameToKey(cityName)] = Object.keys(deDupedEventsCity)

            return Object.values(deDupedEventsCity)
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
        for (const cityEvents of Object.values(this.cityToEventIdsMap)) {
            stats.totalEventsIncludingDuplicates += cityEvents.length
        }
        return stats
    }
}

// Create and register the event source
const pluraEventsSource = new PluraEventsSource()
registerEventSource(pluraEventsSource)

export function knownCitiesAsKeys(cityName: string = ''): string[] {
    const cities = Object.keys(pluraEventsSource.cityToEventIdsMap)
    if (cityName) {
        return cities.filter((city) => city.includes(convertCityNameToKey(cityName)))
    }
    return cities
}
