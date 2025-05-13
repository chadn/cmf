import axios, { AxiosResponse } from 'axios'
import * as cheerio from 'cheerio'
import { EventSourceParams, EventSourceResponse, EventSourceType, CmfEvent } from '@/types/events'
import { BaseEventSourceHandler, registerEventSource } from './index'
import { logr } from '@/lib/utils/logr'

// Two-pass scraping: first collect all event URLs, then scrape event details

const axiosGet = {
    headers: {
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    },
}

interface PluraEventScrapeStats {
    totalCities: number
    totalEvents: number
    newEvents: number
    duplicateEvents: number
    unknownLocationsCount: number
}

interface CityPageResult {
    eventLinks: string[]
    events: CmfEvent[]
}

export class PluraEventsSource extends BaseEventSourceHandler {
    private fetchEventDetails: boolean = false // if true, fetch event details from the event page, otherwise just scrape the city page
    private processedUrls: Set<string> = new Set() // Track processed URLs to avoid duplicates
    private cityEventPages: Map<string, string[]> = new Map() // city name -> event URLs
    private scrapeStats: PluraEventScrapeStats = {
        totalCities: 0,
        totalEvents: 0,
        newEvents: 0,
        duplicateEvents: 0,
        unknownLocationsCount: 0,
    }

    public readonly type: EventSourceType = {
        prefix: 'plura',
        name: 'Plura Community Events',
    }

    constructor() {
        super()
    }

    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        const cityToScrape = params.id || 'all'
        // Reset processed URLs for each new fetch
        this.processedUrls.clear()

        try {
            logr.info('api-es-plura', `Scrape plura, city=${cityToScrape}, fetchEventDetails=${this.fetchEventDetails}`)
            const events: CmfEvent[] = await this.scrapeCityEvents(cityToScrape)
            logr.info('api-es-plura', `Completed scraping, found ${events.length} events`)

            logr.info('api-es-plura', 'Scrape Statistics', this.scrapeStats)

            return {
                events,
                metadata: {
                    id: cityToScrape,
                    name: `Plura Events - ${cityToScrape !== 'all' ? `${cityToScrape}` : 'Global'}`,
                    type: this.type,
                    totalCount: events.length,
                    unknownLocationsCount: this.scrapeStats.unknownLocationsCount,
                },
                httpStatus: 200,
            }
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error scraping Plura events: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return {
                events: [],
                metadata: {
                    id: cityToScrape,
                    type: this.type,
                    name: `Plura Events - ${cityToScrape !== 'all' ? `${cityToScrape}` : 'Global'}`,
                    totalCount: 0,
                    unknownLocationsCount: 0,
                },
                httpStatus: 500,
            }
        }
    }

    /**
     * Scrape events for a specific city or all cities
     * @param cityFilter City to filter by, or 'all' for all cities
     * @returns Array of CmfEvent objects
     */
    private async scrapeCityEvents(cityFilter: string): Promise<CmfEvent[]> {
        const events: CmfEvent[] = []

        try {
            // Try direct city URL if given a specific city
            if (cityFilter !== 'all' && cityFilter.includes(',')) {
                // Convert "Oakland,CA" to "Oakland_CA" format
                const cityUrlFormat = cityFilter.replace(/,\s*/g, '_').replace(/\s+/g, '%20')

                // Try both domains
                const urls = [
                    `https://heyplura.com/events/city/${cityUrlFormat}`,
                    `https://plra.io/events/city/${cityUrlFormat}`,
                ]

                for (const url of urls) {
                    try {
                        const cityEvents = await this.processCityPage(url, cityFilter)

                        if (cityEvents.events.length > 0) {
                            logr.info('api-es-plura', `Found ${cityEvents.events.length} events via direct url ${url}`)
                            events.push(...cityEvents.events)
                            return events
                        }
                    } catch {
                        // Continue to next URL on error
                    }
                }
            }

            // If direct URL failed or we need all cities, use city list
            const cityLinks = await this.scrapeCityLists()
            this.scrapeStats.totalCities = cityLinks.length

            for (const cityUrl of cityLinks) {
                const cityName = this.extractCityNameFromUrl(cityUrl)

                // Filter cities if we have a city filter
                if (cityFilter !== 'all') {
                    const filterCity = cityFilter.split(',')[0].trim().toLowerCase()
                    if (!cityName.toLowerCase().includes(filterCity)) {
                        continue
                    }
                }

                // Process the city page
                const cityEvents = await this.processCityPage(cityUrl, cityName)
                logr.info('api-es-plura', `Found ${cityEvents.events.length} events via city list ${cityUrl}`)
                events.push(...cityEvents.events)
            }

            return events
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error in scrapeCityEvents: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            throw error
        }
    }

    /**
     * Scrape the city list page to get all city URLs
     * @returns Array of city URLs
     */
    private async scrapeCityLists(): Promise<string[]> {
        try {
            logr.info('api-es-plura', 'Fetching city list from https://heyplura.com/events/city')
            const cityListResponse: AxiosResponse = await axios.get('https://heyplura.com/events/city', axiosGet)

            const $ = cheerio.load(cityListResponse.data)
            logr.info('api-es-plura', 'Loaded city list page with cheerio')

            // Find all links that point to city pages
            const cityLinks = $('a')
                .map((_, el) => {
                    const href = $(el).attr('href')
                    if (href && href.startsWith('/events/city/')) {
                        return `https://heyplura.com${href}`
                    }
                    return null
                })
                .get()
                .filter(Boolean)
                .filter((url, index, self) => self.indexOf(url) === index) // Remove duplicates

            // If we didn't find any city links, log HTML structure for debugging
            if (cityLinks.length === 0) {
                logr.warn('api-es-plura', 'No city links found, analyzing HTML structure')
                this.logPageStructure($, 'city list')
            }

            return cityLinks
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error fetching city list: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return []
        }
    }

    /**
     * @param cityUrl URL of the city page
     * @returns boolean if the city url has already been processed
     */
    private checkProcessedUrls(cityUrl: string): boolean {
        if (this.processedUrls.has(cityUrl)) return true
        if (this.processedUrls.has(cityUrl.replace('https://plra.io/', 'https://heyplura.com/'))) return true
        if (this.processedUrls.has(cityUrl.replace('https://heyplura.com/', 'https://plra.io/'))) return true
        return false
    }

    /**
     * Process a city page to extract events
     * @param cityUrl URL of the city page
     * @param cityName Name of the city
     * @returns Object containing event links and event objects
     */
    private async processCityPage(cityUrl: string, cityName: string): Promise<CityPageResult> {
        const result: CityPageResult = {
            eventLinks: [],
            events: [],
        }

        try {
            if (this.checkProcessedUrls(cityUrl)) {
                logr.info('api-es-plura', `City URL already processed: ${cityUrl}, skipping`)
                return {
                    eventLinks: this.cityEventPages.get(cityName) || [],
                    events: [],
                }
            }
            let currentPageUrl = cityUrl
            if (!cityUrl.match(/page=(\d+)/)) {
                currentPageUrl = cityUrl + '?page=1'
            }
            while (currentPageUrl) {
                logr.info('api-es-plura', `Processing ${cityName}: ${currentPageUrl}`)
                const nextPageUrl = await this.processPageAndExtractEvents(currentPageUrl, cityName, result)
                if (nextPageUrl) {
                    currentPageUrl = nextPageUrl
                } else {
                    // No more pages
                    logr.info('api-es-plura', `No more pages found for ${cityName} after page ${currentPageUrl}`)
                    break
                }
            }
            this.cityEventPages.set(cityName, result.eventLinks)
            this.scrapeStats.totalEvents += result.events.length
            return result
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error processing city page ${cityUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return result
        }
    }

    /**
     * Process a single page and extract events
     * @param pageUrl URL of the page to process
     * @param cityName Name of the city
     * @param result Object to store results in
     * @returns next page url or null if no next page
     */
    private async processPageAndExtractEvents(
        pageUrl: string,
        cityName: string,
        result: CityPageResult
    ): Promise<string | null> {
        try {
            const response = await axios.get(pageUrl, axiosGet)
            const $ = cheerio.load(response.data)

            // Find event sections - each section is a separate event
            const eventSections = $('section')

            if (eventSections.length === 0) {
                this.logPageStructure($, `page ${cityName}`)
                return null
            }

            // Process each event section
            eventSections.each((_, section) => {
                const $section = $(section)
                const eventLink = $section.find('a').attr('href')
                if (!eventLink) return

                // Create absolute URL and normalize domain
                const fullEventLink = (
                    eventLink.startsWith('http') ? eventLink : `https://heyplura.com${eventLink}`
                ).replace('https://plra.io/', 'https://heyplura.com/')

                // Add unique links
                if (!result.eventLinks.includes(fullEventLink)) {
                    result.eventLinks.push(fullEventLink)
                }

                // Create event object
                const event = this.createEventFromCard($section, fullEventLink, cityName)
                if (event) {
                    result.events.push(event)
                    this.scrapeStats.newEvents++
                }
            })
            // find next page url from this html
            const span = $('a > button > span').filter((_, el) => {
                return $(el).text().trim() === 'Next Page'
            })
            let nextPageUrl = null
            if (span.length > 0) {
                const anchor = span.closest('a')
                nextPageUrl = anchor.attr('href') || null
            }
            return nextPageUrl
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error processing page ${pageUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return null
        }
    }

    /**
     * Create a CmfEvent from an event card section
     * @param $section Cheerio section element
     * @param eventUrl URL of the event
     * @param cityName Name of the city
     * @returns CmfEvent object or null if extraction failed
     */
    private createEventFromCard($section: cheerio.Cheerio, eventUrl: string, cityName: string): CmfEvent | null {
        try {
            // Extract basic event info
            const title = $section.find('h2').text().trim()
            if (!title) {
                logr.warn('api-es-plura', `No title found for event ${eventUrl}`)
                return null
            }

            // Extract date info using attribute selectors instead of class names
            const dateEl = $section.find('li[title="Date"]')
            const dateText = dateEl.find('span').text().trim()

            // Extract location info
            const addressEl = $section.find('li[title="Address"]')
            const locationText = addressEl.find('span').text().trim() || cityName

            // Parse date and time
            let startDate: Date | null = null
            let endDate: Date | null = null

            if (dateText) {
                const dateInfo = this.parseDateString(dateText)
                startDate = dateInfo.startDate
                endDate = dateInfo.endDate
            }

            // Create the event object with the correct CmfEvent structure
            const event: CmfEvent = {
                id: eventUrl,
                name: title,
                original_event_url: eventUrl,
                description: '',
                description_urls: [],
                start: startDate ? startDate.toISOString() : new Date().toISOString(),
                end: endDate ? endDate.toISOString() : '',
                location: locationText, // Use simple location string
            }

            return event
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error creating event from card: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return null
        }
    }

    /**
     * Parse a date string from Plura format
     * @param dateString Date string in format like "Wednesday, May 14th at 1:30am"
     * @returns Object with startDate and endDate
     */
    private parseDateString(dateString: string): { startDate: Date | null; endDate: Date | null } {
        try {
            const currentYear = new Date().getFullYear()

            // Create regex to extract date components
            const dateRegex = /([A-Za-z]+),\s+([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)(?:\s+at\s+(\d+):?(\d+)?([ap]m))?/i
            const match = dateString.match(dateRegex)

            if (!match) {
                logr.warn('api-es-plura', `Failed to parse date string: ${dateString}`)
                return { startDate: null, endDate: null }
            }

            // We don't use dayOfWeek but we destructure it for clarity
            const [, , month, day, hour, minute, ampm] = match

            // Create date string in format that JS Date can parse
            let dateStr = `${month} ${day}, ${currentYear}`

            // Handle time if available
            let timeStr = ''
            if (hour) {
                timeStr = `${hour}:${minute || '00'} ${ampm || 'am'}`
                dateStr += ` ${timeStr}`
            }

            const startDate = new Date(dateStr)

            // Default duration is 1 hour if not specified
            const endDate = new Date(startDate)
            endDate.setHours(endDate.getHours() + 1)

            return { startDate, endDate }
        } catch (error: unknown) {
            logr.error(
                'api-es-plura',
                `Error parsing date: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return { startDate: null, endDate: null }
        }
    }

    /**
     * Extract city name from URL
     * @param url City URL like https://heyplura.com/events/city/Oakland_CA
     * @returns City name like "Oakland, CA"
     */
    private extractCityNameFromUrl(url: string): string {
        try {
            // Extract the last part of the URL
            const urlParts = url.split('/')
            const lastPart = urlParts[urlParts.length - 1]

            // Convert URL format to display format (e.g., Oakland_CA -> Oakland, CA)
            return decodeURIComponent(lastPart).replace(/_/g, ', ').replace(/%20/g, ' ')
        } catch {
            return url
        }
    }

    /**
     * Log HTML page structure to help diagnose scraping issues
     * @param $ Cheerio instance
     * @param contextName Name for logging context
     */
    private logPageStructure($: cheerio.Root, contextName: string): void {
        logr.warn('api-es-plura', `Analyzing HTML structure for ${contextName}`)

        // Log overall structure stats
        logr.info(
            'api-es-plura',
            `Page has ${$('a').length} links, ${$('section').length} sections, ${$('div').length} divs`
        )

        // Log all link hrefs to see what's available
        const allLinks = $('a')
            .map((_, el) => $(el).attr('href'))
            .get()
        logr.info('api-es-plura', `Sample links: ${allLinks.slice(0, 5).join(', ')}`)

        // Look for section patterns
        const sectionClasses = $('section')
            .map((_, el) => $(el).attr('class'))
            .get()
        logr.info('api-es-plura', `Section classes: ${sectionClasses.slice(0, 5).join(', ')}`)

        // Look for titles
        const titles = $('h1, h2, h3')
            .map((_, el) => $(el).text().trim())
            .get()
        logr.info('api-es-plura', `Titles: ${titles.slice(0, 5).join(', ')}`)
    }
}

// Create the instance first, then register and export it
const pluraEventsSource = new PluraEventsSource()
registerEventSource(pluraEventsSource)

export default pluraEventsSource
