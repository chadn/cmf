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

## Round 3 - Code

This phase is long and complicated.

Initially Cursor Claude 3.7 (referred to as Claude from now on) did a great job of writing all the code.
I spent several hours and several iterations to get it to a working state.
Common issues include Claude making guesses that it later corrected. Sometimes it would be totally wrong.
Sometimes it would partially do what I asked and instead add code that is not needed but related to the ask.
Therefore I had to include basic reminders during chat iterattions, as well provide feedback of whatever the current issue is

```
Remember to write concise code, only what is needed, follows best practices, easy to understand, easy to maintain.
Do not refactor code unless it is to fix an issue, nor change documentation unless it is to fix an issue or add or remove functionality.
```

Examples of requests

1. Add DEBUG_LOGIC to the code to help me debug.
1. Ensure DEBUG_LOGIC works on both browser and server (did not work in browser for 2 iterations)
1. Fix Error: Invalid hook call <paste error message>

### Sample Debug Log

```

16:35 chad@mbp-2022 main cmf > npm run dev

> calendar-map-filter@0.1.0 dev
> next dev

▲ Next.js 14.2.24

-   Local: http://localhost:3000
-   Environments: .env.local

✓ Starting...
✓ Ready in 1451ms
○ Compiling /api/calendar ...
✓ Compiled /api/calendar in 648ms (237 modules)
[DEBUG][2025-03-11T23:58:50.959Z][SERVER] DEBUG_LOGIC enabled on server
[DEBUG][2025-03-11T23:58:50.960Z][API] ✅ API keys validation: Both Google Calendar and Maps API keys are found
[DEBUG][2025-03-11T23:58:50.966Z][CALENDAR] Fetching calendar with ID: geocachingspain@gmail.com
[DEBUG][2025-03-11T23:58:50.966Z][CALENDAR] Attempting to fetch calendar with ID: geocachingspain@gmail.com
[DEBUG][2025-03-11T23:58:50.966Z][API] Google Calendar API key is configured
[DEBUG][2025-03-11T23:58:50.967Z][API] fetchCalendarEvents request {
calendarId: 'geocachingspain@gmail.com',
timeMin: '2025-02-11T00:00:00Z',
timeMax: '2025-06-11T23:59:59Z',
apiUrl: 'https://www.googleapis.com/calendar/v3/calendars/geocachingspain%40gmail.com/events'
}
[DEBUG][2025-03-11T23:58:51.533Z][API] fetchCalendarEvents response data {
kind: 'calendar#events',
etag: '"p32vsftv5hq08o0o"',
summary: 'Eventos Geocaching en España',
description: 'Aquí podrás consultar todos los eventos de geocaching que se realizan en España.\n' +
'Disfrútalos.\n' +
'GS.',
updated: '2025-03-10T18:13:10.264Z',
timeZone: 'Europe/Madrid',
accessRole: 'reader',
defaultReminders: [],
items: [
{
kind: 'calendar#event',
etag: '"3475828421274000"',
id: '0ecm69thrd50h8r44qvuu91vqh',
status: 'confirmed',
htmlLink: 'https://www.google.com/calendar/event?eid=MGVjbTY5dGhyZDUwaDhyNDRxdnV1OTF2cWggZ2VvY2FjaGluZ3NwYWluQG0',
created: '2025-01-26T17:56:50.000Z',
updated: '2025-01-26T17:56:50.637Z',
summary: 'CUENCA - Santa María del Campo Rus: Meet & Great castilla+tere',
description: 'https://www.geocaching.com/geocache/GCB2MQK',
location: '39.512533, -2.410233 (http://coord.info/GCB2MQK)',
creator: [Object],
organizer: [Object],
start: [Object],
end: [Object],
transparency: 'transparent',
iCalUID: '0ecm69thrd50h8r44qvuu91vqh@google.com',
sequence: 0,
eventType: 'default'
},
{
kind: 'calendar#event',
etag: '"3475993075120000"',
id: '02o3q1br6koq85ggnupak9eokt',
status: 'confirmed',
htmlLink: 'https://www.google.com/calendar/event?eid=MDJvM3ExYnI2a29xODVnZ251cGFrOWVva3QgZ2VvY2FjaGluZ3NwYWluQG0',
created: '2025-01-10T20:17:00.000Z',
updated: '2025-01-27T16:48:57.560Z',
summary: 'CANARIAS - Tenerife - Porís de Abona: 80. Meet & Greet @ Poris',
description: 'https://www.geocaching.com/geocache/GCB23HR',
location: '28.164483, -16.431833 (http://coord.info/GCB23HR)',
creator: [Object],
organizer: [Object],
start: [Object],
end: [Object],
transparency: 'transparent',
iCalUID: '02o3q1br6koq85ggnupak9eokt@google.com',
sequence: 0,
eventType: 'default'
}
...

```

```

```
