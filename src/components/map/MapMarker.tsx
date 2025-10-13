'use client'

import React from 'react'

interface MapMarkerProps {
    count: number
    isSelected: boolean
    isUnresolved?: boolean
}

const MapMarker: React.FC<MapMarkerProps> = ({ count, isSelected, isUnresolved }) => {
    // Determine marker size based on event count
    const getMarkerSize = () => {
        if (count === 1) return 'w-6 h-6'
        if (count < 5) return 'w-7 h-7'
        if (count < 10) return 'w-8 h-8'
        return 'w-10 h-10'
    }

    // Determine text size based on event count
    const getTextSize = () => {
        if (count === 1) return 'text-xs'
        if (count < 10) return 'text-sm'
        return 'text-xs'
    }

    return (
        <div
            className={`
        ${getMarkerSize()} 
        rounded-full 
        flex 
        items-center 
        justify-center 
        ${isSelected ? 'bg-green-500 border-2 border-green-700' : isUnresolved ? 'bg-orange-500' : 'bg-blue-600'} 
        text-white 
        font-bold 
        ${getTextSize()}
        shadow-md
        transform
        ${isSelected ? 'scale-125' : 'scale-100'}
        transition-transform
        duration-200
        cursor-pointer
      `}
            data-testid="map-marker-component"
            data-umami-event="MarkerDiv"
            data-selected={isSelected}
        >
            {count}
        </div>
    )
}

export default MapMarker
