import { Page, expect, TestInfo } from '@playwright/test'

// ===== SHARED INTERFACES AND TYPES =====

export interface ConsoleMessage {
    type: string
    text: string
    timestamp: Date
    url?: string
    location?: string
}

/**
 * Defines a log pattern to search for and verify in captured console logs.
 *
 * Use this interface to specify what log messages to look for and how to validate them.
 */
export interface LogPattern {
    /** The exact string pattern to search for in console log messages */
    logPattern: string

    /** Human-readable description of what this pattern verifies (for test output) */
    description: string

    /** Optional: Only match logs that occur in this specific application state */
    requiredInState?: string

    /**
     * Optional callback for data extraction - called ONLY when matches are found.
     *
     * Use this when you need to:
     * - Extract and validate specific data from matching logs
     * - Perform complex assertions on log content
     * - Parse structured data from log messages
     *
     * @param matchingLogs - Array of matching log strings (guaranteed non-empty)
     * @example
     * cb: (logs) => {
     *     const counts = extractCounts(logs[logs.length - 1])
     *     expect(counts.visibleEvents).toBeGreaterThan(0)
     * }
     */
    cb?: (matchingLogs: string[]) => void

    /**
     * Optional callback for assertions - ALWAYS called, even with zero matches.
     *
     * Use this when you need to:
     * - Assert that a log pattern exists (or doesn't exist)
     * - Verify the presence/absence of specific log messages
     * - Make test failures point to the exact test file line (not test-utils.ts)
     *
     * @param matchingLogs - Array of matching log strings (may be empty)
     * @example
     * assertMatch: (logs) => expect(logs.length).toBeGreaterThan(0)
     */
    assertMatch?: (matchingLogs: string[]) => void
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
 * Captures console logs and automatically attaches them to test results for failure debugging.
 *
 * Use this instead of captureConsoleLogs() when you want logs to automatically appear
 * in test output if the test fails.
 *
 * @param page - The Playwright page instance
 * @param testInfo - The TestInfo object from Playwright (available in test context)
 * @param url - The URL to navigate to
 * @param options - Optional capture configuration
 * @returns Promise<ConsoleMessage[]> - Captured console logs
 *
 * @example
 * test('my test', async ({ page }, testInfo) => {
 *     const logs = await captureAndReportLogsOnFailure(page, testInfo, '/?es=test:stable')
 *     // ... test assertions ...
 * })
 */
export async function captureAndReportLogsOnFailure(
    page: Page,
    testInfo: TestInfo,
    url: string,
    options?: CaptureLogsOptions
): Promise<ConsoleMessage[]> {
    const logs = await captureConsoleLogs(page, url, options)

    // Attach logs to test results - will appear in HTML report and can be accessed in afterEach
    testInfo.attach('console-logs', {
        body: JSON.stringify(logs.map(log => ({
            type: log.type,
            text: log.text,
            timestamp: log.timestamp.toISOString(),
            url: log.url,
            location: log.location
        })), null, 2),
        contentType: 'application/json'
    })

    return logs
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
        const { logPattern, description, requiredInState, cb, assertMatch } = expected

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
                if (logText.includes(logPattern)) {
                    matchingLogs.push(logText)
                }
            }
        }

        // Handle results
        const stateLog = requiredInState ? `appState ${requiredInState}` : 'any appState'
        if (cb && matchingLogs.length > 0) {
            try {
                console.log(`\n🔧 Running cb() callback for: ${description}`)
                cb(matchingLogs)
                console.log(`✅ Callback successful: ${description}`)
            } catch (error) {
                console.log(`❌ Callback failed: ${error}`)
                throw error
            }
        }
        if (assertMatch) {
            try {
                console.log(`\n🔧 Running assertMatch() callback for: ${description}`)
                assertMatch(matchingLogs)
                console.log(`✅ Callback successful: ${description}`)
            } catch (error) {
                console.log(`❌ Callback assertMatch() failed/error: ${error}`)
                console.log(`ALL ${logs.length} LOGS, since none matched logPattern="${logPattern}"\n` + logs.map((log) => log.text).join('\n'))
                throw error
            }
        }
        if (!cb && !assertMatch && matchingLogs.length > 0) {
            console.log(`[PASS ✅] ${description}: FOUND in ${stateLog}`)
        } else if (!cb && !assertMatch) {
            console.log(`[FAIL ❌] description="${description}". Pattern NOT FOUND in ${stateLog}. Pattern="${logPattern}"`)
            expect(matchingLogs.length).toBeGreaterThan(0) // should not happen, transition test to use assertMatch
        }
        if (matchingLogs.length == 0) {
            console.log(`ALL ${logs.length} LOGS, since none matched logPattern="${logPattern}"\n` + logs.map((log) => log.text).join('\n'))
        }
    }
}

// ===== ERROR LOG UTILITIES =====

/**
 * Filter and report error logs from captured logs
 */
export function findErrorLogs(logs: ConsoleMessage[]): ConsoleMessage[] {
    return logs.filter((log) => {
        // Only include actual error and pageerror types
        // Do NOT check text content for "error" or "failed" keywords - too many false positives
        return log.type === 'error' || log.type === 'pageerror'
    })
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

/**
 * Outputs all console logs to the terminal when a test fails.
 *
 * Call this in an afterEach hook to automatically print logs for failed tests.
 *
 * @param testInfo - The TestInfo object from Playwright
 *
 * @example
 * test.afterEach(async ({ }, testInfo) => {
 *     await outputLogsOnFailure(testInfo)
 * })
 */
export async function outputLogsOnFailure(testInfo: TestInfo) {
    // Only output logs if test failed
    if (testInfo.status !== 'passed' && testInfo.status !== 'skipped') {
        const logsAttachment = testInfo.attachments.find(a => a.name === 'console-logs')

        if (logsAttachment && logsAttachment.body) {
            try {
                const logs: ConsoleMessage[] = JSON.parse(logsAttachment.body.toString())
                console.log('\n' + '='.repeat(80))
                console.log(`❌ TEST FAILED: ${testInfo.title}`)
                console.log('='.repeat(80))
                console.log(`\n📋 CONSOLE LOGS (${logs.length} messages):\n`)
                console.log(logs.map(log => log.text).join('\n'))      
            } catch (error) {
                console.error('Failed to parse console logs:', error)
            }
        }
    }
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
