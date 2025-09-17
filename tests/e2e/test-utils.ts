import { Page, expect } from '@playwright/test'

// ===== SHARED INTERFACES AND TYPES =====

export interface ConsoleMessage {
    type: string
    text: string
    timestamp: Date
    url?: string
    location?: string
}

export interface LogPattern {
    pattern: string | RegExp
    description: string
    required?: boolean // normally true, but can be false to temporarily skip a test
    requiredInState?: string // Expected application state when this pattern should occur
    cb?: (logs: string[]) => void // Callback function to run when pattern matches
}

export interface EventCountExpectations {
    hasVisibleEvents?: boolean
    hasAllEvents?: boolean
    hasFilteredCounts?: boolean
    minVisibleEvents?: number
    maxVisibleEvents?: number
}

export interface PageLoadTestCase {
    name: string
    url: string
    expectedLogs: LogPattern[]
    expectedEventCounts?: EventCountExpectations
    timeout?: number
    additionalWaitTime?: number
    skip?: boolean
    timezoneId?: string
}

export interface CaptureLogsOptions {
    timeout?: number
    waitForNetworkIdle?: boolean
    includeErrors?: boolean
    includeWarnings?: boolean
    waitForSpecificLog?: string
    additionalWaitTime?: number
    maxWaitForLogs?: number
}

// ===== CONSOLE LOG UTILITIES =====

export function extractCounts(logEntry: ConsoleMessage | string): {
    state: string
    visibleEvents: number
    allEvents: number
    byMap: number
    bySearch: number
    byDate: number
    byLocationFilter: number
} {
    const logText = typeof logEntry === 'string' ? logEntry : logEntry.text
    const matches = logText.match(
        /State: (\S+), Events: allEvents:(\d+) visibleEvents:(\d+) \{"byMap":(\d+),"bySearch":(\d+),"byDate":(\d+),"byLocationFilter":(\d+)\}/
    )
    if (!matches) {
        throw new Error(`Could not extract counts from log: "${logText}"`)
    }
    return {
        state: matches[1],
        allEvents: parseInt(matches[2]),
        visibleEvents: parseInt(matches[3]),
        byMap: parseInt(matches[4]),
        bySearch: parseInt(matches[5]),
        byDate: parseInt(matches[6]),
        byLocationFilter: parseInt(matches[7]),
    }
}

/**
 * Utility function to capture console logs from a page
 */
export async function captureConsoleLogs(
    page: Page,
    url: string,
    options?: CaptureLogsOptions
): Promise<ConsoleMessage[]> {
    const logs: ConsoleMessage[] = []
    const {
        timeout = 15000,
        waitForNetworkIdle = true,
        includeErrors = true,
        includeWarnings = true,
        waitForSpecificLog,
        additionalWaitTime = 3000,
        maxWaitForLogs = 30000,
    } = options || {}

    let lastLogTime = Date.now()
    let logStabilized = false

    // Capture console messages
    page.on('console', (msg) => {
        const shouldCapture =
            msg.type() === 'log' ||
            (includeErrors && msg.type() === 'error') ||
            (includeWarnings && msg.type() === 'warning')

        if (shouldCapture) {
            lastLogTime = Date.now()
            logs.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: new Date(),
                url: page.url(),
                location: msg.location() ? `${msg.location().url}:${msg.location().lineNumber}` : undefined,
            })

            if (waitForSpecificLog && msg.text().includes(waitForSpecificLog)) {
                logStabilized = true
            }
        }
    })

    // Capture page errors
    if (includeErrors) {
        page.on('pageerror', (error) => {
            lastLogTime = Date.now()
            logs.push({
                type: 'pageerror',
                text: error.message,
                timestamp: new Date(),
                url: page.url(),
            })
        })
    }

    console.log(`Navigating to: ${url}`)

    try {
        await page.goto(url, {
            timeout,
            waitUntil: waitForNetworkIdle ? 'networkidle' : 'domcontentloaded',
        })

        console.log('Page loaded, waiting for logs to stabilize...')

        const startTime = Date.now()
        while (Date.now() - startTime < maxWaitForLogs) {
            const timeSinceLastLog = Date.now() - lastLogTime

            if (waitForSpecificLog && logStabilized && timeSinceLastLog > 1000) {
                console.log(`Found specific log: "${waitForSpecificLog}", finishing early`)
                break
            }

            if (timeSinceLastLog > additionalWaitTime) {
                console.log(`Logs stabilized after ${timeSinceLastLog}ms of silence`)
                break
            }

            await page.waitForTimeout(500)
        }

        await page.waitForTimeout(1000)
    } catch (error) {
        console.error('Error during page load:', error)
    }

    console.log(`Captured ${logs.length} console messages`)
    return logs
}

/**
 * Pretty-print console logs with formatting
 */
export function printConsoleLogs(logs: ConsoleMessage[], title = 'Console Logs') {
    console.log(`\n${'='.repeat(50)}`)
    console.log(`=== ${title} (${logs.length} messages) ===`)
    console.log(`${'='.repeat(50)}`)

    logs.forEach((log, index) => {
        const timestamp = log.timestamp.toISOString().split('T')[1].split('.')[0]
        const location = log.location ? ` [${log.location}]` : ''
        console.log(
            `${String(index + 1).padStart(3)}. [${timestamp}] ${log.type.toUpperCase()}: ${log.text}${location}`
        )
    })

    console.log(`=== End ${title} (${logs.length} messages) ===\n`)
}

// ===== LOG PATTERN VERIFICATION =====

/**
 * Verify that specific log patterns appear in the captured logs with optional state checking
 */
export function verifyLogPatterns(logs: ConsoleMessage[], expectedLogs: LogPattern[], testName: string) {
    console.log(`\nVerifying log patterns for: ${testName}`)

    for (const expected of expectedLogs) {
        const { pattern, description, required = true, requiredInState, cb } = expected

        let curState: string | null = null
        const matchingLogs: string[] = []

        // Iterate over all console logs as strings one time
        for (const log of logs) {
            const logText = log.text

            // Check for state transitions
            const transitionMatch = logText.match(/\[APP_STATE\].*?changing:\s*(\w[\w-]*)\s*to\s*(\w[\w-]*)/)
            if (transitionMatch) {
                curState = transitionMatch[2] // Update to new state
            }

            // Check if pattern matches (only if in required state or no state requirement)
            if (!requiredInState || (requiredInState && curState === requiredInState)) {
                let patternMatches = false
                if (typeof pattern === 'string') {
                    patternMatches = logText.includes(pattern)
                } else {
                    patternMatches = pattern.test(logText)
                }

                if (patternMatches) {
                    matchingLogs.push(logText)
                }
            }
        }

        // Handle results
        const stateLog = requiredInState ? `in appState ${requiredInState}` : 'in any appState'
        if (cb && matchingLogs.length > 0) {
            try {
                console.log(`\n🔧 Running callback for: ${description}`)
                cb(matchingLogs)
                console.log(`✅ Callback successful: ${description}`)
            } catch (error) {
                console.log(`❌ Callback failed: ${error}`)
                throw error
            }
        } else if (matchingLogs.length > 0) {
            console.log(`[PASS ✅] ${description}: FOUND ${stateLog}`)
        } else {
            console.log(`[FAIL ❌] ${description}: PATTERN NOT FOUND ${stateLog}: ${pattern}`)
            if (required) {
                expect(matchingLogs.length).toBeGreaterThan(0)
            }
        }
    }
}

// ===== ERROR LOG UTILITIES =====

/**
 * Filter and report error logs from captured logs
 */
export function findErrorLogs(logs: ConsoleMessage[]): ConsoleMessage[] {
    return logs.filter(
        (log) =>
            log.type === 'error' ||
            log.type === 'pageerror' ||
            log.text.toLowerCase().includes('error') ||
            log.text.toLowerCase().includes('failed')
    )
}

/**
 * Print error summary if any errors are found
 */
export function reportErrors(logs: ConsoleMessage[], testName: string): number {
    const errorLogs = findErrorLogs(logs)

    if (errorLogs.length > 0) {
        console.log(`\nFound ${errorLogs.length} potential errors in ${testName}:`)
        errorLogs.forEach((log) => console.log(`   - ${log.text}`))
    } else {
        console.log(`\nNo errors found in ${testName}`)
    }

    return errorLogs.length
}

// ===== TEST CONFIGURATION AND CONSTANTS =====

/**
 * Default options for console log capture
 */
export const DEFAULT_CAPTURE_OPTIONS: CaptureLogsOptions = {
    timeout: 20000,
    waitForNetworkIdle: true,
    includeErrors: true,
    includeWarnings: true,
    additionalWaitTime: 5000,
    maxWaitForLogs: 45000,
}
