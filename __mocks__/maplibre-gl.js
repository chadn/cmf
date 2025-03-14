// Mock for maplibre-gl
class Map {
    constructor(options) {
        this.options = options
        this.on = jest.fn()
        this.off = jest.fn()
        this.remove = jest.fn()
        this.getCanvas = jest.fn(() => ({
            clientWidth: 512,
            clientHeight: 512,
        }))
        this.getCenter = jest.fn(() => ({ lat: 0, lng: 0 }))
        this.getZoom = jest.fn(() => 10)
        this.getBearing = jest.fn(() => 0)
        this.getPitch = jest.fn(() => 0)
        this.getBounds = jest.fn(() => ({
            getNorthEast: () => ({ lat: 1, lng: 1 }),
            getSouthWest: () => ({ lat: -1, lng: -1 }),
            toArray: () => [
                [-1, -1],
                [1, 1],
            ],
        }))
        this.easeTo = jest.fn()
        this.flyTo = jest.fn()
        this.fitBounds = jest.fn()
        this.addControl = jest.fn()
        this.removeControl = jest.fn()
        this.addSource = jest.fn()
        this.removeSource = jest.fn()
        this.addLayer = jest.fn()
        this.removeLayer = jest.fn()
        this.getSource = jest.fn(() => ({
            setData: jest.fn(),
        }))
        this.loaded = jest.fn(() => true)
        this.resize = jest.fn()
        this.project = jest.fn((lngLat) => ({ x: 0, y: 0 }))
        this.unproject = jest.fn((point) => ({ lng: 0, lat: 0 }))
        this.once = jest.fn((event, callback) => {
            if (event === 'load') {
                callback()
            }
        })
    }
}

class NavigationControl {
    constructor() {}
}

class Popup {
    constructor() {
        this.setLngLat = jest.fn(() => this)
        this.setHTML = jest.fn(() => this)
        this.addTo = jest.fn(() => this)
        this.remove = jest.fn()
        this.setDOMContent = jest.fn(() => this)
    }
}

class Marker {
    constructor() {
        this.setLngLat = jest.fn(() => this)
        this.addTo = jest.fn(() => this)
        this.remove = jest.fn()
        this.setPopup = jest.fn(() => this)
        this.togglePopup = jest.fn()
        this.getElement = jest.fn(() => document.createElement('div'))
        this.setDraggable = jest.fn()
        this.on = jest.fn(() => this)
        this.setOffset = jest.fn(() => this)
    }
}

class LngLat {
    constructor(lng, lat) {
        this.lng = lng
        this.lat = lat
    }

    wrap() {
        return this
    }

    toArray() {
        return [this.lng, this.lat]
    }
}

class LngLatBounds {
    constructor(sw, ne) {
        this.sw = sw
        this.ne = ne
    }

    extend() {
        return this
    }

    getCenter() {
        return new LngLat(0, 0)
    }

    getSouthWest() {
        return this.sw
    }

    getNorthEast() {
        return this.ne
    }

    toArray() {
        return [this.sw.toArray(), this.ne.toArray()]
    }
}

module.exports = {
    Map,
    NavigationControl,
    Popup,
    Marker,
    LngLat,
    LngLatBounds,
    supported: jest.fn(() => true),
    clearPrewarmedResources: jest.fn(),
}
