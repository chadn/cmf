import { getSizeOfAny, roundTimeToNearestHour, stringify, getMyCallers } from '@/lib/utils/utils-shared'

describe('utils-shared', () => {
    describe('getSizeOfAny', () => {
        it('should handle null and undefined', () => {
            expect(getSizeOfAny(null)).toBe('4 bytes (object)')
            expect(getSizeOfAny(undefined)).toBe('0 bytes (undefined)')
        })

        it('should handle primitive types', () => {
            expect(getSizeOfAny('hello')).toBe('7 bytes (string)')
            expect(getSizeOfAny(42)).toBe('2 bytes (number)')
            expect(getSizeOfAny(true)).toBe('4 bytes (boolean)')
        })

        it('should handle arrays', () => {
            const arr = [1, 2, 3]
            const result = getSizeOfAny(arr)
            expect(result).toMatch(/^\d+ bytes \(object\)$/)
        })

        it('should handle objects', () => {
            const obj = { a: 1, b: 'test' }
            const result = getSizeOfAny(obj)
            expect(result).toMatch(/^\d+ bytes \(object\)$/)
        })

        it('should handle Buffer', () => {
            const buffer = Buffer.from('test')
            expect(getSizeOfAny(buffer)).toBe('42 bytes (object)')
        })

        it('should handle ArrayBuffer', () => {
            const arrayBuffer = new ArrayBuffer(8)
            expect(getSizeOfAny(arrayBuffer)).toBe('2 bytes (object)')
        })

        it('should handle different output types', () => {
            const data = { test: 'data' }

            // String output (default)
            expect(getSizeOfAny(data, 'string')).toMatch(/^\d+ bytes \(object\)$/)

            // JSON output
            const jsonResult = getSizeOfAny(data, 'json')
            expect(jsonResult).toHaveProperty('bytes')
            expect(jsonResult).toHaveProperty('sizeString')

            // Bytes output
            const bytesResult = getSizeOfAny(data, 'bytes')
            expect(typeof bytesResult).toBe('number')
            expect(bytesResult).toBeGreaterThan(0)
        })

        it('should handle circular references', () => {
            interface Employee {
                name: string
                manager?: Employee
            }
            const circular: Employee = { name: 'John' }
            circular.manager = circular

            const result = getSizeOfAny(circular)
            expect(result).toBe('unknown size (catch)')
        })

        it('should handle functions', () => {
            const func = () => console.log('test')
            const result = getSizeOfAny(func)
            expect(result).toBe('23 bytes (function)')
        })

        it('should handle symbols', () => {
            const symbol = Symbol('test')
            const result = getSizeOfAny(symbol)
            expect(result).toBe('12 bytes (symbol)')
        })
    })

    describe('roundTimeToNearestHour', () => {
        it('should round date to nearest hour', () => {
            const date = new Date('2024-06-10T15:30:45.123Z')
            const result = roundTimeToNearestHour(date)
            expect(result).toBe('2024-06-10T15:00:00Z')
        })

        it('should handle string dates', () => {
            const result = roundTimeToNearestHour('2024-06-10T15:30:45.123Z')
            expect(result).toBe('2024-06-10T15:00:00Z')
        })

        it('should handle invalid dates by using current time', () => {
            const result = roundTimeToNearestHour('invalid')
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/)
        })

        it('should handle empty string by using current time', () => {
            const result = roundTimeToNearestHour('')
            expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/)
        })
    })

    describe('stringify', () => {
        it('should handle null and undefined', () => {
            expect(stringify(null)).toBe('null')
            expect(stringify(undefined)).toBe('undefined')
        })

        it('should handle strings', () => {
            expect(stringify('hello')).toBe('hello')
        })

        it('should truncate long strings', () => {
            const longString = 'a'.repeat(150)
            const result = stringify(longString, 100)
            expect(result).toBe('a'.repeat(97) + '...')
            expect(result.length).toBe(100)
        })

        it('should handle CmfEvents type', () => {
            const cmfEvents = {
                allEvents: [1, 2, 3],
                visibleEvents: [1, 2],
                hiddenCounts: { map: 1 },
            }
            const result = stringify(cmfEvents)
            expect(result).toBe('allEvents:3 visibleEvents:2 {"map":1}')
        })

        it('should handle MapBounds type', () => {
            const bounds = { north: 40, south: 30, east: -120, west: -130 }
            const result = stringify(bounds)
            expect(result).toBe('north:40 south:30 east:-120 west:-130')
        })

        it('should handle MapViewport type', () => {
            const viewport = { latitude: 37.7749, longitude: -122.4194, zoom: 12 }
            const result = stringify(viewport)
            expect(result).toBe('lat:37.7749 lon:-122.4194 zoom:12')
        })

        it('should handle generic objects', () => {
            const obj = { a: 1, b: 'test' }
            expect(stringify(obj)).toBe('{"a":1,"b":"test"}')
        })

        it('should truncate long JSON strings', () => {
            const largeObj = { data: 'x'.repeat(150) }
            const result = stringify(largeObj, 100)
            expect(result.length).toBe(100)
            expect(result.endsWith('...')).toBe(true)
        })
    })

    describe('getMyCallers', () => {
        it('should return an array of caller strings', () => {
            const callers = getMyCallers()
            expect(Array.isArray(callers)).toBe(true)
        })

        it('should filter to only src files by default', () => {
            const callers = getMyCallers()
            callers.forEach((caller) => {
                if (caller !== '') {
                    expect(caller.includes('/src/') || !caller.includes('/')).toBe(true)
                }
            })
        })

        it('should include non-src files when requested', () => {
            const callers = getMyCallers({ nonSrcToo: true })
            expect(Array.isArray(callers)).toBe(true)
        })

        it('should keep oldest non-src lines when requested', () => {
            const callers = getMyCallers({ keepOldest: true })
            expect(Array.isArray(callers)).toBe(true)
        })
    })
})
