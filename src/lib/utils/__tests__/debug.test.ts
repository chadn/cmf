import { debugLog, clientDebug } from '../debug'

describe('Debug Utilities', () => {
    let originalConsoleLog: any
    let originalConsoleError: any
    let mockConsoleLog: jest.Mock
    let mockConsoleError: jest.Mock
    let originalEnv: any

    beforeEach(() => {
        // Save original console methods
        originalConsoleLog = console.log
        originalConsoleError = console.error

        // Mock console methods
        mockConsoleLog = jest.fn()
        mockConsoleError = jest.fn()
        console.log = mockConsoleLog
        console.error = mockConsoleError

        // Save original env
        originalEnv = process.env
    })

    afterEach(() => {
        // Restore console methods
        console.log = originalConsoleLog
        console.error = originalConsoleError

        // Restore env
        process.env = originalEnv
    })

    describe('debugLog', () => {
        it('logs when DEBUG_LOGIC is true', () => {
            process.env.DEBUG_LOGIC = 'true'
            debugLog('test', 'Test message')
            expect(mockConsoleLog).toHaveBeenCalled()
        })

        it('does not log when DEBUG_LOGIC is false', () => {
            process.env.DEBUG_LOGIC = 'false'
            debugLog('test', 'Test message')
            expect(mockConsoleLog).not.toHaveBeenCalled()
        })

        it('includes data when provided', () => {
            process.env.DEBUG_LOGIC = 'true'
            const testData = { foo: 'bar' }
            debugLog('test', 'Test message', testData)
            expect(mockConsoleLog).toHaveBeenCalled()
        })
    })

    describe('clientDebug', () => {
        it('logs when DEBUG_LOGIC is true', () => {
            process.env.DEBUG_LOGIC = 'true'
            clientDebug.log('test', 'Test message')
            expect(mockConsoleLog).toHaveBeenCalled()
        })

        it('does not log when DEBUG_LOGIC is false', () => {
            process.env.DEBUG_LOGIC = 'false'
            clientDebug.log('test', 'Test message')
            expect(mockConsoleLog).not.toHaveBeenCalled()
        })

        it('logs errors with error console method', () => {
            process.env.DEBUG_LOGIC = 'true'
            clientDebug.error('test', 'Test error')
            expect(mockConsoleError).toHaveBeenCalled()
        })

        it('includes error object when provided', () => {
            process.env.DEBUG_LOGIC = 'true'
            const testError = new Error('Test error object')
            clientDebug.error('test', 'Test error message', testError)
            expect(mockConsoleError).toHaveBeenCalled()
        })
    })
})
