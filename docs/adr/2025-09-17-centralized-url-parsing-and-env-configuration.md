# Centralized URL Parsing and Environment Configuration

- Status: accepted
- Deciders: Chad Norwood
- Date: 2025-09-17

## Table of Contents

- [Context and Problem Statement](#context-and-problem-statement)
- [Decision Drivers](#decision-drivers)
- [Considered Options](#considered-options)
- [Decision Outcome](#decision-outcome)
  - [Positive Consequences](#positive-consequences)
  - [Negative Consequences](#negative-consequences)
- [Implementation Details](#implementation-details)
  - [New Files Added](#new-files-added)
  - [Files Removed](#files-removed)
  - [Key Features](#key-features)
  - [URL Building Rules](#url-building-rules)
- [Links](#links)

## Context and Problem Statement

The application had URL parameter handling scattered across multiple components and lacked centralized environment configuration. This led to:

1. Duplicated URL parsing logic across components
2. Inconsistent URL parameter handling patterns
3. Hard-coded environment values throughout the codebase
4. Difficulty in maintaining and testing URL-related functionality

## Decision Drivers

- Need for consistent URL parameter handling across the application
- Requirement for comprehensive test coverage of URL utilities
- Need for centralized environment configuration with proper validation
- Desire to separate URL building logic from component concerns
- Goal to improve maintainability and reduce code duplication

## Considered Options

1. Keep existing scattered URL handling approach
2. Create centralized URL utilities with comprehensive test coverage
3. Use external URL management library

## Decision Outcome

Chosen option 2: Create centralized URL utilities with comprehensive test coverage.

### Positive Consequences

- **Centralized URL Logic**: New `src/lib/utils/url-utils.ts` provides comprehensive URL building and parsing utilities
- **Environment Configuration**: New `src/lib/config/env.ts` centralizes environment variable handling with validation
- **Test Coverage**: Extensive test suite in `src/lib/utils/__tests__/url-utils.test.ts` ensures reliability
- **Code Reduction**: Removed duplicate URL handling logic from multiple components
- **Type Safety**: Improved TypeScript support for URL parameters and environment variables
- **Maintainability**: Single source of truth for URL and environment logic

### Negative Consequences

- **Migration Effort**: Required updating multiple files to use new centralized utilities
- **Learning Curve**: Team needs to understand new URL utility patterns

## Implementation Details

### New Files Added

- `src/lib/config/env.ts`: Centralized environment configuration with validation
- `src/lib/utils/url-utils.ts`: Comprehensive URL building and parsing utilities
- `src/lib/utils/__tests__/url-utils.test.ts`: Extensive test coverage for URL utilities

### Files Removed

- `src/lib/utils/date-nuqs.ts`: Functionality consolidated into other modules

### Key Features

- **URL Building**: `buildShareUrl()` function for constructing share URLs with user preferences
- **Parameter Validation**: Type-safe URL parameter handling with validation
- **Environment Parsing**: Safe parsing of environment variables with defaults and warnings
- **Comprehensive Testing**: 100+ test cases covering edge cases and error conditions

### URL Building Rules

The new system implements consistent URL building rules:

- Always includes event source (es) and selected event (se) if present
- Includes search query (sq) if present
- For date filters: prefers quick filters (qf) when enabled, otherwise uses explicit dates (fsd/fed)
- Only includes location/zoom (llz) when explicitly enabled by user

## Links

- Related to previous ADR: [2025-09-12-appstate-machine-over-useref-flags.md](2025-09-12-appstate-machine-over-useref-flags.md)
- Affects components: DateAndSearchFilters, Sidebar, MapContainer, page.tsx
- Test coverage: `npm test` shows comprehensive coverage for new utilities
