import axios from 'axios'
import * as cheerio from 'cheerio'
import { CmfEvent, EventSourceParams, EventSourceResponse, EventSourceType } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSource } from './index'
import { parse19hzDateRange } from '@/lib/utils/date-parsing'

interface ParsedEventRow {
    dateTime: string
    eventTitle: string
    eventUrl: string
    tags: string
    priceAge: string
    organizers: string
    links: string
    venue: string
}

export class NineteenHzEventSource extends BaseEventSourceHandler {
    public readonly type: EventSourceType = {
        prefix: '19hz',
        name: '19hz.info Bay Area Electronic Music Events',
    }
    private venueCache: Map<string, string> = new Map()

    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        try {
            const url = 'https://19hz.info/eventlisting_BayArea.php'
            logr.info('api-es-19hz', `Fetching events from ${url}`)

            const response = await axios.get(url)

            const $ = cheerio.load(response.data)
            const events: CmfEvent[] = []

            this.buildVenueCache($)

            // Find the events table and process each row
            $('table tbody tr').each((_, row) => {
                const parsedEvent = this.parseEventRow($, $(row))
                if (parsedEvent) {
                    const cmfEvent = this.createCmfEvent(parsedEvent)
                    if (cmfEvent) {
                        // Ensure unique ID by adding suffix if needed
                        cmfEvent.id = this.ensureUniqueId(cmfEvent.id, events)
                        events.push(cmfEvent)
                    }
                }
            })

            logr.info('api-es-19hz', `Successfully parsed ${events.length} events`)

            return {
                httpStatus: 200,
                events,
                metadata: {
                    id: params.id || 'bayarea',
                    name: this.type.name,
                    totalCount: events.length,
                    unknownLocationsCount: 0, // Will be computed after geocoding
                    type: this.type,
                },
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.error('api-es-19hz', `Error fetching events: ${errorMessage}`)
            throw error
        }
    }

    /**
     * Parse a single event row from the HTML table
     */
    private parseEventRow($: cheerio.Root, $row: cheerio.Cheerio): ParsedEventRow | null {
        try {
            const cells = $row.find('td')
            if (cells.length < 6) return null

            // Extract data from each column
            const dateTime = $(cells[0]).text().trim()

            // Column 2: Event Title @ Venue with link
            const eventCell = $(cells[1])
            const eventLink = eventCell.find('a').first()
            const eventTitle = eventCell.text().trim()
            const eventUrl = eventLink.attr('href') || ''

            const tags = $(cells[2]).text().trim()
            const priceAge = $(cells[3]).text().trim()
            const organizers = $(cells[4]).text().trim()

            // Column 6: Links - extract all links with their text
            const linksCell = $(cells[5])
            const links = linksCell
                .find('a')
                .map((_, link) => {
                    const text = $(link).text().trim()
                    const href = $(link).attr('href') || ''
                    return text && href ? `${text}: ${href}` : ''
                })
                .get()
                .filter(Boolean)
                .join(', ')

            // Extract venue from event title
            let venue = this.extractVenueAndCity(eventTitle)

            // Clean venue formatting
            if (venue) {
                venue = venue
                    // Merge 2+ whitespace to single white space
                    .replace(/\s+/g, ' ')
                    // Remove whitespace before comma
                    .replace(/\s+,/g, ',')
                    // Replace multiple commas with one comma
                    .replace(/,+/g, ',')
                    // Trim any leading/trailing whitespace
                    .trim()
            }

            return {
                dateTime,
                eventTitle,
                eventUrl,
                tags,
                priceAge,
                organizers,
                links,
                venue,
            }
        } catch (error) {
            logr.warn(
                'api-es-19hz',
                `Error parsing event row: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return null
        }
    }

    /**
     * Build venue cache from HTML venue list
     */
    private buildVenueCache($: cheerio.Root): void {
        const venueListSection = $('#venueList').parent()
        const venueText = venueListSection.html() || ''

        // Parse venue entries: <a href='...'>Venue Name</a> - Address<br />
        const venueRegex = /<a[^>]*>([^<]+)<\/a>\s*-\s*([^<]+)<br/g
        let match

        while ((match = venueRegex.exec(venueText)) !== null) {
            const venueName = match[1].trim()
            const venueAddress = match[2].trim()
            this.venueCache.set(venueName.toLowerCase(), venueAddress)
        }

        logr.info('api-es-19hz', `Built venue cache with ${this.venueCache.size} venues`)
    }

    /**
     * Extract venue and city from event title in format "Event Name @ Venue (City)"
     */
    private extractVenueAndCity(eventTitle: string): string {
        // Match pattern: "Event @ Venue (City)" or "Event @ Venue"
        const match = eventTitle.match(/^(.+?)\s*@\s*([^(]+?)(?:\s*\(([^)]+)\))?$/)

        if (match) {
            const venue = match[2]?.trim() || ''
            const city = match[3]?.trim() || ''

            // Check venue cache for full address
            const cachedAddress = this.venueCache.get(venue.toLowerCase())
            if (cachedAddress) {
                return cachedAddress
            }

            // Handle TBA case - only city known
            if (venue.toLowerCase() === 'tba' && city) {
                return `${city}, CA`
            }

            // No match in cache, format as "Venue, city, CA" without parens
            if (venue && city) {
                return `${venue}, ${city}, CA`
            }

            logr.info('api-es-19hz', `Unexpected venue and city for event: ${eventTitle}`)
            return `${venue}, ${city}, CA, USA`
        }

        // Fallback: look for city in parentheses at the end
        const cityMatch = eventTitle.match(/\(([^)]+)\)$/)
        if (cityMatch) {
            return `${cityMatch[1].trim()}, CA`
        }

        logr.info('api-es-19hz', `Unexpected venue and city formatting for event: ${eventTitle}`)
        return ''
    }

    /**
     * Parse date/time text into start and end dates
     */
    private parseDateRange(dateTimeText: string): { start: string; end: string; recurring: boolean } {
        const { start, end, recurring } = parse19hzDateRange(dateTimeText)
        if (recurring) {
            logr.debug('api-es-19hz', `Recurring event detected: ${dateTimeText}: ${start} - ${end}`)
        }
        return { start, end, recurring }
    }

    /**
     * Ensure unique ID by adding suffix -2, -3, etc. until unique
     */
    private ensureUniqueId(baseId: string, existingEvents: CmfEvent[]): string {
        let uniqueId = baseId
        let suffix = 2

        while (existingEvents.some((event) => event.id === uniqueId)) {
            uniqueId = `${baseId}-${suffix}`
            suffix++
        }

        return uniqueId
    }

    /**
     * Create a CmfEvent from parsed row data
     */
    private createCmfEvent(parsed: ParsedEventRow): CmfEvent | null {
        try {
            const { start, end } = this.parseDateRange(parsed.dateTime)

            // Build description from all columns as requested
            const descriptionParts = [
                parsed.eventTitle,
                parsed.tags ? `Tags: ${parsed.tags}` : '',
                parsed.priceAge ? `Price/Age: ${parsed.priceAge}` : '',
                parsed.organizers ? `Organizers: ${parsed.organizers}` : '',
                parsed.links ? `Links: ${parsed.links}` : '',
            ].filter(Boolean)

            const description = descriptionParts.join(' | ')

            // Use location from extractVenueAndCity (already formatted)
            const location = parsed.venue || ''

            // Extract event name (part before @)
            const eventNameMatch = parsed.eventTitle.match(/^(.+?)\s*@/)
            const eventName = eventNameMatch ? eventNameMatch[1].trim() : parsed.eventTitle

            // Generate a unique ID from the event URL or title
            // Use entire URL path with dashes to ensure uniqueness
            const eventId = parsed.eventUrl
                ? (() => {
                      try {
                          const url = new URL(parsed.eventUrl)
                          return (
                              url.hostname.replace(/\./g, '-').replace(/[^a-zA-Z0-9-]/g, '') +
                              '-' +
                              url.pathname
                                  .split('/')
                                  .filter(Boolean)
                                  .join('-')
                                  .replace(/[^a-zA-Z0-9-]/g, '')
                          )
                      } catch {
                          // Fallback for invalid URLs
                          return 'random-' + Math.random().toString(36).substring(2, 11)
                      }
                  })()
                : eventName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

            logr.debug('api-es-19hz', `Generated event ID: ${eventId}`)
            return {
                id: eventId,
                name: eventName,
                description,
                description_urls: this.extractUrls(description),
                start,
                end,
                tz: 'America/Los_Angeles', // PST/PDT timezone for Bay Area
                location,
                original_event_url: parsed.eventUrl,
            }
        } catch (error) {
            logr.warn(
                'api-es-19hz',
                `Error creating CmfEvent: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
            return null
        }
    }
}

// Register the 19hz event source
const nineteenHzEventSource = new NineteenHzEventSource()
registerEventSource(nineteenHzEventSource)

export default nineteenHzEventSource
