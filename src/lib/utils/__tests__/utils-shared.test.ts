import { getSizeOfAny } from '../utils-shared'

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
})
