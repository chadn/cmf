import { MapBounds } from '@/types/map'
import { Location } from '@/types/events'

/**
 * Truncates a location string to a maximum length
 * @param location - The location string to truncate
 * @param maxLength - Maximum length (default: 40)
 * @returns Truncated location string with ellipsis if needed
 */
export function truncateLocation(location: string, maxLength: number = 40): string {
    if (!location) return ''
    if (location.length <= maxLength) return location
    return `${location.substring(0, maxLength - 3)}...`
}

/**
 * Checks if a location is within the given map bounds
 * @param location - The location to check
 * @param bounds - The map bounds to check against
 * @returns boolean indicating if the location is within bounds
 */
export function isLocationInBounds(location: Location, bounds: MapBounds): boolean {
    if (!location.lat || !location.lng) return false

    return (
        location.lat >= bounds.south &&
        location.lat <= bounds.north &&
        location.lng >= bounds.west &&
        location.lng <= bounds.east
    )
}

/**
 * Finds the largest city in a set of locations
 * Used as a fallback for the "Map of All Events" view
 * @param locations - Array of resolved locations
 * @returns The location of the largest city, or null if none found
 */
export function findLargestCity(locations: Location[]): Location | null {
    // Filter to only resolved locations
    const resolvedLocations = locations.filter((loc) => loc.status === 'resolved' && loc.lat && loc.lng)

    if (resolvedLocations.length === 0) {
        return null
    }

    // For a simple implementation, we'll just return the first resolved location
    // In a real implementation, this would use population data or other heuristics
    return resolvedLocations[0]
}

/**
 * Calculates the center point of multiple locations
 * @param locations - Array of resolved locations
 * @returns Object with latitude and longitude of the center point
 */
export function calculateCenter(locations: Location[]): {
    latitude: number
    longitude: number
} {
    // Filter to only resolved locations
    const resolvedLocations = locations.filter((loc) => loc.status === 'resolved' && loc.lat && loc.lng)

    if (resolvedLocations.length === 0) {
        // Default to a central US location if no resolved locations
        return { latitude: 39.8283, longitude: -98.5795 }
    }

    // Calculate the average of all latitudes and longitudes
    const sumLat = resolvedLocations.reduce((sum, loc) => sum + (loc.lat || 0), 0)
    const sumLng = resolvedLocations.reduce((sum, loc) => sum + (loc.lng || 0), 0)

    return {
        latitude: sumLat / resolvedLocations.length,
        longitude: sumLng / resolvedLocations.length,
    }
}
