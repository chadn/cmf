# CMF AI Agent Guide

This file provides project-level guidance to AI LLMs (Cursor, Claude Code, GitHub Copilot, etc.) when working with code in this repository.
The goal is guidance, recommending a solution when more than one common solution exists - no need to specify details if there's just one common solution.
Everything here is a recommendation, should only deviate when good reason and user approves.
Also follow the user level guidelines in ~/.config/AGENT.md

# Do the following if user asks

@prompt VerifyCommit Plan:
Review the latest git commit. Ensure the following are true — fix if not - and summarize what you did.

1. package.json:

    - Version is incremented appropriately (patch/minor/major)

2. CHANGELOG.md:

    - Entry exists for this commit
    - Describes all relevant changes accurately
    - Marks any breaking changes

3. docs/adr/:

    - If the commit includes a significant refactor or architectural change:
        - Create or update an ADR that reflects the **final state and rationale** of the change
        - Rewrite the ADR as a clean snapshot (do not append commentary)
    - To verify:
        - Review the full git diff and re-read the ADR in full
        - Ensure the ADR reflects all relevant changes
        - Follow `docs/adr/README.md` guidelines

4. File reference docs:

    - If any files were added, removed, or renamed:
        - Update all affected documentation (e.g. tests.md, Implementation.md)

5. docs/tests.md:

    - If timestamp from `npm test` section in tests.md is newer than any file's last modified timestamp in this commit, done. Go to 6.
    - Run `npm test`. If any tests are failing, attempt to fix.
    - Copy appropriate output to tests.md, ensuring the formatted code block in tests.md matches the EXACT output 
    format and order from `npm test` - do not rearrange, reorder, or reorganize any lines.

6. Remaining documentation:
    - Review all other `.md` files for accuracy and relevance
    - If related to this commit, update as needed
    - If unrelated but clearly improvable, suggest improvements with reasoning (do not modify yet)

Do not commit or push until all items are verified.

# General Project Preferences

## Versioning

-   Use **SemVer** with `CHANGELOG.md`.
-   Tag releases to align with semver and changelog.

## Release Automation

-   **Tags drive releases**: tagging `vX.Y.Z` triggers publishing (package/image) and changelog update.
-   Use **Conventional Commits** to auto-generate release notes and bump versions.
-   Use GitHub Actions to publish to PyPI / GHCR (or your registry).

## Config and Secrets

-   Use `.env.example` to document required settings with dummy values.
-   **Never commit `.env`**.
-   Load `.env` **only in local development**; not in CI or production.
-   In CI/prod, rely on injected env vars / secret managers.

## Testing

-   Every feature requires tests.
-   Always add or update tests for new or updated functionality
-   Focus on behavior over implementation details
-   Unit tests should be **fast (<1s)**; add integration/E2E when relevant.
-   Apply the **testing pyramid**; mock external APIs in unit tests; prefer **testcontainers/pytest-docker** for integration.
-   Consider **property-based tests** (Hypothesis) for tricky logic.
-   Mirror application structure
    -   Node Test files: `__tests__/*.test.tsx` or `*.test.ts`
    -   python in `tests/`

## Security

-   Never commit secrets or API keys.
-   Validate all user inputs on client and server.
-   Least-privilege access throughout.
-   Pre-commit hooks (lint, type, audit) and **secret scanning** (e.g., detect-secrets).
-   Pin dependencies with lockfiles (`uv.lock`, `package-lock.json`) and review drift in PRs.

## Logging & Errors

-   Use **structured logging** (JSON) and include correlation/request IDs.
-   Don’t swallow exceptions; log with context.

## Dependencies

-   Prefer stdlib; justify external packages.
-   Use stable versions; avoid short-lived dev releases.

## Troubleshooting

-   If a dependency misbehaves, confirm the **installed version** and read that version’s docs.

# Project Overview

CMF displays calendar events on an interactive map with real-time filtering. Key technologies:

-   **Frontend**: Next.js, React, TypeScript, MapLibre GL, Tailwind CSS
-   **Backend**: Next.js API routes with Redis caching
-   **Testing**: Jest with React Testing Library

Architecture: Client-side event filtering with server-side API integration and geocoding cache.

## Development Commands

```bash
npm run dev          # Start development server (localhost:3000)
npm run build        # Build for production
npm run lint         # Run ESLint
npm test             # Run Jest tests with coverage
```

## Code Style

-   2 spaces indentation
-   120 character line limit
-   Single quotes, trailing commas
-   TypeScript strict mode enabled
-   NEVER use `@ts-ignore` without strong justification

## Testing

-   Use Jest + React Testing Library

## Project-Specific Patterns

### Event Sources System

-   Modular event source handlers in `src/lib/api/eventSources/`
-   Each source extends `BaseEventSourceHandler`
-   Format: `{prefix}:{id}` (e.g., `gc:calendar@gmail.com`)

### Map Integration

-   MapLibre GL with react-map-gl wrapper
-   Markers grouped by location coordinates
-   Real-time filtering based on map viewport bounds

### State Management

-   React Context + hooks (no Redux)
-   URL parameters for shareable state
-   `useEventsManager` for event data and filtering
-   `useMap` for map state and interactions

### Data Flow

1. URL params → Event fetching → Geocoding → Map markers
2. User interactions → Filter updates → Event list + map sync
3. Map viewport changes → Event filtering → UI updates

### Key Components

-   `MapContainer.tsx`: Main map with markers and popups
-   `EventList.tsx`: Sortable event table with filtering
-   `DateAndSearchFilters.tsx`: Date range and search controls
-   Event source handlers: Google Calendar, Facebook, custom scrapers

### Debugging

-   Use `logr` utility for rate-limited logging
-   Debug mode via environment variable
-   Browser console access to event data

### Performance Notes

-   Events geocoded in parallel batches
-   Redis caching for geocoding results
-   Client-side data fetching with caching
-   Designed for moderate event volumes

### Common Tasks

-   Adding event sources: Extend `BaseEventSourceHandler` in `eventSources/`
-   Map changes: Update `useMap` hook and `MapContainer`
-   Filtering: Modify `FilterEventsManager` or filter components
-   UI: Tailwind CSS with custom components in `components/ui/`
