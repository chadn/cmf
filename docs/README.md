# CMF Documentation

This directory contains comprehensive documentation for Calendar Map Filter (CMF). All documents follow the "Less is More" philosophy, staying high-level and focused.

## 📖 Documentation Index

### For Users

-   **[usage.md](usage.md)** - How to use the CMF application
    -   Event source configuration (Google Calendar, Facebook, etc.)
    -   Map interactions and filtering
    -   URL parameters for sharing views
    -   Mobile vs desktop features

### For Developers

-   **[development.md](development.md)** - Development setup and workflow

    -   Installation and API key configuration
    -   Running locally and deployment options
    -   Contributing guidelines

-   **[Implementation.md](Implementation.md)** - Technical architecture and design decisions

    -   Directory structure and key components
    -   State management patterns and data flow
    -   Map filtering architecture deep-dive
    -   Troubleshooting guide

-   **[tests.md](tests.md)** - Test coverage and testing strategy
    -   Current test coverage statistics (78.36% statements, 67.46% branches)
    -   Testing priorities and next steps
    -   Testing patterns and best practices

### For Maintainers

-   **[todo.md](todo.md)** - Feature backlog and known issues
    -   Planned features and enhancements
    -   Current bugs and limitations
    -   Implementation priorities

### Reference

-   **[product.md](product.md)** - Original product specification

    -   Use cases and requirements
    -   Data model and UI specifications
    -   Technical assumptions and considerations

-   **[build_history.md](build_history.md)** - AI-assisted development history
    -   How Claude helped build the application
    -   Development process insights
    -   Sample debug logs and iterations

### Special Files

-   **[prompts.txt](prompts.txt)** - AI prompt templates
-   **[adr/README.md](adr/README.md)** - Architecture Decision Records
    -   Key architectural decisions with rationale
    -   MADR template format
    -   Historical decision tracking

## 🎯 Quick Start Paths

**New Users**: Start with [usage.md](usage.md) to learn how to use the app

**New Developers**: Follow [development.md](development.md) → [Implementation.md](Implementation.md) → [tests.md](tests.md)

**New Contributors**: Review [development.md](development.md) → [refactor.md](refactor.md) → [todo.md](todo.md)

**Maintainers**: Check [todo.md](todo.md) → [tests.md](tests.md) → [refactor.md](refactor.md)

## 📋 Documentation Standards

All documents in this directory follow these principles:

-   **Up to Date**: Content matches current v0.2.11 codebase
-   **Well Organized**: Logical flow with clear cross-references
-   **Concise**: High-level focus, avoiding implementation minutiae
-   **Cross-Referenced**: Links between related documents
-   **Consistent Formatting**: Standardized structure and style

## 🔄 Maintenance

Documents are updated as part of the regular development workflow:

-   **Implementation changes**: Update relevant docs in same PR
-   **New features**: Document in usage.md and update todo.md
-   **Refactoring**: Create ADRs for architectural decisions, update refactor.md template
-   **Test changes**: Update tests.md coverage statistics

For historical context on major architectural decisions, see [Architecture Decision Records](adr/README.md).

## 📊 Document Status

| Document          | Last Updated | Status      | Next Review           |
| ----------------- | ------------ | ----------- | --------------------- |
| usage.md          | 2025-09-03   | ✅ Current  | Next feature release  |
| development.md    | 2025-06-12   | ✅ Current  | Quarterly             |
| Implementation.md | 2025-09-03   | ✅ Current  | After major refactors |
| tests.md          | 2025-09-05   | ✅ Current  | After test runs       |
| refactor.md       | 2025-09-05   | ✅ Template | As needed             |
| todo.md           | 2025-09-05   | ✅ Current  | Weekly                |

---

_For project overview and getting started, see the main [README.md](../README.md)_
