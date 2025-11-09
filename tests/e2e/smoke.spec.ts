import { test, expect } from '@playwright/test'
import {
    captureConsoleLogs,
    captureAndReportLogsOnFailure,
    outputLogsOnFailure,
    verifyLogPatterns,
    reportErrors,
    extractCounts,
    LogPattern,
    CaptureLogsOptions,
} from './test-utils'

/**
 * SMOKE TESTS - Fast Critical Path Validation (<20 seconds)
 *
 * These tests verify the top 3 user workflows using stable test data (test:stable).
 * They run on every commit to catch breaking changes quickly.
 *
 * Test Data: Uses test:stable which provides 4 stable events:
 * - event-today-sf: Today 2pm PT in San Francisco
 * - event-weekend-oakland: Next Friday 6pm PT in Oakland
 * - event-tomorrow-berkeley: Tomorrow 10am PT in Berkeley
 * - event-unresolved: Today 8pm with unresolved location
 */

// Fast capture options for smoke tests
const SMOKE_CAPTURE_OPTIONS: CaptureLogsOptions = {
    timeout: 30000, // Increased to handle analytics requests
    waitForNetworkIdle: true,
    includeErrors: true,
    includeWarnings: false, // Skip warnings for speed
    additionalWaitTime: 2000, // Shorter wait than default
    maxWaitForLogs: 20000,
}

test.describe('Smoke Tests - Critical User Workflows', () => {
    // Automatically output console logs when tests fail
    test.afterEach(async ({ }, testInfo) => {
        await outputLogsOnFailure(testInfo)
    })

    test('Workflow 1: Load app with events', async ({ page }, testInfo) => {
        console.log('\n🧪 SMOKE TEST 1: Load app with events')
        console.log('📍 URL: /?es=test:stable')

        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/?es=test:stable', SMOKE_CAPTURE_OPTIONS)

        // Verify critical log patterns
        const expectedLogs: LogPattern[] = [
            {
                description: 'App reaches user-interactive state',
                logPattern: 'State: user-interactive',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
            },
            {
                description: 'Events loaded and visible',
                logPattern: 'State: user-interactive, Events: allEvents',
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    expect(counts.allEvents).toBeGreaterThan(0)
                    expect(counts.visibleEvents).toBeGreaterThan(0)
                    console.log(`   📊 Loaded ${counts.allEvents} events, ${counts.visibleEvents} visible`)
                },
            },
        ]

        verifyLogPatterns(logs, expectedLogs, 'Load app with events')

        // Verify no errors occurred
        const errorCount = reportErrors(logs, 'Load app with events')
        expect(errorCount).toBe(0)

        // Verify basic UI elements are visible
        await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
        await expect(page.getByRole('table').first()).toBeVisible() // Event list table

        console.log('✅ SMOKE TEST 1 PASSED: App loads successfully with events\n')
    })

    test('Workflow 2: View today\'s events (qf=today)', async ({ page }, testInfo) => {
        console.log('\n🧪 SMOKE TEST 2: View today\'s events')
        console.log('📍 URL: /?es=test:stable&qf=today')

        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/?es=test:stable&qf=today', SMOKE_CAPTURE_OPTIONS)

        // Verify critical log patterns
        const expectedLogs: LogPattern[] = [
            {
                description: 'Today quick filter processed',
                logPattern: 'Processing quick date filter: today',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'Date range filter applied',
                logPattern: '[FLTR_EVTS_MGR] setFilter: dateRange:',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'App reaches user-interactive with filtered events',
                logPattern: 'State: user-interactive, Events: allEvents',
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    // Should have events filtered by date (event-today-sf, event-unresolved)
                    expect(counts.visibleEvents).toBeGreaterThan(0)
                    console.log(`   📊 ${counts.visibleEvents} visible today, ${counts.byDate} filtered by date`)
                },
            },
        ]

        verifyLogPatterns(logs, expectedLogs, 'View today\'s events')

        // Verify no errors occurred
        const errorCount = reportErrors(logs, 'View today\'s events')
        expect(errorCount).toBe(0)

        // Verify date filter chip is visible
        const dateChip = page.locator('[data-testid="date-filter-chip"]')
        await expect(dateChip).toBeVisible()
        await expect(dateChip).toContainText(/filtered by date/i)

        console.log('✅ SMOKE TEST 2 PASSED: Today filter works correctly\n')
    })

    test('Workflow 3: View selected event from shared URL (se=)', async ({ page }, testInfo) => {
        console.log('\n🧪 SMOKE TEST 3: View selected event from shared URL')
        console.log('📍 URL: /?es=test:stable&se=event-today-sf')

        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/?es=test:stable&se=event-today-sf', SMOKE_CAPTURE_OPTIONS)

        // Verify critical log patterns
        const expectedLogs: LogPattern[] = [
            {
                description: 'Selected event ID processed from URL',
                logPattern: 'URL parsing: selectedEventIdUrl is set, checking if valid',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
                requiredInState: 'parsing-remaining-url',
            },
            {
                description: 'App reaches user-interactive state',
                logPattern: 'State: user-interactive',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
            },
        ]

        verifyLogPatterns(logs, expectedLogs, 'View selected event')

        // Verify no errors occurred
        const errorCount = reportErrors(logs, 'View selected event')
        expect(errorCount).toBe(0)

        // Verify map marker popup is visible (1 of 3 visual cues)
        const popup = page.locator('.maplibregl-popup')
        await expect(popup).toBeVisible({ timeout: 5000 })
        await expect(popup).toContainText('Today Event SF')

        // Verify event row is highlighted (2 of 3 visual cues)
        const eventRow = page.getByRole('row', { name: /today event sf/i })
        await expect(eventRow).toBeVisible()
        // Check for green highlight class (bg-green-200 or similar)
        await expect(eventRow).toHaveClass(/bg-green/)

        // Verify URL contains se parameter (3 of 3 visual cues)
        expect(page.url()).toContain('se=event-today-sf')

        console.log('✅ SMOKE TEST 3 PASSED: Selected event displays correctly\n')
    })
})
