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
    private passed: Array<{ test: TestCase; project: string }> = []
    private failed: Array<{ test: TestCase; project: string }> = []
    private skipped: Array<{ test: TestCase; project: string }> = []

    onBegin(config: FullConfig, suite: Suite) {
        // Initialize
    }

    onTestEnd(test: TestCase, result: TestResult) {
        const project = test.parent.project()?.name || 'unknown'

        // Track all statuses including timedOut, interrupted
        if (result.status === 'passed') {
            this.passed.push({ test, project })
        } else if (result.status === 'failed' || result.status === 'timedOut' || result.status === 'interrupted') {
            this.failed.push({ test, project })
        } else if (result.status === 'skipped') {
            this.skipped.push({ test, project })
        }
    }

    onEnd(result: FullResult) {
        console.log('\n' + '='.repeat(80))
        console.log('TEST SUMMARY')
        console.log('='.repeat(80))

        if (this.passed.length > 0) {
            console.log(`\n✅ PASSED (${this.passed.length}):`)
            this.passed.forEach(({ test, project }) => {
                const testPath = test.titlePath().join(' › ')
                console.log(`  [${project}] ${testPath}`)
            })
        }

        if (this.failed.length > 0) {
            console.log(`\n❌ FAILED (${this.failed.length}):`)
            this.failed.forEach(({ test, project }) => {
                const testPath = test.titlePath().join(' › ')
                console.log(`  [${project}] ${testPath}`)
            })
        }

        if (this.skipped.length > 0) {
            console.log(`\n⏭️  SKIPPED (${this.skipped.length}):`)
            this.skipped.forEach(({ test, project }) => {
                const testPath = test.titlePath().join(' › ')
                console.log(`  [${project}] ${testPath}`)
            })
        }

        const total = this.passed.length + this.failed.length + this.skipped.length
        console.log('\n' + '='.repeat(80))
        console.log(
            `TOTAL: ${total} tests ` +
                `(${this.passed.length} passed, ${this.failed.length} failed, ${this.skipped.length} skipped)`
        )
        console.log('='.repeat(80) + '\n')
    }
}

export default SummaryReporter
