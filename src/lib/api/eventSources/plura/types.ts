/**
 * Plura Events Source - Type Definitions
 *
 * This module defines shared interfaces and types used across the Plura event source:
 * - Cache data structures for storing city lists and events
 * - Statistics tracking for scraping operations
 * - Result types for city page processing
 *
 * These types provide consistent data structures across the different modules.
 */

/* Notes on plura domains, 2025-05-15

https://heyplura.com/events/city/Oakland_CA still works and goes to events same domain

https://plra.io/m/soulplay-festival-2025   308 to 
https://heyplura.com/events/soulplay-festival-2025?r=chadrock28

https://plura.io/events/soulplay-festival-2025   302 to
https://www.plura.io/events/soulplay-festival-2025


not found goes to https://heyplura.com/

https://heyplura.com/ has links that 404, like https://bloomcommunity.com/events/city/Oakland_CA
 */
export const PluraDomain = 'https://plra.io'

// Cache data structures
export interface PluraCityEventsCache {
    timestamp: number
    numPages: number
    eventIds: string[]
}

export interface PluraCitiesListCache {
    timestamp: number
    cityNames: Record<string, string> //key is noramlized city name (aka cityKey), value is original city name
}

export interface PluraEventScrapeStats {
    totalCities: number
    totalUniqueEvents: number
    totalEventsIncludingDuplicates: number
    totalPages: number
}

export const ValidLocations: Record<string, string> = {
    Berkeley: 'Berkeley, CA',
    'La Jolla': 'La Jolla, CA',
    'Los Angeles': 'Los Angeles, CA',
    Oakland: 'Oakland, CA',
    Portland: 'Portland, OR',
    'San Francisco': 'San Francisco, CA',
    Seattle: 'Seattle, WA',
}
