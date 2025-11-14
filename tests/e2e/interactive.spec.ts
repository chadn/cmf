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

/*

Test is failing but should not. Example from console logs for "Date filter clearing - verify event list updates"

[2025-11-08.13:39:59.639][INFO][APP_STATE] ⭐⭐ URL_FILTERS_APPLIED changing: applying-url-filters to parsing-remaining-url
[2025-11-08.13:39:59.640][INFO][APP_STATE] window.cmfEvents: allEvents:6 visibleEvents:6 {"byMap":0,"bySearch":0,"byDate":0,"byLocationFilter":0}
[2025-11-08.13:39:59.641][INFO][FLTR_EVTS_MGR] getCmfEvents 3 visibleEvents {north: 37.87151, south: 37.77489, east: -122.249734, west: -122.41941}
[2025-11-08.13:39:59.641][INFO][FLTR_EVTS_MGR] getCmfEvents return counts allEvents:6 visibleEvents:3 {"byMap":0,"bySearch":0,"byDate":3,"byLocationFilter":0}
[2025-11-08.13:39:59.642][INFO][UMAP] filteredMarkers updated - 3 of 5  markers showing, with 3 of 6 visible events
[2025-11-08.13:39:59.652][INFO][DATE-AND-SEARCH-FILTERS] Using active range: {"start":"2025-11-08T12:01:00.000Z","end":"2025-11-11T07:59:59.999Z"}
[.WebGL-0x108c08dede00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels
[2025-11-08.13:39:59.778][INFO][USE_EVTS_MGR] uE: cmfEvents.visibleEvents now 3
[2025-11-08.13:39:59.779][INFO][UMAP] uE: markersChanged, 3 markers, was 5, from 3 events {oldMarkers: Array(5), newMarkers: Array(3)}
[2025-11-08.13:39:59.780][INFO][DEBUG-FLOW] State: parsing-remaining-url, Events: allEvents:6 visibleEvents:3 {"byMap":0,"bySearch":0,"byDate":3,"byLocationFilter":0}, Loading: false
[2025-11-08.13:39:59.781][INFO][APP] URL parsing step 6 & 7 Auto-resizing map to show visible events (useBounds: true)
[2025-11-08.13:39:59.782][INFO][UMAP] resetMapToVisibleEvents({"useBounds":true}) 5 markers, curBounds:north:37.87151 south:37.77489 east:-122.249734 west:-122.41941
[2025-11-08.13:39:59.783][INFO][FLTR_EVTS_MGR] getCmfEvents 3 visibleEvents {north: 37.87151, south: 37.77489, east: -122.249734, west: -122.41941}
[2025-11-08.13:39:59.784][INFO][FLTR_EVTS_MGR] getCmfEvents return counts allEvents:6 visibleEvents:3 {"byMap":0,"bySearch":0,"byDate":3,"byLocationFilter":0}
[2025-11-08.13:39:59.785][INFO][LOCATION] generateMapMarkers(3) 3 markers
[2025-11-08.13:39:59.786][INFO][LOCATION] calculateBoundsFromMarkers return: {north: 37.87151, south: 37.77489, east: -122.27299, west: -122.41941}
[2025-11-08.13:39:59.787][INFO][LOCATION] calculateViewportFromBounds(w=999,h=999) MapViewport: {latitude: 37.823216, longitude: -122.3462, zoom: 12.14, bearing: 0, pitch: 0}
[2025-11-08.13:39:59.788][INFO][LOCATION] calculateMapBoundsAndViewport return: {bounds: Object, viewport: Object}
[2025-11-08.13:39:59.789][INFO][UMAP] resetMapToVisibleEvents: showing 3 markers from 3 visible events; bounds: {north: 37.87151, south: 37.77489, east: -122.27299, west: -122.41941}
[2025-11-08.13:39:59.790][INFO][APP] handleBoundsChangeForFilters: north:37.87151 south:37.77489 east:-122.27299 west:-122.41941 {fromUserInteraction: true, isShowingAllEvents: false}
[.WebGL-0x108c08dede00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels
[2025-11-08.13:39:59.850][INFO][APP_STATE] ⭐⭐ REMAINING_URL_PARSED changing: parsing-remaining-url to finalizing-setup
[2025-11-08.13:39:59.850][INFO][APP_STATE] window.cmfEvents: allEvents:6 visibleEvents:3 {"byMap":0,"bySearch":0,"byDate":3,"byLocationFilter":0}
[2025-11-08.13:39:59.851][INFO][FLTR_EVTS_MGR] getCmfEvents 3 visibleEvents {north: 37.87151, south: 37.77489, east: -122.27299, west: -122.41941}
[2025-11-08.13:39:59.851][INFO][FLTR_EVTS_MGR] getCmfEvents return counts allEvents:6 visibleEvents:3 {"byMap":2,"bySearch":0,"byDate":3,"byLocationFilter":0}
[2025-11-08.13:39:59.852][INFO][UMAP] filteredMarkers updated - 3 of 5  markers showing, with 3 of 6 visible events
[.WebGL-0x108c08dede00]GL Driver Message (OpenGL, Performance, GL_CLOSE_PATH_NV, High): GPU stall due to ReadPixels (this message will no longer repeat)
[2025-11-08.13:39:59.932][INFO][MAPC] uE: MapContainer updated num markers, now 3
[2025-11-08.13:39:59.932][INFO][MAPC] uE: MapContainer updated viewport, now lat:37.823216 lon:-122.3462 zoom:12.14
[2025-11-08.13:39:59.933][INFO][USE_EVTS_MGR] uE: currentBounds now north:37.87151 south:37.77489 east:-122.27299 west:-122.41941
[2025-11-08.13:39:59.934][INFO][UMAP] uE: map dimensions changed to 999x999 or 3 markers
[2025-11-08.13:39:59.935][INFO][DEBUG-FLOW] State: finalizing-setup, Events: allEvents:6 visibleEvents:3 {"byMap":2,"bySearch":0,"byDate":3,"byLocationFilter":0}, Loading: false
[2025-11-08.13:39:59.960][INFO][APP_STATE] ⭐⭐ SETUP_FINALIZED changing: finalizing-setup to user-interactive
[2025-11-08.13:39:59.960][INFO][APP_STATE] window.cmfEvents: allEvents:6 visibleEvents:3 {"byMap":2,"bySearch":0,"byDate":3,"byLocationFilter":0}
[2025-11-08.13:39:59.979][INFO][DEBUG-FLOW] State: user-interactive, Events: allEvents:6 visibleEvents:3 {"byMap":2,"bySearch":0,"byDate":3,"byLocationFilter":0}, Loading: false
[2025-11-08.13:39:59.981][INFO][APP] Cleared llz URL parameter, llzChecked=false
[2025-11-08.13:40:00.077][INFO][MAPC] uC: Map onLoad: handleMapLoad
[2025-11-08.13:40:00.269][INFO][UMAMI] umamiTrack(onWidthHeightChange)
[2025-11-08.13:40:00.270][INFO][MAPC] timeout=10ms, setting initial bounds {north: 37.867503, south: 37.778902, east: -122.286768, west: -122.405632}
[2025-11-08.13:40:00.271][INFO][UMAMI] umamiTrack(onBoundsChange)
[2025-11-08.13:40:00.271][INFO][APP] handleBoundsChangeForFilters: north:37.867503 south:37.778902 east:-122.286768 west:-122.405632 {fromUserInteraction: false, isShowingAllEvents: false}
[2025-11-08.13:40:00.272][INFO][FLTR_EVTS_MGR] getCmfEvents 1 visibleEvents {north: 37.867503, south: 37.778902, east: -122.286768, west: -122.405632}
[2025-11-08.13:40:00.273][INFO][FLTR_EVTS_MGR] getCmfEvents return counts allEvents:6 visibleEvents:1 {"byMap":5,"bySearch":0,"byDate":3,"byLocationFilter":0}
[2025-11-08.13:40:00.273][INFO][UMAP] filteredMarkers updated - 1 of 5  markers showing, with 1 of 6 visible events
[2025-11-08.13:40:00.317][INFO][USE_EVTS_MGR] uE: currentBounds now north:37.867503 south:37.778902 east:-122.286768 west:-122.405632
[2025-11-08.13:40:00.318][INFO][USE_EVTS_MGR] uE: cmfEvents.visibleEvents now 1
[2025-11-08.13:40:00.319][INFO][UMAP] uE: map dimensions changed to 763x720 or 3 markers
[2025-11-08.13:40:00.320][INFO][UMAP] uE: markersChanged, 1 markers, was 3, from 1 events {oldMarkers: Array(3), newMarkers: Array(1)}
[2025-11-08.13:40:00.322][INFO][DEBUG-FLOW] State: user-interactive, Events: allEvents:6 visibleEvents:1 {"byMap":5,"bySearch":0,"byDate":3,"byLocationFilter":0}, Loading: false
[2025-11-08.13:40:00.322][INFO][APP] Cleared llz URL parameter, llzChecked=false
[2025-11-08.13:40:00.367][INFO][MAPC] uE: MapContainer updated num markers, now 1
[2025-11-08.13:40:00.368][INFO][UMAP] uE: map dimensions changed to 763x720 or 1 markers
[2025-11-08.13:40:03.634][INFO][UMAMI] umamiTrack(onClearDateFilter)
[2025-11-08.13:40:03.635][INFO][FLTR_EVTS_MGR] setFilter: dateRange: undefined
[2025-11-08.13:40:03.635][INFO][FLTR_EVTS_MGR] getCmfEvents 1 visibleEvents {north: 37.867503, south: 37.778902, east: -122.286768, west: -122.405632}
[2025-11-08.13:40:03.636][INFO][FLTR_EVTS_MGR] getCmfEvents return counts allEvents:6 visibleEvents:1 {"byMap":5,"bySearch":0,"byDate":0,"byLocationFilter":0}
[2025-11-08.13:40:03.636][INFO][UMAP] filteredMarkers updated - 1 of 5  markers showing, with 1 of 6 visible events
[2025-11-08.13:40:03.646][INFO][DATE-AND-SEARCH-FILTERS] Using active range: {"start":"2025-10-08T20:40:03.637Z","end":"2026-02-08T21:40:03.637Z"}
[2025-11-08.13:40:03.653][INFO][DEBUG-FLOW] State: user-interactive, Events: allEvents:6 visibleEvents:1 {"byMap":5,"bySearch":0,"byDate":0,"byLocationFilter":0}, Loading: false

*/
