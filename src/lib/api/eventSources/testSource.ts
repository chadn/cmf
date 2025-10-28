import fs from 'fs'
import path from 'path'
import { CmfEvent, EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSourceFactory } from './index'
import { createTestEvent } from '@/tests/locations'
import { addDays, startOfDay, setHours } from 'date-fns'

// ===== HELPER FUNCTIONS FOR STABLE E2E TEST EVENTS =====

function getTodayAt(hour: number, minute: number): string {
    const now = new Date()
    const date = setHours(startOfDay(now), hour)
    date.setMinutes(minute)
    return date.toISOString()
}

function getTomorrowAt(hour: number, minute: number): string {
    const tomorrow = addDays(new Date(), 1)
    const date = setHours(startOfDay(tomorrow), hour)
    date.setMinutes(minute)
    return date.toISOString()
}

function getNextWeekendFriday(hour: number, minute: number): string {
    const now = new Date()
    const dayOfWeek = now.getDay()
    let daysToFriday = 0

    if (dayOfWeek === 0) daysToFriday = 5 // Sunday
    else if (dayOfWeek < 5) daysToFriday = 5 - dayOfWeek // Mon-Thu
    else if (dayOfWeek === 5) daysToFriday = 7 // Friday (next week)
    else daysToFriday = 6 // Saturday

    const friday = addDays(now, daysToFriday)
    const date = setHours(startOfDay(friday), hour)
    date.setMinutes(minute)
    return date.toISOString()
}

// ===== STABLE TEST EVENT SETS FOR E2E TESTS =====

const STABLE_EVENTS: CmfEvent[] = [
    {
        id: 'event-today-sf',
        name: 'Today Event SF',
        description: 'Event happening today in San Francisco',
        description_urls: [],
        start: getTodayAt(14, 0),
        end: getTodayAt(16, 0),
        location: 'San Francisco, CA',
        original_event_url: 'https://example.com/today-sf',
        resolved_location: {
            status: 'resolved',
            original_location: 'San Francisco, CA',
            lat: 37.7749,
            lng: -122.4194,
            formatted_address: 'San Francisco, CA, USA',
        },
        tz: 'America/Los_Angeles',
    },
    {
        id: 'event-weekend-oakland',
        name: 'Weekend Event Oakland',
        description: 'Weekend event in Oakland',
        description_urls: [],
        start: getNextWeekendFriday(18, 0),
        end: getNextWeekendFriday(22, 0),
        location: 'Oakland, CA',
        original_event_url: 'https://example.com/weekend-oakland',
        resolved_location: {
            status: 'resolved',
            original_location: 'Oakland, CA',
            lat: 37.8044,
            lng: -122.2712,
            formatted_address: 'Oakland, CA, USA',
        },
        tz: 'America/Los_Angeles',
    },
    {
        id: 'event-tomorrow-berkeley',
        name: 'Tomorrow Event Berkeley',
        description: 'Event tomorrow in Berkeley',
        description_urls: [],
        start: getTomorrowAt(10, 0),
        end: getTomorrowAt(12, 0),
        location: 'Berkeley, CA',
        original_event_url: 'https://example.com/tomorrow-berkeley',
        resolved_location: {
            status: 'resolved',
            original_location: 'Berkeley, CA',
            lat: 37.8715,
            lng: -122.273,
            formatted_address: 'Berkeley, CA, USA',
        },
        tz: 'America/Los_Angeles',
    },
    {
        id: 'event-unresolved',
        name: 'Unresolved Location Event',
        description: 'Event with unresolved location',
        description_urls: [],
        start: getTodayAt(20, 0),
        end: getTodayAt(22, 0),
        location: 'gibberish123',
        original_event_url: 'https://example.com/unresolved',
        resolved_location: {
            status: 'unresolved',
            original_location: 'gibberish123',
        },
        tz: 'UNKNOWN_TZ',
    },
]

const TIMEZONE_EVENTS: CmfEvent[] = [
    {
        id: 'event-utc-midnight',
        name: 'UTC Midnight Event',
        description: 'Event at midnight UTC to test timezone conversion',
        description_urls: [],
        start: '2025-11-01T00:00:00Z',
        end: '2025-11-01T02:00:00Z',
        location: 'New York, NY',
        original_event_url: 'https://example.com/utc-midnight',
        resolved_location: {
            status: 'resolved',
            original_location: 'New York, NY',
            lat: 40.7128,
            lng: -74.006,
            formatted_address: 'New York, NY, USA',
        },
        tz: 'America/New_York',
    },
]

export class TestEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'test',
        name: 'Test Source',
        url: 'https://cmf.chadnorwood.com/',
    }

    /*
     * Fetch events based on params.id:
     * - 'stable': Returns stable events for E2E tests (dynamic dates)
     * - 'timezone': Returns timezone edge case events (static dates)
     * - 'file': Returns events from testSource.events.json
     * - default: Returns randomly generated events
     */
    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        try {
            let events: CmfEvent[]

            if (params.id === 'stable') {
                events = STABLE_EVENTS
                logr.info('api-es-test', `Returning ${events.length} stable E2E test events`)
            } else if (params.id === 'timezone') {
                events = TIMEZONE_EVENTS
                logr.info('api-es-test', `Returning ${events.length} timezone test events`)
            } else if (params.id === 'file') {
                events = this.getEventsFromFile() || []
            } else {
                events = this.generateEvents()
            }

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
            logr.error('api-es-test', `Error fetching events: ${errorMessage}`)
            throw error
        }
    }

    /*
     * Serve events from a json file
     */
    private getEventsFromFile(): CmfEvent[] | null {
        try {
            // copy const CACHE_DIR = path.join(process.cwd(), '.cache')
            const filePath = path.join(process.cwd(), 'src/lib/api/eventSources/testSource.events.json')
            logr.info('api-es-test', `getEventsFromFile: filePath: ${filePath}`)
            const data = fs.readFileSync(filePath, 'utf-8')
            const events = JSON.parse(data).events as CmfEvent[]
            logr.info('api-es-test', `getEventsFromFile:Successfully loaded ${events.length} events from file`)
            return events
        } catch (error) {
            logr.error('api-es-test', `getEventsFromFile: Failed to load test events: ${(error as Error).message}`)
            return null
        }
    }

    /*
     * Create mock events for testing based on the examples provided
     * 2 events per day, one at lunch time, one ends at 2am on the next day.
     */
    private generateEvents(): CmfEvent[] {
        const numEvents = 99
        const events: CmfEvent[] = []
        for (let i = 0; i < numEvents; i++) {
            events.push(createTestEvent())
        }

        logr.info('api-es-test', `Successfully created ${events.length} mock test events`)
        return events
    }
    private createTestEvent(): CmfEvent {
        return {
            id: `test-${Math.random().toString(36).substring(2, 15)}`,
            name: 'Test Event',
            description: 'This is a test event generated for testing purposes.',
            description_urls: [],
            original_event_url: 'https://example.com/test-event',
            start: new Date().toISOString(),
            end: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
            location: '123 Test St, Test City, TS',
            resolved_location: {
                status: 'resolved',
                original_location: '123 Test St, Test City, TS',
                lat: 37.7749,
                lng: -122.4194,
                formatted_address: '123 Test St, Test City, TS 12345, USA',
            },
        }
    }
}

// Register factory for test event source
registerEventSourceFactory(() => new TestEventsSource())
