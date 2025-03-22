# Bugs and Known Issues

## Bugs

Working on fixing these:

1. Browser client initialization - Sometimes when first rendering, calendar loads events successfully, but the events do not appear on the list or the map.
WORKAROUND: move the map a little, triggers filters, click "filtered by map"
1. Bug or Feature Change - show events with unresolved locations on events list. Currently if a user is trying to find an event by name or date, and doesn't realize the location is missing or unresolvable, they will not be able to find it.  They should.  This is partally implemented via filteredWithLocations 
1. Bug: When clicking on "bad addr" it toggles to show events with unresolved locations, but it doesn't actually update events list as user expects.

## Features 

Thinking about implementing these:

1. Fully support calendarEndDate as a variable, right now its 3 months from today. Similarly, support calendarStartDate, which is 1 month prior.
1. Make design better - colors. layout, sizing, UX, etc.

Consider features from original version https://chadnorwood.com/projects/gcm/
