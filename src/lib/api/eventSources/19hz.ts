import * as cheerio from 'cheerio'
import { CmfEvent, EventsSourceParams, EventsSourceResponse, EventsSource, DateRangeIso } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSourceFactory } from './index'
import { parse19hzDateRange, getCityInfo } from '@/lib/utils/date-19hz-parsing'
import { extractVenueAndCity } from '@/lib/utils/venue-parsing'
import { applyDateFilter } from '@/lib/events/filters'
import { axiosGet } from '@/lib/utils/utils-server'

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

export class NineteenHzEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: '19hz',
        name: '19hz Music Events',
        url: 'https://19hz.info/',
    }
    private venueCache: Map<string, string> = new Map()

    /**
     * Build the event listing URL for a given city code
     */
    private buildEventListingUrl(cityCode: string): string {
        return `https://19hz.info/eventlisting_${cityCode}.php`
    }

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        try {
            // Determine which city page to fetch from
            const cityCode = params.id || 'BayArea'
            const cityInfo = getCityInfo(cityCode)
            const url = this.buildEventListingUrl(cityCode)
            const dateRange: DateRangeIso = {
                startIso: params.timeMin || new Date().toISOString(),
                endIso: params.timeMax || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days from now
            }

            logr.info('api-es-19hz', `Fetching events from ${cityInfo.name} (${url})`)

            const response = await axiosGet(url) // chad

            const $ = cheerio.load(response.data)
            const events: CmfEvent[] = []

            this.buildVenueCache($)

            // Find the events table and process each row
            $('table tbody tr').each((_, row) => {
                const parsedEvent = this.parseEventRow($, $(row), cityInfo)
                if (parsedEvent) {
                    const cmfEvent = this.createCmfEvent(parsedEvent, cityInfo)
                    if (cmfEvent) {
                        // Ensure unique ID by adding suffix if needed
                        cmfEvent.id = this.ensureUniqueId(cmfEvent.id, events)
                        if (dateRange && !applyDateFilter(cmfEvent, dateRange)) {
                            logr.info('api-es-19hz', `Skipping event outside date range: ${cmfEvent.id}`)
                            return
                        }
                        events.push(cmfEvent)
                    }
                }
            })

            logr.info('api-es-19hz', `Successfully parsed ${events.length} events`)

            return {
                httpStatus: 200,
                events,
                source: {
                    ...this.type,
                    name: `${this.type.name} - ${cityInfo.name}`,
                    url: url,
                    id: cityCode,
                    totalCount: events.length,
                    unknownLocationsCount: 0, // Will be computed after geocoding
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
    private parseEventRow(
        $: cheerio.Root,
        $row: cheerio.Cheerio,
        cityInfo: { name: string; timezone: string; state: string }
    ): ParsedEventRow | null {
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
            let venue = extractVenueAndCity(eventTitle, cityInfo.state, cityInfo.name, this.venueCache)

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
     * Parse date/time text into start and end dates.
     *
     * Time & Timezone Notes:
     * - Many event sources (like 19hz) do **not** include timezone information next to start times.
     * - This is normally fine because most events are in the same local timezone.
     * However:
     * - Some events may actually be in a different timezone.
     * - In these cases, we currently assume the event times follow the **same timezone
     *   as the majority of events**, rather than the event’s actual local timezone. So using cityInfo.timezone
     * Result:
     * - This approach works for now but is not ideal long-term.
     * - Code should manage this on the event source side, since each source may be different.
     *
     * @param dateTimeText
     * @param timezone
     * @returns
     */
    private parseDateRange(dateTimeText: string, timezone: string): { start: string; end: string; recurring: boolean } {
        const { start, end, recurring } = parse19hzDateRange(dateTimeText, new Date(), timezone)
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
    private createCmfEvent(
        parsed: ParsedEventRow,
        cityInfo: { name: string; timezone: string; state: string }
    ): CmfEvent | null {
        try {
            const { start, end, recurring } = this.parseDateRange(parsed.dateTime, cityInfo.timezone)

            // Build description from all columns as requested
            const descriptionParts = [
                parsed.eventTitle,
                parsed.tags ? `Tags: ${parsed.tags}` : '',
                parsed.priceAge ? `Price/Age: ${parsed.priceAge}` : '',
                parsed.organizers ? `Organizers: ${parsed.organizers}` : '',
                parsed.links ? `Links: ${parsed.links}` : '',
            ].filter(Boolean)

            const description = descriptionParts.join(' | ') + (recurring ? ' (Recurring)' : '')

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
                tz: cityInfo.timezone, // Dynamic timezone based on city
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

// Register factory for 19hz event source
registerEventSourceFactory(() => new NineteenHzEventsSource())
