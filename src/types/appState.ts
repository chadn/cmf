/**
 * Application state-related type definitions
 * This file should be deprecated, only used by appStateService.ts which is not used.

 */

import { CmfEvents } from './events'
import { MapBounds } from './map'

/**
 * Data available for state transition decisions
 * @interface StateData
 * @property {CmfEvents} [cmfEvents] - Current events and filtering state
 * @property {MapBounds | null} [mapBounds] - Current map bounds for filtering
 * @property {boolean} [apiIsLoading] - Whether API is currently fetching data
 * @property {boolean} [mapInitialized] - Whether map component is ready
 * @property {boolean} [domainFiltersProcessed] - Whether URL domain filters have been applied
 * @property {boolean} [urlProcessed] - Whether all URL parameters have been processed
 * @property {boolean} [mapBoundsCalculated] - Whether map bounds have been calculated
 */
export interface StateData {
    cmfEvents?: CmfEvents
    mapBounds?: MapBounds | null
    apiIsLoading?: boolean
    mapInitialized?: boolean
    domainFiltersProcessed?: boolean
    urlProcessed?: boolean
    mapBoundsCalculated?: boolean
}

/**
 * Requirement for a specific state transition
 * @interface StateRequirement
 * @property {string} name - Unique identifier for the requirement
 * @property {string} description - Human-readable description
 * @property {boolean} satisfied - Whether this requirement is currently met
 * @property {any} [data] - Optional additional data about the requirement
 */
export interface StateRequirement {
    name: string
    description: string
    satisfied: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data?: any
}

/**
 * Result of checking whether a state transition should occur
 * @interface StateTransitionResult
 * @property {boolean} shouldTransition - Whether the transition should proceed
 * @property {string} reason - Explanation of why transition should/shouldn't occur
 * @property {StateRequirement[]} requirements - All requirements and their status
 * @property {import('@/lib/state/appStateReducer').AppState} [nextState] - The state to transition to if applicable
 */
export interface StateTransitionResult {
    shouldTransition: boolean
    nextState?: import('@/lib/state/appStateReducer').AppState
    reason: string
    requirements: StateRequirement[]
}
