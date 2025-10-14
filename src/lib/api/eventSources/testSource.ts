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
            /*
             * Create mock events for testing based on the examples provided
             * 2 events per day, one at lunch time, one ends at 2am on the next day.
             */
            const numEvents = 99
            const events: CmfEvent[] = []
            for (let i = 0; i < numEvents; i++) {
                events.push(createTestEvent())
            }

            logr.info('api-es-test', `Successfully created ${events.length} mock test events`)

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
}

// Register factory for test event source
registerEventSourceFactory(() => new TestEventsSource())
