# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records for the Calendar Map Filter (CMF) project, following the [MADR template](https://adr.github.io/madr/) format.

## Index

- ✅ [2025-10-01-single-pass-filtering-optimization](2025-10-01-single-pass-filtering-optimization.md) - Single-Pass Filtering Optimization for Performance
- ✅ [2025-09-23-smart-hook-dumb-component-architecture](2025-09-23-smart-hook-dumb-component-architecture.md) - Smart Hook/Dumb Component Architecture with Enhanced State Machine
- ✅ [2025-09-17-centralized-url-parsing-and-env-configuration](2025-09-17-centralized-url-parsing-and-env-configuration.md) - Centralized URL Parsing and Environment Configuration
- ❌ [2025-09-12-appstate-machine-over-useref-flags](2025-09-12-appstate-machine-over-useref-flags.md) - AppState Machine Over useRef Flags
- ✅ [2025-09-09-fix-quick-filter-url-parameter-timing](2025-09-09-fix-quick-filter-url-parameter-timing.md) - Fix Quick Filter URL Parameter Timing Issue
- ❌ [2025-09-05-direct-state-over-reducer-pattern](2025-09-05-direct-state-over-reducer-pattern.md) - Direct State Management Over Reducer Pattern
- ✅ [2025-09-05-simplified-filtered-events-structure](2025-09-05-simplified-filtered-events-structure.md) - Simplified FilteredEvents (now CmfEvents) Structure
- ✅ [2025-09-05-unified-eventssource-interface](2025-09-05-unified-eventssource-interface.md) - Unified EventsSource Interface
- ✅ [2025-09-03-viewport-parameter-pattern](2025-09-03-viewport-parameter-pattern.md) - Viewport Parameter Pattern for Map Filtering
- ✅ [2025-05-20-vercel-deployment-platform](2025-05-20-vercel-deployment-platform.md) - Vercel as Primary Deployment Platform
- ✅ [2025-05-20-upstash-redis-for-geocoding-cache](2025-05-20-upstash-redis-for-geocoding-cache.md) - Upstash Redis for Geocoding Cache
- ✅ [2025-05-20-tailwind-css-implementation](2025-05-20-tailwind-css-implementation.md) - Tailwind CSS Implementation Strategy
- ✅ [2025-05-20-react-context-over-redux](2025-05-20-react-context-over-redux.md) - React Context Over Redux for State Management

## Status Definitions

- **Accepted** ✅ - Decision implemented and working
- **Proposed** 🤔 - Decision suggested but not yet implemented
- **Deprecated** ❌ - Decision no longer valid or superseded

## Guidelines

- Keep ADRs concise and focused on the architectural decision, not implementation details
- Focus on **WHY** the decision was made, not HOW it was implemented
- Include context, considered options, and consequences
- Update status when decisions change or are superseded
