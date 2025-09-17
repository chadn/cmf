import {
    appStateReducer,
    appActions,
    AppState,
    INITIAL_APP_STATE,
    isInitializing,
    isReadyForInteraction,
} from '@/lib/state/appStateReducer'
import type { AppAction } from '@/lib/state/appStateReducer'

// Mock the logr utility
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        info: jest.fn(),
    },
}))

describe('appStateReducer', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('Initial state', () => {
        it('should have correct initial state', () => {
            expect(INITIAL_APP_STATE).toBe('starting-app')
        })
    })

    describe('State transitions', () => {
        it('should transition to fetching-events on APP_STARTED', () => {
            const action = appActions.startFetchingEvents()
            const result = appStateReducer('starting-app', action)
            expect(result).toBe('fetching-events')
        })

        it('should transition to processing-events on EVENTS_FETCHED with events', () => {
            const action = appActions.eventsFetched(true)
            const result = appStateReducer('fetching-events', action)
            expect(result).toBe('processing-events')
        })

        it('should stay in current state on EVENTS_FETCHED without events', () => {
            const action = appActions.eventsFetched(false)
            const result = appStateReducer('fetching-events', action)
            expect(result).toBe('fetching-events')
        })

        it('should transition to parsing-remaining-url from applying-url-filters on URL_FILTERS_APPLIED', () => {
            const action = appActions.urlFiltersApplied()
            const result = appStateReducer('applying-url-filters', action)
            expect(result).toBe('parsing-remaining-url')
        })

        it('should not transition to parsing-remaining-url from wrong state', () => {
            const action = appActions.urlFiltersApplied()
            const result = appStateReducer('starting-app', action)
            expect(result).toBe('starting-app')
        })

        it('should transition to user-interactive from finalizing-setup on SETUP_FINALIZED', () => {
            const action = appActions.setupFinalized()
            const result = appStateReducer('finalizing-setup', action)
            expect(result).toBe('user-interactive')
        })

        it('should not transition to user-interactive from wrong state', () => {
            const action = appActions.setupFinalized()
            const result = appStateReducer('processing-events', action)
            expect(result).toBe('processing-events')
        })

        it('should transition to user-interactive from finalizing-setup on READY_FOR_INTERACTION', () => {
            const action = appActions.readyForInteraction()
            const result = appStateReducer('finalizing-setup', action)
            expect(result).toBe('user-interactive')
        })

        it('should not transition to user-interactive from wrong state', () => {
            const action = appActions.readyForInteraction()
            const result = appStateReducer('applying-url-filters', action)
            expect(result).toBe('applying-url-filters')
        })
    })

    describe('Complete state flow', () => {
        it('should follow the complete initialization flow', () => {
            let state: AppState = INITIAL_APP_STATE

            // Start fetching events
            state = appStateReducer(state, appActions.startFetchingEvents())
            expect(state).toBe('fetching-events')

            // Events fetched successfully
            state = appStateReducer(state, appActions.eventsFetched(true))
            expect(state).toBe('processing-events')

            // Events processed
            state = appStateReducer(state, appActions.eventsProcessed())
            expect(state).toBe('applying-url-filters')

            // URL filters applied
            state = appStateReducer(state, appActions.urlFiltersApplied())
            expect(state).toBe('parsing-remaining-url')

            // Remaining URL parsed
            state = appStateReducer(state, appActions.remainingUrlParsed())
            expect(state).toBe('finalizing-setup')

            // Setup finalized
            state = appStateReducer(state, appActions.setupFinalized())
            expect(state).toBe('user-interactive')
        })

        it('should handle failed events loading', () => {
            let state: AppState = INITIAL_APP_STATE

            state = appStateReducer(state, appActions.startFetchingEvents())
            expect(state).toBe('fetching-events')

            // Events failed to load (no events)
            state = appStateReducer(state, appActions.eventsFetched(false))
            expect(state).toBe('fetching-events') // Should stay in fetching-events
        })
    })

    describe('Invalid actions', () => {
        it('should handle unknown action types', () => {
            const invalidAction = { type: 'UNKNOWN_ACTION' } as unknown as AppAction
            const result = appStateReducer('user-interactive', invalidAction)
            expect(result).toBe('user-interactive')
        })
    })

    describe('Action creators', () => {
        it('should create correct APP_STARTED action', () => {
            const action = appActions.startFetchingEvents()
            expect(action).toEqual({ type: 'APP_STARTED' })
        })

        it('should create correct EVENTS_FETCHED action with events', () => {
            const action = appActions.eventsFetched(true)
            expect(action).toEqual({ type: 'EVENTS_FETCHED', hasEvents: true })
        })

        it('should create correct EVENTS_FETCHED action without events', () => {
            const action = appActions.eventsFetched(false)
            expect(action).toEqual({ type: 'EVENTS_FETCHED', hasEvents: false })
        })

        it('should create correct URL_FILTERS_APPLIED action', () => {
            const action = appActions.urlFiltersApplied()
            expect(action).toEqual({ type: 'URL_FILTERS_APPLIED' })
        })

        it('should create correct SETUP_FINALIZED action', () => {
            const action = appActions.setupFinalized()
            expect(action).toEqual({ type: 'SETUP_FINALIZED' })
        })

        it('should create correct READY_FOR_INTERACTION action', () => {
            const action = appActions.readyForInteraction()
            expect(action).toEqual({ type: 'SETUP_FINALIZED' })
        })
    })

    describe('Type guards', () => {
        it('should correctly identify initializing states', () => {
            expect(isInitializing('starting-app')).toBe(true)
            expect(isInitializing('fetching-events')).toBe(true)
            expect(isInitializing('processing-events')).toBe(true)
            expect(isInitializing('applying-url-filters')).toBe(true)
            expect(isInitializing('parsing-remaining-url')).toBe(true)
            expect(isInitializing('finalizing-setup')).toBe(true)
            expect(isInitializing('user-interactive')).toBe(false)
        })

        it('should correctly identify ready for interaction', () => {
            expect(isReadyForInteraction('user-interactive')).toBe(true)
            expect(isReadyForInteraction('starting-app')).toBe(false)
            expect(isReadyForInteraction('finalizing-setup')).toBe(false)
        })
    })

    describe('Logging behavior', () => {
        it('should log state transitions', () => {
            const { logr } = jest.requireMock('@/lib/utils/logr')

            appStateReducer('fetching-events', appActions.eventsFetched(true))

            expect(logr.info).toHaveBeenCalledWith(
                'app_state',
                '⭐⭐ EVENTS_FETCHED changing: fetching-events to processing-events'
            )
        })

        it('should log no change when state does not transition', () => {
            const { logr } = jest.requireMock('@/lib/utils/logr')

            appStateReducer('starting-app', appActions.urlFiltersApplied())

            expect(logr.info).toHaveBeenCalledWith('app_state', 'URL_FILTERS_APPLIED: starting-app, no change')
        })
    })
})
