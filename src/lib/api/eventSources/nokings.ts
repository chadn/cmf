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

interface MobilizeLocation {
    venue: string
    address_lines: string[]
    locality: string
    region: string
    country: string
    postal_code: string
    location: {
        latitude: number
        longitude: number
    }
    congressional_district: string
    state_leg_district: string
    state_senate_district: string
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
}

export class NoKingsEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'nokings',
        name: 'No Kings',
        url: 'https://nokings.org/',
    }

    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        try {
            logr.info('api-es-nokings', 'Fetching No Kings events from Mobilize API')

            const apiUrl = 'https://mobilize-feed-cache.vercel.app/data-42198.json'
            const queryParams = new URLSearchParams({
                timeslot_start: 'gte_now',
                per_page: '100',
                approval_status: 'APPROVED',
                is_virtual: 'false',
            })

            const url = `${apiUrl}?${queryParams.toString()}`
            logr.info('api-es-nokings', `Fetching from: ${url}`)

            const response = await axiosGet(url)
            const mobilizeData = response.data

            logr.info('api-es-nokings', `Retrieved ${mobilizeData.data.length} events (total: ${mobilizeData.count})`)

            const events: CmfEvent[] = []

            for (const mobilizeEvent of mobilizeData.data) {
                // Each mobilize event can have multiple timeslots
                for (const timeslot of mobilizeEvent.timeslots) {
                    const cmfEvent = this.convertToCmfEvent(mobilizeEvent, timeslot)
                    if (cmfEvent && this.isEventInTimeRange(cmfEvent, params.timeMin, params.timeMax)) {
                        events.push(cmfEvent)
                    }
                }
            }

            logr.info('api-es-nokings', `Successfully parsed ${events.length} CmfEvents`)

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
            logr.error('api-es-nokings', `Error fetching events: ${errorMessage}`)
            throw error
        }
    }

    /**
     * Convert a Mobilize event + timeslot into a CmfEvent
     */
    private convertToCmfEvent(mobilizeEvent: MobilizeEvent, timeslot: MobilizeTimeslot): CmfEvent | null {
        try {
            // Assume the latitude and longitude from mobilizeEvent.location is accurate. Street address may be incomplete.
            const resolved_location = this.resolvedLocation(mobilizeEvent.location)

            // Convert Unix timestamps to ISO 8601 strings
            const start = new Date(timeslot.start_date * 1000).toISOString()
            const end = new Date(timeslot.end_date * 1000).toISOString()

            // Generate unique ID combining event ID and timeslot ID
            const id = `${this.type.prefix}-${mobilizeEvent.id}-${timeslot.id}`

            // Build description from summary and description
            const description = [mobilizeEvent.summary, mobilizeEvent.description, timeslot.instructions]
                .filter(Boolean)
                .join('\n\n')

            return {
                id,
                name: mobilizeEvent.title,
                description,
                description_urls: this.extractUrls(description),
                start,
                end,
                tz: mobilizeEvent.timezone,
                location: resolved_location.original_location,
                resolved_location,
                original_event_url: mobilizeEvent.browser_url,
            }
        } catch (error) {
            logr.warn('api-es-nokings', `Error converting event ${mobilizeEvent.id}: ${error}`)
            return null
        }
    }

    /**
     * Build a location string from Mobilize location data
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
        logr.info('api-es-nokings', `No location.latitude:"${original_location}"\n${JSON.stringify(mobilizeLocation)}`)
        return {
            status: 'unresolved',
            original_location,
        }
    }

    /**
     * Build a location string from Mobilize location data
     */
    private buildLocationString(location: MobilizeLocation): string {
        let parts = [
            location.venue,
            ...location.address_lines.filter(Boolean),
            location.locality,
            location.region,
            location.postal_code,
            location.country,
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

// Register the nokings event source
const noKingsEventsSource = new NoKingsEventsSource()
registerEventsSource(noKingsEventsSource)

export default noKingsEventsSource
