import fs from 'fs'
import path from 'path'
import { CmfEvent, EventsSourceParams, EventsSourceResponse, EventsSource } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler, registerEventSourceFactory } from './index'
import { createTestEvent } from '@/tests/locations'

export class TestEventsSource extends BaseEventSourceHandler {
    public readonly type: EventsSource = {
        prefix: 'test',
        name: 'Test Source',
        url: 'https://cmf.chadnorwood.com/',
    }

    /*
     */
    async fetchEvents(params: EventsSourceParams): Promise<EventsSourceResponse> {
        try {
            const events = params.id == 'file' ? this.getEventsFromFile() || [] : this.generateEvents()
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
