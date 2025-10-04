import { axiosGet } from '@/lib/utils/utils-server'
import { CmfEvent, Location, EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventsSource } from './index'

interface MobilizeTimeslot {
    start_date: number
    end_date: number
    instructions: string | null
    id: number
    is_full: boolean
}

interface MobilizeLocationCoords {
    latitude: number
    longitude: number
}

interface MobilizeLocation {
    venue: string
    address_lines: string[]
    locality: string
    region: string
    country: string
    postal_code: string
    location?: MobilizeLocationCoords
    congressional_district?: string
    state_leg_district?: string
    state_senate_district?: string
}

interface MobilizeEvent {
    title: string
    summary: string
    featured_image_url: string
    timeslots: MobilizeTimeslot[]
    location: MobilizeLocation
    event_type: string
    browser_url: string
    id: number
    description: string
    timezone: string
    is_virtual: boolean
    address_visibility: string
}

export class MobilizeEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'mobilize',
        name: 'Mobilize',
        url: 'https://www.mobilize.us/',
    }

    private readonly baseUrl = 'https://api.mobilize.us/v1'

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        try {
            const mobilizeIds: Record<string, { id: string; name: string }> = {
                nokings: { id: '42198', name: 'No Kings' }, // No Kings
            }
            const organizationId =
                params.id && params.id in mobilizeIds ? mobilizeIds[params.id].id : params.id ? params.id : '1'
            const organizationName =
                params.id && params.id in mobilizeIds
                    ? mobilizeIds[params.id].name
                    : params.id
                      ? params.id
                      : 'Public Events'

            logr.info('api-es-mobilize', `Fetching Mobilize events for organization ${organizationId}`)

            const events: CmfEvent[] = []
            let nextUrl: string | null = this.buildInitialUrl(organizationId, params.timeMin, params.timeMax)
            let pageCount = 0

            // Fetch all pages of results
            while (nextUrl) {
                pageCount++
                logr.info('api-es-mobilize', `Fetching page ${pageCount}: ${nextUrl}`)

                const response = await axiosGet(nextUrl)
                const mobilizeData = response.data

                logr.info(
                    'api-es-mobilize',
                    `Page ${pageCount}: Retrieved ${mobilizeData.data.length} events (total available: ${mobilizeData.count})`
                )

                for (const mobilizeEvent of mobilizeData.data) {
                    // Each mobilize event can have multiple timeslots
                    for (const timeslot of mobilizeEvent.timeslots) {
                        const cmfEvent = this.convertToCmfEvent(mobilizeEvent, timeslot)
                        if (cmfEvent && this.isEventInTimeRange(cmfEvent, params.timeMin, params.timeMax)) {
                            events.push(cmfEvent)
                        }
                    }
                }

                // Move to next page
                nextUrl = mobilizeData.next
            }

            logr.info('api-es-mobilize', `Successfully parsed ${events.length} CmfEvents from ${pageCount} pages`)

            return {
                httpStatus: 200,
                events,
                source: {
                    ...this.type,
                    name: `${this.type.name}: ${organizationName}`,
                    id: organizationId,
                    totalCount: events.length,
                    unknownLocationsCount: 0,
                },
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
            logr.error('api-es-mobilize', `Error fetching events: ${errorMessage}`)
            throw error
        }
    }

    /**
     * Build the initial API URL with query parameters
     */
    private buildInitialUrl(organizationId: string, timeMin?: string, timeMax?: string): string {
        const params = new URLSearchParams({
            organization_id: organizationId,
            per_page: '100',
        })

        if (timeMin) {
            // Convert ISO date to Unix timestamp for Mobilize API
            const timestamp = Math.floor(new Date(timeMin).getTime() / 1000)
            params.append('timeslot_start', `gte_${timestamp}`)
        }

        if (timeMax) {
            const timestamp = Math.floor(new Date(timeMax).getTime() / 1000)
            params.append('timeslot_end', `lte_${timestamp}`)
        }

        return `${this.baseUrl}/events?${params.toString()}`
    }

    /**
     * Convert a Mobilize event + timeslot into a CmfEvent
     */
    private convertToCmfEvent(mobilizeEvent: MobilizeEvent, timeslot: MobilizeTimeslot): CmfEvent | null {
        try {
            // Convert Unix timestamps to ISO 8601 strings
            const start = new Date(timeslot.start_date * 1000).toISOString()
            const end = new Date(timeslot.end_date * 1000).toISOString()

            // Generate unique ID combining event ID and timeslot ID
            const id = `${this.type.prefix}-${mobilizeEvent.id}-${timeslot.id}`

            // Build description from summary and description
            const descriptionParts = [mobilizeEvent.summary, mobilizeEvent.description, timeslot.instructions].filter(
                Boolean
            )
            const description = descriptionParts.join('\n\n')
            const resolved_location = this.resolvedLocation(mobilizeEvent.location)

            const cmfEvent: CmfEvent = {
                id,
                name: mobilizeEvent.title,
                description,
                description_urls: this.extractUrls(description),
                start,
                end,
                tz: mobilizeEvent.timezone,
                location: resolved_location.original_location,
                original_event_url: mobilizeEvent.browser_url,
                resolved_location,
            }
            return cmfEvent
        } catch (error) {
            logr.warn('api-es-mobilize', `Error converting event ${mobilizeEvent.id}: ${error}`)
            return null
        }
    }

    /**
     * Build a resolved Location from Mobilize location data)
     */
    private resolvedLocation(mobilizeLocation: MobilizeLocation): Location {
        const original_location = this.buildLocationString(mobilizeLocation)
        if (mobilizeLocation.location?.latitude) {
            return {
                status: 'resolved',
                original_location,
                lat: mobilizeLocation.location?.latitude,
                lng: mobilizeLocation.location?.longitude,
            }
        }
        logr.info('api-es-mobilize', `No location.latitude:"${original_location}"\n${JSON.stringify(mobilizeLocation)}`)
        return {
            status: 'unresolved',
            original_location,
        }
    }

    /**
     * Build a location string from Mobilize location data
     */
    private buildLocationString(mobilizeLocation: MobilizeLocation): string {
        let parts = [
            mobilizeLocation.venue,
            ...mobilizeLocation.address_lines.filter(Boolean),
            mobilizeLocation.locality,
            mobilizeLocation.region,
            mobilizeLocation.postal_code,
            mobilizeLocation.country,
        ].filter(Boolean)
        // remove: This event’s address is private. Sign up for more details
        parts = parts.filter((part) => part !== 'This event’s address is private. Sign up for more details')
        return parts.join(', ')
    }

    /**
     * Check if an event falls within the specified time range
     */
    private isEventInTimeRange(event: CmfEvent, timeMin?: string, timeMax?: string): boolean {
        const eventDate = new Date(event.start)

        if (timeMin) {
            const minDate = new Date(timeMin)
            if (eventDate < minDate) return false
        }

        if (timeMax) {
            const maxDate = new Date(timeMax)
            if (eventDate > maxDate) return false
        }

        return true
    }
}

// Register the mobilize event source
const mobilizeEventsSource = new MobilizeEventsSource()
registerEventsSource(mobilizeEventsSource)

export default mobilizeEventsSource
