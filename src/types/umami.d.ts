/**
 * Type definitions for Umami Analytics
 *
 * These type definitions allow TypeScript to recognize the global umami object
 * that's injected into the page by the Umami analytics script.
 */

interface UmamiTrackingData {
    [key: string]: string | number | boolean | undefined
}

interface Umami {
    /**
     * support https://umami.is/docs/tracker-functions
     * umami.track(payload: object);
     * umami.track(event_name: string, event_data: object);
     * umami.identify(session_data: object);
     */
    track: (eventName: string, event_data?: UmamiTrackingData) => void
    identify: (session_data: UmamiTrackingData) => void
}

declare global {
    /**
     * Global umami object that is injected by the Umami analytics script
     */
    let umami: Umami | undefined
}

export {}
