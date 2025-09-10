import {
    appStateReducer,
    appActions,
    AppState,
    INITIAL_APP_STATE,
    isInitializing,
    isReadyForUrlParsing,
    isReadyForViewportSetting,
    isViewportSet,
    isReadyForInteraction,
} from '../appStateReducer'
import type { AppAction } from '../appStateReducer'

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
            expect(INITIAL_APP_STATE).toBe('events-init')
        })
    })

    describe('State transitions', () => {
        it('should transition to events-init on EVENTS_LOADING', () => {
            const action = appActions.eventsLoading()
            const result = appStateReducer('main-state', action)
            expect(result).toBe('events-init')
        })

        it('should transition to events-loaded on EVENTS_LOADED with events', () => {
            const action = appActions.eventsLoaded(true)
            const result = appStateReducer('events-init', action)
            expect(result).toBe('events-loaded')
        })

        it('should stay in current state on EVENTS_LOADED without events', () => {
            const action = appActions.eventsLoaded(false)
            const result = appStateReducer('events-init', action)
            expect(result).toBe('events-init')
        })

        it('should transition to url-applied from events-loaded on URL_FILTERS_APPLIED', () => {
            const action = appActions.urlFiltersApplied()
            const result = appStateReducer('events-loaded', action)
            expect(result).toBe('url-applied')
        })

        it('should not transition to url-applied from wrong state', () => {
            const action = appActions.urlFiltersApplied()
            const result = appStateReducer('events-init', action)
            expect(result).toBe('events-init')
        })

        it('should transition to viewport-set from url-applied on VIEWPORT_SET', () => {
            const action = appActions.viewportSet()
            const result = appStateReducer('url-applied', action)
            expect(result).toBe('viewport-set')
        })

        it('should not transition to viewport-set from wrong state', () => {
            const action = appActions.viewportSet()
            const result = appStateReducer('events-loaded', action)
            expect(result).toBe('events-loaded')
        })

        it('should transition to main-state from viewport-set on READY_FOR_INTERACTION', () => {
            const action = appActions.readyForInteraction()
            const result = appStateReducer('viewport-set', action)
            expect(result).toBe('main-state')
        })

        it('should not transition to main-state from wrong state', () => {
            const action = appActions.readyForInteraction()
            const result = appStateReducer('url-applied', action)
            expect(result).toBe('url-applied')
        })
    })

    describe('Complete state flow', () => {
        it('should follow the complete initialization flow', () => {
            let state: AppState = INITIAL_APP_STATE

            // Start with events loading
            state = appStateReducer(state, appActions.eventsLoading())
            expect(state).toBe('events-init')

            // Events loaded successfully
            state = appStateReducer(state, appActions.eventsLoaded(true))
            expect(state).toBe('events-loaded')

            // URL filters applied
            state = appStateReducer(state, appActions.urlFiltersApplied())
            expect(state).toBe('url-applied')

            // Viewport configured
            state = appStateReducer(state, appActions.viewportSet())
            expect(state).toBe('viewport-set')

            // Ready for user interaction
            state = appStateReducer(state, appActions.readyForInteraction())
            expect(state).toBe('main-state')
        })

        it('should handle failed events loading', () => {
            let state: AppState = INITIAL_APP_STATE

            state = appStateReducer(state, appActions.eventsLoading())
            expect(state).toBe('events-init')

            // Events failed to load (no events)
            state = appStateReducer(state, appActions.eventsLoaded(false))
            expect(state).toBe('events-init') // Should stay in events-init
        })
    })

    describe('Invalid actions', () => {
        it('should handle unknown action types', () => {
            const invalidAction = { type: 'UNKNOWN_ACTION' } as unknown as AppAction
            const result = appStateReducer('main-state', invalidAction)
            expect(result).toBe('main-state')
        })
    })

    describe('Action creators', () => {
        it('should create correct EVENTS_LOADING action', () => {
            const action = appActions.eventsLoading()
            expect(action).toEqual({ type: 'EVENTS_LOADING' })
        })

        it('should create correct EVENTS_LOADED action with events', () => {
            const action = appActions.eventsLoaded(true)
            expect(action).toEqual({ type: 'EVENTS_LOADED', hasEvents: true })
        })

        it('should create correct EVENTS_LOADED action without events', () => {
            const action = appActions.eventsLoaded(false)
            expect(action).toEqual({ type: 'EVENTS_LOADED', hasEvents: false })
        })

        it('should create correct URL_FILTERS_APPLIED action', () => {
            const action = appActions.urlFiltersApplied()
            expect(action).toEqual({ type: 'URL_FILTERS_APPLIED' })
        })

        it('should create correct VIEWPORT_SET action', () => {
            const action = appActions.viewportSet()
            expect(action).toEqual({ type: 'VIEWPORT_SET' })
        })

        it('should create correct READY_FOR_INTERACTION action', () => {
            const action = appActions.readyForInteraction()
            expect(action).toEqual({ type: 'READY_FOR_INTERACTION' })
        })
    })

    describe('Type guards', () => {
        it('should correctly identify initializing states', () => {
            expect(isInitializing('events-init')).toBe(true)
            expect(isInitializing('events-loaded')).toBe(true)
            expect(isInitializing('url-applied')).toBe(true)
            expect(isInitializing('viewport-set')).toBe(true)
            expect(isInitializing('main-state')).toBe(false)
        })

        it('should correctly identify ready for URL parsing', () => {
            expect(isReadyForUrlParsing('events-loaded')).toBe(true)
            expect(isReadyForUrlParsing('events-init')).toBe(false)
            expect(isReadyForUrlParsing('url-applied')).toBe(false)
            expect(isReadyForUrlParsing('main-state')).toBe(false)
        })

        it('should correctly identify ready for viewport setting', () => {
            expect(isReadyForViewportSetting('url-applied')).toBe(true)
            expect(isReadyForViewportSetting('events-init')).toBe(false)
            expect(isReadyForViewportSetting('events-loaded')).toBe(false)
            expect(isReadyForViewportSetting('main-state')).toBe(false)
        })

        it('should correctly identify viewport set', () => {
            expect(isViewportSet('viewport-set')).toBe(true)
            expect(isViewportSet('events-init')).toBe(false)
            expect(isViewportSet('url-applied')).toBe(false)
            expect(isViewportSet('main-state')).toBe(false)
        })

        it('should correctly identify ready for interaction', () => {
            expect(isReadyForInteraction('main-state')).toBe(true)
            expect(isReadyForInteraction('events-init')).toBe(false)
            expect(isReadyForInteraction('viewport-set')).toBe(false)
        })
    })

    describe('Logging behavior', () => {
        it('should log state transitions', () => {
            const { logr } = jest.requireMock('@/lib/utils/logr')
            
            appStateReducer('events-init', appActions.eventsLoaded(true))
            
            expect(logr.info).toHaveBeenCalledWith(
                'app-state',
                'EVENTS_LOADED: events-init → events-loaded'
            )
        })

        it('should log no change when state does not transition', () => {
            const { logr } = jest.requireMock('@/lib/utils/logr')
            
            appStateReducer('events-init', appActions.urlFiltersApplied())
            
            expect(logr.info).toHaveBeenCalledWith(
                'app-state',
                'URL_FILTERS_APPLIED: events-init, no change'
            )
        })
    })
})