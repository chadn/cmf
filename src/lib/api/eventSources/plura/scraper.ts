/**
 * Plura Events Source - Scraper Module
 *
 * This module handles all HTML scraping and event extraction for the Plura event source:
 * - Scraping city lists from the main page
 * - Processing city pages to extract events
 * - Extracting event details from event pages
 * - Creating event objects from HTML elements
 *
 * The scraper uses a two-pass approach:
 * 1. First, collect all event URLs from city pages
 * 2. Then, extract event details from each URL
 */

import * as cheerio from 'cheerio'
import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { axiosGet } from '@/lib/utils/utils-server'
import { PluraDomain } from './types'
import { convertCityNameToUrl, convertCityNameToKey, parsePluraDateString, improveLocation } from './utils'
import { getCachedEvent, getCityListCache, setCityListCache } from './cache'

/**
 * If not cached, Scrape the city list page to get all city names, the cache it.
 * If cached, return the cached city names.
 * @returns Array of original city names
 */
export async function getCityNamesCacheOrWeb(): Promise<string[]> {
    try {
        // Check for cached city list
        const cachedCityNames = await getCityListCache()
        if (cachedCityNames) return Object.values(cachedCityNames)

        // Not in cache, fetch the city list
        const cityNamesRecord: Record<string, string> = {}
        const response = await axiosGet(`${PluraDomain}/events/city`)
        const $ = cheerio.load(response.data)

        // Find all city links
        $('li > a').each((_, el) => {
            const cityName = $(el).text().trim()
            if ($(el).attr('href')?.includes('/events/city/')) {
                logr.info('api-es-plura', `Found city: ${cityName}`)
                cityNamesRecord[convertCityNameToKey(cityName)] = cityName
            } else {
                logr.info('api-es-plura', `Found non-city link ${cityName}, maybe html structure changed?`)
            }
        })
        if (Object.keys(cityNamesRecord).length > 0) {
            logr.info('api-es-plura', `Found ${Object.keys(cityNamesRecord).length} cities`)
            await setCityListCache(cityNamesRecord)
        } else {
            logr.warn('api-es-plura', `No city links found from ${PluraDomain}, maybe html structure changed?`)
        }
        return Object.values(cityNamesRecord)
    } catch (error: unknown) {
        logr.error(
            'api-es-plura',
            `Error scraping city lists: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return []
    }
}

/**
 * Process a city page to extract events
 * @param cityName Name of the city
 * @param cityUrl Optional URL of the city page, if provided, it will be used instead of converting the city name to a URL
 * @param attempt Current attempt number, used to prevent infinite loops
 * @returns Record with CmfEvent.id as key and CmfEvent as value
 */
export async function processCityPageWithPagination(
    cityName: string,
    cityUrlParam: string = '',
    attempt: number = 1
): Promise<{
    deDupedEventsCity: Record<string, CmfEvent>
    totalPages: number
}> {
    let cityUrl = cityUrlParam ? cityUrlParam : convertCityNameToUrl(cityName)
    const deDupedEventsCity: Record<string, CmfEvent> = {}
    try {
        logr.info('api-es-plura', `Processing city page: ${cityName} ${cityUrl}`)
        let currentUrl = cityUrl

        // Process all pages for this city
        do {
            const { nextPageUrl, deDupedCmfEventsPage } = await processSingleCityPage(currentUrl, cityName)
            for (const event of Object.values(deDupedCmfEventsPage)) {
                if (event.id in deDupedEventsCity) {
                    // warn because it is unexpected to have a duplicate in the same page, but just may be bad plura programming
                    logr.warn('api-es-plura', `processCityPageWithPagination: duplicate ${event.id} in ${cityName}`)
                } else {
                    deDupedEventsCity[event.id] = event
                }
            }
            if (nextPageUrl) {
                currentUrl = nextPageUrl
            } else {
                break
            }
        } while (currentUrl)

        // currentUrl = https://plura.io/events/city/Oakland_CA?page=14
        const url = new URL(currentUrl)
        const totalPages = Number(url.searchParams.get('page')) || 1

        logr.info(
            'api-es-plura',
            `processCityPageWithPagination(${cityName}) ${
                Object.keys(deDupedEventsCity).length
            } events found in ${totalPages} pages ${cityUrl}`
        )
        if (Object.keys(deDupedEventsCity).length === 0 && attempt <= 1) {
            // Only try the second URL format once
            if (convertCityNameToUrl(cityName) === cityUrl) {
                cityUrl = convertCityNameToUrl(cityName, '', 2)
                logr.info('api-es-plura', `processCityPageWithPagination(${cityName}) trying different URL ${cityUrl}`)
                return processCityPageWithPagination(cityName, cityUrl, attempt + 1)
            } else {
                logr.info('api-es-plura', `processCityPageWithPagination(${cityName}) already tried URL ${cityUrl}`)
            }
        }
        return { deDupedEventsCity, totalPages }
    } catch (error: unknown) {
        logr.error(
            'api-es-plura',
            `processCityPageWithPagination(${cityName}): ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return { deDupedEventsCity: {}, totalPages: 0 }
    }
}

/**
 * Process a single city page and extract events
 * @param pageUrl URL of the page to process, may be page=2 of city page
 * @param cityName Name of the city
 * @returns object with url of the next page and events
 */
export async function processSingleCityPage(
    pageUrl: string,
    cityName: string
): Promise<{ nextPageUrl: string; deDupedCmfEventsPage: Record<string, CmfEvent> }> {
    try {
        const response = await axiosGet(pageUrl)
        const $ = cheerio.load(response.data)
        const deDupedCmfEventsPage: Record<string, CmfEvent> = {}
        logr.info('api-es-plura', `processSingleCityPage(${cityName}): ${pageUrl}`)

        // Process each section that might contain an event, add to deDupedCmfEvents
        $('section').each((_, section) => {
            const eventLink = $(section).find('a[href*="/events/"]').first().attr('href')
            if (!eventLink) {
                logr.warn('api-es-plura', `processSingleCityPage error: no eventLink found in section ${pageUrl}`)
                return
            }
            //logr.info('api-es-plura', `processSingleCityPage found eventLink in section ${eventLink}`)

            // Process event
            const eventUrl = eventLink.startsWith('http') ? eventLink : `${PluraDomain}${eventLink}`
            const event = createEventFromCard($(section), eventUrl, cityName)
            if (!event) {
                // warn because this is unexpected, probably html structure changed
                logr.warn('api-es-plura', `processSingleCityPage: no event created from section with ${eventLink}`)
            } else if (event.id in deDupedCmfEventsPage) {
                // warn because this is unexpected, but just may be bad plura programming
                logr.warn('api-es-plura', `processSingleCityPage: duplicate event ${event.id} in ${pageUrl}`)
            } else {
                deDupedCmfEventsPage[event.id] = event
            }
        })
        // Now find next page url from this html
        const span = $('a > button > span').filter((_, el) => {
            return $(el).text().trim() === 'Next Page'
        })
        let nextPageUrl = ''
        if (span.length > 0) {
            const anchor = span.closest('a')
            nextPageUrl = anchor.attr('href') || ''
            nextPageUrl = nextPageUrl.startsWith('/') ? `${PluraDomain}${nextPageUrl}` : nextPageUrl
        }
        logr.info(
            'api-es-plura',
            `processSingleCityPage() ${Object.keys(deDupedCmfEventsPage).length} events, nextPage=${nextPageUrl}`
        )
        return { nextPageUrl, deDupedCmfEventsPage }
    } catch (error) {
        logr.error(
            'api-es-plura',
            `Error processing page ${pageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return { nextPageUrl: '', deDupedCmfEventsPage: {} }
    }
}

/**
 * Create an event from a card element from the city page
 * @param $section Cheerio element for the card
 * @param eventUrl URL of the event
 * @param cityName Name of the city
 * @returns CmfEvent or null
 */
export function createEventFromCard($section: cheerio.Cheerio, eventUrl: string, cityName: string): CmfEvent | null {
    try {
        // Extract event ID from URL
        const eventId = eventUrl.split('/').pop() || ''
        if (!eventId) return null

        /* Event pages have times with timezone.
         * Ex: 5:30 PM - 8:30 PM BST https://heyplura.com/events/tantra-speed-dater-cambridge-debut-meet-sing
         *
         * City pages serves HTML with times in UTC, then browser changes time to local time.
         * Ex: Saturday, Jun 14th at 4:30pm https://heyplura.com/events/city/Cambridge_England_GB
         */
        const title = $section.find('h3, h2').first().text().trim()
        const locationText = $section.find('li[title="Address"] span').text().trim() || ''
        const dateText = $section.find('li[title="Date"] span').first().text().trim()
        const note = `End Time is Estimated, Start Date UTC: ${dateText}`
        const { startDate, endDate } = parsePluraDateString(dateText + ' UTC')
        if (!startDate || !endDate) {
            logr.warn('api-es-plura', `createEventFromCard: no date found in ${cityName} for ${eventUrl}`)
        }
        return {
            id: eventId,
            name: title || '',
            description: '',
            description_urls: [],
            start: startDate?.toISOString() || '',
            end: endDate?.toISOString() || '',
            tz: 'UTC',
            original_event_url: eventUrl,
            location: improveLocation(locationText, cityName),
            note: note,
        }
    } catch (error: unknown) {
        logr.error(
            'api-es-plura',
            `Error creating event from card: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return null
    }
}

/**
 * Fetch a single event from its URL
 * @param eventId Event ID to fetch
 * @returns CmfEvent or null
 */
export async function fetchSingleEvent(eventId: string): Promise<CmfEvent | null> {
    try {
        // Check cache first
        const cachedEvent = await getCachedEvent(eventId)
        if (cachedEvent) return cachedEvent

        // Not in cache, fetch from URL
        const eventUrl = `${PluraDomain}/events/${eventId}`

        const response = await axiosGet(eventUrl)
        const $ = cheerio.load(response.data)

        // Extract event details
        const title = $('h1').first().text().trim()
        const description = $('section p').first().text().trim()

        // TODO: fix this - Extract city name - this is wrong,
        const cityName = $('h1').first().text().trim().split(' - ').slice(0, -1).join(' - ')

        // Extract date with timezone
        const dateText = $('li[title="Date"] span').first().text().trim()
        const { startDate, endDate } = parsePluraDateString(dateText)
        if (!startDate || !endDate) return null

        // Extract location
        let locationText = ''
        const paragraphs = $('p')
        for (let i = 0; i < paragraphs.length; i++) {
            const text = paragraphs.eq(i).text().trim()
            if (text.includes('Address:') || text.includes('Location:')) {
                locationText = text
                break
            }
        }

        // Create event object
        return {
            id: eventId,
            name: title,
            description,
            description_urls: [],
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            original_event_url: eventUrl,
            location: improveLocation(locationText, cityName),
        }
    } catch (error: unknown) {
        logr.error(
            'api-es-plura',
            `Error fetching single event ${eventId}: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
        return null
    }
}
