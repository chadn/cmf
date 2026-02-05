# AGENT.md

This file provides guidance when working with code in any repository.

Never edit files without explicit direction from user.

NEVER EVER execute `git commit` or `git push` commands.  User MUST ALWAYS do this after manual testing.

## User Plans

The following are plans that must be followed exactly when requested:

Ex: Use SafeDiff plan to resolve this task: ...

@prompt SafeDiff Plan:
Before taking any action on a coding task, follow this structured
process EXACTLY, only sharing info with me (the user) when requested:
--------------------------------------------------------------------
PHASE 1: REVIEW & PLANNING
--------------------------------------------------------------------
1. Analyze the task and review all relevant files:
   - Directly involved files
   - Any files imported/exported from them
2. Mentally plan the expected `git diff`:
   - What specific changes would need to be made?
3. Share a summary of all viable implementation options:
   - For EACH option, include:
     - A concise explanation of the approach
     - A high-level plan of the expected `git diff`
     - Pros and cons
     - A confidence score (0–100%) based on:
         - Idiomatic quality
         - Maintainability
         - Risk/scope of unintended side effects
4. Only if NO safe or reasonable option exists, share an explanation.

>>> DO NOT create or modify any code/files yet. Wait for approval. <<<
--------------------------------------------------------------------
PHASE 2: PRE-CHANGE VALIDATION (After Approval)
--------------------------------------------------------------------
5. Review all related files:
   - Files to be modified
   - Files that import or are imported by those files
6. Verify consistency with project-wide patterns and idioms.
7. Plan the code changes to minimize noise in the `git diff`.

--------------------------------------------------------------------
PHASE 3: Quality Assurance (After Work is Done)
--------------------------------------------------------------------
8. Review everything to ensure quality work
   - review what was asked, planned, and approved.
   - double check the `git diff` did what was intended.
   - double check build, lint, `npm test` pass without errors.
9. Record minimal metrics:
   - LOC delta for modified files (approximate)
   - Notable complexity deltas (e.g., functions simplified/split)
   - Any reduction in duplication (modules unified, helpers extracted)
10. Share a summary of what is changed from the `git diff`.


--------------------------------------------------------------------
CODING STANDARDS & PRIORITIES
--------------------------------------------------------------------
In order of importance:
[1] Follow project idioms and React/Next.js (or Python) best practices
[2] Apply DRY, KISS, YAGNI, and maintenance-first principles. Do not overengineer.
[3] Use clear, simple data structures and precise names. For similar-but-different concepts (**Similar ≠ Same**), use contrastive qualifiers (e.g., raw/parsed, utc/local, id/index), enforce distinctions with types (e.g., brand/newtypes), and add brief This-vs-That notes where confusion is likely (propose tests—don’t add without approval).
[4] Comments should explain WHY, not WHAT; avoid redundant comments
[5] Only refactor if it:
     - Reduces total lines of code
     - Simplifies logic
     - Improves clarity without changing behavior
[6] Assess and minimize all side effects (e.g., variable/prop renames)
[7] Ensure the project still builds using: `npm run build`
[8] NEVER modify unrelated code or add tests unless explicitly asked
[9] Keep the `git diff` small and focused — large/noisy diffs will be reverted

>>> Wait for explicit confirmation before making ANY changes. <<<
Never run `git commit` or `git push`; the user must commit after manual testing.
===============================================================================


--------------------------------------------------------------------

@prompt Naming 0.1 Plan:

Goal is to make sure code has good names for "named things", which include variables, functions, classes, types.
A good name leads to easy understanding of intent (code reviews) and maintainability (easier to refactor or debug well-named code).
It requires understanding of the named thing's purpose and context.  The larger the context, the more important it is the name is good.

If context is very small or short lived, like in a function only a few lines long, naming is less important, name can be very short and less purposeful. Also known as, May use Short names over Short Distances when Obvious. Ex: i, index, curUser; 
If context is large, used in more than one file or in many functions, name needs to have purpose and be as specific and descriptive enough to differentiate from similar but different names. Ex: curLoggedinUserId

Purpose-driven names are the most important characteristic of good naming. A name should immediately tell you what the named thing represents or does without needing to read additional comments or documentation.

A good name eliminates ambiguity. It should not be able to be confused with other names nor open to multiple interpretations. If it can mean different things in different contexts, it will lead to confusion. Ask: "Could someone unfamiliar with the codebase misinterpret what this name refers to?"

Avoid long names, use common abbreviations. maxRetries is better than maximumNumberOfAttemptsToReconnect

For similar-but-different concepts (**Similar ≠ Same**), use contrastive qualifiers (e.g., raw/parsed, utc/local, id/index).
Sometimes there are many similar names, and it can be better to have comments in one place to explain differences, contrast them all.
In order to identify it may require listing all names in one place and comparing their names and purpose

Review all code and create the following table, sorted by first column which is the number of occurrences

1. Num occurrences
1. Num files it appears in
1. Name 
1. Where it's defined (FileName:LineNumber)
1. Good Name (0-100% confident it adheres to k)
1. New name suggestion - n/a if current name is good enough.

===============================================================================
--------------------------------------------------------------------
@prompt  Naming 0.2 Plan:

The goal is to ensure all named entities (variables, functions, classes, types) have clear, purpose-driven names that make code easier to understand, review, and maintain. Good naming should convey intent without needing extra context, especially for human reviewers unfamiliar with the codebase. This requires understanding both the purpose of each named thing and the scope of its use — the broader the context, the more precise and contrastive the name must be.  

The most important part of this is to identify trouble areas that lead to bugs.
The hardest bugs to find are often ones where the names are similar to intent but could be better. We want to minimize the chances of the hardest bugs.

AI reviewers should prioritize human readability and code review clarity over minimal diffs. Names that reduce mental friction for future readers are more valuable than names that only make sense in local or short-lived contexts.

Output all findings to a single markdown file: `code-review-naming.md`
Make sure to include
- Name Cluster Tables
- Name Usage Table
- Name Function Table
- Function Call Graph

--------------------------------------------------------------------

@prompt Naming 0.5 Plan:

The goal is to ensure all named entities (variables, functions, classes, types) have clear, purpose-driven names that make code easier to understand, review, and maintain. Good naming should convey intent without needing extra context — especially for **human reviewers** unfamiliar with the codebase.

⚠️ The priority is to **identify naming weaknesses that may lead to bugs**, especially where the name appears plausible but is misleading, ambiguous, or overly generic. These are often the hardest bugs to catch. Minimize them.

AI reviewers should prioritize **clarity and disambiguation over diff minimization**. Favor names that reduce friction for future developers. Short names are fine for short-lived context; otherwise, prefer specific, contrastive, purpose-revealing names.

📝 **Output all findings to**: `code-review-naming.md`

Include the following outputs:
1. **Name Cluster Tables**: For similar-but-different names (e.g. `data`, `user`, `curUser`, `userObj`, `userId`, etc.)
2. **Name Usage Table**: Each named entity, where it is defined, how often it's used, and clarity rating.
3. **Name → Function Table**: Where each name is used (mapped to functions), sorted by function.
4. **Function Call Graph**: Show what functions call what (include aliasing and parameter-passed callables where possible).

🚫 Do not rename anything yet — only evaluate and suggest.


--------------------------------------------------------------------
@prompt Debug Names Plan:

🎯 **Goal: Find naming issues that cause real bugs.**

The goal is to ensure all named entities - variables, functions, classes, types - have clear,
purpose-driven names that make code easier to understand, review, and maintain. Good naming should convey
 intent without needing extra context — especially for **human reviewers** unfamiliar with the codebase.

Do **not** waste time identifying obviously bad names — those are easy to fix.

This review must prioritize the *subtle naming issues most likely to cause bugs* — names that appear
valid at first glance, but are:
- Slightly misleading
- Easy to confuse with another similar name
- Too vague for the scope of their use
- Masking architectural flaws due to overloaded or reused semantics

These are the names that cause the *worst kinds of bugs* — ones that survive code review, confuse
maintainers, and break things later. This review is a failure if it misses them.

✅ Success = catching tricky or plausible-but-wrong names before they become architecture problems or
production issues.
❌ Failure = verbose analysis that misses real naming risks.

Focus your reasoning on human code reviewers: Would a developer scanning the code **misunderstand 
intent** because the name seems fine but isn't?

Prioritize precision, contrast, and risk reduction. Avoid bloat.

📝 Output findings to: `docs/code-review-naming.md`

--------------------------------------------------------------------
Review Process
--------------------------------------------------------------------

1. **Analyze Codebase Structure**
   - Extract all named entities from `src/` directory
   - Focus on high-frequency, cross-file, or semantically ambiguous names
   - Identify function call patterns that propagate naming confusion

2. **Create Name Cluster Tables**
   - Group **similar-but-different** names (e.g. `user*`, `config*`, `*state*`)
   - Highlight where contrasts are unclear or suggest unified naming
   - Focus on clusters most likely to cause developer confusion

3. **Generate Function Call Graph (REQUIRED)**
   - **Critical for naming analysis**: Shows where confusing names propagate
   - Identifies high-impact rename targets (frequently called functions)
   - Maps parameter passing that could cause type confusion
   - **Must create all formats**:
     - ASCII Tree (simple text-based visual)
     - DOT/Graphviz file (color-coded by function category)
     - Interactive HTML/D3.js (with hover info and collapsible nodes)
   - Use static analysis or best-effort pattern-matching
   - Document limitations if results are incomplete

4. **Generate Comprehensive Analysis**
   - **Name Usage Table**: All entities with clarity ratings and suggestions
   - **Function Name Usage**: Map names to functions that use them
   - **Risk Assessment**: Focus on names that could cause runtime errors or logic bugs

--------------------------------------------------------------------
Output Requirements
--------------------------------------------------------------------

Create **Name Cluster Tables** of **similar-but-different** names to clarify contrasts:

| Name                 | Clarity % | Intent                            | Risk Level |
|----------------------|-----------|-----------------------------------|------------|
| `evts`               | 40%       | FilteredEvents object (not array) | HIGH       |
| `events`             | 60%       | Generic event array               | MEDIUM     |
| `visibleEvents`      | 90%       | Filtered event array              | LOW        |

**Name Usage Table** with all named entities, sorted by occurrence count:

| Name             | Occur | Files | Defined              | Clarity % | Risk | Suggestion        |
|------------------|-------|-------|----------------------|-----------|------|-------------------|
| `evts`           | 180   | 15    | useEventsManager:22  | 40%       | HIGH | `eventData`       |
| `events`         | 300   | 35    | multiple             | 60%       | MED  | context-specific  |

**Function Call Graph** in all three formats:
1. **ASCII Tree** – show call hierarchy and parameter flow
2. **DOT/Graphviz** – `function-call-graph.dot` with color coding
3. **Interactive HTML** – `function-call-graph.html` with filtering

**Critical Risk Analysis**:
- Identify the top 5 naming issues most likely to cause bugs
- For each, provide specific examples of how confusion could lead to errors
- Prioritize fixes by impact vs effort

--------------------------------------------------------------------
Naming Principles (For Reference)
--------------------------------------------------------------------

- **Purpose-first**: The name should make the role or intent obvious
- **Short names over short distances**: `i`, `cur`, `tmp` acceptable in short functions
- **Longer-lived names must be unambiguous**: Cross-file usage requires clear meaning
- **Avoid vague terms**: `data`, `item`, `value`, `info`, `config`, `state`
- **Use contrastive qualifiers**: `utcTimestamp` vs `localDate`, `rawData` vs `parsedData`
- **Focus on human reviewers**: Names should reduce mental friction for code review

--------------------------------------------------------------------

Do not rename anything yet. Wait for explicit user approval.

--------------------------------------------------------------------

@prompt Basic Naming Plan:

Goal is to make sure code is has good names for "named things", which include variables, functions, classes, types.
Good names are important for:
1. Readability: Good names make your code intuitive, understandable, and reduce the learning curve for others.
1. Maintainability: It is easier to refactor or debug well-named code.
1. Collaboration: Clear names improve team communication and productivity.
1. Scalability: Meaningful names help keep large projects manageable.

In general, Be descriptive and concise: Names should convey the purpose or role of the variable/function/etc.



----
Does It Represent the Purpose?
Purpose-driven names are the most important characteristic of good naming. A name should immediately tell you what the variable, function, or class represents or does without needing to read additional comments or documentation.

How to Assess:

Ask yourself: "When I read this name, can I immediately understand its purpose?"

Example:

userAge is better than a because userAge tells you what the variable represents, whereas a is too ambiguous.

----
Is It Specific Enough?
The name should be specific enough to reflect the exact role of the entity in your code. Overly generic names like data or temp can be confusing because they don’t provide enough context.

How to Assess:

Ask: "Is this name specific to what this variable, function, or class represents in my application?"

Example:

calculateTaxAmount() is better than calculate() because it’s clear what the function is calculating.


----
Does It Follow a Consistent Naming Convention?
Consistency in naming conventions is vital. When all team members follow the same conventions, the code is easier to understand and navigate.

How to Assess:

Ask: "Is this name consistent with the naming conventions used in the rest of the project?" Follow project guidelines such as:

camelCase for variables and functions (e.g., userAge)

PascalCase for classes, types (e.g., UserProfile)

UPPERCASE_SNAKE_CASE for constants (e.g., MAX_USERS)

Example:

If your team follows camelCase, userData is better than UserData.

----
Does it Avoid Ambiguity?
A good name eliminates ambiguity. It should not be open to multiple interpretations. If it can mean different things in different contexts, it will lead to confusion.

How to Assess:

Ask: "Could someone unfamiliar with the codebase misinterpret what this name refers to?"

Example:

Instead of naming a boolean isValid, use isUserLoggedIn or isEmailVerified to make it clearer what is being checked.

----
Is It Easy to Read and Pronounce?
While not strictly necessary, ease of reading and pronunciation can improve the overall readability and maintainability of your code.

How to Assess:

Ask: "Is this name easy to read aloud, and can I understand it at a glance?"

Avoid long names, and use common abbreviations only when they are widely accepted.

Example:

maxRetries is better than maximumNumberOfAttemptsToReconnect.

----
Is It Self-Documenting?
The best names document themselves. Good names reduce the need for additional comments or explanations.

How to Assess:

Ask: "Does this name fully describe the variable, function, or class without requiring a comment to explain what it does?"

Example:

calculateTotalPrice is self-explanatory, so there’s no need for an additional comment like “This function calculates the total price after discount.”

----
Is It Contextual and Relevant to the Domain?
The name should fit within the context of your project and its domain. For example, naming conventions for a web application may differ from those for a mobile app or a machine learning model.

How to Assess:

Ask: "Is this name aligned with the domain and context of my project?"

If you’re working in a specific domain (for example, finance, health, gaming), use domain-specific terms that are easily recognizable.

Example:

In a gaming app, healthPoints is more appropriate than hp, as it reflects its meaning.

----
Does It Avoid Magic Numbers and Hard-Coded Values?
Magic numbers (numbers with unclear meaning) should be avoided in favor of named constants.

How to Assess:

Ask: "Does this name represent a meaningful constant, or is it just a raw number?"

Example:

Instead of using 1000, use a constant like MAX_FILE_SIZE to explain the meaning behind the number.

----

Use Prefixes for Intent
- For event handlers: handle, on
- For utilities: calculate, convert, format
- For fetch operations: fetch, get, load
- For setters and getters: set, get

----

@prompt Architecture Refactor Plan:

Goal is to ensure the architecture-level refactor improves clarity and maintainability, while following all CODING STANDARDS & PRIORITIES from SafeDiff Plan.

---

Part 1: Analyze the Problem
- Review all relevant files in full:
  - Start with `ARCHITECTURE.md` (if present) and anything the user specifies
- Identify key issues:
  - Misaligned structure, confusing flow, duplicated logic, premature abstractions, etc.
  - Include any assumptions that are not directly traceable to code

- Update `docs/refactor.md`:
  1. **Current Architecture (Snapshot)** — rewrite this section each time
     - Concisely describe what exists today
     - Identify what's unclear, misaligned, or problematic
     - Keep this section clean and current — no running notes
  2. **Journal: Understanding & Rationale**
     - Record “why” the current approach is flawed or confusing
     - Track insights, tradeoffs, constraints, rejected paths
     - Use bullet points or short dated notes; do not track specific line changes

---

Part 2: Propose Solutions
- Propose one or more solutions for each issue
- Break complex changes into multiple phases (if needed)
- For each phase:
  - Objective and rationale
  - Expected high-level `git diff`
  - Pros/cons
  - Confidence (%) that this improves adherence to CODING STANDARDS & PRIORITIES
- Document this plan in `docs/refactor.md` under **Planned Rounds**
- Follow SafeDiff Plan Phase 1
- Wait for explicit user approval before continuing

---

Part 3: Implement in Phases
- Implement code changes for one phase at a time
- After each phase:
  - Follow SafeDiff Plan Phase 2–3
  - Update `Completed Rounds` section in `docs/refactor.md`
  - Wait for user approval before moving to the next phase

---

Part 4: Wrap Up
- Perform minimal cleanup:
  - Remove unused code, update tests and related docs (`tests.md`, `Implementation.md`)
  - Mark final status in `docs/refactor.md`
- Full architecture documentation updates (`ARCHITECTURE.md`, `docs/adr/`) may be deferred unless specifically requested

---




@prompt Quick Refactor Plan:

*(For single, self-contained refactor rounds; no need to update `docs/refactor.md`)*

Quick Refactor Plan is an **extension of SafeDiff Plan**, designed for small, isolated refactors.  

*Process*
1. **Identify Refactor Targets**
   - Start with `git diff --staged`. If empty, do `git diff HEAD~`. If both are empty, do nothing.
   - Summarize what changed and where refactor opportunities exist.

2. **Propose a Single Refactor Round**
   - Provide a concise plan:
     - Objective (why the refactor is needed)
     - High-level expected `git diff`
     - Pros/cons
     - Confidence (%) that it improves adherence to **CODING STANDARDS & PRIORITIES**

3. **Apply SafeDiff Plan**
   - Use SafeDiff's Phase 1 - 3 structure.
   - Keep the diff small, clear, and self-contained.

4. **Definition of Done**
   - Ensure build, lint, and tests pass.
   - New or updated code should be covered by tests.
   - Confidence rationale recorded inline.
   - Confirm behavior is unchanged, clarity/maintainability improved.


*Notes*
- Do not update `docs/refactor.md`.
- Use Quick Refactor Plan when a refactor is straightforward and can be completed in **one round**.
- If more than one round is required, switch to **Full Refactor Plan**.

====================================================================

@prompt Full Refactor Plan:

*(For multi-round, iterative refactoring; requires `docs/refactor.md` updates)*

Full Refactor Plan builds on SafeDiff Plan but adds **iteration, documentation, and learning**.  

### Process
1. **Review Recent Changes**
   - Unless told not to, focus on `git diff --staged` (if not empty) or `git diff HEAD~`.
   - Summarize what was changed and why it may need refactoring.
   - Note potential bugs, risks, and deviations from coding standards.

2. **Plan Multiple Refactor Rounds**
   - Break down into **small, sequential rounds**.
   - For EACH round, provide:
     - Objective
     - Expected high-level `git diff`
     - Pros/cons
     - Confidence (%) it improves adherence to **CODING STANDARDS & PRIORITIES**
   - Prioritize rounds in safest → highest-impact order.

3. **Document in `docs/refactor.md`**
   - Add a section for **Current State** (summary of changes/issues).
   - Add a **Planned Rounds** list with objectives and order.
   - Record any **failed or abandoned approaches** (with rationale) so they aren’t retried.
   - Keep updating after each round.

4. **Execute Rounds with SafeDiff**
   - For each round, follow SafeDiff Plan Phase 1 - 3.
   - Keep diffs scoped and review after each round.

5. **Iterate Until Complete**
   - After each round:
     - Update `docs/refactor.md`
     - Reassess if further refactors are needed
   - Stop when no safe, valuable improvements remain.

6. **Definition of Done**
   - Verify goals achieved, code is cleaner, maintainability improved.
   - All planned rounds completed or intentionally descoped.
   - Build/lint/tests pass; behavior unchanged or explicitly approved.
   - Confirm `docs/refactor.md` accurately reflects:
     - Completed changes
     - Lessons learned
     - Alternatives Considered / Abandoned attempts (with rationale)
     - Future opportunities



### Notes
- **Required**: Update `docs/refactor.md` for every multi-round refactor.
- Never run `git commit` or `git push`; the user must commit after manual testing.

---

## 📄 Simplified Refactor Template (`docs/refactor.md`)

```markdown
# Refactor Log

## Current State
- Summary of recent changes/issues
- Risks, potential bugs, or deviations from standards

## Planned Rounds
1. **Round 1** – Objective: [goal]  
   Confidence: [XX%]  
   Expected impact: [clarity, simplicity, maintainability]  

2. **Round 2** – Objective: [goal]  
   Confidence: [XX%]  

[...]

## Completed Rounds
- **Round 1** – [Summary of changes + result]  
- **Round 2** – [Summary]  

## Abandoned Attempts
- **Attempt**: [What was tried]  
- **Reason Abandoned**: [Why it failed / not worth it]  

## Lessons Learned
- [Lesson 1]  
- [Lesson 2]  

## Future Opportunities
- [Candidate for future refactor, priority, rationale]

```

@prompt FixDocs Plan:
Follow this structured process for documentation review and improvement:
--------------------------------------------------------------------
PHASE 1: DISCOVERY, ANALYSIS & QUALITY REVIEW
--------------------------------------------------------------------

1. Identify all documentation files (.md) in the repository
2. Review package.json or pyproject.toml (if exists) to understand project context
3. Assess current documentation state and identify gaps or issues
4. Evaluate each document against these criteria (in priority order):
   [1] Up to date - verify content matches current folders, files, and commands
       - Config reality check: ensure docs don’t encourage hard-coded domain data.
   [2] Clear and well-organized - logical flow and structure
   [3] Follows best practices:
       - README.md in root directory
       - Decision records follow MADR template (keeping it concise) with index in docs/adr/README.md
       ADR Filename: YYYY-MM-DD-title-kebab.md (e.g., 2025-09-05-adopt-nextjs-app-router.md)
   [4] Concise - apply "Less is More" philosophy, stay high-level
   [5] Cross-references - ensure no broken internal links between docs
   [6] Code examples - are they current and functional
   [7] Consistent - flag discrepancies for user clarification
   [8] Not overengineered - avoid excessive future plans/goals
   [9] Properly formatted - TOCs, links, bullets, bold/italics
       - Table of Contents (TOCs) should exist for any `.md` file under `docs/` over 100 lines or with 5 or more headings (count all heading levels)
       - TOCs should appear under the first heading, after the intro paragraph.
       - TOCs should link to all heading levels

--------------------------------------------------------------------
PHASE 2: IMPLEMENTATION (After Approval)
--------------------------------------------------------------------
5. Present findings and proposed changes to user, with confidence score (0–100%)
6. Wait for explicit approval before making modifications
7. Apply approved changes while maintaining existing document structure

>>> Wait for explicit confirmation before making ANY changes. <<<

