// utils-shared.ts for both client and server
//import { logr } from '@/lib/utils/logr'

/**
 * get the size of any data
 * This is an approximate memory representation, good for diagnostics or rough profiling.
 * @param data - The data to get the size of
 * @param outputType - The type of output to return, 'string' or 'json' or 'bytes
 * @returns string saying the size of the data and type
 */
export const getSizeOfAny = (
    // ignore warning about using 'any'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    outputType: string = 'string'
): string | number | { bytes: number; sizeString: string } => {
    // return function that returns a string
    const ret = (bytes: number): string | number | { bytes: number; sizeString: string } => {
        if (outputType === 'string') {
            return `${bytes} bytes (${typeof data})`
        } else if (outputType === 'json') {
            return { bytes, sizeString: `${bytes} bytes (${typeof data})` }
        } else if (outputType === 'bytes') {
            return bytes as number
        } else {
            return `${bytes} bytes (${typeof data})`
        }
    }
    let sizeInBytes: number
    try {
        // JSON.stringify handles most types except functions, symbols, and circular refs
        const json = JSON.stringify(data)
        // TextEncoder().encode(...) accurately counts UTF-8 bytes.
        sizeInBytes = new TextEncoder().encode(json).length
    } catch {
        sizeInBytes = -1 // Indicates failure to calculate size
    }
    if (sizeInBytes > 0) {
        return ret(sizeInBytes)
    }
    try {
        if (data === null || data === undefined) {
            return ret(0)
        } else if (typeof data === 'string') {
            return ret(data.length)
        } else if (Buffer.isBuffer(data)) {
            return ret(data.length)
        } else if (data instanceof ArrayBuffer) {
            return ret(data.byteLength)
        } else if (typeof data === 'object') {
            // Handle JSON objects and arrays
            return ret(JSON.stringify(data).length)
        } else {
            // For other types like numbers, booleans, convert to string
            return ret(String(data).length)
        }
    } catch {
        return 'unknown size (catch)'
    }
}

/**
 * Rounds a date to the nearest hour in ISO 8601 format
 * @param date - Date object or string to round, defaults to current date if invalid
 * @returns ISO 8601 formatted date string rounded to the nearest hour
 */
export function roundTimeToNearestHour(date: Date | string = ''): string {
    let roundedDate = new Date(date)
    if (isNaN(roundedDate.getTime())) roundedDate = new Date()
    roundedDate.setMinutes(0, 0, 0)
    return roundedDate.toISOString()
}

/**
 * Like JSON.stringify(), but custom strings for certain types
 * @param data - The data to standardize
 * @returns A standardized string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stringify(data: any): string {
    if (data == null) return String(data) // handles null + undefined
    if (typeof data === 'string') return data // handles string

    // TypeScript uses the concept of a discriminated union (also called a tagged union).
    // For that to work, all members of the union must share a common property whose type is a string (or literal) union
    // TODO: investigate pros/cons of adding kind property
    // if ('kind' in data && data.kind === 'CmfEvents') {

    if (data && 'allEvents' in data && 'visibleEvents' in data && 'hiddenCounts' in data) {
        // CmfEvents type
        return (
            `allEvents:${data.allEvents.length} visibleEvents:${data.visibleEvents.length} ` +
            JSON.stringify(data.hiddenCounts)
        )
    }
    if (data && 'north' in data && 'south' in data && 'east' in data && 'west' in data) {
        // MapBounds type
        return `north:${data.north} south:${data.south} east:${data.east} west:${data.west}`
    }
    if (data && 'latitude' in data && 'longitude' in data && 'zoom' in data) {
        // MapViewport type
        return `lat:${data.latitude} lon:${data.longitude} zoom:${data.zoom}`
    }
    return JSON.stringify(data)
}
