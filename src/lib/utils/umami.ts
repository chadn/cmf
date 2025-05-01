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
const sessionIds = {
    'cmf-chad.vercel.app': '5b4eb79f-b7a7-4bea-b03b-808126201cb0',
    'cmf-dev.vercel.app': '74a92658-839d-4055-9cea-4647fe94896c',
}
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
export const umamiWebsiteId = sessionIds[domain as keyof typeof sessionIds] || sessionIds['cmf-chad.vercel.app']

// just get the first 8 characters of the sha
//const sha = (process.env.VERCEL_GIT_COMMIT_SHA || 'xxxxxxxxxx').substring(0, 8)

logr.info('umami', `init for ${domain} ${umamiWebsiteId}`)
