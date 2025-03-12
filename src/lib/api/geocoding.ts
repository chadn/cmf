import axios from 'axios'
import { GeocodeResponse } from '@/types/api'
import { ResolvedLocation } from '@/types/events'
import { getCachedLocation, cacheLocation } from '@/lib/cache'
import { debugLog } from '@/lib/utils/debug'

const GOOGLE_MAPS_GEOCODING_API =
    'https://maps.googleapis.com/maps/api/geocode/json'

// Fixed location for temporary use
const FIXED_LOCATION = {
    formatted_address: 'Berkeley CA 94705',
    lat: 37.8608, // Approximate coordinates for Berkeley
    lng: -122.2451,
    status: 'resolved' as const,
}

/**
 * Geocodes a location string using Google Maps Geocoding API
 * TEMPORARILY MODIFIED: Always returns a fixed address
 * @param locationString - The location text to geocode
 * @returns Promise with geocoded location data
 */
export async function geocodeLocation(
    locationString: string
): Promise<ResolvedLocation> {
    if (!locationString) {
        return {
            original_location: '',
            status: 'unresolved',
        }
    }

    debugLog(
        'geocoding',
        `TEMPORARY: Using fixed address for "${locationString}"`
    )

    // Return the fixed location for all requests
    return {
        original_location: locationString,
        formatted_address: FIXED_LOCATION.formatted_address,
        lat: FIXED_LOCATION.lat,
        lng: FIXED_LOCATION.lng,
        status: FIXED_LOCATION.status,
    }

    /* Original implementation commented out
    try {
        // Check cache first
        const cachedLocation = await getCachedLocation(locationString)
        if (cachedLocation) {
            return cachedLocation
        }

        // If not in cache, call the API
        if (!process.env.GOOGLE_MAPS_API_KEY) {
            debugLog('api', 'Google Maps API key is not configured')
            throw new Error('Google Maps API key is not configured')
        }

        const params = {
            address: locationString,
            key: process.env.GOOGLE_MAPS_API_KEY,
        }

        const response = await axios.get<GeocodeResponse>(
            GOOGLE_MAPS_GEOCODING_API,
            { params }
        )

        if (response.data.status === 'OK' && response.data.results.length > 0) {
            const result = response.data.results[0]
            const resolvedLocation: ResolvedLocation = {
                original_location: locationString,
                formatted_address: result.formatted_address,
                lat: result.geometry.location.lat,
                lng: result.geometry.location.lng,
                status: 'resolved',
            }

            // Cache the result
            await cacheLocation(locationString, resolvedLocation)

            return resolvedLocation
        }

        // If geocoding failed, return unresolved status
        const unresolvedLocation: ResolvedLocation = {
            original_location: locationString,
            status: 'unresolved',
        }

        // Cache the unresolved result too to avoid repeated API calls
        await cacheLocation(locationString, unresolvedLocation)

        return unresolvedLocation
    } catch (error) {
        console.error('Error geocoding location:', error)
        return {
            original_location: locationString,
            status: 'unresolved',
        }
    }
    */
}

/**
 * Batch geocodes multiple locations
 * @param locations - Array of location strings to geocode
 * @returns Promise with array of geocoded locations
 */
export async function batchGeocodeLocations(
    locations: string[]
): Promise<ResolvedLocation[]> {
    // Filter out duplicates to minimize API calls
    const uniqueLocations = Array.from(new Set(locations))

    debugLog(
        'geocoding',
        `TEMPORARY: Using fixed address for ${uniqueLocations.length} locations`
    )

    // Return the fixed location for all locations
    return uniqueLocations.map((location) => ({
        original_location: location,
        formatted_address: FIXED_LOCATION.formatted_address,
        lat: FIXED_LOCATION.lat,
        lng: FIXED_LOCATION.lng,
        status: FIXED_LOCATION.status,
    }))

    /* Original implementation commented out
    // Process in batches of 10 to avoid rate limits
    const batchSize = 10
    const results: ResolvedLocation[] = []

    for (let i = 0; i < uniqueLocations.length; i += batchSize) {
        const batch = uniqueLocations.slice(i, i + batchSize)
        const batchPromises = batch.map((location) => geocodeLocation(location))

        // Wait for the current batch to complete
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Add a small delay between batches to avoid rate limits
        if (i + batchSize < uniqueLocations.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
        }
    }

    return results
    */
}
