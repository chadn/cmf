// utils-shared.ts for both client and server
//import { logr } from '@/lib/utils/logr'
import equal from "fast-deep-equal";

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
 * @returns ISO 8601 formatted date string rounded to the nearest hour, msecs removed
 */
export function roundTimeToNearestHour(date: Date | string = ''): string {
    let roundedDate = new Date(date)
    if (isNaN(roundedDate.getTime())) roundedDate = new Date()
    roundedDate.setMinutes(0, 0, 0)
    return roundedDate.toISOString().replace(/00\.000Z/, '00Z')
}

/**
 * Like JSON.stringify(), but custom strings for certain types
 * @param data - The data to standardize
 * @param maxLength - Maximum length of the resulting string, default 100.
 *        For data types that do not match, longer strings are truncated with ...
 * @returns A standardized string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function stringify(data: any, maxLength: number = 100): string {
    if (data == null) return String(data) // handles null + undefined

    if (typeof data === 'string') {
        if (maxLength && data.length > maxLength) {
            return data.substring(0, maxLength - 3) + '...'
        } else {
            return data
        }
    }

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
    let result = JSON.stringify(data)
    if (maxLength && result.length > maxLength) {
        result = result.substring(0, maxLength - 3) + '...'
    }
    return result
}

/**
 * Get the call stack of the current function, returning only calls from our source code (/src/)
 * Usually the first 2 or 3 strings from array are useful for debugging
 *
 * For debugging with chrome devtools, just do this instead:
 * console.trace('Tracing call stack, clickable in Chrome DevTools')
 *
 * @param params.nonSrcToo - if true, include calls from non-src code. Default is false, only include src lines
 * @param params.keepOldest - if true, keep the oldest non-src lines. Default is false, only include src lines
 * @returns string array
 */
export function getMyCallers(params?: { nonSrcToo?: boolean; keepOldest?: boolean }): string[] {
    // TODO: consider using https://www.npmjs.com/package/stacktrace-js

    const stack = new Error().stack
    if (!stack) return []

    // Replace everything before and including "(webpack-internal:///(app-pages-browser)/./src/" with "src/"
    let lines = stack
        .split('\n')
        .map((line) => line.trim())
        .map((line) => line.replace(/^.*\(app-pages-browser\)\/\.\/src\//, '/src/'))
        .slice(1) // remove first element (getMyCallers)

    const lastSrcIdx = lines.findLastIndex((line) => line.includes('/src/'))
    const oldestNonSrcLines = lastSrcIdx >= 0 ? lines.slice(lastSrcIdx + 1) : []

    if (!params?.nonSrcToo) {
        // only include src lines ... and also add the oldest non-src lines to identify original call
        lines = lines.filter((line) => line.includes('/src/'))
        if (params?.keepOldest) {
            lines = [...lines, ...oldestNonSrcLines]
        }
    }
    console.trace('Tracing call stack, clickable in Chrome DevTools')
    return lines
}

// The following functions are fast way to test if 2 structures are equal ignoring order of keys in objects and order of elements in arrays 
// TODO: need tests for these functions

export type NormalizedMarker = {
  id: string;
  eventIds: string[];
};

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONObject
  | JSONArray;

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JSONArray = Array<JSONValue>

// ---- Canonicalization ----

function canonicalize<T extends JSONValue>(value: T): JSONValue {
  // Arrays: canonicalize children + sort canonically
  if (Array.isArray(value)) {
    const arr = value.map(canonicalize);
    arr.sort(compareCanonical);
    return arr as JSONArray;
  }

  // Objects: canonicalize values + sort keys
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as JSONObject).map(
      ([k, v]) => [k, canonicalize(v)] as [string, JSONValue]
    );

    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    const obj: JSONObject = {};
    for (const [k, v] of entries) obj[k] = v;
    return obj;
  }

  // Primitives
  return value;
}

// ---- Sorting support ----

function compareCanonical(a: JSONValue, b: JSONValue): number {
  const sa = stableHash(a);
  const sb = stableHash(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

function stableHash(v: JSONValue): string {
  return JSON.stringify(v);
}

// ---- Public equality function ----

export function unorderedEquals<A extends JSONValue, B extends JSONValue>(
  a: A,
  b: B
): boolean {
  return equal(canonicalize(a), canonicalize(b));
}
