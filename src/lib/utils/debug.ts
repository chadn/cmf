/**
 * Debug utility for logging application flow
 * Only logs when DEBUG_LOGIC environment variable is set to true
 */

// Check if debug logging is enabled
const isDebugEnabled = process.env.DEBUG_LOGIC === 'true'

/**
 * Log debug information if DEBUG_LOGIC is enabled
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
    // General client log
    log: (area: string, message: string, data?: any) => {
        if (isDebugEnabled) {
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
        if (isDebugEnabled) {
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
