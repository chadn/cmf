import { determineHeaderName } from '../headerNames'
import type { EventsSource } from '@/types/events'
import { ExampleEventSource } from '@/lib/events/examples'

describe('determineHeaderName', () => {
  const mockExampleSources: ExampleEventSource[] = [
    { shortId: 'sf', name: 'SF Events' } as ExampleEventSource,
    { shortId: 'nyc', name: 'NYC Events' } as ExampleEventSource,
  ]

  describe('with window.location.search', () => {
    beforeEach(() => {
      // Reset window.location.search
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).location
    })

    it('returns example source name when shortId matches', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?es=sf' },
        writable: true,
      })

      const result = determineHeaderName(null, mockExampleSources)
      expect(result).toBe('SF Events')
    })

    it('returns example source name when shortId is in middle of query string', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?foo=bar&es=nyc&baz=qux' },
        writable: true,
      })

      const result = determineHeaderName(null, mockExampleSources)
      expect(result).toBe('NYC Events')
    })

    it('falls through when shortId does not match any example source', () => {
      Object.defineProperty(window, 'location', {
        value: { search: '?es=unknown' },
        writable: true,
      })

      const eventSource: EventsSource = { name: 'My Calendar', events: [], id: '1' }
      const result = determineHeaderName([eventSource], mockExampleSources)
      expect(result).toBe('My Calendar')
    })
  })

  describe('with single event source', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
      })
    })

    it('returns trimmed event source name', () => {
      const eventSource: EventsSource = { name: 'My Calendar', events: [], id: '1' }
      const result = determineHeaderName([eventSource], mockExampleSources)
      expect(result).toBe('My Calendar')
    })

    it('removes "Google Calendar:" prefix and trims', () => {
      const eventSource: EventsSource = {
        name: 'Google Calendar: Work Events',
        events: [],
        id: '1',
      }
      const result = determineHeaderName([eventSource], mockExampleSources)
      expect(result).toBe('Work Events')
    })

    it('truncates long names to 20 chars with ellipsis', () => {
      const eventSource: EventsSource = {
        name: 'This is a very long calendar name that needs truncation',
        events: [],
        id: '1',
      }
      const result = determineHeaderName([eventSource], mockExampleSources)
      expect(result).toBe('This is a very long ...') // space before ellipsis from slice(0,20)
      expect(result.length).toBe(23) // 20 chars + ' ...'
    })

    it('does not truncate names at exactly 22 chars', () => {
      const eventSource: EventsSource = {
        name: '1234567890123456789012',
        events: [],
        id: '1',
      }
      const result = determineHeaderName([eventSource], mockExampleSources)
      expect(result).toBe('1234567890123456789012')
    })

    it('truncates names longer than 22 chars', () => {
      const eventSource: EventsSource = {
        name: '12345678901234567890123',
        events: [],
        id: '1',
      }
      const result = determineHeaderName([eventSource], mockExampleSources)
      expect(result).toBe('12345678901234567890...')
    })
  })

  describe('with multiple event sources', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
      })
    })

    it('returns "Various Event Sources" for multiple sources', () => {
      const eventSources: EventsSource[] = [
        { name: 'Calendar 1', events: [], id: '1' },
        { name: 'Calendar 2', events: [], id: '2' },
      ]
      const result = determineHeaderName(eventSources, mockExampleSources)
      expect(result).toBe('Various Event Sources')
    })
  })

  describe('with no event sources', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: { search: '' },
        writable: true,
      })
    })

    it('returns default name when eventSources is null', () => {
      const result = determineHeaderName(null, mockExampleSources)
      expect(result).toBe('Calendar Map Filter Sources')
    })

    it('returns default name when eventSources is empty array', () => {
      const result = determineHeaderName([], mockExampleSources)
      expect(result).toBe('Calendar Map Filter Sources')
    })
  })
})
