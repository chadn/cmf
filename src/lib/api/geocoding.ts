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

if (!process.env.GOOGLE_MAPS_API_KEY) {
    logr.warn('api-geo', 'Google Maps API key is not configured')
}

// See if location already has Lat and Lon in it. If so, extract and return ResolvedLocation, else return false
export function customLocationParserLatLon(locationString: string): Location | false {
    // Check for latitude and longitude in the format "lat,lng", allowing for spaces  and negative values
    // Example: "37.774929,-122.419418"
    // 6 decimal places is less than 1m precision, which is good enough for our purposes
    const latLonRegex = /^\s*(-?\d{1,3}\.\d{2,6}),\s*(-?\d{1,3}\.\d{2,6})/
    let match = locationString.match(latLonRegex)
    if (match) {
        return {
            original_location: locationString,
            formatted_address: locationString,
            lat: parseFloat(match[1]),
            lng: parseFloat(match[2]),
            status: 'resolved' as const,
        }
    }
    return false
}

export function customLocationParserDegMinSec(locationString: string): Location | false {
    // Check to see if match 41°07'16.0"N 1°00'16.9"E  Google Maps accepts this format
    const latLonRegex2 = /^([\s0-9°'".-]+)(Nn|Ss)\s*([\s0-9°'".-]+)(Ee|Ww)/
    const DegMinSecRegex = /(-?\d{1,3})\s*°\s*(\d{1,2})\s*'\s*(\d{1,2}\.\d{1,3})/
    const match = locationString.match(latLonRegex2)
    if (match) {
        const latMatch = match[1].match(DegMinSecRegex)
        const lngMatch = match[3].match(DegMinSecRegex)
        if (latMatch && lngMatch) {
            const latDegrees = parseFloat(latMatch[1])
            const latMinutes = parseFloat(latMatch[2])
            const latSeconds = parseFloat(latMatch[3]) * 60
            const lngDegrees = parseFloat(lngMatch[1])
            const lngMinutes = parseFloat(lngMatch[2])
            const lngSeconds = parseFloat(lngMatch[3]) * 60
            const lat = latDegrees + latMinutes / 60 + latSeconds / 3600
            const lng = lngDegrees + lngMinutes / 60 + lngSeconds / 3600
            // Adjust for N/S and E/W
            const latSign = match[2].toUpperCase() === 'N' ? 1 : -1
            const lngSign = match[4].toUpperCase() === 'E' ? 1 : -1
            const latFinal = lat * latSign
            const lngFinal = lng * lngSign
            const formatted_address = `${latFinal.toFixed(6)},${lngFinal.toFixed(6)}`
            const ret: Location = {
                original_location: locationString,
                formatted_address: formatted_address,
                lat: latFinal,
                lng: lngFinal,
                status: 'resolved' as const,
            }
            return ret
        }
    }
    return false
}

export function customLocationParserDegMinDecimal(locationString: string): Location | false {
    // Finally check to match locations with degrees, minutes, seconds.
    // N 41° 07.266 E 001° 00.281
    const latLonDMSRegex =
        /^\s*(Nn|Ss)\s*(-?\d{1,3})\s*°\s*(\d{1,2})\.(\d{1,6})\s*(Ee|wW)\s*(-?\d{1,3})\s*°\s*(\d{1,2})\.(\d{1,6})/
    //   1         2                 3          4           5         6                 7          8
    const matchDMS = locationString.match(latLonDMSRegex)
    if (matchDMS) {
        // Convert DMS to decimal degrees
        const latDegrees = parseFloat(matchDMS[2])
        const latMinutes = parseFloat(matchDMS[3])
        const latSeconds = parseFloat(matchDMS[4]) * 60
        const lngDegrees = parseFloat(matchDMS[6])
        const lngMinutes = parseFloat(matchDMS[7])
        const lngSeconds = parseFloat(matchDMS[8]) * 60
        const lat = latDegrees + latMinutes / 60 + latSeconds / 3600
        const lng = lngDegrees + lngMinutes / 60 + lngSeconds / 3600
        // Adjust for N/S and E/W
        const latSign = matchDMS[1].toUpperCase() === 'N' ? 1 : -1
        const lngSign = matchDMS[5].toUpperCase() === 'E' ? 1 : -1
        const latFinal = lat * latSign
        const lngFinal = lng * lngSign
        const formatted_address = `${latFinal.toFixed(6)},${lngFinal.toFixed(6)}`

        const ret: Location = {
            original_location: locationString,
            formatted_address: formatted_address,
            lat: latFinal,
            lng: lngFinal,
            status: 'resolved' as const,
        }
        return ret
    }
    return false
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
