import axios from 'axios'
import { format } from 'date-fns'
import { CmfEvent, EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventsSource } from './index'

// Interface for the Protest API response
interface ProtestEvent {
    id: string
    title: string
    uuid: string
    beginsOn: string
    endsOn: string
    picture?: {
        url?: string
    }
    status: string
    tags: Array<{
        title: string
        slug: string
    }>
    physicalAddress?: {
        description?: string
        street?: string
        locality?: string
        postalCode?: string
        region?: string
        country?: string
        url?: string
    }
    organizerActor?: {
        name?: string
        preferredUsername?: string
    }
    attributedTo?: {
        name?: string
        preferredUsername?: string
    }
    options?: {
        isOnline?: boolean
    }
}

interface ProtestApiResponse {
    data: {
        searchEvents: {
            total: number
            elements: ProtestEvent[]
        }
    }
}

export class ProtestsEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'protest',
        name: 'Protests from pol-rev.com',
        url: 'https://events.pol-rev.com/',
    }

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        const protestData = await this.fetchProtestEvents(params.timeMin, params.timeMax)

        // Transform protest events to our format
        const events: CmfEvent[] = protestData.data.searchEvents.elements.map((item: ProtestEvent) => {
            // Format location from address components
            const location = this.formatLocation(item.physicalAddress)

            // Extract URLs from description if available
            const description = item.physicalAddress?.description || ''
            const description_urls = this.extractUrls(description)

            // Create event URL from UUID
            const original_event_url = `https://events.pol-rev.com/events/${item.uuid}`

            return {
                id: item.id,
                name: item.title,
                start: item.beginsOn,
                end: item.endsOn,
                location,
                description,
                description_urls,
                original_event_url,
                // Resolved location will be added later
            }
        })

        return {
            httpStatus: 200,
            events,
            source: {
                ...this.type,
                id: 'protests',
                totalCount: events.length,
                unknownLocationsCount: 0, // This will be computed after geocoding
            },
        }
    }

    /**
     * Formats a location string from address components
     */
    private formatLocation(address?: ProtestEvent['physicalAddress']): string {
        if (!address) return ''

        const components = [
            address.street,
            address.locality,
            address.region,
            address.postalCode,
            address.country,
        ].filter(Boolean)

        return components.join(', ')
    }

    /**
     * Fetches events from the Protest API
     * @param timeMin - Start date for events
     * @param timeMax - End date for events
     * @returns Promise with protest events
     */
    private async fetchProtestEvents(timeMin?: string, timeMax?: string): Promise<ProtestApiResponse> {
        // Default to today if no start date provided
        const beginsOn = timeMin || format(new Date(), "yyyy-MM-dd'T'00:00:00.000'Z'")
        // Default to 30 days from now if no end date provided
        const endsOn =
            timeMax || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'23:59:59.999'Z'")

        const apiUrl = 'https://events.pol-rev.com/api'

        logr.info('api-es-pr', `fetchProtestEvents request`, {
            beginsOn,
            endsOn,
        })

        // Implement pagination as per TODO
        // Start with page 1 and continue fetching until all events are retrieved
        try {
            const limit = 999 // original from scraping web
            let currentPage = 1
            let allEvents: ProtestEvent[] = []
            let totalEvents = 0
            let hasMorePages = true

            while (hasMorePages) {
                logr.info('api-es-pr', `Fetching protest events page ${currentPage}`)

                const response = await axios.post(
                    apiUrl,
                    {
                        operationName: 'SearchEvents',
                        variables: {
                            limit,
                            eventPage: currentPage,
                            beginsOn,
                            endsOn,
                        },
                        query: `query SearchEvents($beginsOn: DateTime, $endsOn: DateTime, $eventPage: Int, $limit: Int) {
  searchEvents(
    beginsOn: $beginsOn
    endsOn: $endsOn
    page: $eventPage
    limit: $limit
    longEvents: false
  ) {
    total
    elements {
      id
      title
      uuid
      beginsOn
      endsOn
      picture {
        id
        url
        __typename
      }
      status
      tags {
        id
        slug
        title
        __typename
      }
      physicalAddress {
        id
        description
        street
        locality
        postalCode
        region
        country
        url
        __typename
      }
      organizerActor {
        id
        name
        preferredUsername
        __typename
      }
      attributedTo {
        id
        name
        preferredUsername
        __typename
      }
      options {
        isOnline
        __typename
      }
      __typename
    }
    __typename
  }
}`,
                    },
                    {
                        headers: {
                            accept: '*/*',
                            'content-type': 'application/json',
                            origin: 'https://events.pol-rev.com',
                            referer: 'https://events.pol-rev.com/events/calendar',
                            'user-agent':
                                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
                        },
                    }
                )

                if (response.data?.data?.searchEvents?.elements) {
                    const pageEvents = response.data.data.searchEvents.elements
                    const pageCount = pageEvents.length
                    totalEvents = response.data.data.searchEvents.total

                    // Add this page's events to our collection
                    allEvents = [...allEvents, ...pageEvents]

                    logr.info(
                        'api-es-pr',
                        `Fetched page ${currentPage}: ${pageCount} events (${allEvents.length}/${totalEvents} total)`
                    )

                    // Check if we need to fetch more pages
                    hasMorePages = allEvents.length < totalEvents
                    currentPage++
                } else {
                    logr.info('api-es-pr', 'fetchProtestEvents unexpected response', response.data)
                    hasMorePages = false
                }
            }

            // Construct a complete response object with all events
            const completeResponse = {
                data: {
                    searchEvents: {
                        total: totalEvents,
                        elements: allEvents,
                        __typename: 'PaginatedEventList',
                    },
                },
            }

            logr.info('api-es-pr', `fetchProtestEvents complete: ${allEvents.length} total events`)
            return completeResponse
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.error('api-es-pr', `fetchProtestEvents error: ${errorMessage}`)
            console.error('Error fetching protest events:', error)
            throw error
        }
    }
}

// Register the Protests event source
const protestsEventsSource = new ProtestsEventsSource()
registerEventsSource(protestsEventsSource)

export default protestsEventsSource
