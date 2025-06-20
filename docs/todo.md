# To Do

This is a high level list of things to do on the app. Not necessarily in prioritized order.

1. ✅ When clicking on CMF in top left, open/close menu without resetting app state. When open, show
    1. ✅ About Blurb
    1. ✅ Enter new Source (homepage)
    1. ✅ Usage Info on Github
    1. ✅ Share button (copies to clipboard)
    1. ✅ Show timezone (defaults to browser local)
    1. change timezone
1. ✅ Make design better
    1. ✅ USE Shadcn
    1. ✅ On desktop, make map go to top (header should only be on left side panel).
    1. ✅ Make design more compact - Put search box and dates in same row. Click on either will expand.
1. Favorite events, remember favs via cookies or browser local storage.
1. ✅ Make list panel open all the way, half way (normal) or close entirely except small CMF with count of events showing
    - ✅ Added react-resizable-panels to allow user to control size of map by dragging line.
1. Add more protest event sources
    - ✅ https://events.pol-rev.com/api
    - ✅ https://www.wethepeopledissent.net/ Google Sheet
    - https://www.mobilize.us/nokings/, https://www.mobilize.us/?event_type=29 , https://www.mobilize.us/events/rally/
1. Support events DB that is populated by independent scraping tasks
    - Hosting Scarping:
        - [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs/quickstart) ([60sec max duration](https://vercel.com/docs/functions/configuring-functions/duration)),
        - GCF
    - Hosting DB: Supabase (open-source Firebase alternative built on PostgreSQL)
    - Tech : Playwright to scrape, Prisma DB ORM client
    - move plura scraping to this
    - support scraping https://lu.ma/genai-sf
1. Client side caching events - use local storage for events if less than CLIENT_EVENT_CACHE_SECS. For more than 5mb, use [dexie](https://github.com/dexie/Dexie.js/?tab=readme-ov-file#hello-world-react--typescript) and [indexedDB](https://www.geeksforgeeks.org/difference-between-localstorage-and-indexeddb-in-javascript/).
1. Have a map search box - Add ability for user to type location in box, then map jumps to it. like https://thetide.guide/, Use https://maps.googleapis.com/maps/api/place/js/AutocompletionService.GetPredictionsJson
1. Use CMF for multi day festivals - sliders can be hour instead of day, quick filters can be next 3 hrs, tonight, etc. Can support custom maps and custom event sources
1. switch url params lat&lon to ll (or zll), like https://www.google.com/maps/d/u/0/viewer?mid=1NiJprGgrxLL6FBEV0Cg2NtkHlLhc-kA&ll=36.62469946088837%2C-119.44145496585381&z=6
1. compress json before writing to / after reading from redis. Consider [MessagePack](https://msgpack.org/index.html), [Protobuf](https://developers.google.com/protocol-buffers), [Arvo](https://avro.apache.org/), [BSON](https://en.wikipedia.org/wiki/BSON)
1. batchGeocodeLocations() calls getCachedLocation() for each location. Instead, it should call a new function, getCachedLocations(), with many locations.
1. Plura event end time is hardcoded to 1 hr after start, since only start time is shown on city pages. TODO: scrape event page itself for correct end time, and description (which is empty on city page)
1. ✅ Support search box updating map when a 5-digit zipcode is entered

(thanks https://euangoddard.github.io/clipboard2markdown/)

Consider features from original version https://chadnorwood.com/projects/gcm/

## Bugs

Working on fixing these:

1. Feature: if start and end time are same, code assumes timing is not accurate, and says "See event for time" instead of showing time
1. chrome on android - Sometimes top of app (CMF, title) goes up off screen when using map to select events, triggering scrollTo, which may trigger browser to scroll up.
1. qf on links are broken. When clicking link with `qf=next3days`, the dates will be the 4 month window, not 3 days as you expect. Numbers are not filtered yet. As soon as you click on days it fixes itself. https://cmf-dev.vercel.app/?es=plura:all&qf=next3days

## Features

1. Not a bug: When clicking on event for marker popup, map changes, filters and event showing count do not change (correct). Clicking on x to close popup or zooming/moving map should change count.
1. Not a bug: When changing start / end dates on calendar, you cannot change the calendar month by clicking on the arrows next to the month name. Must use the slider.

Also see [How to Use](usage.md)

Found a bug or want a feature? Let me know by [Creating a new issue in github](https://github.com/chadn/cmf/issues/new)

## TEMP

1. Server side caching events - fetch in redis first, use if its less than CACHE_TTL_API_EVENTSOURCE
1. Server side API timing - log time to fetch events and time to geocode (redis vs maps api)
   After refactor, eventSource api results are cached, and response time with cache hit is < 1 second.  
   For example, below can see BROWSER fetch of protest:all went from 6506ms to 163ms

```
[2025-05-05T23:12:41.209Z][INFO][API-EVENTS] No Cache hit 96ms, calling API for gc:geocachingspain@gmail.com-2025-04-05T23:00:00.000Z-2025-08-05T23:00:00.000Z
[2025-05-05T23:12:41.651Z][INFO][API-EVENTS] API fetched 188 events in 440ms 91027 bytes gc:geocachingspain@gmail.com
[2025-05-05T23:12:41.677Z][INFO][API-GEO] batchGeocodeLocations returning 188 for 188 locations:
TOTAL  : 188 calls,    26 ms,   0.14 ms per call
api    :   0 calls,     0 ms,   0.00 ms per call
cache  :   0 calls,     0 ms,   0.00 ms per call
caching:   0 calls,     0 ms,   0.00 ms per call
custom : 188 calls,   234 ms,   1.25 ms per call
other  :   0 calls,     0 ms,   0.00 ms per call
[2025-05-05T23:12:41.678Z][INFO][API-EVENTS] API response 125596 bytes, 468ms for fetch + geocode {
[2025-05-05T23:12:41.692Z][INFO][BROWSER] fetcherLogr Response 200, 125596 bytes in 1025ms, url: /api/events?id=gc%3Ageocachingspain%40gmail.com&timeMin=2025-04-05T23%3A12%3A40.664Z&timeMax=2025-08-05T23%3A12%3A40.665Z
16:12:41.693

[2025-05-05T23:16:54.134Z][INFO][API-EVENTS] Cache hit 98ms on 2025-05-05T23:12:41.690Z for gc:geocachingspain@gmail.com-2025-04-05T23:00:00.000Z-2025-08-05T23:00:00.000Z
[2025-05-05T23:16:54.156Z][INFO][BROWSER] fetcherLogr Response 200, 125596 bytes in 234ms, url: /api/events?id=gc%3Ageocachingspain%40gmail.com&timeMin=2025-04-05T23%3A16%3A53.919Z&timeMax=2025-08-05T23%3A16%3A53.919Z
16:16:54.157



[2025-05-05T23:19:52.888Z][INFO][API-EVENTS] No Cache hit 31ms, calling API for protest:all-2025-04-05T23:00:00.000Z-2025-08-05T23:00:00.000Z
[2025-05-05T23:19:58.634Z][INFO][API-EVENTS] API fetched 1347 events in 5739ms 494157 bytes protest:all
[2025-05-05T23:19:59.224Z][INFO][API-GEO] batchGeocodeLocations returning 1040 for 1040 locations:
TOTAL  : 1040 calls,   589 ms,   0.57 ms per call
api    :   1 calls,   259 ms, 259.42 ms per call
cache  : 1039 calls, 24529 ms,  23.61 ms per call
caching:   1 calls,     4 ms,   4.25 ms per call
custom :   0 calls,     0 ms,   0.00 ms per call
other  :   0 calls,     0 ms,   0.00 ms per call
[2025-05-05T23:19:59.224Z][INFO][API-EVENTS] Geocoded 1040 of 1040 locations
[2025-05-05T23:19:59.225Z][INFO][API-EVENTS] Events with unknown locations: 160
[2025-05-05T23:19:59.231Z][INFO][API-EVENTS] API response 792773 bytes, 6343ms for fetch + geocode {
[2025-05-05T23:19:59.286Z][INFO][BROWSER] fetcherLogr Response 200, 792773 bytes in 6506ms, url: /api/events?id=protest%3Aall&timeMin=2025-04-05T23%3A19%3A52.775Z&timeMax=2025-08-05T23%3A19%3A52.775Z
16:19:59.287

[2025-05-05T23:22:52.197Z][INFO][API-EVENTS] Cache hit 77ms on 2025-05-05T23:19:59.241Z for protest:all-2025-04-05T23:00:00.000Z-2025-08-05T23:00:00.000Z
[2025-05-05T23:22:52.216Z][INFO][BROWSER] fetcherLogr Response 200, 792773 bytes in 163ms, url: /api/events?id=protest%3Aall&timeMin=2025-04-05T23%3A22%3A52.047Z&timeMax=2025-08-05T23%3A22%3A52.047Z
16:22:52.216
```
