import { createParser } from 'nuqs'
import { CurrentUrlState } from '@/types/urlProcessing'
import { getDateFromUrlDateString, formatDateForUrl } from '@/lib/utils/date'
import { calculateQuickFilterRange } from '@/lib/utils/quickFilters'
import { dateQuickFilterLabels } from '@/lib/utils/date-constants'
import { logr } from '@/lib/utils/logr'
import { ExampleEventsSources } from '@/lib/events/examples'

export interface ShareUrlParams {
    currentUrlState?: CurrentUrlState
    preferQfChecked?: boolean
    llzChecked?: boolean
    baseUrl?: string
}

/**
 * Build a custom Share URL based on user preferences and current app state
 *
 * URL building rules:
 * - Always includes event source (es) and selected event (se) if present
 * - Includes search query (sq) if present
 * - For date filters:
 *   - If qf exists and preferQfChecked=true: use qf parameter
 *   - If qf exists and preferQfChecked=false: convert qf to fsd/fed dates
 *   - If no qf but date filters active: use fsd/fed parameters
 * - Only includes llz (lat/lon/zoom) if llzChecked=true
 * @param params Parameters for building the share URL
 * @param params.currentUrlState Current URL state
 * @param params.preferQfChecked Whether to prefer quick filters
 * @param params.llzChecked Whether to include llz (lat/lon/zoom)
 * @param params.baseUrl Base URL for the share link
 * @return Constructed share URL as a string
 */
export function buildShareUrl(params: ShareUrlParams): string {
    const { currentUrlState, preferQfChecked = true, llzChecked = false, baseUrl } = params

    const url = baseUrl ? new URL(baseUrl) : null
    const urlParams = new URLSearchParams()

    if (!currentUrlState) {
        return url ? url.href : typeof window !== 'undefined' ? window.location.href : '/'
    }

    // Always add event source
    if (currentUrlState.es) {
        urlParams.set('es', parseAsEventsSourceSerialize(currentUrlState.es))
    }

    // Add selected event
    if (currentUrlState.se) {
        urlParams.set('se', currentUrlState.se)
    }

    // Add search query
    if (currentUrlState.sq) {
        urlParams.set('sq', currentUrlState.sq)
    }

    // Handle date filters based on preference
    if (currentUrlState.qf && preferQfChecked) {
        // Prefer qf over fsd/fed - use qf directly
        urlParams.set('qf', currentUrlState.qf)
    } else if (currentUrlState.qf && !preferQfChecked) {
        // Convert qf to fsd/fed
        try {
            const sd = getDateFromUrlDateString(currentUrlState.sd || '-1m')
            const ed = getDateFromUrlDateString(currentUrlState.ed || '3m')
            const minDate = sd || new Date() // sd should always work but this makes typescript happy

            if (sd && ed) {
                const totalDays = Math.ceil((ed.getTime() - sd.getTime()) / (1000 * 60 * 60 * 24))
                const todayValue = Math.ceil((new Date().getTime() - sd.getTime()) / (1000 * 60 * 60 * 24))

                const getDateFromDays = (days: number) => {
                    // Inline implementation as fallback for Jest issues
                    const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
                    return date.toISOString().replace(/\.\d{3}Z$/, 'Z')
                }

                const range = calculateQuickFilterRange(currentUrlState.qf, todayValue, totalDays, getDateFromDays)
                logr.info('url-utils', 'converting qf to fsd/fed:', range)
                if (range) {
                    // Inline implementations as fallback for Jest issues
                    const getStartOfDayInline = (days: number, minDate: Date): string => {
                        const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
                        date.setHours(4, 1, 0, 0)
                        return date.toISOString()
                    }
                    const getEndOfDayInline = (days: number, minDate: Date): string => {
                        const date = new Date(minDate.getTime() + days * (1000 * 60 * 60 * 24))
                        date.setHours(23, 59, 59, 999)
                        return date.toISOString()
                    }

                    urlParams.set('fsd', formatDateForUrl(getStartOfDayInline(range.start, minDate)))
                    urlParams.set('fed', formatDateForUrl(getEndOfDayInline(range.end, minDate)))
                } else {
                    // Fallback to qf if quick filter calculation fails
                    urlParams.set('qf', currentUrlState.qf)
                }
            } else {
                // Fallback to qf if date parsing fails
                urlParams.set('qf', currentUrlState.qf)
            }
        } catch (error) {
            // Fallback to qf if conversion fails
            urlParams.set('qf', currentUrlState.qf)
            logr.warn('url-utils', `Error converting qf to fsd/fed. params=${JSON.stringify(currentUrlState)}`, error)
        }
    } else {
        // No qf, but add fsd/fed if date filters are active
        if (currentUrlState.dateSliderRange) {
            urlParams.set('fsd', formatDateForUrl(currentUrlState.dateSliderRange.startIso))
            urlParams.set('fed', formatDateForUrl(currentUrlState.dateSliderRange.endIso))
        } else if (currentUrlState.fsd || currentUrlState.fed) {
            if (currentUrlState.fsd) urlParams.set('fsd', formatDateForUrl(currentUrlState.fsd))
            if (currentUrlState.fed) urlParams.set('fed', formatDateForUrl(currentUrlState.fed))
        }
    }

    // Add llz only if checkbox is checked
    if (llzChecked && currentUrlState.llz) {
        const { lat, lon, zoom } = currentUrlState.llz
        // Format llz as lat,lon,zoom
        const latStr = lat.toFixed(5)
        const lonStr = lon.toFixed(5)
        const zoomStr = zoom === parseInt(zoom.toString()) ? zoom.toString() : zoom.toFixed(1)
        urlParams.set('llz', `${latStr},${lonStr},${zoomStr}`)
    }

    const urlBase = url
        ? `${url.origin}${url.pathname}`
        : typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : '/'
    const shareUrl = `${urlBase}?${urlParams.toString()}`
    logr.info('url-utils', `buildShareUrl: ${shareUrl}`)
    return shareUrl
}

// Custom parsers to read and write values to the URL
// url params have a value of null if they do not or should not exist.

/**
 * Parses CMF date strings from URL parameters
 *
 */
export const parseAsCmfDate = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        if (getDateFromUrlDateString(queryValue)) {
            return queryValue
        }
        return null
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        return formatDateForUrl(value)
    },
})

/**
 * Parses date quick filter labels from URL parameters
 */
export const parseAsDateQuickFilter = createParser({
    parse(queryValue) {
        logr.info('url-utils', 'parseAsDateQuickFilter parse queryValue:', queryValue)
        if (!queryValue) return null

        // Convert the query value to lowercase with no spaces for comparison
        const normalizedQueryValue = queryValue.toLowerCase().replace(/\s+/g, '')

        // Check if any of the labels match when normalized
        const matchingLabel = dateQuickFilterLabels.find(
            (label) => label.toLowerCase().replace(/\s+/g, '') === normalizedQueryValue
        )

        if (matchingLabel) {
            return normalizedQueryValue
        }

        // if queryValue is not a value from quickFilterLabels, return null
        return null
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        logr.info('url-utils', `parseAsDateQuickFilter serialize queryValue: "${value}"`)
        return value
    },
})

/**
 * Parses zoom level from URL parameters (1-22)
 */
export const parseAsZoom = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        const val = parseFloat(queryValue)
        if (isNaN(val) || val < 1 || val > 22) return null
        return val
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        logr.debug('url-utils', `serialize zoom:${value}`)
        // if the value is an integer, return it as a string no decimal places
        if (value === parseInt(value.toString())) {
            return value.toString()
        }
        // otherwise, return it as a string with 1 decimal place
        return value.toFixed(1)
    },
})

/**
 * Parses latitude/longitude coordinates from URL parameters (-180 to 180)
 */
export const parseAsLatLon = createParser({
    // parse: a function that takes a string and returns the parsed value, or null if invalid.
    parse(queryValue) {
        const val = parseFloat(queryValue)
        if (isNaN(val) || val < -180 || val > 180) return null
        return val
    },
    // serialize: a function that takes the parsed value and returns a string used in the URL.
    serialize(value) {
        return value.toFixed(5)
    },
})

/**
 * Parses combined lat,lon,zoom from URL parameter in format "lat,lon,zoom"
 */
export const parseAsLlz = createParser({
    parse(queryValue) {
        if (!queryValue || typeof queryValue !== 'string') return null

        const parts = queryValue.split(',')
        if (parts.length !== 3) return null

        const lat = parseFloat(parts[0])
        const lon = parseFloat(parts[1])
        const zoom = parseFloat(parts[2])

        // Validate lat/lon bounds and zoom bounds
        if (isNaN(lat) || lat < -180 || lat > 180) return null
        if (isNaN(lon) || lon < -180 || lon > 180) return null
        if (isNaN(zoom) || zoom < 1 || zoom > 22) return null

        return { lat, lon, zoom }
    },
    serialize(value) {
        if (!value || typeof value !== 'object') return ''
        const { lat, lon, zoom } = value

        // Format lat/lon to 5 decimal places, zoom as integer or 1 decimal
        const latStr = lat.toFixed(5)
        const lonStr = lon.toFixed(5)
        const zoomStr = zoom === parseInt(zoom.toString()) ? zoom.toString() : zoom.toFixed(1)

        return `${latStr},${lonStr},${zoomStr}`
    },
})

function validateSource(source: string): string {
    if (/^[a-zA-Z0-9]+[:\.]/.test(source)) {
        return source
    } else if (/^[a-zA-Z0-9]+$/.test(source)) {
        return source + '.all'
    }
    return ''
}

/**
 * Used to turn value of 'es' parameter into array of valid event sources, expands shortId from ExampleEventsSources
 * @param source The input event source string from URL parameter
 * @returns Array of strings, each representing a valid event source
 */
function addExampleEventsSources(source: string): string[] {
    const result: string[] = []
    const incoming: string[] = [source]
    const visited = new Set<string>()

    while (incoming.length > 0) {
        const curSource = incoming.pop()
        if (!curSource) continue
        if (visited.has(curSource)) continue
        visited.add(curSource)

        if (curSource.includes(',')) {
            const rawSources = curSource
                .split(',')
                .map((s) => s.trim())
                .filter((s) => s)
            incoming.push(...rawSources)
            continue
        }
        const shortIdExample = ExampleEventsSources.find((es) => es.shortId === curSource)
        if (shortIdExample && shortIdExample.ids) {
            logr.info('url-utils', `addExampleEventsSources: found match in example ids[]:${curSource}`)
            incoming.push(...Object.keys(shortIdExample.ids))
        } else if (shortIdExample && shortIdExample.id) {
            logr.info('url-utils', `addExampleEventsSources: found match in example id:${curSource}`)
            incoming.push(shortIdExample.id)
        } else {
            const validatedSource = validateSource(curSource)
            if (validatedSource) result.push(validatedSource)
        }
    }
    return result
}

/**
 * Parses event source IDs from URL parameters with support for ExampleEventsSources shortcuts
 * @param queryValue The query parameter value to parse
 * @returns An array of event source IDs or an empty array if no valid sources are found
 */
export function parseAsEventsSourceParse(queryValue: string): string[] | null {
    if (typeof queryValue !== 'string') return []

    const parsedSources = addExampleEventsSources(queryValue)
    logr.info('url-utils', `parseAsEventsSourceParse: found ${parsedSources.length} valid sources`, parsedSources)
    return parsedSources.length > 0 ? parsedSources : null
}

export function parseAsEventsSourceSerialize(value: unknown): string {
    // Handle array of sources
    if (Array.isArray(value)) {
        // Check if this array matches an example shortcut
        const valueString = value.join(',')
        const example = ExampleEventsSources?.find?.((es) => es.id === valueString && es.shortId)
        if (example) return example.shortId as string

        // Otherwise, serialize each source individually and join with commas
        const serializedSources = value.map((source) => {
            // Check both id and ids structures
            const example = ExampleEventsSources?.find?.((es) => {
                if (es.id === source && es.shortId) return true
                if (es.ids && Object.keys(es.ids).includes(source) && es.shortId) return true
                return false
            })
            return example ? (example.shortId as string) : source
        })
        return serializedSources.join(',')
    }
    if (typeof value !== 'string') return ''

    // Handle single source (existing logic)
    // Check for example event sources first
    const example = ExampleEventsSources?.find?.((es) => {
        if (es.id === value && es.shortId) return true
        if (es.ids && Object.keys(es.ids).includes(value) && es.shortId) return true
        return false
    })
    logr.info('url-utils', `parseAsEventsSource.serialize(${value})`, example)
    if (example) return example.shortId as string

    return value
}

/**
 * Parses event source IDs from URL parameters with support for shortcuts
 */
export const parseAsEventsSource = createParser({
    parse: parseAsEventsSourceParse,
    serialize: parseAsEventsSourceSerialize,
})
