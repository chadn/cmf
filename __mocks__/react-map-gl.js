// Mock for react-map-gl
const React = require('react')

// Mock Map component
const Map = React.forwardRef((props, ref) => {
    // Call onLoad callback if provided
    if (props.onLoad) {
        setTimeout(() => {
            props.onLoad()
        }, 0)
    }

    // Expose methods via ref
    if (ref) {
        ref.current = {
            getMap: () => ({
                getBounds: () => ({
                    getNorth: () => 1,
                    getSouth: () => -1,
                    getEast: () => 1,
                    getWest: () => -1,
                }),
                getCenter: () => ({ lat: 0, lng: 0 }),
                getZoom: () => 10,
                flyTo: jest.fn(),
                easeTo: jest.fn(),
            }),
        }
    }

    return (
        <div
            data-testid="map-container"
            className={props.className}
            style={props.style}
        >
            {props.children}
        </div>
    )
})

// Mock Marker component
const Marker = (props) => {
    return (
        <div
            data-testid="map-marker"
            onClick={props.onClick}
            style={{
                position: 'absolute',
                left: `${props.longitude * 10}px`,
                top: `${props.latitude * 10}px`,
            }}
        >
            {props.children}
        </div>
    )
}

// Mock Popup component
const Popup = (props) => {
    return (
        <div
            data-testid="map-popup"
            style={{
                position: 'absolute',
                left: `${props.longitude * 10}px`,
                top: `${props.latitude * 10}px`,
            }}
        >
            <button onClick={props.onClose}>Close</button>
            {props.children}
        </div>
    )
}

// Mock NavigationControl component
const NavigationControl = (props) => {
    return <div data-testid="navigation-control"></div>
}

// Mock ViewState component
const ViewState = (props) => {
    return <div data-testid="view-state">{props.children}</div>
}

// Export all mocked components
module.exports = {
    Map,
    Marker,
    Popup,
    NavigationControl,
    // Add any other components that might be used
    Source: (props) => <div>{props.children}</div>,
    Layer: (props) => <div></div>,
    useMap: () => ({ current: null }),
    ViewState,
}
