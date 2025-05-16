import axios from 'axios'
import { GeocodeResponse, GoogleGeocodeResult } from '@/types/googleApi'
import { Location } from '@/types/events'
import { getCachedLocation, setCacheLocation } from '@/lib/cache'
import { logr } from '@/lib/utils/logr'

// Type definitions for consistent return values
type GeocodingResult<T = Location | null> = {
    result: T
    source: 'sCache' | 'custom' | 'api' | 'other' | null
    time: number
    parserIndex?: number
}

// Configuration
const CONFIG = {
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY,
    GOOGLE_MAPS_GEOCODING_API: 'https://maps.googleapis.com/maps/api/geocode/json',
    CACHE_UNRESOLVED_LOCATIONS: true,
    USE_FIXED_LOCATIONS: false,
    // API limits: 25+ req/s, 1500+ req/min https://console.cloud.google.com/google/maps-apis/quotas?project=cmf-2025&api=geocoding-backend.googleapis.com
    BATCH_SIZE: 100,
    BATCH_DELAY_MS: 5,
}

/**
 * Utility function to time an operation
 * @param operation - Function to execute and time
 * @returns [result, time in ms]
 */
async function withTiming<T>(operation: () => Promise<T>, start?: number): Promise<[T, number]> {
    start = start || performance.now()
    const result = await operation()
    return [result, performance.now() - start]
}

/**
 * Create a default unresolved location object
 * @param locationString - The original location string
 */
function createUnresolvedLocation(locationString: string): Location {
    return {
        original_location: locationString || '',
        status: 'unresolved',
    }
}

// Log warning if API key is missing
if (!CONFIG.GOOGLE_MAPS_API_KEY) {
    logr.warn('api-geo', 'Google Maps API key is not configured')
}

// Fixed location for temporary development debugging use
const FIXED_LOCATIONS = [
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

// See if location already has Lat and Lon in it. If so, extract and return ResolvedLocation, else return false
export function customLocationParserLatLon(location: string): Location | false {
    const match = location.match(/^\s*(-?\d{1,3}(?:\.\d{1,6})?),\s*(-?\d{1,3}(?:\.\d{1,6})?)/)
    if (!match) return false

    const lat = parseFloat(match[1])
    const lng = parseFloat(match[2])

    // Validate lat/lng ranges
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        return false
    }

    return {
        original_location: location,
        formatted_address: `${lat},${lng}`,
        lat,
        lng,
        status: 'resolved',
    }
}

export function customLocationParserDegMinSec(location: string): Location | false {
    const match = location.match(
        /^(\d{1,3}°\s*\d{1,2}'\s*\d{1,2}(?:\.\d{1,3})?"\s*[NnSs])\s*(\d{1,3}°\s*\d{1,2}'\s*\d{1,2}(?:\.\d{1,3})?"\s*[EeWw])/
    )
    if (!match) return false

    const latPart = match[1]
    const lngPart = match[2]

    const latMatch = latPart.match(/(\d{1,3})°\s*(\d{1,2})'\s*(\d{1,2}(?:\.\d{1,3})?)"([NnSs])/)
    const lngMatch = lngPart.match(/(\d{1,3})°\s*(\d{1,2})'\s*(\d{1,2}(?:\.\d{1,3})?)"([EeWw])/)

    if (!latMatch || !lngMatch) return false

    const latDegrees = parseFloat(latMatch[1])
    const latMinutes = parseFloat(latMatch[2])
    const latSeconds = parseFloat(latMatch[3])
    const latDir = latMatch[4].toUpperCase()

    const lngDegrees = parseFloat(lngMatch[1])
    const lngMinutes = parseFloat(lngMatch[2])
    const lngSeconds = parseFloat(lngMatch[3])
    const lngDir = lngMatch[4].toUpperCase()

    // Validate degree ranges
    if (latDegrees < 0 || latDegrees > 90 || lngDegrees < 0 || lngDegrees > 180) {
        return false
    }

    let lat = Number((latDegrees + latMinutes / 60 + latSeconds / 3600).toFixed(6))
    let lng = Number((lngDegrees + lngMinutes / 60 + lngSeconds / 3600).toFixed(6))

    if (latDir === 'S') lat = -lat
    if (lngDir === 'W') lng = -lng

    return {
        original_location: location,
        formatted_address: `${lat.toFixed(6)},${lng.toFixed(6)}`,
        lat,
        lng,
        status: 'resolved',
    }
}

export function customLocationParserDegMinDecimal(location: string): Location | false {
    const match = location.match(
        /^([NnSs])\s*(\d{1,3})°\s*(\d{1,2})\.(\d{1,6})\s*([EeWw])\s*(\d{1,3})°\s*(\d{1,2})\.(\d{1,6})/
    )
    if (!match) return false

    const latDir = match[1].toUpperCase()
    const latDegrees = parseFloat(match[2])
    const latMinutes = parseFloat(`${match[3]}.${match[4]}`)

    const lngDir = match[5].toUpperCase()
    const lngDegrees = parseFloat(match[6])
    const lngMinutes = parseFloat(`${match[7]}.${match[8]}`)

    // Validate degree ranges
    if (latDegrees < 0 || latDegrees > 90 || lngDegrees < 0 || lngDegrees > 180) {
        return false
    }

    let lat = Number((latDegrees + latMinutes / 60).toFixed(6))
    let lng = Number((lngDegrees + lngMinutes / 60).toFixed(6))

    if (latDir === 'S') lat = -lat
    if (lngDir === 'W') lng = -lng

    return {
        original_location: location,
        formatted_address: `${lat.toFixed(6)},${lng.toFixed(6)}`,
        lat,
        lng,
        status: 'resolved',
    }
}

export const customLocationParsers = [
    customLocationParserLatLon,
    customLocationParserDegMinSec,
    customLocationParserDegMinDecimal,
]

export function updateResolvedLocation(result: Location, apiData: GoogleGeocodeResult): Location {
    try {
        return {
            original_location: result.original_location,
            formatted_address: apiData.formatted_address,
            lat: apiData.geometry.location.lat,
            lng: apiData.geometry.location.lng,
            types: apiData.types,
            status: 'resolved' as const,
        }
    } catch (error) {
        // format of data from API is not what we expect
        logr.info(
            'api-geo',
            `updateResolvedLocation unexpected API data format, unresolved: ${result.original_location}`,
            [error, apiData]
        )
        return {
            original_location: result.original_location,
            status: 'unresolved',
        }
    }
}

/**
 * Process a location string through custom parsers
 * @param locationString - The location text to process
 * @returns Promise with tuple of [result, success flag, time taken in ms]
 */
async function tryCustomParsers(locationString: string): Promise<GeocodingResult> {
    const [result, time] = await withTiming(async () => {
        for (let i = 0; i < customLocationParsers.length; i++) {
            const parser = customLocationParsers[i]
            const parsedResult = parser(locationString)
            if (parsedResult) {
                return {
                    result: parsedResult,
                    source: 'custom' as const,
                    parserIndex: i,
                }
            }
        }
        return {
            result: createUnresolvedLocation(locationString),
            source: 'other' as const,
        }
    })
    return {
        ...result,
        time,
    }
}

/**
 * Check if a location is in the cache
 * @param locationString - The location text to check
 * @returns Promise with tuple of [result, success flag, time taken in ms]
 */
async function checkCache(locationString: string): Promise<GeocodingResult<Location | null>> {
    const [cachedLocation, time] = await withTiming(() => getCachedLocation(locationString))

    return {
        result: cachedLocation,
        source: cachedLocation ? 'sCache' : null,
        time,
    }
}

/**
 * Cache a location result
 * @param locationString - The original location string
 * @param result - The location result to cache
 * @returns Promise with time taken in ms
 */
async function saveToCacheWithTiming(locationString: string, result: Location): Promise<number> {
    const [, time] = await withTiming(async () => {
        if (result.status === 'resolved' || CONFIG.CACHE_UNRESOLVED_LOCATIONS) {
            logr.debug('api-geo', `Caching ${result.status}: "${locationString}"`)
            return await setCacheLocation(locationString, result)
        }
    })
    return time
}

/**
 * Call the Google Maps API for geocoding
 * @param locationString - The location text to geocode
 * @returns Promise with tuple of [result, success flag, time taken in ms]
 */
async function callGeocodingAPI(locationString: string): Promise<GeocodingResult> {
    const [result, time] = await withTiming(async () => {
        const defaultResult = createUnresolvedLocation(locationString)

        try {
            logr.info('api-geo', 'Fetching from API:', locationString)

            const params = {
                address: locationString,
                key: CONFIG.GOOGLE_MAPS_API_KEY,
            }
            const response = await axios.get<GeocodeResponse>(CONFIG.GOOGLE_MAPS_GEOCODING_API, { params })

            logr.debug('api-geo', 'response result:', response.data.results[0])

            if (response.data.results && response.data.results.length > 0) {
                return updateResolvedLocation(defaultResult, response.data.results[0])
            } else {
                return defaultResult
            }
        } catch (error) {
            logr.warn('api-geo', 'API Error: ', error)
            return defaultResult
        }
    })
    return {
        result,
        source: 'api',
        time,
    }
}

/**
 * Geocodes a location string using Google Maps Geocoding API
 * @param locationString - The location text to geocode
 * @returns Promise with tuple of [geocoded location data, cache source, timing information]
 */
export async function geocodeLocation(
    locationString: string
): Promise<[Location, 'sCache' | 'custom' | 'api' | 'other', Record<string, number>]> {
    // Handle empty string case
    if (!locationString) {
        return [createUnresolvedLocation(''), 'other', { total: 0 }]
    }
    // Handle fixed locations if enabled (for development)
    if (CONFIG.USE_FIXED_LOCATIONS) {
        const i = Math.floor(Math.random() * FIXED_LOCATIONS.length)
        logr.info('api-geo', `TEMPORARY: Using fixed address ${i} for "${locationString}"`)
        return [
            {
                original_location: locationString,
                formatted_address: FIXED_LOCATIONS[i].formatted_address,
                lat: FIXED_LOCATIONS[i].lat,
                lng: FIXED_LOCATIONS[i].lng,
                status: FIXED_LOCATIONS[i].status,
            },
            'other',
            { other: 0 },
        ]
    }
    const timings: Record<string, number> = {}
    const trimmedLocation = locationString.trim()
    let result: Location = createUnresolvedLocation(trimmedLocation)
    let source: 'sCache' | 'custom' | 'api' | 'other' | null = null

    // Try custom parsers first
    const customResult = await tryCustomParsers(trimmedLocation)
    timings.custom = customResult.time
    if (customResult.source === 'custom' && customResult.result) {
        result = customResult.result
        source = customResult.source
    }
    if (source === null) {
        const cacheResult = await checkCache(trimmedLocation)
        timings.sCache = cacheResult.time
        if (cacheResult.source === 'sCache' && cacheResult.result) {
            result = cacheResult.result
            source = cacheResult.source
        }
    }
    if (source === null) {
        // Call API as last resort
        const apiResult = await callGeocodingAPI(trimmedLocation)
        timings.api = apiResult.time
        if (apiResult.result) {
            result = apiResult.result
            source = apiResult.source
            // Cache API result
            timings.caching = await saveToCacheWithTiming(trimmedLocation, result)
        }
    }
    if (source === null) {
        source = 'other'
    }
    // Always log timing information
    logr.debug('api-geo', `geocodeLocation() timings for "${trimmedLocation}": ${JSON.stringify(timings)}`)

    return [result, source, timings]
}

/**
 * Batch geocodes multiple locations
 * @param locations - Array of location strings to geocode
 * @returns Promise with array of geocoded locations
 *
 * Following the refactored approach:
 * 1. Check custom parsers, note time taken
 * 2. Check cache, note time taken
 * 3. Call API, note time taken
 * 4. Cache API results, note time taken
 * 5. Return result
 */
export async function batchGeocodeLocations(locations: string[]): Promise<Location[]> {
    // Filter out duplicates to minimize API calls
    const uniqueLocations = Array.from(new Set(locations))

    if (CONFIG.USE_FIXED_LOCATIONS) {
        logr.info('api-geo', `TEMPORARY: Using fixed address for ${uniqueLocations.length} locations`)
    }

    const results: Location[] = []
    const sourceStats = {
        sCache: { count: 0, time: 0 },
        caching: { count: 0, time: 0 },
        custom: { count: 0, time: 0 },
        api: { count: 0, time: 0 },
        other: { count: 0, time: 0 },
    }

    let totalCount = 0
    const startTime = performance.now()

    for (let i = 0; i < uniqueLocations.length; i += CONFIG.BATCH_SIZE) {
        const batch = uniqueLocations.slice(i, i + CONFIG.BATCH_SIZE)
        const batchPromises = batch.map((location) => geocodeLocation(location))

        // Wait for the current batch to complete
        const batchResults = await Promise.all(batchPromises)

        // Extract locations and update stats
        for (const [location, source, locationTimings] of batchResults) {
            results.push(location)
            sourceStats[source].count++

            // Add timing directly if available for this source
            if (locationTimings[source]) {
                sourceStats[source].time += locationTimings[source]
            }
            if (locationTimings.caching) {
                sourceStats.caching.count++
                sourceStats.caching.time += locationTimings.caching
            }
        }

        totalCount += batch.length
        logr.info('api-geo', `batchGeocodeLocations batch ${i} done, processed ${results.length}`)

        // Add a small delay between batches to avoid rate limits
        if (i + CONFIG.BATCH_SIZE < uniqueLocations.length) {
            await new Promise((resolve) => setTimeout(resolve, CONFIG.BATCH_DELAY_MS))
        }
    }

    const totalTime = performance.now() - startTime

    /* Format timing statistics with aligned columns for better readability */
    const formatTimingStats = (label: string, count: number, totalTime: number): string => {
        const avgTime = count > 0 ? totalTime / count : 0
        return `${label.padEnd(7)}: ${count.toString().padStart(3)} calls, ${totalTime
            .toFixed(0)
            .padStart(5)} ms, ${avgTime.toFixed(2).padStart(6)} ms per call`
    }

    const timingOutput = [
        formatTimingStats('TOTAL', totalCount, totalTime),
        formatTimingStats('api', sourceStats.api.count, sourceStats.api.time),
        formatTimingStats('cache', sourceStats.sCache.count, sourceStats.sCache.time),
        formatTimingStats('caching', sourceStats.caching.count, sourceStats.caching.time),
        formatTimingStats('custom', sourceStats.custom.count, sourceStats.custom.time),
        formatTimingStats('other', sourceStats.other.count, sourceStats.other.time),
    ].join('\n')

    logr.info(
        'api-geo',
        `batchGeocodeLocations returning ${results.length} for ${uniqueLocations.length} locations:\n${timingOutput}`
    )

    return results
}
