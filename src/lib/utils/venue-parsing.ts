import { getCityStateFromCity } from './timezones'
import { logr } from './logr'

// This file supports 19hz event source

/**
 * Get state from event source region using timezone data
 * @param regionName - The event source region name (e.g., "Los Angeles", "Bay Area")
 * @returns The state code (e.g., "CA", "IL") or null if not found
 */
export function getStateFromEventSource(regionName: string): string | null {
    // Try to get state from event source city using existing timezone data
    const cityState =
        getCityStateFromCity(`${regionName}, CA`) ||
        getCityStateFromCity(`${regionName}, IL`) ||
        getCityStateFromCity(`${regionName}, OR`) ||
        getCityStateFromCity(`${regionName}, NV`) ||
        getCityStateFromCity(regionName)

    if (cityState) {
        const stateMatch = cityState.match(/,\s*([A-Z]{2})$/)
        return stateMatch ? stateMatch[1] : null
    }
    return null
}

/**
 * Determine if we should use the default state for a given city
 * Uses regional context from event source to make intelligent decisions about ambiguous city names
 * @param cityName - The city name to check
 * @param eventSourceRegion - The event source region (e.g., "Los Angeles", "Bay Area")
 * @returns true if we should use the regional default state, false otherwise
 */
export function shouldUseDefaultState(cityName: string, eventSourceRegion: string): boolean {
    // If the city is in our timezone database, don't use default state
    // (the inferStateFromCityName method would have already found it)
    const knownCityState = getCityStateFromCity(cityName)
    if (knownCityState) {
        return false
    }

    // Use regional default if we have timezone data for the event source region
    const eventSourceState = getStateFromEventSource(eventSourceRegion)
    return eventSourceState !== null
}

/**
 * Infer state from city name using existing cityToTimezone mappings
 * @param cityName - The city name to look up
 * @returns The state code if found, null otherwise
 */
export function inferStateFromCityName(cityName: string): string | null {
    // Use existing getCityStateFromCity function from timezones.ts
    const cityState = getCityStateFromCity(cityName)
    if (!cityState) return null

    // Extract state from "City, ST" format
    const stateMatch = cityState.match(/,\s*([a-zA-Z]{2})$/)
    return stateMatch ? stateMatch[1] : null
}

/**
 * Extract venue and city from event title and apply intelligent state resolution
 * Handles formats like:
 * - "Event Name @ Venue (City)"
 * - "Event Name @ Venue (City, ST)" where ST is a 2-letter state code
 * - "Event Name @ TBA (Highland Park)" - uses regional context for ambiguous cities
 *
 * @param eventTitle - The full event title containing venue and location info
 * @param defaultState - The default state from the event source region
 * @param eventSourceRegion - The event source region name for regional context
 * @param venueCache - Optional venue cache for looking up venue addresses
 * @returns Formatted location string (e.g., "Venue, City, ST" or "City, ST")
 */
export function extractVenueAndCity(
    eventTitle: string,
    defaultState: string,
    eventSourceRegion: string,
    venueCache?: Map<string, string>
): string {
    // Match pattern: "Event @ Venue (City)" or "Event @ Venue (City, ST)" where ST is 2-letter state
    const match = eventTitle.match(/^(.+?)\s*@\s*([^(]+?)(?:\s*\(([^)]+)\))?$/)

    if (match) {
        const venue = match[2]?.trim() || ''
        const cityAndState = match[3]?.trim() || ''

        // Check venue cache for full address
        if (venueCache) {
            const cachedAddress = venueCache.get(venue.toLowerCase())
            if (cachedAddress) {
                return cachedAddress
            }
        }

        // Parse city and state from the parentheses content using hybrid approach
        let city = ''
        let state: string | null = null
        let useState = false

        if (cityAndState) {
            // Check if format is "City, ST" where ST is a 2-letter state code
            const cityStateMatch = cityAndState.match(/^(.+?),\s*([A-Z]{2})$/)
            if (cityStateMatch) {
                // Explicit state provided - always use it
                city = cityStateMatch[1].trim()
                state = cityStateMatch[2].trim()
                useState = true
                logr.debug('venue-parsing', `Explicit state found: ${city}, ${state}`)
            } else {
                // Just city name - try intelligent state detection
                city = cityAndState

                // Try to infer state from city name
                const inferredState = inferStateFromCityName(city)
                if (inferredState) {
                    state = inferredState
                    useState = true
                    logr.debug('venue-parsing', `Inferred state for ${city}: ${state}`)
                } else {
                    // Check if we should use regional default state for this city
                    const shouldUseRegionalDefault = shouldUseDefaultState(city, eventSourceRegion)
                    if (shouldUseRegionalDefault) {
                        state = defaultState
                        useState = true
                        logr.debug(
                            'venue-parsing',
                            `Using regional default state for ${city} from ${eventSourceRegion}: ${state}`
                        )
                    } else {
                        // Don't use any state to avoid incorrect geocoding
                        logr.debug('venue-parsing', `No state assigned for unknown city: ${city}`)
                    }
                }
            }
        }

        // Handle TBA case - only city known
        if (venue.toLowerCase() === 'tba' && city) {
            return useState && state ? `${city}, ${state}` : city
        }

        // Format as "Venue, city" or "Venue, city, STATE" based on state confidence
        if (venue && city) {
            return useState && state ? `${venue}, ${city}, ${state}` : `${venue}, ${city}`
        }

        logr.info('venue-parsing', `Unexpected venue and city for event: ${eventTitle}`)
        return useState && state ? `${venue}, ${city}, ${state}, USA` : `${venue}, ${city}, USA`
    }

    // Fallback: look for city in parentheses at the end
    const cityMatch = eventTitle.match(/\(([^)]+)\)$/)
    if (cityMatch) {
        return `${cityMatch[1].trim()}, ${defaultState}`
    }

    logr.info('venue-parsing', `Unexpected venue and city formatting for event: ${eventTitle}`)
    return ''
}
