import { CmfEvent } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import {
    BaseEventSourceHandler,
    EventSourceParams,
    EventSourceResponse,
    EventSourceType,
    registerEventSource,
} from './index'

/**
 * Facebook Events source handler implementation
 * TODO: Implement this when ready to support Facebook events
 */
export class FacebookEventsSource extends BaseEventSourceHandler {
    // Event source format: 'fb:${facebookEventId}'
    public readonly type: EventSourceType = {
        prefix: 'fb',
        name: 'Facebook Events',
    }
    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        // TODO: Implement fetching events from Facebook
        // Reference: https://github.com/derekantrican/GAS-ICS-Sync/blob/master/Helpers.gs
        // For parsing: https://github.com/kewisch/ical.js

        logr.info('api-es-fb', 'Facebook events fetching not yet implemented')
        throw new Error('Facebook events fetching not yet implemented')

        /* Implementation will look something like this:
        const fbData = await this.fetchFacebookEvents(params.id, params.timeMin, params.timeMax)
        
        // Transform Facebook events to our format
        const events: CmfEvent[] = fbData.events.map(item => {
            return {
                id: item.id,
                name: item.name,
                start: item.start_time,
                end: item.end_time,
                location: item.place?.name || '',
                description: item.description || '',
                description_urls: this.extractUrls(item.description || ''),
                original_event_url: `https://www.facebook.com/events/${item.id}`,
            }
        })

        return {
            events,
            metadata: {
                id: params.id,
                name: fbData.name || 'Facebook Events',
                type: 'facebookEvents',
                totalCount: events.length,
                unknownLocationsCount: 0
            }
        }
        */
    }
}

// Commented out until implementation is ready
// const facebookEventsSource = new FacebookEventsSource()
// registerEventSource(facebookEventsSource)

// export default facebookEventsSource
