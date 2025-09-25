# To Do

This is a high level list of things to do on the app. Not necessarily in prioritized order.
Done items in [CHANGELOG](../CHANGELOG.md)

1. Create 2nd redis instance for dev work, to be used by localhost or dev server. This will prevent problems in production when data structures stored in redis change during development. Or more simply, prepend "dev-" to all redis keys when in dev.
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
1. compress json before writing to / after reading from redis. Consider [MessagePack](https://msgpack.org/index.html), [Protobuf](https://developers.google.com/protocol-buffers), [Arvo](https://avro.apache.org/), [BSON](https://en.wikipedia.org/wiki/BSON)
1. batchGeocodeLocations() calls getCachedLocation() for each location. Instead, it should call a new function, getCachedLocations(), with many locations.
1. Plura event end time is hardcoded to 1 hr after start, since only start time is shown on city pages. TODO: scrape event page itself for correct end time, and description (which is empty on city page)
1. Update AGENT.md with CI and related stuff
1. When page loads to only show events for today, the map should automatically resize after applying filter, zoom in as much as possible but still have all markers shown. This may get tricky, since if you remove the only current filter , "filtered by date" chip, then not all events may on map, so "filtered by map" chip would have to appear. Maybe a better idea is to have a button or link that zooms map in to show only events in event list.
1. Enable parsing and showing plura's ever evolving site categories, similar to 19hz:DC. So plura:sf-bay-area-polyamory should load https://heyplura.com/sf-bay-area-polyamory
1. Prepare for case where 2 different event sources have similar event ids. setSelectedEventIdUrl(eventId) may highlight event from wrong source. Right now id's are unique per event source.
1. Upgrade from next 14 to next 15
1. Change marker id 'unresolved' to 'unresolvedMarkerId', revisit how unresolved works with filters and related data structures
1. Currently some url params are type `string`, some are `string | null` - seems like null is not necessary.
1. refactor to follow React best practice of
    - UI components → as dumb as possible, just render props.
    - Hooks → wrap stateful or React-specific logic.
    - Services (lib/utils) → pure functions for business logic and data processing.

(thanks https://euangoddard.github.io/clipboard2markdown/)

Consider features from original version https://chadnorwood.com/projects/gcm/

## Bugs

Working on fixing these:

1. On mobile, map container cannot get much bigger than the US. So if events occur in Hawaii and NYC, map cannot fit them both. Buggy behavior.
1. If user enters bad string on home page, it gets stuck, no error messages, no console logs.
1. if url has llz in it, it is not obeyed exactly - it will show visible events then adjust slightly. ex: /?es=sf&sq=midway&llz=37.75108,-122.38569,15
1. If url has fsd&fed, and you add qf, fsd+fed should be removed.
   parseAsEventsSource - needs test cases to cover es=sf from examples.ts
1. Feature: if start and end time are same, code assumes timing is not accurate, and says "See event for time" instead of showing time
1. chrome on android - Sometimes top of app (CMF, title) goes up off screen when using map to select events, triggering scrollTo, which may trigger browser to scroll up.
1. 19hz has recurring events that also sometimes appear in non-recurring event section, which creates almost duplicate entries (duplicates can be identified and prevented). Consider ways to remove almost duplicates - original event source, identitcal title, etc.
1. Logging bug if multiple event sources, could be more than just logs. Below is sourceType 19hz and gc (google calendar), but only gc's id is logged. TODO: review how multiple event sources are resolved - create a new function that will turn a given es string into an array of type:id's using examples.ts. Also fix this log:
   [INFO][USE_EVTS_MGR] ✅ Multiple sources events data fetched: "Multiple Event Sources" {sourceId: 'BayArea,aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com', sourceType: '19hz', totalEvents: 703, unknownLocations: 9, numSources: 2}

## Features

1. Not a bug: When clicking on event for marker popup, map changes, filters and event showing count do not change (correct). Clicking on x to close popup or zooming/moving map should change count.
1. Not a bug: When changing start / end dates on calendar, you cannot change the calendar month by clicking on the arrows next to the month name. Must use the slider.
1. Maybe bug? Marker popup disappears but se is still in URL
    - view all events, click on event to trigger marker popup.
    - filter by date so event goes away. Marker popup disappears, too, but se is still in URL.
    - clearing filters reveals Marker popup again, so can close it.

Also see [How to Use](usage.md)

Found a bug or want a feature? Let me know by [Creating a new issue in github](https://github.com/chadn/cmf/issues/new)
