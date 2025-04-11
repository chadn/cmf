/**
 * Tests for the logr utility
 */
import { logr } from '../logr'

// Mock console methods
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

// Mock process.env
const originalProcessEnv = process.env

describe('logr utility', () => {
    // Setup mocks before each test
    beforeEach(() => {
        jest.resetAllMocks()
        console.log = jest.fn()
        console.warn = jest.fn()
        console.error = jest.fn()

        // Reset the recent logs cache
        logr._recentLogs = {}

        // Reset log level to default
        logr._logLevel = 20 // INFO level

        // Restore process.env
        process.env = { ...originalProcessEnv }
    })

    // Restore original console methods after all tests
    afterAll(() => {
        console.log = originalConsoleLog
        console.warn = originalConsoleWarn
        console.error = originalConsoleError
        process.env = originalProcessEnv
    })

    describe('Log level constants', () => {
        it('provides constants for log levels', () => {
            expect(logr.getLogLevelNumber('DEBUG')).toBe(10)
            expect(logr.getLogLevelNumber('INFO')).toBe(20)
            expect(logr.getLogLevelNumber('WARN')).toBe(30)
            expect(logr.getLogLevelNumber('ERROR')).toBe(40)
        })
    })

    describe('setLogLevel function', () => {
        it('updates the log level with valid string input', () => {
            logr.setLogLevel('DEBUG')
            expect(logr._logLevel).toBe(10)

            logr.setLogLevel('ERROR')
            expect(logr._logLevel).toBe(40)
        })

        it('updates the log level with valid number input', () => {
            logr.setLogLevel(10)
            expect(logr._logLevel).toBe(10)

            logr.setLogLevel(40)
            expect(logr._logLevel).toBe(40)
        })

        it('warns on invalid input', () => {
            logr.setLogLevel('INVALID')
            expect(console.warn).toHaveBeenCalled()

            logr.setLogLevel(-1)
            expect(console.warn).toHaveBeenCalled()
        })
    })

    describe('logging methods', () => {
        it('logs debug messages when level is set to DEBUG', () => {
            logr.setLogLevel('DEBUG')

            logr.debug('test', 'debug message')
            expect(console.log).toHaveBeenCalled()
        })

        it('logs info messages when level is set to INFO or lower', () => {
            logr.setLogLevel('INFO')

            logr.info('test', 'info message')
            expect(console.log).toHaveBeenCalled()
        })

        it('logs warn messages when level is set to WARN or lower', () => {
            logr.setLogLevel('WARN')

            logr.warn('test', 'warn message')
            expect(console.log).toHaveBeenCalled()
        })

        it('logs error messages when level is set to ERROR or lower', () => {
            logr.setLogLevel('ERROR')

            logr.error('test', 'error message')
            expect(console.log).toHaveBeenCalled()
        })

        it('skips lower priority logs based on log level', () => {
            // Explicitly set log level to WARN for this test
            logr.setLogLevel('WARN') // WARN level = 30

            // This should not be logged since DEBUG < WARN
            logr.debug('test', 'debug message')
            expect(console.log).not.toHaveBeenCalled()

            jest.clearAllMocks() // Clear mock to verify next call

            // This should not be logged since INFO < WARN
            logr.info('test', 'info message')
            expect(console.log).not.toHaveBeenCalled()

            jest.clearAllMocks() // Clear mock to verify next call

            // This should be logged since WARN >= WARN
            logr.warn('test', 'warn message')
            expect(console.log).toHaveBeenCalled()
        })

        it('includes additional data in log messages when provided', () => {
            // Explicitly set log level to DEBUG for this test
            logr.setLogLevel('DEBUG') // DEBUG level = 10
            const testData = { id: 1, name: 'test' }

            logr.info('test', 'message with data', testData)
            expect(console.log).toHaveBeenCalled()
        })

        it('handles repeated logs', () => {
            // Explicitly set log level to DEBUG for this test
            logr.setLogLevel('DEBUG') // DEBUG level = 10

            // First call should be logged
            logr.info('test', 'duplicate message')
            expect(console.log).toHaveBeenCalled()

            // Clear mock to verify next call
            jest.clearAllMocks()

            // For this specific test case, we'll mock the recentlyCalled method
            // to simulate the behavior when a log was recently called
            const originalRecentlyCalled = logr.recentlyCalled
            logr.recentlyCalled = jest.fn().mockReturnValue(true)

            // Second call with same params should not be logged
            logr.info('test', 'duplicate message')
            expect(console.log).not.toHaveBeenCalled()

            // Restore the original method
            logr.recentlyCalled = originalRecentlyCalled
        })
    })
})
