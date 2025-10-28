import { test, expect } from '@playwright/test'
import {
    captureConsoleLogs,
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
    test('Workflow 1: Load app with events', async ({ page }) => {
        console.log('\n🧪 SMOKE TEST 1: Load app with events')
        console.log('📍 URL: /?es=test:stable')

        const logs = await captureConsoleLogs(page, '/?es=test:stable', SMOKE_CAPTURE_OPTIONS)

        // Verify critical log patterns
        const expectedLogs: LogPattern[] = [
            {
                description: 'App reaches user-interactive state',
                pattern: 'State: user-interactive',
            },
            {
                description: 'Events loaded and visible',
                pattern: 'State: user-interactive, Events: allEvents',
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

    test('Workflow 2: View today\'s events (qf=today)', async ({ page }) => {
        console.log('\n🧪 SMOKE TEST 2: View today\'s events')
        console.log('📍 URL: /?es=test:stable&qf=today')

        const logs = await captureConsoleLogs(page, '/?es=test:stable&qf=today', SMOKE_CAPTURE_OPTIONS)

        // Verify critical log patterns
        const expectedLogs: LogPattern[] = [
            {
                description: 'Today quick filter processed',
                pattern: 'Processing quick date filter: today',
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'Date range filter applied',
                pattern: '[FLTR_EVTS_MGR] setFilter: dateRange:',
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'App reaches user-interactive with filtered events',
                pattern: 'State: user-interactive, Events: allEvents',
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

    test('Workflow 3: View selected event from shared URL (se=)', async ({ page }) => {
        console.log('\n🧪 SMOKE TEST 3: View selected event from shared URL')
        console.log('📍 URL: /?es=test:stable&se=event-today-sf')

        const logs = await captureConsoleLogs(page, '/?es=test:stable&se=event-today-sf', SMOKE_CAPTURE_OPTIONS)

        // Verify critical log patterns
        const expectedLogs: LogPattern[] = [
            {
                description: 'Selected event ID processed from URL',
                pattern: 'URL parsing: selectedEventIdUrl is set, checking if valid',
                requiredInState: 'parsing-remaining-url',
            },
            {
                description: 'App reaches user-interactive state',
                pattern: 'State: user-interactive',
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
