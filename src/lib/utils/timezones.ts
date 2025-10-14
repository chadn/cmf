import tzlookup from 'tz-lookup'
import { IANAZone, DateTime } from 'luxon'
import { logr } from './logr'
import { CmfEvent } from '@/types/events'
import { stringify } from '@/lib/utils/utils-shared'

// For Overview of how timezones are handled, see docs/Implementation.md#timezones
//
// TODO: review what should be in this file vs date.ts

const tzCache = new Map<string, boolean>()

/**
 * Checks if a given timezone string is valid.
 * isValidTimeZone('America/Los_Angeles') // true
 * isValidTimeZone('UTC')                 // true
 * isValidTimeZone('PST')                 // false
 * isValidTimeZone('Mars/OlympusMons')    // false
 * @param tz - Timezone string to validate (e.g., 'America/Los_Angeles')
 * @returns True if the timezone is valid, false otherwise.
 */
export function isValidTimeZone(tz: string): boolean {
    if (tzCache.has(tz)) return tzCache.get(tz)!

    const valid = IANAZone.isValidZone(tz)
    tzCache.set(tz, valid)
    return valid
}

/**
 * Reinterpret a UTC ISO 8601 wall time string to an ISO 8601 string
 * in a specified target timezone, preserving the wall time components.
 * Or if input is a number (seconds since epoch), returns adjusted number (seconds since epoch)
 *
 * Examples:
 *   '2024-06-10T17:00:00Z','America/Los_Angeles' → '2024-06-10T17:00:00-07:00'
 *   1718048400,'America/Los_Angeles' → 1718074800 ('2024-06-10T17:00:00-07:00')
 *
 * @param utcTime Either number (seconds since epoch), or date-time string in ISO 8601 format (e.g., 'YYYY-MM-DDTHH:mm:ssZ').
 * The 'Z' indicates UTC, but its components (year, month, day, hour, minute, second)
 * are interpreted as the desired wall time to be preserved.
 * @param targetTimeZone The IANA timezone identifier (e.g., 'America/Los_Angeles', 'Europe/London').
 * @returns An ISO 8601 string in the format 'YYYY-MM-DDTHH:mm:ss+/-HH:mm'
 * with the original wall time components and the calculated offset for the target timezone.
 */
export function reinterpretUtcTz(utcTime: string, targetTimeZone: string): string
export function reinterpretUtcTz(utcTime: number, targetTimeZone: string): number
export function reinterpretUtcTz(utcTime: string | number, targetTimeZone: string): string | number {
    const fromUtc =
        typeof utcTime === 'number'
            ? DateTime.fromSeconds(utcTime, { zone: 'utc' })
            : DateTime.fromISO(utcTime, { zone: 'utc' })

    if (!fromUtc.isValid) {
        throw new Error(`Invalid UTC time: ${utcTime}`)
    }

    // Reinterpret the wall time components as if they were in the target timezone
    const reinterpreted = DateTime.fromObject(
        {
            year: fromUtc.year,
            month: fromUtc.month,
            day: fromUtc.day,
            hour: fromUtc.hour,
            minute: fromUtc.minute,
            second: fromUtc.second,
        },
        { zone: targetTimeZone }
    )

    if (reinterpreted && reinterpreted.isValid) {
        return typeof utcTime === 'number'
            ? Math.floor(reinterpreted.toSeconds())
            : reinterpreted.toISO({ suppressMilliseconds: true })
    } else {
        throw new Error(`Invalid target timezone: ${targetTimeZone}`)
    }
}

/**
 * Convert a UTC ISO string (e.g. "2024-06-10T17:00:00Z")
 * to epoch seconds (UTC).
 */
export function convertUtcStringToSecs(utcIsoString: string): number {
    const dt = DateTime.fromISO(utcIsoString, { zone: 'utc' })
    if (!dt.isValid) {
        throw new Error(`Invalid UTC ISO string: ${utcIsoString}`)
    }
    return Math.floor(dt.toSeconds())
}

/**
 * Convert epoch seconds (UTC) to an ISO UTC string.
 */
export function convertUtcSecsToString(epochSeconds: number): string {
    const dt = DateTime.fromSeconds(epochSeconds, { zone: 'utc' })
    if (!dt.isValid) {
        throw new Error(`Invalid epoch seconds: ${epochSeconds}`)
    }
    return dt.toISO({ suppressMilliseconds: true })
}

/**
 * Special timezone state constants used during event processing pipeline:
 * - Set by event source handlers based on data availability
 * - Transformed by validateTzUpdateEventTimes after geocoding
 */
export const TZ_STATE = {
    /**
     * Indicates times are stored as UTC wall time and need reinterpretation
     * to local timezone once location is geocoded.
     * Example: Event says "8pm" but no timezone → stored as "20:00:00Z"
     * After geocoding SF → reinterpreted to "20:00:00-07:00"
     */
    REINTERPRET: 'REINTERPRET_UTC_TO_LOCAL',

    /**
     * Indicates times are already in correct format and don't need conversion.
     * Just need to associate with location timezone for display purposes.
     */
    ACCURATE: 'TIME_IS_ACCURATE',

    /**
     * Indicates timezone could not be determined.
     * Either geocoding failed or location has no timezone data.
     */
    UNKNOWN: 'UNKNOWN_TZ',
} as const

/**
 * Debug helper: Log current state of event timezone fields
 * Uncomment calls to this in validateTzUpdateEventTimes() when debugging
 */
function debugEventTzState(label: string, event: CmfEvent): void {
    logr.info(
        'timezones-debug',
        JSON.stringify(
            {
                label,
                id: event.id,
                tz: event.tz,
                start: event.start,
                end: event.end,
                startSecs: event.startSecs,
                endSecs: event.endSecs,
                has_resolved_location: !!event.resolved_location,
                location_tz: event.resolved_location?.location_tz,
                location: event.location,
            },
            null,
            2
        )
    )
}

/**
 * Update the time fields of events based on their location and timezone.
 * Logic below must match implementation.md#timezones
 *
 * This function is called by server /api/events, after fetching events and geocoding, before returning events
 *
 * FLOW DIAGRAM:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ Input: event with tz state + optional resolved_location         │
 * └─────────────────────────────────────────────────────────────────┘
 *                          ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ VALIDATION: Check for invalid states (UNKNOWN_TZ, no tz)        │
 * │ → Throw errors for bugs that should never reach this point      │
 * └─────────────────────────────────────────────────────────────────┘
 *                          ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ CASE 1: REINTERPRET_UTC_TO_LOCAL                                │
 * │ ├─ Has resolved_location?                                        │
 * │ │  ├─ YES → Get location_tz                                      │
 * │ │  │  ├─ location_tz = UNKNOWN_TZ? → Keep UNKNOWN_TZ, log       │
 * │ │  │  └─ location_tz valid? → Reinterpret times, log success    │
 * │ │  └─ NO → Set UNKNOWN_TZ, log (bug scenario)                   │
 * └─────────────────────────────────────────────────────────────────┘
 *                          ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ CASE 2: TIME_IS_ACCURATE                                         │
 * │ ├─ Has resolved_location?                                        │
 * │ │  ├─ YES → Get location_tz                                      │
 * │ │  │  ├─ location_tz = UNKNOWN_TZ? → Keep TIME_IS_ACCURATE      │
 * │ │  │  └─ location_tz valid? → Use it (no reinterpretation)      │
 * │ │  └─ NO → Set UNKNOWN_TZ, log (bug scenario)                   │
 * └─────────────────────────────────────────────────────────────────┘
 *                          ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ CASE 3: Normal IANA timezone (e.g., 'America/Los_Angeles')      │
 * │ → Validate it, log if invalid                                    │
 * └─────────────────────────────────────────────────────────────────┘
 *                          ↓
 * ┌─────────────────────────────────────────────────────────────────┐
 * │ FINAL: Ensure startSecs/endSecs populated                        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * COMMON DEBUGGING SCENARIOS:
 *
 * 1. "Event showing wrong time"
 *    → Check: Is event.tz a valid IANA zone?
 *    → Check: Was REINTERPRET_UTC_TO_LOCAL path taken?
 *    → Enable: debugEventTzState('AFTER_REINTERPRET', event)
 *
 * 2. "All events from source X have UNKNOWN_TZ"
 *    → Check: Is event source setting tz correctly?
 *    → Check: Is resolved_location.location_tz being set?
 *    → Enable: All logr.info calls in CASE 1 and CASE 2
 *
 * 3. "Times off by timezone offset"
 *    → Likely: Event source should use TIME_IS_ACCURATE not REINTERPRET_UTC_TO_LOCAL
 *    → Check: What does event source set for event.tz?
 *
 * 4. "Event source changed format"
 *    → Enable: ALL commented logr.info calls
 *    → Compare: Before/after debugEventTzState dumps
 *    → Check: Event source handler in src/lib/api/eventSources/
 *
 * @param event - CmfEvent to validate and update
 * @returns Updated CmfEvent with correct timezone and epoch times
 */
export function validateTzUpdateEventTimes(event: CmfEvent): CmfEvent {
    // debugEventTzState('ENTRY', event)

    // ========================================================================
    // VALIDATION: Catch bugs that should never happen
    // ========================================================================

    if (event.tz === 'UNKNOWN_TZ') {
        // State: tz=UNKNOWN_TZ before geocoding → BUG
        throw new Error('Event with UNKNOWN_TZ before location lookup is a bug')
    }
    if (!event.tz) {
        // State: tz is undefined/null → BUG
        throw new Error('Event with no timezone is a bug - perhaps should have been REINTERPRET_UTC_TO_LOCAL')
    }

    // ========================================================================
    // CASE 1: REINTERPRET_UTC_TO_LOCAL
    // Event source didn't provide timezone, times stored as UTC wall time
    // Need to reinterpret to local timezone after geocoding
    // ========================================================================

    if (event.tz === 'REINTERPRET_UTC_TO_LOCAL' && event.resolved_location) {
        // State: tz=REINTERPRET, has location → Extract timezone from location
        event.tz = event.resolved_location.location_tz

        if (event.tz === 'UNKNOWN_TZ') {
            // State: location_tz=UNKNOWN_TZ → Can't reinterpret, keep as UNKNOWN
            logr.info('timezones', `Event with REINTERPRET_UTC_TO_LOCAL got UNKNOWN_TZ: ${stringify(event)}`)
        } else if (event.tz && event.start && event.end) {
            // State: Valid location_tz → Reinterpret UTC wall times to local timezone
            // Before: start='2024-06-10T17:00:00Z' (UTC wall time)
            // After:  start='2024-06-10T17:00:00-07:00' (local timezone with offset)
            // debugEventTzState('BEFORE_REINTERPRET', event)
            event.startSecs = reinterpretUtcTz(event.startSecs || convertUtcStringToSecs(event.start), event.tz)
            event.endSecs = reinterpretUtcTz(event.endSecs || convertUtcStringToSecs(event.end), event.tz)
            event.start = reinterpretUtcTz(event.start, event.tz)
            event.end = reinterpretUtcTz(event.end, event.tz)
            // debugEventTzState('AFTER_REINTERPRET', event)
            logr.info('timezones', `Event with REINTERPRET_UTC_TO_LOCAL set tz correctly: ${event.id}`)
        } else {
            // State: Missing required fields → BUG
            throw new Error(`Event with REINTERPRET_UTC_TO_LOCAL is buggy: ${stringify(event)}`)
        }
    } else if (event.tz === 'REINTERPRET_UTC_TO_LOCAL' && !event.resolved_location) {
        // State: tz=REINTERPRET, no location → Geocoding failed or location unresolvable
        event.tz = 'UNKNOWN_TZ'
        logr.info(
            'timezones',
            `Event with REINTERPRET_UTC_TO_LOCAL, no resolved_location: (bug) setting to UNKNOWN_TZ: ${stringify(event)}`
        )

        // ========================================================================
        // CASE 2: TIME_IS_ACCURATE
        // Event source provided times in correct format (not wall time)
        // Just need to associate with location timezone, no reinterpretation needed
        // ========================================================================
    } else if (event.tz === 'TIME_IS_ACCURATE' && event.resolved_location) {
        // State: tz=TIME_IS_ACCURATE, has location → Use location_tz without reinterpreting
        event.tz = event.resolved_location.location_tz

        if (event.tz === 'UNKNOWN_TZ') {
            // State: location_tz=UNKNOWN_TZ → Keep TIME_IS_ACCURATE since times are already correct
            event.tz = 'TIME_IS_ACCURATE' // keep it as is
            logr.info('timezones', `Event with TIME_IS_ACCURATE, keeping,location_tz=UNKNOWN_TZ: ${stringify(event)}`)
        } else {
            // State: Valid location_tz → Times already accurate, just update tz field
            // DEBUG: Uncomment for troubleshooting timezone association
            //logr.info('timezones', `Event with TIME_IS_ACCURATE, set tz correctly: ${event.id}`)
        }
    } else if (event.tz === 'TIME_IS_ACCURATE' && !event.resolved_location) {
        // State: tz=TIME_IS_ACCURATE, no location → Geocoding failed
        event.tz = 'UNKNOWN_TZ'
        logr.info(
            'timezones',
            `Event with TIME_IS_ACCURATE, no resolved_location: (bug) setting to UNKNOWN_TZ: ${stringify(event)}`
        )

        // ========================================================================
        // CASE 3: Normal IANA Timezone
        // Event source provided explicit timezone (e.g., 'America/Los_Angeles')
        // ========================================================================
    } else if (isValidTimeZone(event.tz)) {
        // State: Valid IANA timezone → No transformation needed
        // DEBUG: Uncomment for troubleshooting valid timezone paths
        //logr.info('timezones', `GOOD event.tz='${event.tz}' for event: ${stringify(event)}`)
    } else {
        // State: Invalid timezone string → Log for investigation
        logr.info('timezones', `BAD event.tz='${event.tz}' for event: ${stringify(event)}`)
    }

    // ========================================================================
    // FINAL: Ensure epoch times are populated for all events
    // ========================================================================

    // Convert ISO strings to epoch seconds if not already set
    event.startSecs ||= convertUtcStringToSecs(event.start)
    event.endSecs ||= convertUtcStringToSecs(event.end)

    // debugEventTzState('EXIT', event)
    return event
}

/**
 * Get browser timezone information.  Used for display in About popup.
 * @returns Object with browser timezone, offset, and abbreviation
 */
export function timezoneInfo(): { browserTz: string; tzOffset: string; tzAbbrev: string } {
    if (typeof Intl === 'undefined') return { browserTz: 'Unknown', tzOffset: '', tzAbbrev: '' }

    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const offsetMin = new Date().getTimezoneOffset()
    const offsetHr = -offsetMin / 60
    const sign = offsetHr >= 0 ? '+' : '-'
    const tzOffset = ` UTC${sign}${Math.abs(offsetHr)}`

    // Get timezone abbreviation (like PDT, PST, EDT, EST, etc.)
    const tzAbbrev =
        new Intl.DateTimeFormat('en', {
            timeZoneName: 'short',
            timeZone: browserTz,
        })
            .formatToParts(new Date())
            .find((part) => part.type === 'timeZoneName')?.value || ''

    return { browserTz, tzOffset, tzAbbrev }
}

/**
 * Gets the timezone for a given latitude and longitude
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Timezone string (e.g., 'America/Los_Angeles') or 'UNKNOWN_TZ' if not found or error.
 */
export const getTimezoneFromLatLng = (lat: number, lng: number): string => {
    try {
        return tzlookup(lat, lng) || 'UNKNOWN_TZ'
    } catch {
        return 'UNKNOWN_TZ'
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
