import { test, expect } from '@playwright/test'
import {
    captureConsoleLogs,
    captureAndReportLogsOnFailure,
    outputLogsOnFailure,
    printConsoleLogs,
    verifyLogPatterns,
    reportErrors,
    DEFAULT_CAPTURE_OPTIONS,
    extractCounts,
} from './test-utils'
import { getDayAt, getTodayAt, getTomorrowAt } from '@/lib/utils/date'

test.describe('User Interactive State Tests', () => {
    // Automatically output console logs when tests fail
    test.afterEach(async ({ }, testInfo) => {
        await outputLogsOnFailure(testInfo)
    })

    test('Date filter clearing - qf=weekend filter chip interaction', async ({ browser }, testInfo) => {
        // Create context with LA timezone for consistent weekend calculation
        const context = await browser.newContext({
            timezoneId: 'America/Los_Angeles',
        })
        const page = await context.newPage()

        console.log('🧪 Testing date filter clearing interaction...')

        // Step 1: Load page with weekend filter
        const testUrl = '/?es=test:stable&qf=weekend'
        console.log(`📍 Loading ${testUrl}`)

        const logs = await captureAndReportLogsOnFailure(page, testInfo, testUrl, {
            ...DEFAULT_CAPTURE_OPTIONS,
            waitForSpecificLog: 'State: user-interactive',
            additionalWaitTime: 2000,
        })

        // Step 2: Verify we reached user-interactive state (logs were captured above)
        console.log('⏳ Verifying user-interactive state reached...')
        const userInteractiveLogs = logs.filter(log => log.text.includes('State: user-interactive'))
        expect(userInteractiveLogs.length).toBeGreaterThan(0)
        console.log(`✅ Found ${userInteractiveLogs.length} user-interactive state logs`)

        // Step 3: Verify initial state - date filter should be active
        console.log('🔍 Verifying initial filtered state...')

        // Check that date filter chip exists
        const dateFilterChip = page.locator('button[data-testid="date-filter-chip"]')
        const mapFilterChip = page.locator('button[data-testid="map-filter-chip"]')
        await expect(dateFilterChip).toBeVisible()

        // Get initial "X of Y Visible" counts
        const visibleButton = page.locator('button:has-text("Visible")')
        await expect(visibleButton).toBeVisible()

        const initialText = await visibleButton.textContent()
        console.log(`📊 Initial visible button text: "${initialText}"`)

        const initialMatch = initialText?.match(/(\d+) of (\d+) Visible/)
        expect(initialMatch).toBeTruthy()
        const initialShown = parseInt(initialMatch![1])
        const initialTotal = parseInt(initialMatch![2])

        console.log(`📈 Initial counts: ${initialShown} shown, ${initialTotal} total`)
        expect(initialShown).toBeLessThan(initialTotal) // Filter should be active
        expect(initialShown).toBeGreaterThan(0) // Should have some weekend events

        // Step 4: Click the date filter chip to clear it
        console.log('🖱️  Clicking date filter chip to clear filter...')
        await dateFilterChip.click()
        if (mapFilterChip) {
            await mapFilterChip.click()
        }

        // Step 5: Wait for filter to clear and verify results
        console.log('⏳ Waiting for filter to clear...')
        await page.waitForTimeout(1000) // Allow time for state update

        // Step 6: Verify filter chip is gone
        console.log('🔍 Verifying date filter chip is removed...')
        await expect(dateFilterChip).toHaveCount(0)

        // Step 7: Verify "X of Y Visible" button shows all events
        console.log('🔍 Verifying visible button shows all events...')
        const finalText = await visibleButton.textContent()
        console.log(`📊 Final visible button text: "${finalText}"`)

        const finalMatch = finalText?.match(/(\d+) of (\d+) Visible/)
        expect(finalMatch).toBeTruthy()
        const finalShown = parseInt(finalMatch![1])
        const finalTotal = parseInt(finalMatch![2])

        console.log(`📈 Final counts: ${finalShown} shown, ${finalTotal} total`)
        expect(finalShown).toBe(finalTotal) // All events should be visible
        expect(finalTotal).toBe(initialTotal) // Total count unchanged
        expect(finalShown).toBeGreaterThan(initialShown) // More events visible now

        // Step 8: Verify no other filter chips are present
        console.log('🔍 Verifying no filter chips remain...')
        const allFilterChips = page.locator('button[aria-label*="filter"]')
        await expect(allFilterChips).toHaveCount(0)

        // Step 9: Capture final console logs to verify filter clearing
        console.log('📋 Capturing final console logs...')
        await page.waitForTimeout(500) // Brief wait for any final logs

        // We already captured the initial logs, the interaction should generate more logs
        // For now, we'll trust that the UI verification above is sufficient
        console.log('✅ Filter clearing verified through UI state changes')

        await context.close()
        console.log('🎉 Date filter clearing test completed successfully!')
    })

    test('Date filter clearing - verify event list updates', async ({ browser }, testInfo) => {
        // Skip - test:stable has dynamic dates, weekend filter may match 0-4 events unpredictably
        // Filter clearing is already tested by "Date filter clearing - qf=weekend filter chip interaction"
        const context = await browser.newContext({
            timezoneId: 'America/Los_Angeles',
        })
        const page = await context.newPage()

        console.log('🧪 Testing event list updates during date filter clearing...')

        // Load page with weekend filter
        const testUrl = '/?es=test:stable&qf=weekend'
        const logs = await captureAndReportLogsOnFailure(page, testInfo, testUrl, {
            ...DEFAULT_CAPTURE_OPTIONS,
            waitForSpecificLog: 'State: user-interactive',
            additionalWaitTime: 2000,
        })

        // Verify user-interactive state reached
        const userInteractiveLogs = logs.filter(log => log.text.includes('State: user-interactive'))
        expect(userInteractiveLogs.length).toBeGreaterThan(0)
        console.log(`✅ Found ${userInteractiveLogs.length} user-interactive state logs`)

        // Count initial events in the event list (tbody tr elements)
        const eventRows = page.locator('tbody tr')
        const initialEventCount = await eventRows.count()
        console.log(`📊 Initial event list count: ${initialEventCount}`)

        // Clear the date filter
        const dateFilterChip = page.locator('button[data-testid="date-filter-chip"]')
        await expect(dateFilterChip).toBeVisible()
        await dateFilterChip.click()

        // Wait for updates
        await page.waitForTimeout(1000)

        // Count final events in the event list
        const finalEventCount = await eventRows.count()
        console.log(`📊 Final event list count: ${finalEventCount}`)

        if (finalEventCount === 0 || finalEventCount === initialEventCount) {
            console.log(logs.map(log => log.text).join('\n'))
        }
        // Verify more events are now visible
        expect(finalEventCount).toBeGreaterThan(initialEventCount)
        expect(finalEventCount).toBeGreaterThan(0)

        // Verify the visible button count matches event list count
        const visibleButton = page.locator('button:has-text("Visible")')
        const buttonText = await visibleButton.textContent()
        const match = buttonText?.match(/(\d+) of (\d+) Visible/)
        const shownCount = parseInt(match![1])

        expect(shownCount).toBe(finalEventCount)
        console.log(`✅ Event list count (${finalEventCount}) matches visible button count (${shownCount})`)

        await context.close()
        console.log('🎉 Event list update test completed successfully!')
    })
})
