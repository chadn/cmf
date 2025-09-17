import {
    buildShareUrl,
    parseAsZoom,
    parseAsLatLon,
    parseAsEventsSource,
    parseAsCmfDate,
    parseAsDateQuickFilter,
    parseAsLlz,
} from '@/lib/utils/url-utils'
import { ExampleEventsSources } from '@/lib/events/examples'

// Mock the nuqs parser
jest.mock('nuqs', () => ({
    createParser: jest.fn().mockImplementation((config) => ({
        parse: config.parse,
        serialize: config.serialize,
    })),
}))

// Mock the ExampleEventsSources for parseAsEventsSource tests
jest.mock('@/lib/events/examples', () => ({
    ExampleEventsSources: [
        { id: 'example:123', shortId: 'ex123' },
        { id: 'example:456', shortId: 'ex456' },
        { id: 'example:789', shortId: null }, // One without shortId
    ],
}))

// Mock additional dependencies for the new tests
jest.mock('@/lib/utils/date', () => ({
    getDateFromUrlDateString: jest.fn((date) => {
        if (date === '2025-09-01' || date === '2025-09-30' || date === '-1m' || date === '3m') {
            return new Date('2025-09-15')
        }
        if (date === '1w' || date === '-7d' || date === '2025-01-15') {
            return new Date('2025-09-15')
        }
        if (date === '2025-09-10') {
            return new Date('2025-09-10')
        }
        if (date === '2025-09-20') {
            return new Date('2025-09-20')
        }
        if (date === '2025-09-15') {
            return new Date('2025-09-15')
        }
        if (date === '2025-09-22') {
            return new Date('2025-09-22')
        }
        return null
    }),
    formatDateForUrl: jest.fn((dateIso: string) => {
        const date = new Date(dateIso)
        if (isNaN(date.getTime())) {
            return dateIso // Return as is if invalid date
        }
        return date.toISOString().split('T')[0]
    }),
}))

jest.mock('@/lib/utils/quickFilters', () => ({
    calculateQuickFilterRange: jest.fn((qf: string) => {
        if (qf === 'today') {
            return { start: 14, end: 14 } // 14th day from start
        }
        return null
    }),
}))

jest.mock('@/lib/utils/date-constants', () => ({
    dateQuickFilterLabels: ['today', 'next3days', 'weekend', 'next7days'],
}))

describe('buildShareUrl', () => {
    const mockDate = new Date('2025-09-15T12:00:00Z')

    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(mockDate)

        // Mock window.location
        Object.defineProperty(window, 'location', {
            value: {
                href: 'https://example.com/test',
                origin: 'https://example.com',
                pathname: '/test',
            },
            writable: true,
        })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('should return current URL when no currentUrlState provided', () => {
        const result = buildShareUrl({})
        expect(result).toBe('https://example.com/test')
    })

    it('should build URL with event source', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
            },
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com')
    })

    it('should build URL with multiple event sources', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: ['gc:test1@gmail.com', 'gc:test2@gmail.com'],
            },
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest1%40gmail.com%2Cgc%3Atest2%40gmail.com')
    })

    it('should include search query and selected event', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                se: 'event123',
                sq: 'test search',
            },
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com&se=event123&sq=test+search')
    })

    it('should use qf when preferQfChecked is true (default)', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                qf: 'next7days',
            },
            preferQfChecked: true,
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com&qf=next7days')
    })

    it('should convert qf to fsd/fed when preferQfChecked is false', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                qf: 'today',
                sd: '-1m',
                ed: '3m',
            },
            preferQfChecked: false,
        })

        // Should contain fsd and fed parameters instead of qf
        expect(result).toContain('fsd=')
        expect(result).toContain('fed=')
        expect(result).not.toContain('qf=')
    })

    it('should use fsd/fed when provided and no qf', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                fsd: '2025-09-15',
                fed: '2025-09-22',
            },
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com&fsd=2025-09-15&fed=2025-09-22')
    })

    it('should use dateSliderRange when provided and no qf', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                dateSliderRange: { startIso: '2025-09-10', endIso: '2025-09-20' },
            },
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com&fsd=2025-09-10&fed=2025-09-20')
    })

    it('should include llz only when llzChecked is true', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                llz: { lat: 45.5231, lon: -122.6765, zoom: 12 },
            },
            llzChecked: true,
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com&llz=45.52310%2C-122.67650%2C12')
    })

    it('should not include llz when llzChecked is false', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                llz: { lat: 45.5231, lon: -122.6765, zoom: 12 },
            },
            llzChecked: false,
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com')
    })

    it('should use custom baseUrl when provided', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
            },
            baseUrl: 'https://custom.com/path',
        })
        expect(result).toBe('https://custom.com/path?es=gc%3Atest%40gmail.com')
    })

    it('should handle empty currentUrlState gracefully', () => {
        const result = buildShareUrl({
            currentUrlState: {},
        })
        expect(result).toBe('https://example.com/test?')
    })

    it('should fallback to qf if conversion fails', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                qf: 'invalid-qf',
                sd: 'invalid-date',
                ed: 'invalid-date',
            },
            preferQfChecked: false,
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com&qf=invalid-qf')
    })

    it('should omit qf parameter when qf is empty string', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                qf: '',
            },
            preferQfChecked: true,
        })
        expect(result).toBe('https://example.com/test?es=gc%3Atest%40gmail.com')
        expect(result).not.toContain('qf=')
    })
})

describe('parseAsZoom', () => {
    it('should parse valid zoom values', () => {
        expect(parseAsZoom.parse('10')).toBe(10)
        expect(parseAsZoom.parse('12.5')).toBe(12.5)
    })

    it('should return null for invalid zoom values', () => {
        expect(parseAsZoom.parse('0')).toBeNull() // Below min
        expect(parseAsZoom.parse('23')).toBeNull() // Above max
        expect(parseAsZoom.parse('not-a-number')).toBeNull() // Not a number
    })

    it('should serialize zoom values correctly', () => {
        expect(parseAsZoom.serialize(10)).toBe('10') // Integer
        expect(parseAsZoom.serialize(12.5)).toBe('12.5') // Decimal
    })
})

describe('parseAsLatLon', () => {
    it('should parse valid latitude/longitude values', () => {
        expect(parseAsLatLon.parse('37.7749')).toBe(37.7749)
        expect(parseAsLatLon.parse('-122.4194')).toBe(-122.4194)
    })

    it('should return null for invalid latitude/longitude values', () => {
        expect(parseAsLatLon.parse('200')).toBeNull() // Above max
        expect(parseAsLatLon.parse('-200')).toBeNull() // Below min
        expect(parseAsLatLon.parse('not-a-number')).toBeNull() // Not a number
    })

    it('should serialize latitude/longitude values correctly', () => {
        expect(parseAsLatLon.serialize(37.7749)).toBe('37.77490')
        expect(parseAsLatLon.serialize(-122.4194)).toBe('-122.41940')
    })
})

describe('parseAsEventsSource', () => {
    it('should parse valid event source IDs', () => {
        expect(parseAsEventsSource.parse('facebook:123')).toBe('facebook:123')
        expect(parseAsEventsSource.parse('meetup:456')).toBe('meetup:456')
    })

    it('should parse example event source shortIds', () => {
        expect(parseAsEventsSource.parse('ex123')).toBe('example:123')
        expect(parseAsEventsSource.parse('ex456')).toBe('example:456')
    })

    it('should return null for invalid event source IDs', () => {
        expect(parseAsEventsSource.parse('invalid-format')).toBeNull()
        expect(parseAsEventsSource.parse('123')).toBeNull()
    })

    it('should serialize event source IDs correctly', () => {
        // Mock the behavior of ExampleEventsSources.find
        // Setup mock implementations for this test only
        const originalFind = ExampleEventsSources.find
        ExampleEventsSources.find = jest.fn((callback) => {
            // Return mockEventsSource for example:123 and example:456
            if (callback({ id: 'example:123', shortId: 'ex123' })) {
                return { id: 'example:123', shortId: 'ex123' }
            }
            if (callback({ id: 'example:456', shortId: 'ex456' })) {
                return { id: 'example:456', shortId: 'ex456' }
            }
            // Return null for other cases like example:789
            return null
        }) as jest.Mock

        try {
            // Regular IDs should remain unchanged
            expect(parseAsEventsSource.serialize('facebook:123')).toBe('facebook:123')

            // Example IDs with shortId should be converted to shortIds
            expect(parseAsEventsSource.serialize('example:123')).toBe('ex123')
            expect(parseAsEventsSource.serialize('example:456')).toBe('ex456')

            // Example without shortId should return the original ID
            expect(parseAsEventsSource.serialize('example:789')).toBe('example:789')
        } finally {
            // Restore the original find method after the test
            ExampleEventsSources.find = originalFind
        }
    })
})

describe('parseAsCmfDate', () => {
    it('should parse valid CMF date strings', () => {
        expect(parseAsCmfDate.parse('2025-01-15')).toBe('2025-01-15')
        expect(parseAsCmfDate.parse('1w')).toBe('1w')
        expect(parseAsCmfDate.parse('-7d')).toBe('-7d')
    })

    it('should return null for invalid date strings', () => {
        expect(parseAsCmfDate.parse('invalid-date')).toBeNull()
        expect(parseAsCmfDate.parse('')).toBeNull()
        expect(parseAsCmfDate.parse('not-a-date')).toBeNull()
    })

    it('should serialize date strings correctly', () => {
        expect(parseAsCmfDate.serialize('2025-01-15')).toBe('2025-01-15')
        expect(parseAsCmfDate.serialize('1w')).toBe('1w')
    })
})

describe('parseAsDateQuickFilter', () => {
    it('should parse valid quick filter labels', () => {
        expect(parseAsDateQuickFilter.parse('today')).toBe('today')
        expect(parseAsDateQuickFilter.parse('Today')).toBe('today')
        expect(parseAsDateQuickFilter.parse('NEXT 3 DAYS')).toBe('next3days')
        expect(parseAsDateQuickFilter.parse('weekend')).toBe('weekend')
    })

    it('should return null for invalid quick filter labels', () => {
        expect(parseAsDateQuickFilter.parse('invalid-filter')).toBeNull()
        expect(parseAsDateQuickFilter.parse('')).toBeNull()
        expect(parseAsDateQuickFilter.parse('not-a-filter')).toBeNull()
    })

    it('should serialize quick filter values correctly', () => {
        expect(parseAsDateQuickFilter.serialize('today')).toBe('today')
        expect(parseAsDateQuickFilter.serialize('next3days')).toBe('next3days')
    })
})

describe('parseAsLlz', () => {
    it('should parse valid llz strings', () => {
        const result = parseAsLlz.parse('37.7749,-122.4194,10')
        expect(result).toEqual({ lat: 37.7749, lon: -122.4194, zoom: 10 })
    })

    it('should return null for invalid llz strings', () => {
        expect(parseAsLlz.parse('invalid')).toBeNull()
        expect(parseAsLlz.parse('37.7749,-122.4194')).toBeNull() // Missing zoom
        expect(parseAsLlz.parse('37.7749,-122.4194,10,extra')).toBeNull() // Too many parts
        expect(parseAsLlz.parse('not-a-number,-122.4194,10')).toBeNull() // Invalid lat
        expect(parseAsLlz.parse('37.7749,not-a-number,10')).toBeNull() // Invalid lon
        expect(parseAsLlz.parse('37.7749,-122.4194,not-a-number')).toBeNull() // Invalid zoom
        expect(parseAsLlz.parse('200,-122.4194,10')).toBeNull() // Lat out of bounds
        expect(parseAsLlz.parse('37.7749,200,10')).toBeNull() // Lon out of bounds
        expect(parseAsLlz.parse('37.7749,-122.4194,0')).toBeNull() // Zoom below min
        expect(parseAsLlz.parse('37.7749,-122.4194,25')).toBeNull() // Zoom above max
        expect(parseAsLlz.parse(null as unknown as string)).toBeNull()
        expect(parseAsLlz.parse('')).toBeNull()
    })

    it('should serialize llz objects correctly', () => {
        expect(parseAsLlz.serialize({ lat: 37.7749, lon: -122.4194, zoom: 10 })).toBe('37.77490,-122.41940,10')
        expect(parseAsLlz.serialize({ lat: 37.7749, lon: -122.4194, zoom: 10.5 })).toBe('37.77490,-122.41940,10.5')
        expect(parseAsLlz.serialize(null as unknown as { lat: number; lon: number; zoom: number })).toBe('')
        expect(parseAsLlz.serialize(undefined as unknown as { lat: number; lon: number; zoom: number })).toBe('')
        expect(parseAsLlz.serialize('invalid' as unknown as { lat: number; lon: number; zoom: number })).toBe('')
    })
})

describe('parseAsEventsSource', () => {
    it('should parse single valid event source IDs', () => {
        expect(parseAsEventsSource.parse('custom:123')).toBe('custom:123')
        expect(parseAsEventsSource.parse('facebook:456')).toBe('facebook:456')
    })

    it('should parse comma-separated event sources', () => {
        const result = parseAsEventsSource.parse('facebook:123,meetup:456')
        expect(Array.isArray(result)).toBe(true)
        expect(result).toContain('facebook:123')
        expect(result).toContain('meetup:456')
    })

    it('should handle example source shortcuts in comma-separated list', () => {
        const result = parseAsEventsSource.parse('ex123,custom:456')
        expect(Array.isArray(result)).toBe(true)
        expect(result).toContain('example:123')
        expect(result).toContain('custom:456')
    })

    it('should return null for invalid event source formats', () => {
        expect(parseAsEventsSource.parse('invalid-format')).toBeNull()
        expect(parseAsEventsSource.parse('123')).toBeNull()
        expect(parseAsEventsSource.parse('')).toBeNull()
        expect(parseAsEventsSource.parse(123 as unknown as string)).toBeNull()
    })

    it('should return null if any source in comma-separated list is invalid', () => {
        expect(parseAsEventsSource.parse('facebook:123,invalid-format')).toBeNull()
    })

    it('should handle example sources with ids object structure', () => {
        // Mock example source with ids structure
        const originalFind = ExampleEventsSources.find
        ExampleEventsSources.find = jest.fn((callback) => {
            if (callback({ shortId: 'multi', ids: { 'source1:123': 'Source 1', 'source2:456': 'Source 2' } })) {
                return { shortId: 'multi', ids: { 'source1:123': 'Source 1', 'source2:456': 'Source 2' } }
            }
            return originalFind.call(ExampleEventsSources, callback)
        }) as jest.Mock

        try {
            const result = parseAsEventsSource.parse('multi')
            expect(Array.isArray(result)).toBe(true)
            expect(result).toEqual(['source1:123', 'source2:456'])
        } finally {
            ExampleEventsSources.find = originalFind
        }
    })

    it('should serialize array of sources correctly', () => {
        const result = parseAsEventsSource.serialize(['facebook:123', 'meetup:456'])
        expect(result).toBe('facebook:123,meetup:456')
    })

    it('should serialize single source correctly', () => {
        expect(parseAsEventsSource.serialize('facebook:123')).toBe('facebook:123')
    })
})

describe('buildShareUrl - Additional Coverage', () => {
    beforeEach(() => {
        jest.useFakeTimers()
        jest.setSystemTime(new Date('2025-09-15T12:00:00Z'))

        Object.defineProperty(window, 'location', {
            value: {
                href: 'https://example.com/test',
                origin: 'https://example.com',
                pathname: '/test',
            },
            writable: true,
        })
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    it('should handle successful qf to fsd/fed conversion', () => {
        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                qf: 'today',
                sd: '2025-09-01',
                ed: '2025-09-30',
            },
            preferQfChecked: false,
        })

        // Should contain fsd and fed parameters
        expect(result).toContain('fsd=')
        expect(result).toContain('fed=')
        expect(result).not.toContain('qf=')
    })

    it('should handle error in qf conversion and fallback to qf', () => {
        // Mock calculateQuickFilterRange to throw an error
        const quickFiltersMock = jest.requireMock('@/lib/utils/quickFilters') as {
            calculateQuickFilterRange: jest.Mock
        }
        const originalImpl = quickFiltersMock.calculateQuickFilterRange
        quickFiltersMock.calculateQuickFilterRange = jest.fn(() => {
            throw new Error('Calculation failed')
        })

        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                qf: 'today',
                sd: '-1m',
                ed: '3m',
            },
            preferQfChecked: false,
        })

        expect(result).toContain('qf=today')

        // Restore original implementation
        quickFiltersMock.calculateQuickFilterRange = originalImpl
    })

    it('should handle null range from calculateQuickFilterRange', () => {
        const quickFiltersMock = jest.requireMock('@/lib/utils/quickFilters') as {
            calculateQuickFilterRange: jest.Mock
        }
        const originalImpl = quickFiltersMock.calculateQuickFilterRange
        quickFiltersMock.calculateQuickFilterRange = jest.fn(() => null)

        const result = buildShareUrl({
            currentUrlState: {
                es: 'gc:test@gmail.com',
                qf: 'invalid-filter',
                sd: '-1m',
                ed: '3m',
            },
            preferQfChecked: false,
        })

        expect(result).toContain('qf=invalid-filter')

        // Restore original implementation
        quickFiltersMock.calculateQuickFilterRange = originalImpl
    })
})
