import type {
    Reporter,
    FullConfig,
    Suite,
    TestCase,
    TestResult,
    FullResult,
} from '@playwright/test/reporter'
import path from "path";

function formatTestName(test: TestCase): string {
    const testPath = `${path.basename(test.location.file)} ${test.location.line}:${test.location.column} ` + test.titlePath().join(' › ')
    //console.log(test)
    return `  ${testPath}`
}

/**
 * Custom Playwright reporter that shows a detailed summary at the end
 * Lists all test names grouped by status: passed, failed, skipped
 */
class SummaryReporter implements Reporter {
    // Use Map to store latest result per test (handles retries correctly)
    private testResults: Map<string, { test: TestCase; project: string; status: string }> = new Map()

    onBegin(config: FullConfig, suite: Suite) {
        // Initialize
    }

    onTestEnd(test: TestCase, result: TestResult) {
        const project = test.parent.project()?.name || 'unknown'
        const status = result.status

        // Create unique key per test (including project)
        const testKey = `[${project}] ${test.titlePath().join(' › ')}`

        // Store/update the latest result for this test
        // If a test is retried, this will overwrite with the final result
        this.testResults.set(testKey, { test, project, status })
    }

    onEnd(result: FullResult) {
        // Convert map to categorized arrays
        const passed: Array<{ test: TestCase; project: string }> = []
        const failed: Array<{ test: TestCase; project: string }> = []
        const skipped: Array<{ test: TestCase; project: string }> = []

        for (const { test, project, status } of this.testResults.values()) {
            if (status === 'passed') {
                passed.push({ test, project })
            } else if (status === 'failed' || status === 'timedOut' || status === 'interrupted') {
                failed.push({ test, project })
            } else if (status === 'skipped') {
                skipped.push({ test, project })
            }
        }

        console.log('\n' + '='.repeat(80))
        console.log('TEST SUMMARY')
        console.log('='.repeat(80))

        if (passed.length > 0) {
            console.log(`\n✅ PASSED (${passed.length}):`)
            passed.forEach(({ test, project }) => {
                console.log(formatTestName(test))
            })
        }

        if (failed.length > 0) {
            console.log(`\n❌ FAILED (${failed.length}):`)
            failed.forEach(({ test, project }) => {
                console.log(formatTestName(test))
            })
        }

        if (skipped.length > 0) {
            console.log(`\n⏭️  SKIPPED (${skipped.length}):`)
            skipped.forEach(({ test, project }) => {
                console.log(formatTestName(test))
            })
        }

        const total = passed.length + failed.length + skipped.length
        console.log('\n' + '='.repeat(80))
        console.log(
            `TOTAL: ${total} tests ` +
                `(${passed.length} passed, ${failed.length} failed, ${skipped.length} skipped)`
        )
        console.log('='.repeat(80) + '\n')
    }
}

export default SummaryReporter
