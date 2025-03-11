# Build History

This doc shows how AI assisted in making this app.  
First Claude 3.7 from the web https://claude.ai/chat was used to refine the product specification document with some implementation details.
Then Claude 3.7 via Cursor AI Agent helped define the technical implementation plan.
Then Cursor AI Agent was used to write the code for the app.

## Round 1 - Product Specification Document

Chad asked claude 3.7 to help create the product specification document. Chad used GCM as starting point, the Google Calendar Map web application built in 2012 https://chadnorwood.com/projects/gcm/

The original product specification document is in docs/product.md

## Round 2 - Technical Implementation

Response from Cursor after asking it

> Can you read the docs/product.md with the intent on creating all the code in this repo needed to build it, then ask me any questions that need to be answered before building it?

Based on the product specification document and the current state of the repository, I need to create a complete web application for the Calendar Map Filter (CMF). Before I start building, I have several important questions that need to be answered:

Technical Stack Questions:
Frontend Framework Preference: Do you have a preference for a specific frontend framework (React, Vue, Angular, etc.)?
Build System: Do you have a preference for a build system (Vite, Webpack, etc.)?
CSS Approach: Do you prefer a specific CSS approach (CSS modules, Tailwind, styled-components, etc.)?
TypeScript vs JavaScript: Would you prefer the application to be built with TypeScript or JavaScript?

API and Integration Questions:
API Keys: Do you already have the Google Calendar API and Google Maps API keys, or should I provide instructions for obtaining them?
API Key Storage: How should API keys be stored and managed? (Environment variables, config file, etc.)
Backend Requirements: Is a backend server needed for this application, or should it be purely frontend with API calls directly from the browser?
CORS Considerations: Are there any CORS considerations we need to address for the API calls?

Feature Priority Questions:
MVP Features: Which features should be prioritized for the initial version? For example, should we focus first on Google Calendar integration and defer Microsoft/Apple Calendar support?
Map Provider: The spec mentions OpenLayers or MapLibre as initial considerations. Do you have a preference between these two?
Geocoding Fallback: For unresolvable locations, the spec mentions using the "largest city visible in Map of All Events view". Should we implement a specific algorithm for this or use a simpler fallback approach?

Deployment and Environment Questions:
Deployment Target: Where will this application be deployed? (GitHub Pages, Netlify, Vercel, self-hosted, etc.)
Browser Support: Are there specific browser versions that need to be supported?
Performance Expectations: Are there specific performance benchmarks or expectations for the application?

Design and UI Questions:
Design Assets: Are there any design assets, mockups, or a style guide available for the UI?
Branding Requirements: Are there any branding requirements (colors, fonts, logos) that need to be incorporated?
Accessibility Requirements: The spec mentions "standard accessibility practices" - are there specific WCAG levels or accessibility features that are particularly important?

Data and State Management:
State Management: Do you have a preference for state management (Redux, Context API, Zustand, etc.)?
Local Storage: Should user preferences (like filter settings) be persisted in local storage?
Event Data Volume: What's the expected volume of events that the application needs to handle efficiently?
Once I have answers to these questions, I can proceed with creating the project structure and implementing the required functionality according to your preferences.

### Observations

Claude 3.7 is a great tool for creating a technical implementation plan, but is not perfect.

An example of a mistake:

Where did June 2024 date come from? You said training data has a cutoff date of April 2023

> You're absolutely right, and I apologize for the confusion. I made a significant error in my response.
> My training data does indeed have a cutoff date of April 2023, and I should not have used "June 2024" as a reference date for the pricing information, as this implies I have current data from the future when I don't. This was misleading and incorrect.
> Let me fix this error in the Implementation.md file:

chad later googled the pricing and updated with March 2025 upstashpricing in the Implementation.md file)
