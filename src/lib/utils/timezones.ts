import tzlookup from 'tz-lookup'
import { DateTime } from 'luxon'

// TODO: review what should be in this file vs date.ts

/**
 * Converts a UTC ISO 8601 wall time string to an ISO 8601 string
 * in a specified target timezone, preserving the wall time components.
 *
 * This means if the input is '2024-06-10T17:00:00Z' and the target is 'America/Los_Angeles' (PDT, UTC-07:00),
 * the output will be '2024-06-10T17:00:00-07:00'.
 *
 * @param utcTime A date-time string in ISO 8601 format (e.g., 'YYYY-MM-DDTHH:mm:ssZ').
 * The 'Z' indicates UTC, but its components (year, month, day, hour, minute, second)
 * are interpreted as the desired wall time to be preserved.
 * @param targetTimeZone The IANA timezone identifier (e.g., 'America/Los_Angeles', 'Europe/London').
 * @returns An ISO 8601 string in the format 'YYYY-MM-DDTHH:mm:ss+/-HH:mm'
 * with the original wall time components and the calculated offset for the target timezone.
 */
export function convertWallTimeToZone(utcTime: string, targetTimeZone: string): string {
    // 1. Extract the wall time components (year, month, day, hour, minute, second)
    // from the input string. We parse it as UTC to ensure correct extraction of these parts
    // without interference from the system's local timezone.
    const dt = DateTime.fromISO(utcTime, { zone: 'utc' })

    const year = dt.year
    const month = dt.month
    const day = dt.day
    const hour = dt.hour
    const minute = dt.minute
    const second = dt.second

    // 2. Create a new Luxon DateTime object by interpreting these extracted components
    // directly in the *target timezone*. This is the crucial step that "preserves"
    // the wall time and allows Luxon to correctly determine the offset for that
    // specific wall time in the target zone (e.g., accounting for DST).
    const wallTimeInTargetZone = DateTime.fromObject(
        {
            year,
            month,
            day,
            hour,
            minute,
            second,
        },
        { zone: targetTimeZone }
    )

    // 3. Get the offset in minutes from UTC for this specific wall time in the target zone.
    const offsetMinutes = wallTimeInTargetZone.offset // e.g., -420 for -07:00, or -480 for -08:00

    // 4. Format the offset into the desired +/-HH:mm string.
    const sign = offsetMinutes < 0 ? '-' : '+'
    const absOffsetMinutes = Math.abs(offsetMinutes)
    const offsetHours = Math.floor(absOffsetMinutes / 60)
    const offsetRemainingMinutes = absOffsetMinutes % 60

    const formattedOffset = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetRemainingMinutes).padStart(
        2,
        '0'
    )}`

    // 5. Reconstruct the final ISO 8601 string.
    // Ensure all components are padded with leading zeros as per ISO 8601.
    const formattedDate = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(
        2,
        '0'
    )}`
    const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(
        second
    ).padStart(2, '0')}`

    return `${formattedDate}T${formattedTime}${formattedOffset}`
}

/**
 * Gets the timezone for a given latitude and longitude
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Timezone string (e.g., 'America/Los_Angeles') or 'UNKNOWN' if not found
 */
export const getTimezoneFromLatLng = (lat: number, lng: number): string => {
    return tzlookup(lat, lng) || 'UNKNOWN'
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
    const key = Object.keys(cityToTimezone).find((key) => key.toLowerCase().includes(cityTrimmed))
    return key || ''
}
