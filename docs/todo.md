# To Do

This is a high level list of things to do on the app. Not necessarily in prioritized order.

1. Server side API timing - log time to fetch events and time to geocode (redis vs maps api)
1. Server side caching events - fetch in redis first, use if its less than SERVER_EVENT_CACHE_SECS
1. Add more protest event sources -
1. Client side caching events - use local storage events if less than CLIENT_EVENT_CACHE_SECS
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
