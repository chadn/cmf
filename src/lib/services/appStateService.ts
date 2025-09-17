/**
 * App State Service - Pure business logic for state transitions and requirements
 *
 * Provides clean interfaces for determining state transitions and requirements
 *
 * STATUS: COMPLETED NEEDS REVIEW!!!!, NOT TESTED, NOT USED.
 *
 * When shouldTransitionTo WOULD Be Valuable:
 *
 * 🔮 Future Scenarios:
 * 1. Complex branching logic - Multiple possible next states based on conditions
 * 2. Error recovery - Invalid states needing validation and correction
 * 3. Conditional flows - Some transitions should be skipped based on URL params
 * 4. Debug/testing - Validating state machine compliance during development
 *
 * Current Status:
 *
 * ✅ Architecture Ready: The service exists and is well-designed
 * ✅ No Current Pain: State transitions work reliably
 * ⚠️ YAGNI Principle: We don't need it yet, so don't add complexity
 */

import { AppState } from '@/lib/state/appStateReducer'
// appState should be deprecated, use onlly appStateReducer
import { StateData, StateRequirement, StateTransitionResult } from '@/types/appState'

/**
 * Determine if a state transition should occur based on current state and data
 * @param currentState - Current application state
 * @param nextState - Proposed next state
 * @param data - Current application data for validation
 * @returns Result indicating whether transition should occur
 */
export function shouldTransitionTo(
    currentState: AppState,
    nextState: AppState,
    data: StateData
): StateTransitionResult {
    const requirements = getStateRequirements(nextState, data)
    const allRequirementsSatisfied = requirements.every((req) => req.satisfied)

    let shouldTransition = false
    let reason = ''

    // Validate transition is allowed by state machine
    const validTransitions = getValidTransitions(currentState)
    if (!validTransitions.includes(nextState)) {
        reason = `Invalid transition from ${currentState} to ${nextState}`
        return {
            shouldTransition: false,
            reason,
            requirements,
        }
    }

    // Check if all requirements are met
    if (allRequirementsSatisfied) {
        shouldTransition = true
        reason = `All requirements satisfied for ${nextState}`
    } else {
        const unmetRequirements = requirements.filter((req) => !req.satisfied)
        reason = `Requirements not met: ${unmetRequirements.map((req) => req.name).join(', ')}`
    }

    return {
        shouldTransition,
        nextState: shouldTransition ? nextState : undefined,
        reason,
        requirements,
    }
}

/**
 * Get requirements for a specific state
 * @param state - Application state to get requirements for
 * @param data - Current application data
 * @returns Array of requirements with their satisfaction status
 */
export function getStateRequirements(state: AppState, data: StateData): StateRequirement[] {
    switch (state) {
        case 'starting-app':
            return [
                {
                    name: 'initial_state',
                    description: 'Application is starting up',
                    satisfied: true, // Always satisfied as initial state
                },
            ]

        case 'fetching-events':
            return [
                {
                    name: 'events_ready_to_fetch',
                    description: 'Ready to fetch events from event source',
                    satisfied: true, // Always ready once in fetching-events state
                },
            ]

        case 'processing-events':
            return [
                {
                    name: 'events_fetched',
                    description: 'Events have been fetched from API',
                    satisfied: !data.apiIsLoading && (data.cmfEvents?.allEvents.length || 0) > 0,
                    data: { eventCount: data.cmfEvents?.allEvents.length || 0 },
                },
            ]

        case 'applying-url-filters':
            return [
                {
                    name: 'events_available',
                    description: 'Events are loaded and available for marker generation',
                    satisfied: (data.cmfEvents?.allEvents.length || 0) > 0,
                    data: { eventCount: data.cmfEvents?.allEvents.length || 0 },
                },
                {
                    name: 'map_component_ready',
                    description: 'Map component is initialized and ready',
                    satisfied: data.mapInitialized === true,
                },
            ]

        case 'parsing-remaining-url':
            return [
                {
                    name: 'map_initialized',
                    description: 'Map bounds initialization completed',
                    satisfied: data.mapInitialized === true,
                },
                {
                    name: 'domain_filters_ready',
                    description: 'Ready to process domain filters from URL',
                    satisfied: true, // Always ready once map is initialized
                },
            ]

        case 'finalizing-setup':
            return [
                {
                    name: 'domain_filters_processed',
                    description: 'Domain filters have been applied',
                    satisfied: data.domainFiltersProcessed === true,
                },
                {
                    name: 'filtered_events_available',
                    description: 'Filtered events are available for map positioning',
                    satisfied: data.cmfEvents?.visibleEvents !== undefined,
                    data: { visibleEventCount: data.cmfEvents?.visibleEvents.length || 0 },
                },
            ]

        case 'user-interactive':
            return [
                {
                    name: 'url_processing_complete',
                    description: 'All URL parameters have been processed',
                    satisfied: data.urlProcessed === true,
                },
                {
                    name: 'viewport_determined',
                    description: 'Final viewport coordinates determined',
                    satisfied: true, // Will be determined during processing
                },
            ]

        case 'fetching-events':
            return [
                {
                    name: 'mapbounds_calculated',
                    description: 'Map bounds have been calculated',
                    satisfied: data.mapBoundsCalculated === true,
                },
                {
                    name: 'bounds_ready_for_filtering',
                    description: 'Map bounds ready to be applied to event filtering',
                    satisfied: data.mapBounds !== undefined,
                },
            ]

        case 'user-interactive':
            return [
                {
                    name: 'mapbounds_applied',
                    description: 'Map bounds have been applied to filtering',
                    satisfied: data.mapBounds !== undefined,
                },
                {
                    name: 'final_events_filtered',
                    description: 'Final event filtering completed',
                    satisfied: data.cmfEvents?.visibleEvents !== undefined,
                    data: { finalEventCount: data.cmfEvents?.visibleEvents.length || 0 },
                },
            ]

        default:
            return []
    }
}

/**
 * Get valid next states from current state
 * @param currentState - Current application state
 * @returns Array of valid next states
 */
export function getValidTransitions(currentState: AppState): AppState[] {
    switch (currentState) {
        case 'starting-app':
            return ['fetching-events']
        case 'fetching-events':
            return ['processing-events']
        case 'processing-events':
            return ['applying-url-filters']
        case 'applying-url-filters':
            return ['parsing-remaining-url']
        case 'parsing-remaining-url':
            return ['finalizing-setup']
        case 'finalizing-setup':
            return ['user-interactive']
        case 'user-interactive':
            return [] // Terminal state
        default:
            return []
    }
}

/**
 * Check if state represents a loading/initialization phase
 * @param state - Application state to check
 * @returns Whether state is part of initialization flow
 */
export function isInitializationState(state: AppState): boolean {
    return state !== 'user-interactive'
}

/**
 * Get human-readable description of what happens in each state
 * @param state - Application state to describe
 * @returns Human-readable description of the state
 */
export function getStateDescription(state: AppState): string {
    switch (state) {
        case 'starting-app':
            return 'Fetching events from event sources'
        case 'processing-events':
            return 'Events loaded, ready to initialize map'
        case 'applying-url-filters':
            return 'Map component initialized, ready for domain filters'
        case 'parsing-remaining-url':
            return 'URL domain filters (date, search) processed and applied'
        case 'finalizing-setup':
            return 'All URL parameters processed (domain + map positioning)'
        case 'user-interactive':
            return 'Map bounds calculated from filtered events and URL state'
        case 'fetching-events':
            return 'Map bounds applied to filtering, ready for user interaction'
        case 'user-interactive':
            return 'Normal user interaction mode'
        default:
            return 'Unknown state'
    }
}
