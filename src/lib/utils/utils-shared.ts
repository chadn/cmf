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
