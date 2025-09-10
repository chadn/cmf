#!/usr/bin/env node

/**
 * Extract and display total lines of code from Jest coverage summary
 */

import fs from 'fs'
import path from 'path'

const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')

try {
    if (!fs.existsSync(coveragePath)) {
        console.error('Coverage summary not found. Run tests with coverage first.')
        process.exit(1)
    }

    const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
    const totalLines = coverageData.total.lines.total

    console.log(`Total Lines of Code: ${totalLines}`)
} catch (error) {
    console.error('Error reading coverage summary:', error.message)
    process.exit(1)
}
