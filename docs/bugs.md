# Bugs and Known Issues

## Bugs

Working on fixing these:

1. Bug or Feature Change - show events with unresolved locations on events list. Currently if a user is trying to find an event by name or date, and doesn't realize the location is missing or unresolvable, they will not be able to find it. They should.
   WORKAROUND: unMapped events can be seen in event list by clicking "Filtered by Map"
1. Bug: When clicking on "bad addr" it toggles to show events with unresolved locations, but it doesn't actually update events list as user expects.
1. Search text should but does not find orginal locations. Feature fix: prepend original location to location column

## Features

Thinking about implementing these:

1. Fully support calendarEndDate as a variable, right now its 3 months from today. Similarly, support calendarStartDate, which is 1 month prior.
1. Make design better - colors. layout, sizing, UX, etc.
1. Add ability for user to type location in box, then map jumps to it. like https://thetide.guide/, Use https://maps.googleapis.com/maps/api/place/js/AutocompletionService.GetPredictionsJson

Consider features from original version https://chadnorwood.com/projects/gcm/
