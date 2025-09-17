import { test, expect } from '@playwright/test'
import {
    captureConsoleLogs,
    printConsoleLogs,
    verifyLogPatterns,
    reportErrors,
    PageLoadTestCase,
    DEFAULT_CAPTURE_OPTIONS,
    extractCounts,
} from './test-utils'

// Define your page load test cases
const pageLoadTests: PageLoadTestCase[] = [
    {
        name: 'Quick Filter qf=weekend Test',
        url: '/?es=sf&qf=weekend',
        timezoneId: 'America/Los_Angeles', // 7 or 8 hrs from UTC
        //skip: true,
        expectedLogs: [
            {
                description: 'URL service processes weekend quick filter',
                pattern: 'URL_SERVICE] Processing quick date filter: weekend',
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'Date range filter set in user-interactive for LA Timezone',
                // Ex: FLTR_EVTS_MGR] setFilter: dateRange: 2025-09-26T11:01:00.000Z to 2025-09-29T06:59:59.999Z
                pattern:
                    /FLTR_EVTS_MGR\] setFilter: dateRange: \d{4}-\d{2}-\d{2}T11:01:00.000Z to \d{4}-\d{2}-\d{2}T06:59:59.999Z/,
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'Test weekend is >2 but <3 days',
                pattern: '[FLTR_EVTS_MGR] setFilter: dateRange: ',
                cb: (logs) => {
                    console.log('********** chad logs **********\n' + JSON.stringify(logs))
                    const matches = logs[logs.length - 1].match(
                        /FLTR_EVTS_MGR\] setFilter: dateRange: (\d{4}-\d{2}-\d{2}T11:01:00.000Z) to (\d{4}-\d{2}-\d{2}T06:59:59.999Z)/
                    )
                    expect(matches).toHaveLength(3)
                    if (matches.length > 2) {
                        const startIso = matches[1]
                        const endIso = matches[2]
                        const startEpoch = new Date(startIso).getTime()
                        const endEpoch = new Date(endIso).getTime()
                        console.log(`startIso: ${startIso}`, new Date(startIso))
                        console.log(`endIso: ${endIso}`, new Date(endIso))
                        expect(endEpoch - startEpoch).toBeGreaterThan(2 * 24 * 60 * 60 * 1000)
                        expect(endEpoch - startEpoch).toBeLessThan(3 * 24 * 60 * 60 * 1000)
                    }
                },
            },
            {
                description: 'Filter only by date (qf) so there are some visible events in user-interactive',
                pattern: 'State: user-interactive, Events: allEvents',
                cb: (logs) => {
                    //console.log('********** chad logs **********\n' + JSON.stringify(logs))
                    const counts = extractCounts(logs[logs.length - 1])
                    expect(counts.visibleEvents).toBeGreaterThan(0)
                    // visible events should not be filtered by map, but it may, so using toBeGreaterThanOrEqual
                    expect(counts.allEvents).toBe(counts.visibleEvents + counts.byDate)
                },
            },
        ],
    },
    {
        name: 'Custom fsd Date Range Test',
        url: '/?es=sf&fsd=2025-10-30&fed=2025-11-2',
        timezoneId: 'America/New_York', // 5 hrs from UTC at this date
        expectedLogs: [
            {
                description: 'URL service processes explicit date filter',
                pattern: 'URL_SERVICE] Processing explicit date filter: {"fsd":"2025-10-30","fed":"2025-11-2"}',
            },
            {
                description: 'Filter events manager sets date range with NYC timezone conversion',
                pattern: '[FLTR_EVTS_MGR] setFilter: dateRange: 2025-10-30T08:01:00.000Z to 2025-11-03T04:59:59.999Z',
            },
            {
                description: 'Filter only by date (fsd) so there are some visible events in user-interactive',
                pattern: 'State: user-interactive, Events: allEvents',
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    expect(counts.visibleEvents).toBeGreaterThan(0)
                    // visible events should not be filtered by map, but it may, so using toBeGreaterThanOrEqual
                    expect(counts.allEvents).toBe(counts.visibleEvents + counts.byDate)
                },
            },
        ],
    },
    {
        name: 'Search Filter sq=berkeley Test',
        url: '/?es=sf&sq=berkeley',
        expectedLogs: [
            {
                description: 'URL filters applied search term',
                pattern: '[URL_FILTERS] Applied search filter: "berkeley"',
                requiredInState: 'applying-url-filters',
            },
            {
                description: 'Search filtering shows reduced visible events, all events count is 3 digits',
                pattern: 'State: user-interactive, Events: allEvents',
                // logs should only be logs that match the pattern.  Should only be one in user-interactive, but if > 1, use the last one.
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    console.log('chad ' + JSON.stringify(counts))
                    expect(counts.visibleEvents).toBeGreaterThan(0)
                    // Since the url has no date filter, we check math without that.
                    // counts.byLocationFilter should be 0 - any time it is not 0 there is a bug.
                    expect(counts.allEvents).toBeGreaterThan(counts.visibleEvents)
                    expect(counts.allEvents).toBe(counts.visibleEvents + counts.bySearch)
                    expect(counts.allEvents).toBeLessThanOrEqual(counts.visibleEvents + counts.byMap + counts.bySearch)
                },
            },
        ],
    },
    {
        name: 'LLZ Coordinates Test With Visible Events',
        url: '/?es=sf&llz=37.77484,-122.41388,12',
        //skip: true,
        expectedLogs: [
            {
                pattern: 'URL parsing step 5: Setting viewport from llz coordinates',
                description: 'URL service processes LLZ coordinates',
            },
            {
                pattern: 'State: user-interactive, Events: allEvents',
                description: 'llz set map bounds so that there are some visible events in user-interactive',
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    expect(counts.visibleEvents).toBeGreaterThan(0)
                    expect(counts.allEvents).toBe(counts.visibleEvents + counts.byMap)
                },
            },
        ],
    },
    {
        name: 'LLZ Coordinates Test With No Visible Events',
        url: '/?es=19hz:ORE&llz=16.32341,-86.54243,12',
        //skip: true,
        expectedLogs: [
            {
                pattern: 'URL parsing step 5: Setting viewport from llz coordinates',
                description: 'URL service processes LLZ coordinates',
            },
            {
                pattern: /State: user-interactive, Events: allEvents/,
                description: 'llz set map bounds so that there are no visible events in user-interactive',
                requiredInState: 'user-interactive',
                cb: (logs) => {
                    const counts = extractCounts(logs[logs.length - 1])
                    expect(counts.visibleEvents).toBe(0)
                    expect(counts.allEvents).toBe(counts.byMap)
                },
            },
        ],
    },
    {
        name: 'Selected Event se= Marker Popup',
        url: '/?es=sf&se=oapv4pivkccdkqo0iujsk7hkt0', // event on 2025-12-11
        expectedLogs: [
            {
                description: 'URL service processes selected event ID',
                pattern: 'URL parsing: selectedEventIdUrl is set, checking if valid',
                requiredInState: 'parsing-remaining-url',
            },
            {
                description: 'URL service processes selected event ID',
                pattern: 'uE: selectedMarkerId now 37.791200,-122.412980',
                requiredInState: 'finalizing-setup',
            },
        ],
    },
    {
        name: 'Unresolved Events Marker Popup',
        url: '/?es=sf&sq=unresolved',
        skip: true, // unresolved events not currently supported
        expectedLogs: [
            {
                pattern: 'ssssss',
                description: 'ssssssss',
                requiredInState: 'ssssssss',
            },
        ],
    },
]

test.describe('Page Load Tests - URL Processing Verification', () => {
    // Support for TEST_URL environment variable (maintains existing functionality)
    const testUrl = process.env.TEST_URL
    const testName = process.env.TEST_NAME

    if (testUrl) {
        test(`Custom URL Test: ${testUrl}`, async ({ page, browser }) => {
            console.log(`\n🌐 Testing custom URL: ${testUrl}`)

            let testPage = page
            let context

            // Support timezone override for custom URL tests via TEST_TIMEZONE environment variable
            const testTimezone = process.env.TEST_TIMEZONE
            if (testTimezone) {
                console.log(`🌍 Using timezone: ${testTimezone}`)
                context = await browser.newContext({
                    timezoneId: testTimezone,
                })
                testPage = await context.newPage()
            }

            try {
                const logs = await captureConsoleLogs(testPage, testUrl, DEFAULT_CAPTURE_OPTIONS)
                printConsoleLogs(logs, `Custom URL Test: ${testUrl}`)

                // For custom URLs, we just verify the page loads and capture logs
                // No specific pattern matching since we don't know what to expect
                const errorCount = reportErrors(logs, testUrl)

                console.log(`\n📈 Test completed with ${logs.length} total logs and ${errorCount} potential errors`)
            } finally {
                // Clean up context if we created one
                if (context) {
                    await context.close()
                }
            }
        })
    } else {
        // Run all predefined page load tests
        for (const testCase of pageLoadTests) {
            const testNameMatch = testName && testCase.name.toLowerCase().includes(testName.toLowerCase())
            if (testName && !testNameMatch) {
                console.log(`\n🚫 Skipping test not matching TEST_NAME="${testName}"; test: "${testCase.name}"`)
                continue
            }
            // skip only if user did not specifically request test via TEST_NAME
            if (!testName && 'skip' in testCase && testCase.skip) {
                console.log(`\n🚫 Skipping, skip=true in code for test: "${testCase.name}"`)
                continue
            }
            //console.log(`Preparing to run test: "${testCase.name}"`)
            test(testCase.name, async ({ page, browser }) => {
                console.log(`\n🧪 Running: ${testCase.name}`)
                console.log(`📍 URL: ${testCase.url}`)

                let testPage = page
                let context

                // Create new context with timezone if specified
                if (testCase.timezoneId) {
                    console.log(`🌍 Using timezone: ${testCase.timezoneId}`)
                    context = await browser.newContext({
                        timezoneId: testCase.timezoneId,
                    })
                    testPage = await context.newPage()
                }

                try {
                    const logs = await captureConsoleLogs(testPage, testCase.url, DEFAULT_CAPTURE_OPTIONS)
                    printConsoleLogs(logs, testCase.name)

                    // Verify expected log patterns
                    verifyLogPatterns(logs, testCase.expectedLogs, testCase.name)

                    // Report any errors found
                    reportErrors(logs, testCase.name)

                    console.log(`\n✅ ${testCase.name} completed successfully`)
                } finally {
                    // Clean up context if we created one
                    if (context) {
                        await context.close()
                    }
                }
            })
        }
    }
})
