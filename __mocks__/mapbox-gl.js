// Mock for mapbox-gl
const mapboxMock = jest.createMockFromModule('mapbox-gl')

// Mock Map class
class MockMap {
    constructor() {
        this.on = jest.fn().mockReturnThis()
        this.off = jest.fn().mockReturnThis()
        this.remove = jest.fn()
        this.getCanvas = jest.fn().mockReturnValue({
            style: {},
            getContext: jest.fn().mockReturnValue({
                canvas: {
                    width: 512,
                    height: 512,
                },
            }),
        })
        this.getContainer = jest.fn().mockReturnValue({
            appendChild: jest.fn(),
            removeChild: jest.fn(),
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
            },
        })
        this.project = jest.fn().mockReturnValue({ x: 0, y: 0 })
        this.unproject = jest.fn().mockReturnValue({ lng: 0, lat: 0 })
        this.addSource = jest.fn()
        this.removeSource = jest.fn()
        this.addLayer = jest.fn()
        this.removeLayer = jest.fn()
        this.getSource = jest.fn().mockReturnValue({
            setData: jest.fn(),
        })
        this.easeTo = jest.fn()
        this.flyTo = jest.fn()
        this.fitBounds = jest.fn()
        this.getBounds = jest.fn().mockReturnValue({
            getNorth: jest.fn().mockReturnValue(1),
            getSouth: jest.fn().mockReturnValue(-1),
            getEast: jest.fn().mockReturnValue(1),
            getWest: jest.fn().mockReturnValue(-1),
            extend: jest.fn(),
        })
        this.getZoom = jest.fn().mockReturnValue(10)
        this.getCenter = jest.fn().mockReturnValue({ lng: 0, lat: 0 })
        this.setCenter = jest.fn()
        this.setZoom = jest.fn()
        this.resize = jest.fn()
        this.loaded = jest.fn().mockReturnValue(true)
    }
}

// Mock Marker class
class MockMarker {
    constructor() {
        this.setLngLat = jest.fn().mockReturnThis()
        this.addTo = jest.fn().mockReturnThis()
        this.remove = jest.fn()
        this.getElement = jest.fn().mockReturnValue({
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
            },
        })
        this.setPopup = jest.fn().mockReturnThis()
    }
}

// Mock Popup class
class MockPopup {
    constructor() {
        this.setLngLat = jest.fn().mockReturnThis()
        this.setHTML = jest.fn().mockReturnThis()
        this.addTo = jest.fn().mockReturnThis()
        this.remove = jest.fn()
        this.setMaxWidth = jest.fn().mockReturnThis()
    }
}

// Mock LngLatBounds class
class MockLngLatBounds {
    extend() {
        return this
    }
}

// Assign mocks to the module
mapboxMock.Map = MockMap
mapboxMock.Marker = MockMarker
mapboxMock.Popup = MockPopup
mapboxMock.LngLatBounds = MockLngLatBounds

module.exports = mapboxMock
