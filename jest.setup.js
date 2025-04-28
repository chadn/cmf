// Import Jest DOM extensions
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        pathname: '/',
        query: {},
    }),
    useSearchParams: () => ({
        get: jest.fn().mockImplementation((param) => {
            if (param === 'gc') return 'test-calendar-id'
            return null
        }),
    }),
    usePathname: () => '/',
}))

// Mock environment variables
process.env = {
    ...process.env,
    GOOGLE_CALENDAR_API_KEY: 'test-api-key',
    GOOGLE_MAPS_API_KEY: 'test-api-key',
    MAPLIBRE_STYLE_URL: 'https://demotiles.maplibre.org/style.json',
    LOG_LEVEL: 'DEBUG',
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(), // Deprecated
        removeListener: jest.fn(), // Deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
})

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(callback) {
        this.callback = callback
    }
    observe() {
        return null
    }
    unobserve() {
        return null
    }
    disconnect() {
        return null
    }
}

window.IntersectionObserver = MockIntersectionObserver

// Mock ResizeObserver
class MockResizeObserver {
    observe() {
        return null
    }
    unobserve() {
        return null
    }
    disconnect() {
        return null
    }
}

window.ResizeObserver = MockResizeObserver

// Suppress console errors during tests
const originalConsoleError = console.error
console.error = (...args) => {
    if (
        typeof args[0] === 'string' &&
        (args[0].includes('Warning: ReactDOM.render') ||
            args[0].includes('Warning: React.createElement') ||
            args[0].includes('Error: Uncaught [Error') ||
            args[0].includes('Warning: An update to'))
    ) {
        return
    }
    originalConsoleError(...args)
}

// Mock TextDecoder and TextEncoder for mapbox-gl
class MockTextDecoder {
    decode(data) {
        return typeof data === 'string' ? data : String.fromCharCode.apply(null, data)
    }
}

class MockTextEncoder {
    encode(str) {
        return str.split('').map((char) => char.charCodeAt(0))
    }
}

window.TextDecoder = MockTextDecoder
window.TextEncoder = MockTextEncoder

// Mock nuqs for tests
jest.mock('nuqs', () => ({
    createParser: () => ({
        parse: jest.fn(),
        serialize: jest.fn(),
    }),
}))
