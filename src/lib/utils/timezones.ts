import tzlookup from 'tz-lookup'
import { DateTime } from 'luxon'

// TODO: review what should be in this file vs date.ts

/**
 * Converts a UTC ISO 8601 wall time string to an ISO 8601 string
 * in a specified target timezone, preserving the wall time components.
 *
 * Example:
 *   '2024-06-10T17:00:00Z' + 'America/Los_Angeles'
 *   → '2024-06-10T17:00:00-07:00'
 *
 * @param utcTime A date-time string in ISO 8601 format (e.g., 'YYYY-MM-DDTHH:mm:ssZ').
 * The 'Z' indicates UTC, but its components (year, month, day, hour, minute, second)
 * are interpreted as the desired wall time to be preserved.
 * @param targetTimeZone The IANA timezone identifier (e.g., 'America/Los_Angeles', 'Europe/London').
 * @returns An ISO 8601 string in the format 'YYYY-MM-DDTHH:mm:ss+/-HH:mm'
 * with the original wall time components and the calculated offset for the target timezone.
 */
export function convertUtcToTimeZone(utcTime: string, targetTimeZone: string): string {
    return (
        DateTime.fromISO(utcTime, { zone: 'utc' })
            .setZone(targetTimeZone, { keepLocalTime: true })
            .toISO({ suppressMilliseconds: true }) || ''
    )
}

/**
 * Converts a UTC ISO 8601 string to an ISO 8601 string
 * in the timezone determined by latitude/longitude, preserving the wall time.
 *
 * Example:
 *   '2024-06-10T17:00:00Z' + (37.77, -122.42)  // San Francisco
 *   → '2024-06-10T17:00:00-07:00'
 * @param utcTime - The UTC ISO 8601 string format (e.g., 'YYYY-MM-DDTHH:mm:ssZ').
 * @param lat - Latitude
 * @param lon - Longitude
 * @returns An ISO 8601 string in the format 'YYYY-MM-DDTHH:mm:ss+/-HH:mm' or '' if invalid
 */
export function convertUtcToTimeZoneAtCoords(utcTime: string, lat: number, lon: number): string {
    const targetZone = tzlookup(lat, lon)

    return (
        DateTime.fromISO(utcTime, { zone: 'utc' })
            .setZone(targetZone, { keepLocalTime: true })
            .toISO({ suppressMilliseconds: true }) || ''
    )
}

/**
 * Gets the timezone for a given latitude and longitude
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Timezone string (e.g., 'America/Los_Angeles') or 'UNKNOWN' if not found
 */
export const getTimezoneFromLatLng = (lat: number, lng: number): string => {
    try {
        return tzlookup(lat, lng) || 'UNKNOWN'
    } catch {
        return 'UNKNOWN'
    }
}

/**
 * Parses a date string in various formats into a JavaScript Date object.
 * Supports formats like:
 * - "6/14/2025 1:30 PM"
 * - "6/14/2025 1 PM"
 * - "6/14/2025" (defaults to midnight)
 * - "6/14/2025 1:30PM" (no space before AM/PM)
 * - "6/14/25 1:30 PM" (2-digit year)
 */
export function parseDateString(dateStr: string): Date | null {
    try {
        // Try formats in order of probable occurrence
        const formats = [
            'M/d/yyyy h:mm a', // 6/14/2025 1:30 PM
            'M/d/yyyy h a', // 6/14/2025 1 PM
            'M/d/yyyy', // 6/14/2025 (no time, defaults to midnight)
            'M/d/yyyy h:mma', // 6/14/2025 1:30PM (no space before AM/PM)
            'M/d/yyyy ha', // 6/14/2025 1PM (no space before AM/PM)
            'M/d/yy h:mm a', // 6/14/25 1:30 PM
            'M/d/yy h a', // 6/14/25 1 PM
            'M/d/yy h:mma', // 6/14/25 1:30PM
            'M/d/yy ha', // 6/14/25 1PM
            'M/d/yy', // 6/14/25 (no time)
        ]

        for (const format of formats) {
            const date = DateTime.fromFormat(dateStr, format, { zone: 'UTC' })
            if (date.isValid) {
                return date.toJSDate()
            }
        }

        // If strict parsing fails, try lenient parsing
        const lenientDate = DateTime.fromString(dateStr, 'M/d/yyyy h:mm a', { zone: 'UTC' })
        return lenientDate.isValid ? lenientDate.toJSDate() : null
    } catch (error) {
        console.error('Failed to parse date:', error)
        return null
    }
}

export const cityToTimezone: Record<string, string> = {
    'Amsterdam, NL': 'Europe/Amsterdam',
    'Arcadia, CA': 'America/Los_Angeles',
    'Asbury Park, NJ': 'America/New_York',
    'Bay Area, CA': 'America/Los_Angeles',
    'Bear Valley Springs, CA': 'America/Los_Angeles',
    'Berkeley, CA': 'America/Los_Angeles',
    'Boulder, CO': 'America/Denver',
    'Brea, CA': 'America/Los_Angeles',
    'Brooklyn, NY': 'America/New_York',
    'Cabo Bello, BCS, MX': 'America/Mazatlan',
    'Cabo San Lucas, BCS, MX': 'America/Mazatlan',
    'Cambridge, MA': 'America/New_York',
    'Cambridge, England, GB': 'Europe/London',
    'Carlsbad, CA': 'America/Los_Angeles',
    'Caryville, NY': 'America/New_York',
    'Chicago, IL': 'America/Chicago',
    'Cleveland, GA': 'America/New_York',
    'Cobb, CA': 'America/Los_Angeles',
    'Commerce, CA': 'America/Los_Angeles',
    'Concord, CA': 'America/Los_Angeles',
    'Cotati, CA': 'America/Los_Angeles',
    'Culver City, CA': 'America/Los_Angeles',
    'Denver, CO': 'America/Denver',
    'Desert Hot Springs, CA': 'America/Los_Angeles',
    'El Cajon, CA': 'America/Los_Angeles',
    'El Cuyo, MX': 'America/Merida',
    'El Segundo, CA': 'America/Los_Angeles',
    'Encinitas, CA': 'America/Los_Angeles',
    'Escondido, CA': 'America/Los_Angeles',
    'Eugene, OR': 'America/Los_Angeles',
    'Fair Oaks, CA': 'America/Los_Angeles',
    'Fort Lauderdale, FL': 'America/New_York',
    'Fremont, CA': 'America/Los_Angeles',
    'Fullerton, CA': 'America/Los_Angeles',
    'Gresham, OR': 'America/Los_Angeles',
    'Huntington Beach, CA': 'America/Los_Angeles',
    'Indianapolis, IN': 'America/Indiana/Indianapolis',
    'La Jolla, CA': 'America/Los_Angeles',
    'Lafayette, CA': 'America/Los_Angeles',
    'Laguna Hills, CA': 'America/Los_Angeles',
    'Laguna Woods, CA': 'America/Los_Angeles',
    'Lakewood, CO': 'America/Denver',
    'Lancaster, CA': 'America/Los_Angeles',
    'Las Vegas, NV': 'America/Los_Angeles',
    'Laytonville, CA': 'America/Los_Angeles',
    'Leesburg, VA': 'America/New_York',
    'Lisboa, PT': 'Europe/Lisbon',
    'Long Beach, CA': 'America/Los_Angeles',
    'Los Angeles, CA': 'America/Los_Angeles',
    'Marietta, GA': 'America/New_York',
    'Marina del Rey, CA': 'America/Los_Angeles',
    'Mendocino, CA': 'America/Los_Angeles',
    'Mobile, AL': 'America/Chicago',
    'Monte Rio, CA': 'America/Los_Angeles',
    'Montecito, CA': 'America/Los_Angeles',
    'Monterey, CA': 'America/Los_Angeles',
    'Montreal, QC': 'America/Toronto',
    'Moraga, CA': 'America/Los_Angeles',
    'Murrieta, CA': 'America/Los_Angeles',
    'Nashville, TN': 'America/Chicago',
    'Nevada City, CA': 'America/Los_Angeles',
    'New York, NY': 'America/New_York',
    'Newnan, GA': 'America/New_York',
    'North Bethesda, MD': 'America/New_York',
    'Novato, CA': 'America/Los_Angeles',
    'Oakland, CA': 'America/Los_Angeles',
    'Oregon, OR': 'America/Los_Angeles',
    'Oxnard, CA': 'America/Los_Angeles',
    'Philadelphia, PA': 'America/New_York',
    'Piedmont, CA': 'America/Los_Angeles',
    'Plainfield, MA': 'America/New_York',
    'Portland, OR': 'America/Los_Angeles',
    'Poughkeepsie, NY': 'America/New_York',
    'Queens, NY': 'America/New_York',
    'Redwood City, CA': 'America/Los_Angeles',
    'Reno, NV': 'America/Los_Angeles',
    'Roswell, GA': 'America/New_York',
    'Sacramento, CA': 'America/Los_Angeles',
    'Saint Albans City, VT': 'America/New_York',
    'Salt Lake City, UT': 'America/Denver',
    'San Anselmo, CA': 'America/Los_Angeles',
    'San Antonio, TX': 'America/Chicago',
    'San Diego, CA': 'America/Los_Angeles',
    'San Fernando, CA': 'America/Los_Angeles',
    'San Francisco, CA': 'America/Los_Angeles',
    'San Jose, CA': 'America/Los_Angeles',
    'San Rafael, CA': 'America/Los_Angeles',
    'San Ramon, CA': 'America/Los_Angeles',
    'Santa Cruz, CA': 'America/Los_Angeles',
    'Santa Rosa, CA': 'America/Los_Angeles',
    'Santee, CA': 'America/Los_Angeles',
    'Seattle, WA': 'America/Los_Angeles',
    'Sebastopol, CA': 'America/Los_Angeles',
    'South Gate, CA': 'America/Los_Angeles',
    'South Pasadena, CA': 'America/Los_Angeles',
    'Southfield, MI': 'America/Detroit',
    'Split, Split-Dalmatia County, HR': 'Europe/Zagreb',
    'Sunnyvale, CA': 'America/Los_Angeles',
    'Tehachapi, CA': 'America/Los_Angeles',
    'Temple City, CA': 'America/Los_Angeles',
    'Toronto, ON, CA': 'America/Toronto',
    'Tuolumne, CA': 'America/Los_Angeles',
    'Tustin, CA': 'America/Los_Angeles',
    'Ukiah, CA': 'America/Los_Angeles',
    'Upper Lake, CA': 'America/Los_Angeles',
    'Vancouver, BC, CA': 'America/Vancouver',
    'Vista, CA': 'America/Los_Angeles',
    'Wantagh, NY': 'America/New_York',
    'Washington, DC': 'America/New_York',
    'Watervliet, MI': 'America/Detroit',
    'West Hollywood, CA': 'America/Los_Angeles',
    'Wilton Manors, FL': 'America/New_York',
}

/**
 * Gets the timezone for a given city name
 * @param cityName - City name to look up
 * @returns Timezone string, defaults to 'America/Los_Angeles' if not found
 */
export const getTimezoneFromCity = (cityName: string): string => {
    const key = Object.keys(cityToTimezone).find((key) => key.toLowerCase().includes(cityName.toLowerCase()))
    if (!key) return 'America/Los_Angeles'
    return cityToTimezone[key] || 'America/Los_Angeles'
}

/**
 * Gets the formatted city, state string for a given city name
 * @param cityName - City name to look up
 * @returns Formatted city, state string (e.g., 'Los Angeles, CA') or original cityName if not found
 */
export const getCityStateFromCity = (cityName: string): string => {
    // return key if cityname is in the cityToTimezone object
    let cityTrimmed = cityName.trim()
    if (cityTrimmed === '') return ''
    cityTrimmed = cityTrimmed.toLowerCase()

    // TODO: handle case where cityName='cambridge' and we want to match correct one (MA vs GB)
    const key = Object.keys(cityToTimezone).find((key) => key.toLowerCase().includes(cityTrimmed))
    return key || ''
}
