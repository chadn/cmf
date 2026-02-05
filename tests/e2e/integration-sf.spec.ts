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
 * SF API INTEGRATION TESTS (@integration @slow)
 *
 * These tests use the REAL San Francisco event API (es=sf) to verify:
 * - API integration works correctly
 * - Geocoding works with real addresses
 * - Performance with hundreds of real events
 * - End-to-end user experience
 *
 * These tests are SLOWER and may be FLAKY due to:
 * - Network latency
 * - API rate limits or downtime
 * - Real data changes over time
 *
 * Run these tests:
 * - Before releases
 * - Nightly builds
 * - When verifying SF API integration
 *
 * DO NOT run on every commit (use smoke tests instead).
 *
 * Usage:
 *   npm run test:e2e:integration       # Run only these tests
 *   npm run test:e2e -- --grep @slow  # Run all slow tests
 */

// Increased timeout for real API calls
const SF_API_CAPTURE_OPTIONS: CaptureLogsOptions = {
    timeout: 60000, // 60s for real API
    waitForNetworkIdle: true,
    includeErrors: true,
    includeWarnings: false,
    additionalWaitTime: 5000, // Extra time for geocoding
    maxWaitForLogs: 45000,
}

test.describe('SF API Integration Tests @integration @slow', () => {
    // Automatically output console logs when tests fail
    test.afterEach(async ({ }, testInfo) => {
        await outputLogsOnFailure(testInfo)
    })

    test('Load real SF events and verify API integration', async ({ page }, testInfo) => {
        console.log('\n🌐 INTEGRATION TEST: Real SF API')
        console.log('📍 URL: /?es=sf')
        console.log('⚠️  This test uses real API calls and may be slower/flaky')

        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/?es=sf', SF_API_CAPTURE_OPTIONS)

        // Verify critical log patterns
        const expectedLogs: LogPattern[] = [
            {
                description: 'App reaches user-interactive state',
                logPattern: 'State: user-interactive',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
            },
            {
                description: 'Real SF events loaded (should be 100+ events)',
                logPattern: 'State: user-interactive, Events: allEvents',
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    console.log(`   📊 Loaded ${counts.allEvents} SF events, ${counts.visibleEvents} visible`)

                    // SF API should return many events (typically 200-400)
                    expect(counts.allEvents).toBeGreaterThan(100)
                    expect(counts.visibleEvents).toBeGreaterThan(0)

                    // Reasonable upper bound (API shouldn't return 5,000+ events)
                    expect(counts.allEvents).toBeLessThan(5000)
                },
            },
        ]

        verifyLogPatterns(logs, expectedLogs, 'SF API Integration')

        // Verify no errors occurred
        const errorCount = reportErrors(logs, 'SF API Integration')
        expect(errorCount).toBe(0)

        // Verify map and event list rendered
        await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible()
        await expect(page.getByRole('table').first()).toBeVisible()

        // Verify we have many event rows (should be 100+)
        const eventRows = page.locator('tbody tr')
        const rowCount = await eventRows.count()
        console.log(`   📊 Event list showing ${rowCount} rows`)
        expect(rowCount).toBeGreaterThan(50) // At least 50 visible events

        console.log('✅ SF API Integration test passed\n')
    })

    test('Real geocoding works with SF search', async ({ page }, testInfo) => {
        console.log('\n🌐 INTEGRATION TEST: Real geocoding with search')
        console.log('📍 URL: /?es=sf&sq=mission')

        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/?es=sf&sq=mission', SF_API_CAPTURE_OPTIONS)

        // Verify search filter applied
        const expectedLogs: LogPattern[] = [
            {
                description: 'Search filter applied',
                logPattern: '[URL_FILTERS] Applied search filter: "mission"',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'Events filtered by search',
                logPattern: 'State: user-interactive, Events: allEvents',
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    console.log(`   📊 ${counts.visibleEvents} visible after search, ${counts.bySearch} filtered out`)

                    // Search should filter out some events
                    expect(counts.allEvents).toBeGreaterThan(counts.visibleEvents)
                    expect(counts.bySearch).toBeGreaterThan(0)
                    expect(counts.visibleEvents).toBeGreaterThan(0) // Should find some "mission" events
                },
            },
        ]

        verifyLogPatterns(logs, expectedLogs, 'SF geocoding search')

        // Verify search chip visible (shows count, not search term)
        const searchChip = page.locator('[data-testid="search-filter-chip"]')
        await expect(searchChip).toBeVisible()
        await expect(searchChip).toContainText('Filtered by Search')

        // Verify error count
        const errorCount = reportErrors(logs, 'SF geocoding search')
        expect(errorCount).toBe(0)

        console.log('✅ Real geocoding test passed\n')
    })

    test('Performance with real SF event volume', async ({ page }, testInfo) => {
        console.log('\n🌐 INTEGRATION TEST: Performance with real data')
        console.log('📍 URL: /?es=sf&qf=weekend')

        const startTime = Date.now()

        const logs = await captureAndReportLogsOnFailure(page, testInfo, '/?es=sf&qf=weekend', SF_API_CAPTURE_OPTIONS)

        const loadTime = Date.now() - startTime
        console.log(`   ⏱️  Total load time: ${loadTime}ms`)

        // Verify app loaded successfully
        const expectedLogs: LogPattern[] = [
            {
                description: 'Weekend filter applied',
                logPattern: 'Processing quick date filter: weekend',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'App interactive with real data',
                logPattern: 'State: user-interactive',
                assertMatch: (matchingLogs) => expect(matchingLogs.length).toBeGreaterThan(0),
            },
        ]

        verifyLogPatterns(logs, expectedLogs, 'SF performance test')

        // Verify UI is responsive
        const visibleButton = page.locator('button:has-text("Visible")')
        await expect(visibleButton).toBeVisible()

        // Verify date filter chip
        const dateChip = page.locator('[data-testid="date-filter-chip"]')
        await expect(dateChip).toBeVisible()

        // Performance expectations (may need adjustment based on real performance)
        // This is just to catch major regressions, not strict benchmarks
        console.log(`   ⏱️  Load time: ${loadTime}ms (should be <60s)`)
        expect(loadTime).toBeLessThan(60000) // Should load within 60s

        console.log('✅ Performance test passed\n')
    })

    test('Real selected event from SF API', async ({ page }, testInfo) => {
        console.log('\n🌐 INTEGRATION TEST: Selected event with real SF data')
        console.log('📍 URL: /?es=sf (will select first event)')

        // First load to get a real event ID
        await page.goto('/?es=sf')
        await page.waitForSelector('canvas.maplibregl-canvas', { timeout: 30000 })

        // Wait for events to load
        await page.waitForTimeout(5000)

        // Click the first event row to get its ID
        const firstRow = page.locator('tbody tr').first()
        await expect(firstRow).toBeVisible({ timeout: 30000 })

        // Click the row to select it
        await firstRow.click()

        // Wait for popup to appear
        await page.waitForTimeout(2000)

        // Verify popup appeared
        const popup = page.locator('.maplibregl-popup')
        await expect(popup).toBeVisible({ timeout: 10000 })

        // Verify row is highlighted
        await expect(firstRow).toHaveClass(/bg-green/)

        // Verify URL contains se parameter
        const url = page.url()
        console.log(`   🔗 URL after selection: ${url}`)
        expect(url).toContain('se=')

        console.log('✅ Real selected event test passed\n')
    })
})
