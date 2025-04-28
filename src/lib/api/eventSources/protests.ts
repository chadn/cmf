import axios from 'axios'
import { parseISO, format } from 'date-fns'
import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import {
    BaseEventSourceHandler,
    EventSourceParams,
    EventSourceResponse,
    EventSourceType,
    registerEventSource,
} from './index'

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

export class ProtestsEventSource extends BaseEventSourceHandler {
    public readonly type: EventSourceType = {
        prefix: 'protest',
        name: 'Protests from pol-rev.com',
    }

    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
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
            events,
            metadata: {
                id: 'protests',
                name: this.type.name,
                totalCount: events.length,
                unknownLocationsCount: 0, // This will be computed after geocoding
                type: this.type,
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
     * Fetches events from the Protests API
     */
    private async fetchProtestEvents(timeMin?: string, timeMax?: string): Promise<ProtestApiResponse> {
        // Default time range if not provided
        const beginsOn = timeMin || format(new Date(), "yyyy-MM-dd'T'00:00:00.000'Z'")
        const endsOn =
            timeMax || format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'23:59:59.999'Z'")

        const apiUrl = 'https://events.pol-rev.com/api'

        logr.info('api-es-pr', `fetchProtestEvents request`, {
            beginsOn,
            endsOn,
        })

        try {
            const response = await axios.post(
                apiUrl,
                {
                    operationName: 'SearchEvents',
                    variables: {
                        limit: 999,
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
                logr.info(
                    'api-es-pr',
                    `fetchProtestEvents response: ${response.data.data.searchEvents.elements.length} events`
                )
            } else {
                logr.info('api-es-pr', 'fetchProtestEvents unexpected response', response.data)
            }

            return response.data
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.error('api-es-pr', `fetchProtestEvents error: ${errorMessage}`)
            console.error('Error fetching protest events:', error)
            throw error
        }
    }
}

// Register the Protests event source
const protestsEventSource = new ProtestsEventSource()
registerEventSource(protestsEventSource)

export default protestsEventSource
