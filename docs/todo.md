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
1. Use CMF for multi day festivals 
    1. quick filter for next 3 (?) hrs or "tonight"
    1. sliders can be hour instead of day
    1. Click on event will not zoom out
    1. Support custom maps
1. compress json before writing to / after reading from redis. Consider [MessagePack](https://msgpack.org/index.html), [Protobuf](https://developers.google.com/protocol-buffers), [Arvo](https://avro.apache.org/), [BSON](https://en.wikipedia.org/wiki/BSON)
1. batchGeocodeLocations() calls getCachedLocation() for each location. Instead, it should call a new function, getCachedLocations(), with many locations.
1. Plura event end time is hardcoded to 1 hr after start, since only start time is shown on city pages. TODO: scrape event page itself for correct end time, and description (which is empty on city page)
1. Update AGENT.md with CI and related stuff
1. Enable parsing and showing plura's ever evolving site categories, similar to 19hz:DC. So plura:sf-bay-area-polyamory should load https://heyplura.com/sf-bay-area-polyamory
1. Prepare for case where 2 different event sources have similar event ids. setSelectedEventIdUrl(eventId) may highlight event from wrong source. Right now id's are unique per event source. Low priority now that "Skipping duplicate events" fixes real issue - events with same id are just duplicates and we don't want them.
1. Upgrade from next 14 to next 15
1. Change marker id 'unresolved' to 'unresolvedMarkerId', revisit how unresolved works with filters and related data structures
1. Currently some url params are type `string`, some are `string | null` - seems like null is not necessary.
1. refactor to follow React best practice of
    - UI components → as dumb as possible, just render props.
    - Hooks → wrap stateful or React-specific logic.
    - Services (lib/utils) → pure functions for business logic and data processing.
1. when clicking on event, map centers and zooms. Currently its always same zoom level. Improvement: if marker is already on screen, just move map without changing zoom. Benefit: identifying
1. better error handling of HTTP 500 from /api/events
1. Add new field CmfEvent.timeKnown instead of "Hack: if same as start, exact start time is not known. If 1 minute after start, end time is not known.
1. Performance improvements
    1. Store start and end times of events as seconds since epoch. Or end should be replaced by duration? Using seconds is faster for filters.
    1. Create new state, `user-updating` which is triggered by `user-updating-event`. When in `user-updating` state, don't recalculate visible events or chip counts (which leads to re-renders).
    Note debouncing is a technique that will delay the execution of a function until an event stops firing for a specified time period.
    So basically debounce after user-updating-event (USER_UPDATING_TIMEOUT=100 ms) then change from `user-updating` to `user-interactive`.
    Examples of `user-updating-event`: when user starts dragging date slider, or map, or typing search box.
    1. Current code has allEvents and visibleEvents, both array of CmfEvent[]. Every time visibleEvents changes, it recalculates event list and markers. Instead, make visibleEvents just list of eventIds, allEvents a record of Id:CmfEvent, and separate those for dependencies.
    1. See if event list can just change display:none for tr on events that are not visible.
1. support `skipCache=1` in react url to force server to pull fresh data from event source.
1. foopee - if no times, currently defaults to 8:01pm, in general if parsing date/time and only date, should pick reasonable start end time (6am-10pm) - do this when implementing CmfEvent.timeKnown

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
1. Logging bug if multiple event sources, could be more than just logs. Below is sourceType 19hz and gc (google calendar), but only gc's id is logged.

## Features

1. Not a bug: When clicking on event for marker popup, map changes, filters and event showing count do not change (correct). Clicking on x to close popup or zooming/moving map should change count.
1. Not a bug: When changing start / end dates on calendar, you cannot change the calendar month by clicking on the arrows next to the month name. Must use the slider.
1. Maybe bug? Marker popup disappears but se is still in URL
    - view all events, click on event to trigger marker popup.
    - filter by date so event goes away. Marker popup disappears, too, but se is still in URL.
    - clearing filters reveals Marker popup again, so can close it.

Also see [How to Use](usage.md)

Found a bug or want a feature? Let me know by [Creating a new issue in github](https://github.com/chadn/cmf/issues/new)
