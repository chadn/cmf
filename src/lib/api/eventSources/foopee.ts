import axios from 'axios'
import * as cheerio from 'cheerio'
import { format, addYears, subDays, parse } from 'date-fns'
import { CmfEvent, EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSourceFactory } from './index'
import { extractEventTimes, parseMonthDayRange } from '@/lib/utils/date'

interface DatePageInfo {
    url: string
    linkText: string
    startDate: Date | null
    endDate: Date | null
}

export class FoopeeEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'foopee',
        name: 'Foopee Concerts by Steve Koepke',
        url: 'http://www.foopee.com/punk/the-list/',
    }

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        try {
            logr.info('api-es-foopee', 'Fetching punk show listings from foopee.com')

            const mainPageUrl = this.type.url
            const response = await axios.get(mainPageUrl)
            const $ = cheerio.load(response.data)

            const events: CmfEvent[] = []
            const datePages = this.extractDatePageUrls($)
            logr.info('api-es-foopee', `Found ${datePages.length} date pages to process`)

            // Process each date page with time filtering
            const pagesToProcess = this.filterDatePagesByTimeRange(datePages, params.timeMin, params.timeMax)
            for (const datePage of pagesToProcess) {
                try {
                    const pageEvents = await this.processDatePage(datePage.url)
                    const filteredEvents = this.filterEventsByTimeRange(pageEvents, params.timeMin, params.timeMax)
                    events.push(...filteredEvents)
                    logr.info(
                        'api-es-foopee',
                        `Processed ${datePage.linkText} (${datePage.url}), found ${pageEvents.length} events, ${filteredEvents.length} after time filtering`
                    )

                    // Stop processing if we're past timeMax to optimize performance
                    if (params.timeMax && this.isPagePastTimeMax(datePage, params.timeMax)) {
                        logr.info('api-es-foopee', 'Reached timeMax, stopping page processing')
                        break
                    }
                } catch (error) {
                    logr.warn('api-es-foopee', `Failed to process date page ${datePage.url}: ${error}`)
                }
            }

            logr.info('api-es-foopee', `Successfully parsed ${events.length} real events`)

            return {
                httpStatus: 200,
                events,
                source: {
                    ...this.type,
                    id: params.id || 'all',
                    totalCount: events.length,
                    unknownLocationsCount: 0,
                },
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.error('api-es-foopee', `Error fetching events: ${errorMessage}`)
            throw error
        }
    }

    /**
     * Process a single date page to extract events
     */
    private async processDatePage(url: string): Promise<CmfEvent[]> {
        logr.debug('api-es-foopee', `Processing date page: ${url}`)

        const response = await axios.get(url)
        const $ = cheerio.load(response.data)
        const events: CmfEvent[] = []

        let currentDate: Date | null = null
        let eventIndex = 0

        // Process all <li> elements to find dates and events
        $('li').each((_, element) => {
            const $li = $(element)
            const liText = $li.text().trim()
            const liHtml = $li.html() || ''

            // Check if this <li> contains a date (like "Mon Oct 6")
            const dateMatch = liText.match(
                /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i
            )
            if (dateMatch) {
                // This is a date header - extract and store the current date
                const [, , monthName, dayStr] = dateMatch
                const dateStr = `${monthName} ${dayStr}`

                currentDate = parse(dateStr, 'MMM d', new Date())

                // If the date is more than 14 days in the past, assume it's next year
                const fourteenDaysAgo = subDays(new Date(), 14)
                if (currentDate < fourteenDaysAgo) {
                    currentDate = addYears(currentDate, 1)
                }

                //logr.info('api-es-foopee', `Found date: ${currentDate.toISOString()}`)
                return // Continue to next <li>
            }

            // Check if this <li> contains event data (has links)
            // Parse structure: <b><a>location</a></b> <a>band1</a>, <a>band2</a>, ... description
            const $allLinks = $li.find('a')
            if ($allLinks.length > 0 && currentDate) {
                // First link (in <b>) is the location
                const location = $allLinks.first().text().trim()

                // Extract band names from remaining links (those with by-band.* hrefs)
                const bands: string[] = []
                $allLinks.each((index, link) => {
                    if (index === 0) return // Skip location link
                    const href = $(link).attr('href')
                    if (href && href.includes('by-band.')) {
                        bands.push($(link).text().trim())
                    }
                })

                // TODO: extract description, everything after the last </a>
                const description = liHtml.split(/<\/a>/).pop()?.trim() || ''

                const event = this.parseEventFromLi(location, bands, description, currentDate, eventIndex)
                if (event) {
                    events.push(event)
                    eventIndex++
                }
            }
        })

        logr.debug('api-es-foopee', `Extracted ${events.length} events from ${url}`)
        return events
    }

    /**
     * Parse event data from <li> element into a CmfEvent
     */
    private parseEventFromLi(
        location: string,
        bands: string[],
        description: string,
        eventDate: Date,
        index: number
    ): CmfEvent | null {
        try {
            // Create event title from bands
            const title = bands.length > 0 ? bands.join(', ') : 'Punk Show'

            // Extract time, ex: "7pm til 11:30pm" or "7pm/8pm" or "8pm"
            const { startStr, endStr } = extractEventTimes(description, eventDate)

            // Append CA, USA to location
            const fullLocation = location.includes(', CA, USA')
                ? location
                : `${location}, CA, USA`.replace(/,\s*,/g, ',')

            // Generate unique ID
            const dateStr = format(eventDate, 'yyyy-MM-dd')
            const id = `${this.type.prefix}-${fullLocation.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${dateStr}-${index}`

            return {
                id,
                name: title,
                description: this.applyLegendReplacements(description),
                description_urls: this.extractUrls(description),
                start: startStr,
                end: endStr,
                tz: `REINTERPRET_UTC_TO_LOCAL`, // foopee times are local to the venue
                location: fullLocation,
                original_event_url: this.type.url,
            }
        } catch (error) {
            logr.warn('api-es-foopee', `Error parsing event from li: ${description} - ${error}`)
            return null
        }
    }

    /**
     * Apply legend replacements to add brackets around symbols
     * Examples:
     * - "a/a" → "a/a[all ages]"
     * - "$" (not part of price) → "$[will probably sell out]"
     * - "#" (not part of venue) → "#[no ins/outs]"

        '*': 'recommendable shows',
        '$': 'will probably sell out',
        '^': 'under 21 must buy drink tickets',
        'a/a': 'all ages',
        '@': 'pit warning',
        '#': 'no ins/outs',
     */
    private applyLegendReplacements(text: string): string {
        let result = text

        // Replace a/a with a/a[all ages]
        result = result.replace(/\ba\/a\b/g, 'a/a[all ages]')

        // Replace # that's not followed by numbers (not part of venue info)
        result = result.replace(/#(?!\d)/g, '#[no ins/outs]')

        // Replace $ that's not part of a price (not followed by digits)
        result = result.replace(/\$(?=\s|$)/g, '$[will probably sell out]')

        // Replace standalone symbols
        result = result.replace(/\b\*\b/g, '*[recommendable shows]')
        result = result.replace(/\b\^\b/g, '^[under 21 must buy drink tickets]')
        result = result.replace(/\b@\b/g, '@[pit warning]')

        return result
    }

    /**
     * Extract date page URLs from the main page with date information
     */
    private extractDatePageUrls($: cheerio.Root): DatePageInfo[] {
        const datePages: DatePageInfo[] = []

        logr.info('api-es-foopee', 'Extracting date page URLs from main page')

        // Find all date range links and parse their dates
        let dateLinksFound = 0

        $('a').each((_, element) => {
            const $link = $(element)
            const linkText = $link.text().trim()
            const href = $link.attr('href')

            // Look for date range links directly
            if (href && this.isDateRangeLink(linkText)) {
                let fullUrl = href
                if (!href.startsWith('http')) {
                    // Handle relative URLs
                    if (href.startsWith('/')) {
                        fullUrl = `http://www.foopee.com${href}`
                    } else {
                        fullUrl = `http://www.foopee.com/punk/the-list/${href}`
                    }
                }

                // Parse dates from link text
                // const { startDate, endDate } = this.parseDateRangeFromLinkText(linkText)
                const { startDate, endDate } = parseMonthDayRange(linkText)

                const datePageInfo: DatePageInfo = {
                    url: fullUrl,
                    linkText,
                    startDate,
                    endDate,
                }

                datePages.push(datePageInfo)
                dateLinksFound++
                const startDateStr = startDate ? format(startDate, 'yyyy-MM-dd') : 'null'
                const endDateStr = endDate ? format(endDate, 'yyyy-MM-dd') : 'null'
                logr.info(
                    'api-es-foopee',
                    `Found date range link: "${linkText}" -> ${fullUrl} (${startDateStr} to ${endDateStr})`
                )
            }
        })

        logr.info('api-es-foopee', `Found ${dateLinksFound} date range links`)
        return datePages
    }

    /**
     * Check if a link text represents a date range (like "Oct 27 - Nov 2")
     */
    private isDateRangeLink(linkText: string): boolean {
        // Look for patterns like "Oct 27 - Nov 2", "Sep 22 - Sep 28", etc.
        const dateRangePattern =
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s*-\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)?\s*\d{1,2}\b/i
        return dateRangePattern.test(linkText)
    }

    /**
     * Filter date page URLs by time range to optimize processing
     */
    private filterDatePagesByTimeRange(datePages: DatePageInfo[], timeMin?: string, timeMax?: string): DatePageInfo[] {
        if (!timeMin && !timeMax) return datePages

        return datePages.filter((datePage) => {
            // If we can't parse dates, include the page to be safe
            if (!datePage.startDate || !datePage.endDate) return true

            // Check if the page date range overlaps with the requested time range
            return this.isDateRangeOverlapping(datePage.startDate, datePage.endDate, timeMin, timeMax)
        })
    }

    /**
     * Filter events by time range
     */
    private filterEventsByTimeRange(events: CmfEvent[], timeMin?: string, timeMax?: string): CmfEvent[] {
        if (!timeMin && !timeMax) return events

        return events.filter((event) => {
            const eventDate = new Date(event.start)
            return this.isDateInRange(eventDate, timeMin, timeMax)
        })
    }

    /**
     * Check if a date falls within the specified time range
     */
    private isDateInRange(date: Date, timeMin?: string, timeMax?: string): boolean {
        if (timeMin) {
            const minDate = new Date(timeMin)
            if (date < minDate) return false
        }
        if (timeMax) {
            const maxDate = new Date(timeMax)
            if (date > maxDate) return false
        }
        return true
    }

    /**
     * Check if two date ranges overlap
     */
    private isDateRangeOverlapping(startDate: Date, endDate: Date, timeMin?: string, timeMax?: string): boolean {
        if (timeMin) {
            const minDate = new Date(timeMin)
            // Check if the page ends before our time range starts
            if (endDate < minDate) return false
        }
        if (timeMax) {
            const maxDate = new Date(timeMax)
            // Check if the page starts after our time range ends
            if (startDate > maxDate) return false
        }
        return true
    }

    /**
     * Check if we've passed the timeMax based on the page's date range
     */
    private isPagePastTimeMax(datePage: DatePageInfo, timeMax: string): boolean {
        if (!datePage.startDate) return false

        const maxDate = new Date(timeMax)
        // If the page starts after timeMax, we've gone too far
        return datePage.startDate > maxDate
    }
}

// Register factory for event source
registerEventSourceFactory(() => new FoopeeEventsSource())
