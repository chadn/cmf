import axios from 'axios'
import { GeocodeResponse, GoogleGeocodeResult } from '@/types/api'
import { Location } from '@/types/events'
import { getCachedLocation, cacheLocation } from '@/lib/cache'
import { logr } from '@/lib/utils/logr'

const GOOGLE_MAPS_GEOCODING_API = 'https://maps.googleapis.com/maps/api/geocode/json'

// Cache unresolved locations, so we don't call the API repeatedly and can manually fix them
const CACHE_UNRESOLVED_LOCATIONS = true

// Fixed location for temporary development debugging use
const USE_FIXED_LOCATIONS = false
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

if (!process.env.GOOGLE_MAPS_API_KEY) {
    logr.warn('api-geo', 'Google Maps API key is not configured')
}

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
            apiData
        )
        return {
            original_location: result.original_location,
            status: 'unresolved',
        }
    }
}

async function resolveLocation(result: Location): Promise<Location> {
    // check custom parser
    for (let i = 0; i < customLocationParsers.length; i++) {
        const parser = customLocationParsers[i]
        const parsedResult = parser(result.original_location)
        if (parsedResult) {
            logr.info('api-geo', `customLocationParsers ${i} found:`, parsedResult)
            return parsedResult
        }
    }
    try {
        // call the API
        if (!process.env.GOOGLE_MAPS_API_KEY) {
            logr.warn('api-geo', 'Google Maps API key is not configured')
            throw new Error('Google Maps API key is not configured')
        }
        logr.info('api-geo', 'Fetching from API:', result.original_location)

        const params = {
            address: result.original_location,
            key: process.env.GOOGLE_MAPS_API_KEY,
        }
        const response = await axios.get<GeocodeResponse>(GOOGLE_MAPS_GEOCODING_API, {
            params,
        })
        logr.debug('api-geo', 'response result:', response.data.results[0])
        return updateResolvedLocation(result, response.data.results[0])
    } catch (error) {
        logr.warn('api-geo', 'API Error: ', error)
        return {
            original_location: result.original_location,
            status: 'unresolved',
        }
    }
}

/**
 * Geocodes a location string using Google Maps Geocoding API
 * @param locationString - The location text to geocode
 * @returns Promise with geocoded location data
 */
export async function geocodeLocation(locationString: string): Promise<Location> {
    if (!locationString) {
        return {
            original_location: '',
            status: 'unresolved',
        }
    }

    if (USE_FIXED_LOCATIONS) {
        const i = Math.floor(Math.random() * FIXED_LOCATIONS.length)
        logr.info('api-geo', `TEMPORARY: Using fixed address ${i} for "${locationString}"`)
        return {
            original_location: locationString,
            formatted_address: FIXED_LOCATIONS[i].formatted_address,
            lat: FIXED_LOCATIONS[i].lat,
            lng: FIXED_LOCATIONS[i].lng,
            status: FIXED_LOCATIONS[i].status,
        }
    }

    let result: Location = {
        original_location: locationString,
        status: 'unresolved',
    }
    locationString = locationString.trim()
    // Check cache first
    const cachedLocation = await getCachedLocation(locationString)
    if (cachedLocation) {
        logr.info('api-geo', `Found in Cache ${cachedLocation.status}: "${locationString}"`)
        return cachedLocation
    }

    result = await resolveLocation(result)
    if (result.status === 'resolved') {
        // Cache the result
        await cacheLocation(locationString, result)
    } else if (CACHE_UNRESOLVED_LOCATIONS) {
        logr.info('api-geo', `Caching Unresolved: "${locationString}"`)
        await cacheLocation(locationString, result)
    } else {
        logr.info('api-geo', `Not Caching Unresolved: "${locationString}"`)
    }
    return result
}

/**
 * Batch geocodes multiple locations
 * @param locations - Array of location strings to geocode
 * @returns Promise with array of geocoded locations
 */
export async function batchGeocodeLocations(locations: string[]): Promise<Location[]> {
    // Filter out duplicates to minimize API calls
    const uniqueLocations = Array.from(new Set(locations))

    if (USE_FIXED_LOCATIONS) {
        logr.info('api-geo', `TEMPORARY: Using fixed address for ${uniqueLocations.length} locations`)
    }
    // Process in batches of 10 with delayMs in between to avoid rate limits
    const batchSize = 10
    const delayMs = 20
    const results: Location[] = []

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
    logr.info('api-geo', `batchGeocodeLocations returning ${results.length} for ${uniqueLocations.length} locations`)

    return results
}
