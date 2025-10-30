import { defineConfig, devices } from '@playwright/test'

// if number of tests is close to NUM_PARALLEL_WORKERS, update NUM_PARALLEL_WORKERS to be same.
// Reduced from 6 to 2 to prevent overwhelming the dev server with parallel requests
const NUM_PARALLEL_WORKERS = 2
/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests/e2e',
    /* Run tests in files in parallel */
    fullyParallel: true,
    /* Fail the build on CI if you accidentally left test.only in the source code. */
    forbidOnly: !!process.env.CI,
    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,
    /* Opt out of parallel tests on CI. */
    workers: process.env.CI ? 1 : NUM_PARALLEL_WORKERS,
    /* Reporter to use. See https://playwright.dev/docs/test-reporters */
    reporter: [
        ['list'], // Show progress during test run, like: Test timeout of 30000ms exceeded.
        ['./tests/e2e/summary-reporter.ts'], // Show detailed summary at end
        ['html',{
            open: 'never', // don't open browser automatically since this is used by AI.
        }],
    ],
    /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
    use: {
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: 'http://localhost:3000',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'desktop-chrome',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'mobile-iphone16',
            use: {
                viewport: { width: 393, height: 852 },
                isMobile: true,
                hasTouch: true,
                userAgent:
                    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
            },
        },
    ],

    /* Run your local dev server before starting the tests */
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30 * 1000, // 30s - Next.js needs time to compile (2-15s usually)
    },
})
