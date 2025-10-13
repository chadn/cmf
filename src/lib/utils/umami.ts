import { logr } from '@/lib/utils/logr'

// Code can use data-umami-event in HTML elements to track events without importing this file

/**
 * Wrapper for umami.track to track analytics events
 * @see https://umami.is/docs/track-events
 * @see https://www.npmjs.com/package/@types/umami
 * @param eventName - Name of the event to track
 * @param event_data - Optional event data properties
 */
export const umamiTrack = (
    eventName: string,
    event_data?: { [key: string]: string | number | boolean | undefined }
) => {
    try {
        if (typeof umami !== 'undefined') {
            umami?.track(eventName, event_data)
        }
        logr.info('umami', `umamiTrack(${eventName})`, event_data)
    } catch {} // ignore errors
}

/**
 * Umami event handler wrapper - concise way to track umami events from event handlers
 * @param name - Name of the event
 * @param fn - Original event handler function
 * @returns Wrapped event handler function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uamamiHandler = <T extends (...args: any[]) => any>(name: string, fn: T): T =>
    ((...args: Parameters<T>): ReturnType<T> => {
        umamiTrack(name)
        return fn(...args)
    }) as T

// must match domains in https://umami-chad.vercel.app/settings/websites
const sessionIds = {
    default: '5b4eb79f-b7a7-4bea-b03b-808126201cb0', // default to production
    'cmf.mapbyme.org': '74a92658-839d-4055-9cea-4647fe94896c',
    'cmf-dev.vercel.app': '74a92658-839d-4055-9cea-4647fe94896c',
    localhost: '74a92658-839d-4055-9cea-4647fe94896c',
}

/**
 * Gets the Umami website ID for the current domain
 * @returns Umami website ID string
 */
export const getUmamiWebsiteId = () => {
    let domain = 'unknownDomain'
    if (typeof window !== 'undefined') {
        domain = window.location.hostname
    } else {
        if (process.env.VERCEL_BRANCH_URL == 'cmf-git-dev-all-chads.vercel.app') {
            domain = 'cmf-dev.vercel.app'
        } else if (process.env.VERCEL_BRANCH_URL == 'cmf-git-main-all-chads.vercel.app') {
            domain = 'cmf-chad.vercel.app'
        }
    }

    const umamiWebsiteId = sessionIds[domain as keyof typeof sessionIds] || sessionIds['default']
    logr.info('umami', `init for ${domain}:${umamiWebsiteId}`)
    return umamiWebsiteId
}
// just get the first 8 characters of the sha
//const sha = (process.env.VERCEL_GIT_COMMIT_SHA || 'xxxxxxxxxx').substring(0, 8)
