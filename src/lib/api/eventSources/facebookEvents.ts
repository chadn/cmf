import { EventSourceParams, EventSourceResponse, EventSourceType } from '@/types/events'
import { logr } from '@/lib/utils/logr'
import { BaseEventSourceHandler } from './index'

/**
 * Facebook Events source handler implementation
 * TODO: Implement this when ready to support Facebook events
 */
export class FacebookEventsSource extends BaseEventSourceHandler {
    // Event source format: 'fb:${facebookUid}-${facebookKey}'
    // https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
    public readonly type: EventSourceType = {
        prefix: 'fb',
        name: 'Facebook Events',
    }
    async fetchEvents(params: EventSourceParams): Promise<EventSourceResponse> {
        // TODO: Implement fetching events from Facebook
        // Reference: https://github.com/derekantrican/GAS-ICS-Sync/blob/master/Helpers.gs
        // For parsing: https://github.com/kewisch/ical.js

        logr.info('api-es-fb', 'Facebook events fetching not yet implemented', params)
        throw new Error('Facebook events fetching not yet implemented')

        // TODO: Implement this when ready to support Facebook events
        // ICS Feed URL https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
        // ICS Feed example file: data/facebook-calendar.ics

        // TODO: create ics parsing in separate file so can be used by other event sources

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
