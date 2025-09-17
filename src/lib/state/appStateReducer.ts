/**
 * Application State Machine for Calendar Map Filter
 *
 * Manages the initialization flow from loading events through URL parsing
 * to ready state for user interaction.
 */

import { logr } from '@/lib/utils/logr'
import { stringify } from '../utils/utils-shared'

export const INITIAL_APP_STATE: AppState = 'starting-app'

// Application state representing the initialization flow.
// Names should be present tense, unique enough to grep, following FSM best practices.
export type AppState =
    | 'starting-app' // When successfully parses es, before fetching events, should transition to fetching-events
    | 'fetching-events' // SWR fetching events from API
    | 'processing-events' // resetMapToVisibleEvents, header setup
    | 'applying-url-filters' // DateAndSearchFilters processes date/search URL params
    | 'parsing-remaining-url' // Handle se, llz, auto-resize logic
    | 'finalizing-setup' // Final transition before interaction (placeholder for tracking)
    | 'user-interactive' // Normal user interaction mode, was 'main-state'

// Actions that can transition between states
// Names should ideally describe what happened (past tense) or only if need be, what is happening (present tense)
// Started: [THING]_STARTED
// Completed: [THING]_COMPLETED or [THING]_FINISHED (past tense)
// Succeeded/Failed (if needed): [THING]_SUCCEEDED / [THING]_FAILED
// Ready states: [THING]_READY
export type AppAction =
    | { type: 'APP_STARTED' }
    | { type: 'EVENTS_FETCHED'; hasEvents: boolean }
    | { type: 'EVENTS_PROCESSED' }
    | { type: 'URL_FILTERS_APPLIED' }
    | { type: 'REMAINING_URL_PARSED' }
    | { type: 'SETUP_FINALIZED' }

/**
 * State machine reducer with explicit transitions and logging
 *
 * State flow: starting-app → fetching-events → processing-events → applying-url-filters → parsing-remaining-url → finalizing-setup → user-interactive
 */
export function appStateReducer(state: AppState, action: AppAction): AppState {
    const nextState = (() => {
        switch (action.type) {
            case 'APP_STARTED':
                return state === 'starting-app' ? 'fetching-events' : state

            case 'EVENTS_FETCHED':
                return action.hasEvents ? 'processing-events' : state

            case 'EVENTS_PROCESSED':
                return state === 'processing-events' ? 'applying-url-filters' : state

            case 'URL_FILTERS_APPLIED':
                return state === 'applying-url-filters' ? 'parsing-remaining-url' : state

            case 'REMAINING_URL_PARSED':
                return state === 'parsing-remaining-url' ? 'finalizing-setup' : state

            case 'SETUP_FINALIZED':
                return state === 'finalizing-setup' ? 'user-interactive' : state

            default:
                return state
        }
    })()

    // Log state transitions for debugging
    if (nextState !== state) {
        logr.info('app_state', `⭐⭐ ${action.type} changing: ${state} to ${nextState}`)
    } else {
        logr.info('app_state', `${action.type}: ${state}, no change`)
    }
    logr.info('app_state', `window.cmfEvents: ${window?.cmfEvents ? stringify(window.cmfEvents) : 'none'}`)

    return nextState
}

/**
 * Type guards for checking specific states
 *
 * Note: Best practices for large state machines or public API is to create type guards for each state.
 *       Since that is not us, keep it simple and just check appState in code, since we make appState strings easily greppable.
 */
export const isInitializing = (state: AppState): boolean => state !== 'user-interactive'
export const isReadyForInteraction = (state: AppState): boolean => state === 'user-interactive'

/**
 * Action creators for type safety
 */
export const appActions = {
    startFetchingEvents: (): AppAction => ({ type: 'APP_STARTED' }),
    eventsFetched: (hasEvents: boolean): AppAction => ({ type: 'EVENTS_FETCHED', hasEvents }),
    eventsProcessed: (): AppAction => ({ type: 'EVENTS_PROCESSED' }),
    urlFiltersApplied: (): AppAction => ({ type: 'URL_FILTERS_APPLIED' }),
    remainingUrlParsed: (): AppAction => ({ type: 'REMAINING_URL_PARSED' }),
    setupFinalized: (): AppAction => ({ type: 'SETUP_FINALIZED' }),
    readyForInteraction: (): AppAction => ({ type: 'SETUP_FINALIZED' }),

    // Legacy compatibility actions
    urlProcessed: (): AppAction => ({ type: 'REMAINING_URL_PARSED' }), // delete after deleting appStateService.ts and appState.ts
}
