# E2E Tests for CMF

This directory contains end-to-end (e2e) tests for the Calendar Map Filter (CMF) application.

For more, view [End-to-End Testing in docs/tests.md](../../docs/tests.md#end-to-end-testing)

# **TODO**: REMOVE ALL CONTENT BELOW. Any info that is unique (not duplicated in docs/tests.md) should be moved to appropriate document




## Test Files

### `console-logs.spec.ts`

- **Purpose**: General console log capture and debugging
- **Usage**: `npm run test:console` or `TEST_URL="/?es=sf" npm run test:console`
- **Features**: Captures all console logs, provides debugging output, flexible URL testing

### `page-load.spec.ts`

- **Purpose**: Systematic verification of URL processing and page load behavior
- **Usage**: `npm run test:pageload` or `TEST_URL="/?es=sf&qf=weekend" npm run test:url`
- **Features**: Structured log pattern matching, event count verification, predefined test cases

### `test-utils.ts`

- **Purpose**: Centralized utilities, types, and functions for all e2e tests
- **Features**:
    - Console log capture and formatting functions
    - Log pattern verification and event count validation
    - Common log patterns and test case builders
    - Shared interfaces and types
    - Error reporting utilities
    - Default test configuration

## Available Commands

```bash
# Run all e2e tests
npm run test:e2e

# Run console log debugging (flexible URL testing)
npm run test:console
TEST_URL="/?es=sf&qf=weekend" npm run test:console

# Run structured page load tests (ends cleanly with report option)
npm run test:pageload

# Run page load tests with custom URL (ends cleanly with report option)
TEST_URL="/?es=sf&sq=berkeley" npm run test:url

# View HTML test report (after running any e2e tests)
npm run test:report
```

## Page Load Test Cases

The page load tests verify that URL parameters are processed correctly by checking for specific log patterns:

### 1. Quick Filter Weekend Test

- **URL**: `/?es=sf&qf=weekend`
- **Verifies**: Weekend date calculation and filter application
- **Expected Logs**:
    - `[url_service] Processing quick date filter: weekend`
    - Weekend calculation debug info

### 2. Custom Date Range Test

- **URL**: `/?es=sf&fsd=2025-10-30&fed=2025-11-2`
- **Verifies**: Explicit date range processing
- **Expected Logs**:
    - Explicit date filter processing
    - Filter events manager date range setting

### 3. Search Filter Test

- **URL**: `/?es=sf&sq=berkeley`
- **Verifies**: Search term application and event filtering
- **Expected Logs**: Search filter application debug

### 4. LLZ Coordinates Tests

- **URLs**:
    - `/?es=sf&llz=37.77484,-122.41388,12` (with visible events)
    - `/?es=19hz:ORE&llz=16.32341,-86.54243,12` (no visible events)
- **Verifies**: Coordinate processing and map viewport setting

## Adding New Tests

### Option 1: Use Predefined Patterns (Recommended)

```typescript
import { PrebuiltTestCases } from './test-utils'

const newTest = PrebuiltTestCases.searchFilter('music')
```

### Option 2: Create Custom Test Cases

```typescript
import { PageLoadTestCase } from './test-utils'
const customTest: PageLoadTestCase = {
    name: 'My Custom Test',
    url: '/?es=sf&custom=param',
}
```

### Option 3: Quick URL Testing

Just set the TEST_URL environment variable:

```bash
TEST_URL="/?es=sf&new=param" npm run test:url
```

## Event Count Verification

Tests can verify:

- **hasVisibleEvents**: Whether any events are visible on the map
- **hasAllEvents**: Whether the app loaded any events at all
- **hasFilteredCounts**: Whether filtering statistics are logged
- **minVisibleEvents/maxVisibleEvents**: Specific count ranges

## Log Pattern Matching

The tests support both string and regex patterns:

```typescript
{
    pattern: '[url_service] Processing',  // String contains
    description: 'URL service activity'
},
{
    pattern: /Weekend calc: dayOfWeek=\d+/,  // Regex pattern
    description: 'Weekend calculation with variables'
}
```

## Debugging Failed Tests

When tests fail:

1. Check the console output for captured logs
2. Look for the specific patterns that weren't found
3. Use `TEST_URL` to test individual URLs
4. Add `console.log` statements in the app code if needed

## Best Practices

1. **Keep patterns specific** - Avoid overly broad patterns that might match unintended logs
2. **Use descriptive test names** - Make it clear what each test is verifying
3. **Group related tests** - Use the test suite structure to organize tests logically
4. **Test both success and failure cases** - Include tests for URLs that should have no visible events
5. **Maintain the utilities** - Update `test-utils.ts` when adding new common patterns
