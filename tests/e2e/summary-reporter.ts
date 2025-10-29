import type {
    Reporter,
    FullConfig,
    Suite,
    TestCase,
    TestResult,
    FullResult,
} from '@playwright/test/reporter'

/**
 * Custom Playwright reporter that shows a detailed summary at the end
 * Lists all test names grouped by status: passed, failed, skipped
 */
class SummaryReporter implements Reporter {
    private passed: TestCase[] = []
    private failed: TestCase[] = []
    private skipped: TestCase[] = []

    onBegin(config: FullConfig, suite: Suite) {
        // Initialize
    }

    onTestEnd(test: TestCase, result: TestResult) {
        if (result.status === 'passed') {
            this.passed.push(test)
        } else if (result.status === 'failed') {
            this.failed.push(test)
        } else if (result.status === 'skipped') {
            this.skipped.push(test)
        }
    }

    onEnd(result: FullResult) {
        console.log('\n' + '='.repeat(80))
        console.log('TEST SUMMARY')
        console.log('='.repeat(80))

        if (this.passed.length > 0) {
            console.log(`\n✅ PASSED (${this.passed.length}):`)
            this.passed.forEach((test) => {
                const projectName = test.parent.project()?.name || 'unknown'
                console.log(`  [${projectName}] ${test.titlePath().join(' › ')}`)
            })
        }

        if (this.failed.length > 0) {
            console.log(`\n❌ FAILED (${this.failed.length}):`)
            this.failed.forEach((test) => {
                const projectName = test.parent.project()?.name || 'unknown'
                console.log(`  [${projectName}] ${test.titlePath().join(' › ')}`)
            })
        }

        if (this.skipped.length > 0) {
            console.log(`\n⏭️  SKIPPED (${this.skipped.length}):`)
            this.skipped.forEach((test) => {
                const projectName = test.parent.project()?.name || 'unknown'
                console.log(`  [${projectName}] ${test.titlePath().join(' › ')}`)
            })
        }

        console.log('\n' + '='.repeat(80))
        console.log(
            `TOTAL: ${this.passed.length + this.failed.length + this.skipped.length} tests ` +
                `(${this.passed.length} passed, ${this.failed.length} failed, ${this.skipped.length} skipped)`
        )
        console.log('='.repeat(80) + '\n')
    }
}

export default SummaryReporter
