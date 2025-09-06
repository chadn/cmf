/**
 * Logging utility for client and server
 */
export const logr = {
    // Cache to store recently logged messages with timestamps
    _recentLogs: {} as Record<string, number>,
    _logLevel: 20, // default to INFO
    _debugArea: [] as string[], // default to no debug areas
    getLogLevelNumber: (level?: string) => {
        if (level) {
            switch (level) {
                case 'DEBUG':
                    return 10
                case 'INFO':
                    return 20
                case 'WARN':
                    return 30
                case 'ERROR':
                    return 40
                default:
                    return 0
            }
        } else {
            return logr._logLevel // default to INFO
        }
    },
    getLogLevelString: (level?: number) => {
        const levelNumber = level || logr._logLevel
        switch (levelNumber) {
            case 10:
                return 'DEBUG'
            case 20:
                return 'INFO'
            case 30:
                return 'WARN'
            case 40:
                return 'ERROR'
            default:
                return 'INFO'
        }
    },
    /**
     * Set the log level
     * @param level - The log level to set
     */
    setLogLevel: (level: string | number) => {
        const logLevel = typeof level === 'string' ? logr.getLogLevelNumber(level) : level
        if (logLevel > 0) {
            logr._logLevel = logLevel
        } else {
            console.warn('Invalid LOG_LEVEL:', level)
        }
        logr.info(
            'logr',
            `Log level set to ${logr.getLogLevelString()}, process.env.LOG_LEVEL: ${process.env.LOG_LEVEL}`
        )
    },
    setDebugArea: (area: string) => {
        logr._debugArea = area.trim().toLowerCase().split(',')
    },
    // Helper function to check if a message was recently logged
    recentlyCalled: (area: string, message: string, data?: unknown): boolean => {
        // In test environment, we'll bypass the recent check to avoid timing issues
        if (process.env.NODE_ENV === 'test') {
            return false
        }

        const now = Date.now()
        const recentInMs = 100 // was 1000ms
        let datastr = ''
        try {
            datastr = JSON.stringify(data || '')
        } catch (error) {
            // TODO: this can also generate lots of logs, so consider using recentlyCalled to log this.
            console.error('Error JSON.stringify:', error)
            return true // Return true to skip logging
        }
        const logKey = `${area}:${message}:${datastr}`

        // Check if this exact message was logged within recentInMs
        if (logr._recentLogs[logKey] && now - logr._recentLogs[logKey] < recentInMs) {
            return true // Was recently called
        }

        // Update the timestamp for this message
        logr._recentLogs[logKey] = now

        // Clean up old entries occasionally
        if (Math.random() < 0.1) {
            const recentCutoffTime = now - recentInMs
            for (const key in logr._recentLogs) {
                if (logr._recentLogs[key] < recentCutoffTime) {
                    delete logr._recentLogs[key]
                }
            }
        }

        return false // Was not recently called
    },

    /*  General client log
     *
     * @param area - The area of the application (e.g., 'calendar', 'map', 'geocoding')
     * @param message - The debug message
     * @param data - Optional data to log
     */
    logLevel: (level: string | number, area: string, message: string, data?: unknown) => {
        const logLevel = typeof level === 'string' ? logr.getLogLevelNumber(level) : level
        let alwaysLog = false

        // If debug area is set, always log debug level for that area even if logr._logLevel is higher
        if (logr._debugArea.length > 0 && logr._debugArea.includes(area.trim().toLowerCase())) {
            alwaysLog = true
        }
        // Only log if the message's level is greater than or equal to the current log level
        if (logLevel < logr._logLevel && !alwaysLog) return

        const currentLevel = logr.getLogLevelString(logLevel)
        if (!logr.recentlyCalled(area, message, data)) {
            const timestamp = formatTimestamp(new Date(), 'America/Los_Angeles')
            const prefix = `[${timestamp}][${currentLevel.toUpperCase()}][${area.toUpperCase()}]`

            if (data) {
                console.log(`${prefix} ${message}`, data)
            } else {
                console.log(`${prefix} ${message}`)
            }
        }
    },

    /*  General client log
     *
     * @param area - The area of the application (e.g., 'calendar', 'map', 'geocoding')
     * @param message - The debug message
     * @param data - Optional data to log
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    skip: (_area: string, _message: string, _data?: unknown) => {
        // No-op function for skipped logs
    },
    debug: (area: string, message: string, data?: unknown) => {
        return logr.logLevel('DEBUG', area, message, data)
    },
    info: (area: string, message: string, data?: unknown) => {
        return logr.logLevel('INFO', area, message, data)
    },
    warn: (area: string, message: string, data?: unknown) => {
        return logr.logLevel('WARN', area, message, data)
    },
    error: (area: string, message: string, data?: unknown) => {
        return logr.logLevel('ERROR', area, message, data)
    },
}

/**
 * Formats a date in America/Los_Angeles timezone with format YYYY-MM-DD.HH:MM:SS
 * @param date - Date to format (defaults to current date)
 * @returns Formatted date string
 */
export function formatTimestamp(date: Date = new Date(), timezone: string = 'America/Los_Angeles'): string {
    const msec = date.getMilliseconds().toString().padStart(3, '0')
    return date
        .toLocaleString('en-US', {
            timeZone: timezone,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
        })
        .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+):(\d+)/, `$3-$1-$2.$4:$5:$6.${msec}`)
}

logr.setLogLevel(process.env.LOG_LEVEL || 'INFO') // WAS DEBUG_LOGIC
logr.setDebugArea(process.env.LOG_DEBUG_AREA || '')
