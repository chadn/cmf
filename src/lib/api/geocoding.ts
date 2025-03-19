import axios from 'axios'
import { GeocodeResponse, GoogleGeocodeResult } from '@/types/api'
import { ResolvedLocation } from '@/types/events'
import { getCachedLocation, cacheLocation } from '@/lib/cache'
import { debugLog } from '@/lib/utils/debug'

const GOOGLE_MAPS_GEOCODING_API =
    'https://maps.googleapis.com/maps/api/geocode/json'

// Cache unresolved locations, so we don't call the API repeatedly and can manually fix them
const CACHE_UNRESOLVED_LOCATIONS = true

// Fixed location for temporary development debugging use
const USE_FIXED_LOCATIONS = false
const FIXED_LOCATIONS = [
    {
        name_address: 'Downtown Berkeley, CA',
        formatted_address: 'Berkeley CA 94705',
        lat: 37.8608, // Approximate coordinates for Berkeley
        lng: -122.2451,
        status: 'resolved' as const,
    },
    {
        name_address: 'Pinewood Picnic Area, Joaquin Miller Park',
        formatted_address: '3594 Sanborn Dr, Oakland, CA 94602',
        lat: 37.809926,
        lng: -122.183184,
        status: 'resolved' as const,
    },
    {
        name_address: 'Ghost Town Brewing - West Oakland Brewery & Taproom',
        formatted_address: '1960 Adeline St, Oakland, CA 94607',
        lat: 37.81416,
        lng: -122.28413,
        status: 'resolved' as const,
    },
]

export function updateResolvedLocation(
    result: ResolvedLocation,
    apiData: GoogleGeocodeResult
): ResolvedLocation {
    try {
        return {
            original_location: result.original_location,
            formatted_address: apiData.formatted_address,
            lat: apiData.geometry.location.lat,
            lng: apiData.geometry.location.lng,
            types: apiData.types,
            status: 'resolved',
        }
    } catch (error) {
        debugLog(
            'geocoding',
            `updateResolvedLocation unresolved: ${result.original_location}`,
            apiData
        )
        return result
    }
}

/**
 * Geocodes a location string using Google Maps Geocoding API
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

    if (USE_FIXED_LOCATIONS) {
        const i = Math.floor(Math.random() * FIXED_LOCATIONS.length)
        debugLog(
            'geocoding',
            `TEMPORARY: Using fixed address ${i} for "${locationString}"`
        )
        return {
            original_location: locationString,
            formatted_address: FIXED_LOCATIONS[i].formatted_address,
            lat: FIXED_LOCATIONS[i].lat,
            lng: FIXED_LOCATIONS[i].lng,
            status: FIXED_LOCATIONS[i].status,
        }
    }

    let result: ResolvedLocation = {
        original_location: locationString,
        status: 'unresolved',
    }
    locationString = locationString.trim()
    try {
        // Check cache first
        const cachedLocation = await getCachedLocation(locationString)
        if (cachedLocation) {
            debugLog(
                'geocoding',
                `Found in Cache ${cachedLocation.status}: "${locationString}"`
            )
            return cachedLocation
        }

        // If not in cache, call the API
        if (!process.env.GOOGLE_MAPS_API_KEY) {
            debugLog('api', 'Google Maps API key is not configured')
            throw new Error('Google Maps API key is not configured')
        }
        debugLog('geocoding', 'Fetching from API:', locationString)

        const params = {
            address: locationString,
            key: process.env.GOOGLE_MAPS_API_KEY,
        }
        const response = await axios.get<GeocodeResponse>(
            GOOGLE_MAPS_GEOCODING_API,
            {
                params,
            }
        )
        //debugLog('geocoding', 'response result:', response.data.results[0])
        result = updateResolvedLocation(result, response.data.results[0])

        if (result.status === 'resolved') {
            // Cache the result
            await cacheLocation(locationString, result)
        } else if (CACHE_UNRESOLVED_LOCATIONS) {
            debugLog('geocoding', `Caching Unresolved: "${locationString}"`)
            await cacheLocation(locationString, result)
        } else {
            debugLog('geocoding', `Not Caching Unresolved: "${locationString}"`)
        }
    } catch (error) {
        debugLog('geocoding', 'API Error: ', error)
    }
    return result
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

    if (USE_FIXED_LOCATIONS) {
        debugLog(
            'geocoding',
            `TEMPORARY: Using fixed address for ${uniqueLocations.length} locations`
        )
    }
    // Process in batches of 10 with delayMs in between to avoid rate limits
    const batchSize = 10
    const delayMs = 20
    const results: ResolvedLocation[] = []

    for (let i = 0; i < uniqueLocations.length; i += batchSize) {
        const batch = uniqueLocations.slice(i, i + batchSize)
        const batchPromises = batch.map((location) => geocodeLocation(location))

        // Wait for the current batch to complete
        const batchResults = await Promise.all(batchPromises)
        results.push(...batchResults)

        // Add a small delay between batches to avoid rate limits
        if (i + batchSize < uniqueLocations.length) {
            await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
    }
    debugLog(
        'geocoding',
        `batchGeocodeLocations returning ${results.length} for ${uniqueLocations.length} locations`
    )

    return results
}
