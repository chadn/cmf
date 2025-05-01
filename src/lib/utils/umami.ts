import { logr } from '@/lib/utils/logr'

// wrapper for umami.track
// https://umami.is/docs/track-events
// https://www.npmjs.com/package/@types/umami
export const umamiTrack = (eventName: string, event_data?: { [key: string]: any }) => {
    try {
        if (typeof umami !== 'undefined') {
            umami.track(eventName, event_data)
        }
        logr.info('umami', `umamiTrack(${eventName})`, event_data)
    } catch (error) {}
}

// must match domains in https://umami-chad.vercel.app/settings/websites
const umamiIds = {
    'cmf-chad.vercel.app': '5b4eb79f-b7a7-4bea-b03b-808126201cb0',
    'cmf-dev.vercel.app': '74a92658-839d-4055-9cea-4647fe94896c',
}
const domain = process.env.NEXT_PUBLIC_VERCEL_URL || 'cmf-chad.vercel.app'
export const umamiWebsiteId = umamiIds[domain as keyof typeof umamiIds]
