import { FilterEventsManager } from '@/lib/events/FilterEventsManager'
import { CmfEvent } from '@/types/events'
import { MapBounds } from '@/types/map'

describe('FilterEventsManager - new viewport parameter model', () => {
    const makeEvent = (id: string, lat: number, lng: number): CmfEvent => ({
        id,
        name: `Event ${id}`,
        description: '',
        description_urls: [],
        original_event_url: `https://example.com/${id}`,
        start: '2025-01-01T00:00:00Z',
        end: '2025-01-01T01:00:00Z',
        location: 'Somewhere',
        resolved_location: {
            status: 'resolved',
            lat,
            lng,
            formatted_address: 'Somewhere',
            original_location: 'Somewhere',
        },
    })

    const mapBounds: MapBounds = {
        north: 37.6,
        south: 37.4,
        east: -122.3,
        west: -122.5,
    }

    it('applies viewport bounds passed as parameter for both filtering and chip count', () => {
        const visible = makeEvent('visible', 37.5, -122.4) // inside viewport
        const outside = makeEvent('outside', 35.9, -122.4) // outside viewport

        const mgr = new FilterEventsManager([visible, outside])

        // Without viewport parameter - shows all events
        const resultWithoutViewport = mgr.getCmfEvents()
        expect(resultWithoutViewport.visibleEvents.map((e) => e.id).sort()).toEqual(['outside', 'visible'])
        expect(resultWithoutViewport.hiddenCounts.byMap).toBe(0)

        // With viewport parameter - filters both visible events and chip count
        const resultWithViewport = mgr.getCmfEvents(mapBounds)
        expect(resultWithViewport.visibleEvents.map((e) => e.id)).toEqual(['visible'])
        expect(resultWithViewport.hiddenCounts.byMap).toBe(1)
    })

    it('applies domain filters (date, search) independently of viewport', () => {
        const eventInDateRange = {
            ...makeEvent('inDate', 37.5, -122.4),
            start: '2025-01-15T00:00:00Z',
        }
        const eventOutOfDateRange = {
            ...makeEvent('outOfDate', 37.5, -122.4),
            start: '2025-02-15T00:00:00Z',
        }

        const mgr = new FilterEventsManager([eventInDateRange, eventOutOfDateRange])
        mgr.setDateRange({ startIso: '2025-01-01', endIso: '2025-01-31' })

        const result = mgr.getCmfEvents(mapBounds)

        // Date filter excludes outOfDate from domain results
        expect(result.visibleEvents.map((e) => e.id)).toEqual(['inDate'])
        expect(result.hiddenCounts.byDate).toBe(1)

        // Map chip shows map filtering against all events (not just domain results)
        expect(result.hiddenCounts.byMap).toBe(0) // both events are in viewport bounds
    })

    it('calculates independent chip counts correctly', () => {
        const events = [
            { ...makeEvent('inViewport', 37.5, -122.4), start: '2025-01-15T00:00:00Z', name: 'match' },
            { ...makeEvent('outViewport', 35.9, -122.4), start: '2025-01-15T00:00:00Z', name: 'match' },
            { ...makeEvent('inViewportOutDate', 37.5, -122.4), start: '2025-02-15T00:00:00Z', name: 'match' },
            { ...makeEvent('outViewportOutDate', 35.9, -122.4), start: '2025-02-15T00:00:00Z', name: 'other' },
        ]

        const mgr = new FilterEventsManager(events)
        mgr.setDateRange({ startIso: '2025-01-01', endIso: '2025-01-31' })
        mgr.setSearchQuery('match')

        const result = mgr.getCmfEvents(mapBounds)

        // Visible events: in viewport + in date range + matches search
        expect(result.visibleEvents.map((e) => e.id)).toEqual(['inViewport'])

        // Independent chip counts
        expect(result.hiddenCounts.byMap).toBe(2) // outViewport + outViewportOutDate (map filter against all events)
        expect(result.hiddenCounts.byDate).toBe(2) // inViewportOutDate + outViewportOutDate (date filter against all events)
        expect(result.hiddenCounts.bySearch).toBe(1) // outViewportOutDate (search filter against all events)
    })

    it('handles no viewport parameter gracefully', () => {
        const events = [makeEvent('a', 37.5, -122.4), makeEvent('b', 35.9, -122.4)]

        const mgr = new FilterEventsManager(events)
        mgr.setSearchQuery('a')

        const result = mgr.getCmfEvents() // no viewport parameter

        expect(result.visibleEvents.map((e) => e.id)).toEqual(['a'])
        expect(result.hiddenCounts.byMap).toBe(0) // no map filtering
        expect(result.hiddenCounts.bySearch).toBe(1)
    })
})
