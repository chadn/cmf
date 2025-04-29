import {
    isValidViewport,
    isValidDateParam,
    UrlParamsManager,
    createUrlParamsManager,
    getValidatedUrlParams,
} from '../url'
import { logr } from '../logr'

// Mock logr
jest.mock('../logr', () => ({
    logr: {
        info: jest.fn(),
        warn: jest.fn(),
    },
}))

// Mock window.location and history
const mockLocation = {
    pathname: '/',
    search: '',
}
Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
})

Object.defineProperty(window, 'history', {
    value: {
        replaceState: jest.fn(),
    },
    writable: true,
})

describe('url utils', () => {
    describe('isValidViewport', () => {
        it('should return true for valid viewport parameters', () => {
            expect(isValidViewport(45, -122, 12)).toBe(true)
            expect(isValidViewport(-90, -180, 0)).toBe(true)
            expect(isValidViewport(90, 180, 22)).toBe(true)
        })

        it('should return false for invalid viewport parameters', () => {
            expect(isValidViewport(91, -122, 12)).toBe(false)
            expect(isValidViewport(45, -181, 12)).toBe(false)
            expect(isValidViewport(45, -122, -1)).toBe(false)
            expect(isValidViewport(45, -122, 23)).toBe(false)
        })
    })

    describe('isValidDateParam', () => {
        it('should return true for valid relative dates', () => {
            expect(isValidDateParam('1h')).toBe(true)
            expect(isValidDateParam('2d')).toBe(true)
            expect(isValidDateParam('3m')).toBe(true)
            expect(isValidDateParam('-30d')).toBe(true)
            expect(isValidDateParam('999h')).toBe(true)
        })

        it('should return true for valid YYYY-MM-DD dates', () => {
            expect(isValidDateParam('2024-04-29')).toBe(true)
            expect(isValidDateParam('2024-12-31')).toBe(true)
        })

        it('should return false for invalid dates', () => {
            expect(isValidDateParam('invalid')).toBe(false)
            expect(isValidDateParam('2024-13-01')).toBe(false)
            expect(isValidDateParam('2024-04-32')).toBe(false)
            expect(isValidDateParam('1000h')).toBe(false)
            expect(isValidDateParam('1x')).toBe(false)
        })
    })

    describe('UrlParamsManager', () => {
        let manager: UrlParamsManager
        let mockSearchParams: URLSearchParams

        beforeEach(() => {
            mockSearchParams = new URLSearchParams()
            manager = new UrlParamsManager(mockSearchParams)
            jest.clearAllMocks()
            // Reset window.location mock
            window.location.pathname = '/'
            window.location.search = ''
            ;(window.history.replaceState as jest.Mock).mockClear()
        })

        it('should initialize with empty params and default values', () => {
            const params = manager.getAll()
            expect(params.lat).toBe(null)
            expect(params.lon).toBe(null)
            expect(params.zoom).toBe(12) // default value
            expect(params.csd).toBe('-1m') // default value
            expect(params.ced).toBe('3m') // default value
            expect(params.fsd).toBe('-1m') // default value (fallback to csd)
            expect(params.fed).toBe('3m') // default value (fallback to ced)
            expect(params.se).toBe(null)
            expect(params.gc).toBe(null)
            expect(params.fbc).toBe(null)
            expect(params.sq).toBe(null)
        })

        it('should handle valid parameters', () => {
            const params = new URLSearchParams()
            params.set('lat', '45')
            params.set('lon', '-122')
            params.set('zoom', '12')
            params.set('csd', '1d')
            params.set('ced', '7d')

            const manager = new UrlParamsManager(params)
            const result = manager.getAll()

            expect(result.lat).toBe('45')
            expect(result.lon).toBe('-122')
            expect(result.zoom).toBe('12')
            expect(result.csd).toBe('1d')
            expect(result.ced).toBe('7d')
        })

        it('should handle invalid parameters', () => {
            const params = new URLSearchParams()
            params.set('lat', '91') // invalid
            params.set('lon', '-181') // invalid
            params.set('zoom', '23') // invalid
            params.set('csd', 'invalid') // invalid

            const manager = new UrlParamsManager(params)
            const initialParams = manager.initialParams // Check the validated params stored during initialization
            const result = manager.getAll() // Check the raw params with defaults

            // Initial params should be null for invalid values
            expect(initialParams.lat).toBe(null)
            expect(initialParams.lon).toBe(null)
            expect(initialParams.zoom).toBe(null)
            expect(initialParams.csd).toBe(null)

            // getAll() should return raw values if they exist, or defaults if null
            expect(result.lat).toBe('91') // raw value exists
            expect(result.lon).toBe('-181') // raw value exists
            expect(result.zoom).toBe('23') // raw value exists
            expect(result.csd).toBe('invalid') // raw value exists
        })

        it('should set parameters and update URL', () => {
            manager.set({
                lat: 45,
                lon: -122,
                zoom: 12,
            })

            expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/?lat=45&lon=-122&zoom=12')
        })

        it('should delete parameters and update URL', () => {
            const params = new URLSearchParams()
            params.set('lat', '45')
            params.set('lon', '-122')

            const manager = new UrlParamsManager(params)
            manager.delete(['lat'])

            expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/?lon=-122')
        })
    })

    describe('Factory functions', () => {
        it('createUrlParamsManager should create a new instance', () => {
            const manager = createUrlParamsManager()
            expect(manager).toBeInstanceOf(UrlParamsManager)
        })

        it('getValidatedUrlParams should return validated parameters', () => {
            const params = new URLSearchParams()
            params.set('lat', '45')
            params.set('lon', '-122')
            params.set('zoom', '12')

            const result = getValidatedUrlParams(params)
            expect(result.lat).toBe('45')
            expect(result.lon).toBe('-122')
            expect(result.zoom).toBe('12')
        })
    })
})
