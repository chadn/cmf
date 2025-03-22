/**
 * Debug utility for logging application flow
 * Only logs when DEBUG_LOGIC environment variable is set to true
 */

// Check if debug logging is enabled
const isDebugEnabled = process.env.DEBUG_LOGIC === 'true'

// Cache to store recently logged messages with timestamps
const recentLogs: Record<string, number> = {}

/**
 * Helper function to check if a message was recently logged
 * @param area - The area of the application
 * @param message - The debug message
 * @param data - Optional data to log
 * @returns boolean - True if the message was recently logged, false otherwise
 */
function wasRecentlyLogged(area: string, message: string, data?: any): boolean {
    const now = Date.now()
    const recentInMs = 500 // was 1000ms 
    let datastr = ''
    try {
        datastr = JSON.stringify(data || '')
    } catch (error) {
        console.error('Error JSON.stringify:', error)
        return true // Return true to skip logging
    }
    const logKey = `${area}:${message}:${datastr}`

    // Check if this exact message was logged in the last second
    if (recentLogs[logKey] && now - recentLogs[logKey] < recentInMs) {
        return true // Was recently logged
    }

    // Update the timestamp for this message
    recentLogs[logKey] = now

    // Clean up old entries from recentLogs to prevent memory leaks
    // Only do this occasionally to avoid performance impact
    if (Math.random() < 0.1) {
        // ~10% chance to clean up on each log
        const recentCutoffTime = now - recentInMs
        for (const key in recentLogs) {
            if (recentLogs[key] < recentCutoffTime) {
                delete recentLogs[key]
            }
        }
    }

    return false // Was not recently logged
}

/**
 * Log debug information if DEBUG_LOGIC is enabled
 * Rate limited to prevent the same message from being logged more than once per second
 * @param area - The area of the application (e.g., 'calendar', 'map', 'geocoding')
 * @param message - The debug message
 * @param data - Optional data to log
 */
export function debugLog(area: string, message: string, data?: any): void {
    // Check if debug logging is enabled
    if (!isDebugEnabled) return

    // Get current environment
    const isBrowser = typeof window !== 'undefined'
    // For browser-specific logs, only show them in the browser
    if (area === 'browser' && !isBrowser) return
    // For server-specific logs, only show them on the server
    if (area === 'server' && isBrowser) return

    // Skip if this message was recently logged
    if (wasRecentlyLogged(area, message, data)) return

    const timestamp = new Date().toISOString()
    const prefix = `[DEBUG][${timestamp}][${area.toUpperCase()}]`

    if (data) {
        console.log(`${prefix} ${message}`, data)
    } else {
        console.log(`${prefix} ${message}`)
    }
}

/**
 * Client-side debug utility
 * This function is created during SSR but only logs when DEBUG_LOGIC is true
 */
export const clientDebug = {
    // Cache to store recently logged messages with timestamps
    _recentLogs: {} as Record<string, number>,

    // Helper function to check if a message was recently logged
    recentlyCalled: (
        area: string,
        message: string,
        data?: any,
        isError: boolean = false
    ): boolean => {
        const now = Date.now()
        const prefix = isError ? 'error:' : ''
        let datastr = ''
        try {
            datastr = JSON.stringify(data || '')
        } catch (error) {
            console.error('Error JSON.stringify:', error)
            return true // Return true to skip logging
        }
        const logKey = `${prefix}${area}:${message}:${datastr}`

        // Check if this exact message was logged in the last second
        if (
            clientDebug._recentLogs[logKey] &&
            now - clientDebug._recentLogs[logKey] < 1000
        ) {
            return true // Was recently called
        }

        // Update the timestamp for this message
        clientDebug._recentLogs[logKey] = now

        // Clean up old entries occasionally
        if (Math.random() < 0.1) {
            const oneSecondAgo = now - 1000
            for (const key in clientDebug._recentLogs) {
                if (clientDebug._recentLogs[key] < oneSecondAgo) {
                    delete clientDebug._recentLogs[key]
                }
            }
        }

        return false // Was not recently called
    },

    // General client log
    log: (area: string, message: string, data?: any) => {
        if (
            isDebugEnabled &&
            !clientDebug.recentlyCalled(area, message, data)
        ) {
            const timestamp = new Date().toISOString()
            const prefix = `[DEBUG][${timestamp}][CLIENT-${area.toUpperCase()}]`

            if (data) {
                console.log(`${prefix} ${message}`, data)
            } else {
                console.log(`${prefix} ${message}`)
            }
        }
    },

    // Log errors
    error: (area: string, message: string, error?: any) => {
        if (
            isDebugEnabled &&
            !clientDebug.recentlyCalled(area, message, error, true)
        ) {
            const timestamp = new Date().toISOString()
            const prefix = `[DEBUG][${timestamp}][CLIENT-ERROR-${area.toUpperCase()}]`

            if (error) {
                console.error(`${prefix} ${message}`, error)
            } else {
                console.error(`${prefix} ${message}`)
            }
        }
    },
}
