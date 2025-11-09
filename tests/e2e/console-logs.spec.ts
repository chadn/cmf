import { test, expect } from '@playwright/test'
import {
    captureConsoleLogs,
    captureAndReportLogsOnFailure,
    outputLogsOnFailure,
    printConsoleLogs,
    reportErrors,
    ConsoleMessage,
    DEFAULT_CAPTURE_OPTIONS,
} from './test-utils'

// Functions now imported from test-utils.ts
test('test with custom (LA) timezone', async ({ browser }, testInfo) => {
    // Create a new context with timezone override
    const context = await browser.newContext({
        timezoneId: 'America/Los_Angeles',
    })

    const page = await context.newPage()
    await page.goto('https://google.com')

    // Example: check the browser thinks it’s in LA
    const tz = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)
    expect(tz).toBe('America/Los_Angeles')

    await context.close()
})

test.describe('Console Log Debugging', () => {
    // Automatically output console logs when tests fail
    test.afterEach(async ({ }, testInfo) => {
        await outputLogsOnFailure(testInfo)
    })

    test.skip('capture console logs from home page', async ({ page }, testInfo) => {
        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/')

        printConsoleLogs(logs, 'Home Page Console Logs')

        // Basic assertions - adjust these based on what you expect
        expect(logs.length).toBeGreaterThan(0) // Should have some logs

        // Check for critical errors that might indicate app is broken
        reportErrors(logs, 'Home Page')
    })

    test('capture console logs from custom URL', async ({ page }, testInfo) => {
        // You can easily change this URL to test different pages/states
        const testUrl = process.env.TEST_URL || '/'

        const logs = await captureAndReportLogsOnFailure(page, testInfo, testUrl, DEFAULT_CAPTURE_OPTIONS)

        printConsoleLogs(logs, `Console Logs from ${testUrl}`)

        // Log summary
        const logTypes = logs.reduce(
            (acc: Record<string, number>, log: ConsoleMessage) => {
                acc[log.type] = (acc[log.type] || 0) + 1
                return acc
            },
            {} as Record<string, number>
        )

        console.log('\n📊 Log Summary:')
        Object.entries(logTypes).forEach(([type, count]) => {
            console.log(`- ${type}: ${count}`)
        })

        // Report any errors found
        const errorCount = reportErrors(logs, testUrl)

        // This test always passes - it's just for debugging
        console.log(`\n📈 Test completed with ${logs.length} total logs and ${errorCount} potential errors`)
        expect(true).toBe(true)
    })

    test.skip('check for specific log patterns', async ({ page }, testInfo) => {
        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/')

        printConsoleLogs(logs, 'Pattern Matching Console Logs')

        // Look for common CMF app patterns
        const mapLogs = logs.filter(
            (log: ConsoleMessage) =>
                log.text.toLowerCase().includes('map') || log.text.toLowerCase().includes('maplibre')
        )

        const eventLogs = logs.filter(
            (log: ConsoleMessage) =>
                log.text.toLowerCase().includes('event') || log.text.toLowerCase().includes('geocod')
        )

        const errorLogs = logs.filter(
            (log: ConsoleMessage) =>
                log.type === 'error' || log.type === 'pageerror' || log.text.toLowerCase().includes('error')
        )

        console.log(`\nMap-related logs: ${mapLogs.length}`)
        mapLogs.forEach((log: ConsoleMessage) => console.log(`   - ${log.text}`))

        console.log(`\nEvent-related logs: ${eventLogs.length}`)
        eventLogs.forEach((log: ConsoleMessage) => console.log(`   - ${log.text}`))

        console.log(`\nError logs: ${errorLogs.length}`)
        errorLogs.forEach((log: ConsoleMessage) => console.log(`   - ${log.text}`))

        // Store results for debugging
        expect(logs.length).toBeGreaterThanOrEqual(0)
    })
})

// Utility functions now exported from test-utils.ts
