import axios from 'axios'
import * as cheerio from 'cheerio'
import { CmfEvent, EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventsSource } from './index'

export class FoopeeEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'foopee',
        name: 'Foopee Punk Shows',
        url: 'http://www.foopee.com/punk/the-list/',
    }

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        try {
            logr.info('api-es-foopee', 'Fetching punk show listings from foopee.com')

            const mainPageUrl = this.type.url
            const response = await axios.get(mainPageUrl)
            const $ = cheerio.load(response.data)

            const events: CmfEvent[] = []
            const datePageUrls = this.extractDatePageUrls($)

            logr.info('api-es-foopee', `Found ${datePageUrls.length} date pages to process`)

            // Process each date page (limit to first 5 for testing)
            const urlsToProcess = datePageUrls.slice(0, 5)
            for (const datePageUrl of urlsToProcess) {
                try {
                    const pageEvents = await this.processDatePage(datePageUrl)
                    events.push(...pageEvents)
                    logr.info('api-es-foopee', `Processed ${datePageUrl}, found ${pageEvents.length} events`)
                } catch (error) {
                    logr.warn('api-es-foopee', `Failed to process date page ${datePageUrl}: ${error}`)
                }
            }

            logr.info('api-es-foopee', `Successfully parsed ${events.length} real events`)

            return {
                httpStatus: 200,
                events,
                source: {
                    ...this.type,
                    id: params.id || 'default',
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

            // Check if this <li> contains a date (like "Mon Oct 6")
            const dateMatch = liText.match(
                /\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})\b/i
            )
            if (dateMatch) {
                // This is a date header - extract and store the current date
                const [, , monthName, dayStr] = dateMatch
                const monthNum = this.getMonthNumber(monthName)
                const day = parseInt(dayStr)
                const currentYear = new Date().getFullYear()

                currentDate = new Date(currentYear, monthNum - 1, day)

                // If the date is more than 14 days in the past, assume it's next year
                const today = new Date()
                const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)

                if (currentDate < fourteenDaysAgo) {
                    currentDate.setFullYear(currentYear + 1)
                }

                logr.debug('api-es-foopee', `Found date: ${currentDate.toISOString().split('T')[0]}`)
                return // Continue to next <li>
            }

            // Check if this <li> contains event data (has links)
            const $firstLink = $li.find('a').first()
            if ($firstLink.length > 0 && currentDate) {
                // This is an event - extract location from first link and use everything as description
                const location = $firstLink.text().trim()
                const description = this.applyLegendReplacements(liText)

                const event = this.parseEventFromLi(location, description, currentDate, eventIndex)
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
    private parseEventFromLi(location: string, description: string, eventDate: Date, index: number): CmfEvent | null {
        try {
            // Extract bands from description (everything after the location link)
            // Remove the location text from the description to get band names
            const locationPattern = new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
            const afterLocation = description.replace(locationPattern, '').trim()

            // Find band names before show details like a/a, $, times, etc.
            const bandSection = afterLocation.split(/\s+(?=a\/a|\$\d|\d+:\d{2}|\d+pm|\d+am|#)/i)[0]
            const bands = this.extractBandNames(bandSection)

            // Create event title from bands
            const title = bands.length > 0 ? bands.join(', ') : 'Punk Show'

            // Extract time if available
            const timeMatch = description.match(/(\d{1,2}):?(\d{2})?\s*(pm|am)/i)
            let startTime = '20:00' // Default to 8 PM
            if (timeMatch) {
                let hour = parseInt(timeMatch[1])
                const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0
                const ampm = timeMatch[3]?.toLowerCase()

                if (ampm === 'pm' && hour !== 12) hour += 12
                if (ampm === 'am' && hour === 12) hour = 0

                startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            }

            // Calculate end time (4 hours after start)
            const startHour = parseInt(startTime.split(':')[0])
            const startMinute = parseInt(startTime.split(':')[1])
            const endHour = (startHour + 4) % 24
            const endTime = `${endHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}`

            // Format date with timezone
            const dateStr = eventDate.toISOString().split('T')[0]
            const startDateTime = `${dateStr}T${startTime}:00`
            const endDateTime = `${dateStr}T${endTime}:00`

            // Append CA, USA to location
            const fullLocation = location.includes(', CA, USA') ? location : `${location}, CA, USA`.replace(/,,/g, ',')

            // Generate unique ID
            const id = `foopee-${fullLocation.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}-${dateStr}-${index}`

            return {
                id,
                name: title,
                description,
                description_urls: this.extractUrls(description),
                start: startDateTime,
                end: endDateTime,
                tz: 'America/Los_Angeles',
                location: fullLocation,
                original_event_url: this.type.url,
            }
        } catch (error) {
            logr.warn('api-es-foopee', `Error parsing event from li: ${description} - ${error}`)
            return null
        }
    }

    /**
     * Extract band names from the band section of the line
     */
    private extractBandNames(bandSection: string): string[] {
        if (!bandSection) return []

        // Split by commas and clean up each band name
        const bands = bandSection
            .split(',')
            .map((band) => band.trim())
            .filter((band) => band && band.length > 0)
            .slice(0, 4) // Take up to 4 band names

        return bands
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
     * Extract date page URLs from the main page
     */
    private extractDatePageUrls($: cheerio.Root): string[] {
        const urls: string[] = []

        logr.info('api-es-foopee', 'Extracting date page URLs from main page')

        // Debug: Log all text content first to see the structure
        const pageText = $('body').text()
        logr.info('api-es-foopee', `Page contains "Concerts By Date": ${pageText.includes('Concerts By Date')}`)
        logr.info('api-es-foopee', `Page contains "Concerts By Band": ${pageText.includes('Concerts By Band')}`)

        // Debug: Log all links found
        const allLinks: string[] = []
        $('a').each((_, element) => {
            const $link = $(element)
            const linkText = $link.text().trim()
            const href = $link.attr('href')
            if (linkText && href) {
                allLinks.push(`"${linkText}" -> "${href}"`)
            }
        })
        logr.info('api-es-foopee', `Total links found: ${allLinks.length}`)
        if (allLinks.length > 0) {
            logr.info('api-es-foopee', `First 10 links: ${allLinks.slice(0, 10).join(', ')}`)
        }

        // Alternative approach: find all date range links directly since we know the pattern
        // The date range links are visible in the debug output: "Sep 22 - Sep 28" -> "by-date.0.html"
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
                urls.push(fullUrl)
                dateLinksFound++
                logr.info('api-es-foopee', `Found date range link: "${linkText}" -> ${fullUrl}`)
            }
        })

        logr.info('api-es-foopee', `Found ${dateLinksFound} date range links`)

        logr.info('api-es-foopee', `Found ${urls.length} date page URLs`)
        return urls
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
     * Convert month abbreviation to number
     */
    private getMonthNumber(monthAbbr: string): number {
        const months: { [key: string]: number } = {
            Jan: 1,
            Feb: 2,
            Mar: 3,
            Apr: 4,
            May: 5,
            Jun: 6,
            Jul: 7,
            Aug: 8,
            Sep: 9,
            Oct: 10,
            Nov: 11,
            Dec: 12,
        }
        return months[monthAbbr] || 1
    }
}

// Register the foopee event source
const foopeeEventsSource = new FoopeeEventsSource()
registerEventsSource(foopeeEventsSource)

export default foopeeEventsSource
