# To Do

This is a high level list of things to do on the app. Not necessarily in prioritized order.

1. Server side caching events - fetch in redis first, use if its less than SERVER_EVENT_CACHE_SECS
1. Add more protest event sources -
1. Client side caching events - use local storage for events if less than CLIENT_EVENT_CACHE_SECS. For more than 5mb, use [dexie](https://github.com/dexie/Dexie.js/?tab=readme-ov-file#hello-world-react--typescript) and [indexedDB](https://www.geeksforgeeks.org/difference-between-localstorage-and-indexeddb-in-javascript/).
1. Favorite events, remember favs via cookies or browser local storage.
1. Make design better - colors. layout, sizing, UX, etc.
1. Make design more compact - Put search box and dates in same row. Click on either will expand.
1. Add Hamburger menu in top left by CMF, which can open/close without resetting app state. When open, show link to github usage, about, share button (copies to clipboard) plus config things like timezone
1. Have a map search box - Add ability for user to type location in box, then map jumps to it. like https://thetide.guide/, Use https://maps.googleapis.com/maps/api/place/js/AutocompletionService.GetPredictionsJson
1. Use CMF for multi day festivals - sliders can be hour instead of day, quick filters can be next 3 hrs, tonight, etc. Can support custom maps and custom event sources
1. switch url params lat&lon to ll, like https://www.google.com/maps/d/u/0/viewer?mid=1NiJprGgrxLL6FBEV0Cg2NtkHlLhc-kA&ll=36.62469946088837%2C-119.44145496585381&z=6

Consider features from original version https://chadnorwood.com/projects/gcm/

## Bugs

Working on fixing these:

1. Bug or Feature Change: show events with unresolved locations on events list. Currently if a user is trying to find an event by name or date, and doesn't realize the location is missing or unresolvable, they will not be able to find it. They should.
   WORKAROUND: unMapped events can be seen in event list by clicking "Filtered by Map"

## Features

1. Not a bug: When clicking on event for marker popup, map changes, filters and event showing count do not change (correct). Clicking on x to close popup or zooming/moving map should change count.

Also see [How to Use](usage.md)

Found a bug or want a feature? Let me know by [Creating a new issue in github](https://github.com/chadn/cmf/issues/new)

## TEMP

1. Server side API timing - log time to fetch events and time to geocode (redis vs maps api)

```
http://localhost:3000/?es=gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com
[2025-05-01T14:54:07.659Z][INFO][API-EVENTS] 229 events fetched, "ChadRock Facebook Events" in 1100ms 459001 bytes gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com
[2025-05-01T14:54:08.044Z][INFO][API-EVENTS] API response 511920 bytes, 1486ms for fetch + geocode {
[2025-05-01T14:54:08.060Z][INFO][BROWSER] fetcherLogr Response 200, 511920 bytes in 2127ms, url: /api/events?id=gc%3Aaabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d%40group.calendar.google.com&timeMin=2025-04-01T14%3A54%3A05.922Z&timeMax=2025-08-01T14%3A54%3A05.922Z

http://localhost:3000/?es=gc:geocachingspain@gmail.com
[2025-05-01T15:00:38.157Z][INFO][API-EVENTS] API fetched 198 events in 598ms 95901 bytes gc:geocachingspain@gmail.com
[2025-05-01T15:00:38.524Z][INFO][API-EVENTS] API response 137810 bytes, 966ms for fetch + geocode {
[2025-05-01T15:00:38.532Z][INFO][BROWSER] fetcherLogr Response 200, 137810 bytes in 1312ms, url: /api/events?id=gc%3Ageocachingspain%40gmail.com&timeMin=2025-04-01T15%3A00%3A37.216Z&timeMax=2025-08-01T15%3A00%3A37.216Z

https://cmf-dev.vercel.app/?es=gc:geocachingspain@gmail.com
[2025-05-01T15:28:36.019Z][INFO][API-EVENTS] API fetched 198 events in 422ms 95901 bytes gc:geocachingspain@gmail.com
[2025-05-01T15:28:36.437Z][INFO][API-EVENTS] API response 137636 bytes, 841ms for fetch + geocode {
[2025-05-01T15:28:36.592Z][INFO][BROWSER] fetcherLogr Response 200, 137636 bytes in 2061ms, url: /api/events?id=gc%3Ageocachingspain%40gmail.com&timeMin=2025-04-01T15%3A28%3A34.526Z&timeMax=2025-08-01T15%3A28%3A34.526Z
08:28:36.593

https://cmf-dev.vercel.app/?es=protest:all
[2025-05-01T15:32:49.263Z][INFO][API-EVENTS] API fetched 999 events in 3885ms 369671 bytes protest:all
[2025-05-01T15:32:51.192Z][INFO][API-EVENTS] API response 595397 bytes, 5816ms for fetch + geocode {
[2025-05-01T15:32:51.527Z][INFO][BROWSER] fetcherLogr Response 200, 595397 bytes in 6344ms, url: /api/events?id=protest%3Aall&timeMin=2025-04-01T15%3A32%3A45.180Z&timeMax=2025-08-01T15%3A32%3A45.180Z
08:32:51.528

[2025-05-01T15:37:14.169Z][INFO][API-EVENTS] API response 595397 bytes, 4755ms for fetch + geocode {
```
