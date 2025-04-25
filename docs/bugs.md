# Bugs and Known Issues

## Bugs

Working on fixing these:

1. Bug or Feature Change: When clicking on event for marker popup, map changes, filters and event showing count do not change but should.
1. Bug or Feature Change: When popup is open and user moves map, not sure if event count should change .. it does, and probably keep it that way, but selected event should not disappear from event list
1. Bug or Feature Change: show events with unresolved locations on events list. Currently if a user is trying to find an event by name or date, and doesn't realize the location is missing or unresolvable, they will not be able to find it. They should.
   WORKAROUND: unMapped events can be seen in event list by clicking "Filtered by Map"

## Features

Thinking about implementing these:

1. Fully support calendarEndDate as a variable, right now its 3 months from today. Similarly, support calendarStartDate, which is 1 month prior.
1. Make design better - colors. layout, sizing, UX, etc.
1. When user clicks on a date quick-buttons (today, future, past, etc), update the URL params to include "dbtn" with value, like "&dbtn=today". When calendar loads, after all events are loaded, it should check for dbtn parameter and act like the user clicked the button.
1. Similar to last, store selected event id in a URL parameter, so after calendar loads its as if user clicked on that event.
1. Add ability for user to type location in box, then map jumps to it. like https://thetide.guide/, Use https://maps.googleapis.com/maps/api/place/js/AutocompletionService.GetPredictionsJson

Consider features from original version https://chadnorwood.com/projects/gcm/
