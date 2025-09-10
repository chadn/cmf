/**
 * Application State Machine for Calendar Map Filter
 *
 * Manages the initialization flow from loading events through URL parsing
 * to ready state for user interaction.
 */

import { logr } from '@/lib/utils/logr'

// Application state representing the initialization flow
export type AppState =
    | 'events-init' // Fetching events from eventSource
    | 'events-loaded' // Events loaded, ready to process URL filters
    | 'url-applied' // URL filters applied, ready to set viewport
    | 'viewport-set' // Viewport configured, ready for user interaction
    | 'main-state' // Normal user interaction mode

// Actions that can transition between states
export type AppAction =
    | { type: 'EVENTS_LOADING' }
    | { type: 'EVENTS_LOADED'; hasEvents: boolean }
    | { type: 'URL_FILTERS_APPLIED' }
    | { type: 'VIEWPORT_SET' }
    | { type: 'READY_FOR_INTERACTION' }

/**
 * State machine reducer with explicit transitions and logging
 *
 * State flow: events-init → events-loaded → url-applied → viewport-set → main-state
 */
export function appStateReducer(state: AppState, action: AppAction): AppState {
    const nextState = (() => {
        switch (action.type) {
            case 'EVENTS_LOADING':
                return 'events-init'

            case 'EVENTS_LOADED':
                return action.hasEvents ? 'events-loaded' : state

            case 'URL_FILTERS_APPLIED':
                return state === 'events-loaded' ? 'url-applied' : state

            case 'VIEWPORT_SET':
                return state === 'url-applied' ? 'viewport-set' : state

            case 'READY_FOR_INTERACTION':
                return state === 'viewport-set' ? 'main-state' : state

            default:
                return state
        }
    })()

    // Log state transitions for debugging
    if (nextState !== state) {
        logr.info('app-state', `${action.type}: ${state} → ${nextState}`)
    } else {
        logr.info('app-state', `${action.type}: ${state}, no change`)
    }

    return nextState
}

/**
 * Type guards for checking specific states
 * TODO: make? these like appActions.viewportSet() - appStateIs.initializing(), appStateIs.readyForUrlParsing(), etc
 */
export const isInitializing = (state: AppState): boolean => state !== 'main-state'

export const isReadyForUrlParsing = (state: AppState): boolean => state === 'events-loaded'

export const isReadyForViewportSetting = (state: AppState): boolean => state === 'url-applied'

export const isViewportSet = (state: AppState): boolean => state === 'viewport-set'

export const isReadyForInteraction = (state: AppState): boolean => state === 'main-state'

/**
 * Initial state for the application
 */
export const INITIAL_APP_STATE: AppState = 'events-init'

/**
 * Action creators for type safety
 */
export const appActions = {
    eventsLoading: (): AppAction => ({ type: 'EVENTS_LOADING' }),
    eventsLoaded: (hasEvents: boolean): AppAction => ({ type: 'EVENTS_LOADED', hasEvents }),
    urlFiltersApplied: (): AppAction => ({ type: 'URL_FILTERS_APPLIED' }),
    viewportSet: (): AppAction => ({ type: 'VIEWPORT_SET' }),
    readyForInteraction: (): AppAction => ({ type: 'READY_FOR_INTERACTION' }),
}
