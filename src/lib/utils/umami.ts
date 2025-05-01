import { logr } from '@/lib/utils/logr'

// wrapper for umami.track
// https://umami.is/docs/track-events
// https://www.npmjs.com/package/@types/umami
export const umamiTrack = (eventName: string, event_data?: { [key: string]: any })  => {
    try {
        if (typeof umami !== 'undefined') {
            umami.track(eventName, event_data)
        }
        logr.info('umami', `umamiTrack(${eventName})`, event_data)
    } catch (error) {
    }
}
