import { UrlParams } from '@/types/urlparams'
import { logr } from '@/lib/utils/logr'

/**
 * URL parameter validation utilities
 * NOTE THIS IS NOT USED ANYMORE, WE ARE USING NUQS NOW.
 * KEEPING IT HERE FOR REFERENCE even though it was not in a working state.
 * we may we need to switch back to using URL params again.
 */

/**
 * Validates if the provided coordinates and zoom level are within acceptable ranges
 * @param lat - Latitude value
 * @param lon - Longitude value
 * @param zoom - Zoom level
 * @returns boolean indicating if the values are valid
 */
export const isValidViewport = (lat: number, lon: number, zoom: number): boolean => {
    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180 && zoom >= 0 && zoom <= 22
}

/**
 * Validates if the provided date is a valid date parameter
 * @param date - Date string
 * @returns boolean indicating if the date is valid
 *
 * date is a valid date parameter if it is
 * a positive or negative number (1-3 digits) followed by h, d, m for hours, days, months.
 * or a date in the format YYYY-MM-DD
 */
export const isValidDateParam = (date: string): boolean => {
    // Check for relative dates: -30d, 2m, etc.
    const relativePattern = /^(-?\d{1,3})[hdm]$/
    if (relativePattern.test(date)) {
        return true
    }

    // todo: add support for hours:minutes

    // Check for YYYY-MM-DD format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/
    if (datePattern.test(date)) {
        // Validate it's a real date
        const dateObj = new Date(date)
        return !isNaN(dateObj.getTime())
    }

    return false
}

/**
 * Class for handling URL parameters, which defined in UrlParams interface.
 *
 * Any invalid parameters are read, logged as warning, the removed from URL and default value is used.
 * Setting to null removes the parameter from the URL.
 * Getting a parameter that is null will return default value..
 */
export class UrlParamsManager {
    private searchParams: URLSearchParams
    public initialParams: UrlParams

    constructor(searchParams?: URLSearchParams) {
        this.searchParams = searchParams || new URLSearchParams()
        if (!this.searchParams) {
            if (typeof window !== 'undefined') {
                this.searchParams = new URLSearchParams(window.location.search)
            } else {
                logr.warn('browser', 'No search params provided, using empty URLSearchParams')
                this.searchParams = new URLSearchParams()
            }
        }
        this.initialParams = this.storeValidUrlParams()
    }

    // Default values for parameters
    private defaultValues: Partial<Record<keyof UrlParams, string | number | undefined>> = {
        csd: '-1m', // Default: 1 month ago
        ced: '3m', // Default: 3 months from now
        fsd: undefined, // Default: same as csd (special case handled in get())
        fed: undefined, // Default: same as ced (special case handled in get())
        zoom: 12, // Default zoom level
    }

    // Creates an empty UrlParams object with all values set to null
    private createEmptyParams(): UrlParams {
        return {
            lat: null,
            lon: null,
            zoom: null,
            csd: null,
            ced: null,
            fsd: null,
            fed: null,
            se: null,
            gc: null,
            fbc: null,
            sq: null,
        }
    }

    // Returns all keys from the UrlParams interface
    private getParamKeys(): (keyof UrlParams)[] {
        return Object.keys(this.createEmptyParams()) as (keyof UrlParams)[]
    }

    // Stores valid parameters from URL into currentParams
    storeValidUrlParams(searchParams?: URLSearchParams): UrlParams {
        searchParams = searchParams || this.searchParams
        const params = this.createEmptyParams()

        // Process each parameter
        this.getParamKeys().forEach((param) => {
            const value = searchParams.get(param)

            if (value && this.isValid(param)) {
                if (param === 'lat' || param === 'lon') {
                    params[param] = parseFloat(value)
                } else if (param === 'zoom') {
                    params[param] = parseInt(value)
                } else {
                    params[param] = value as any
                }
            } else if (value) {
                logr.warn('browser', `Skipping Invalid URL parameter ${param}=${value}`)
            } else {
                logr.info('browser', `Skipping URL parameter not found ${param}`)
            }
        })
        logr.info('browser', `Storing valid URL parameters ${JSON.stringify(params)}`)
        return params
    }

    // Validates a specific URL parameter
    isValid(param: keyof UrlParams): boolean {
        const value = this.searchParams.get(param) || ''

        switch (param) {
            case 'csd':
            case 'ced':
            case 'fsd':
            case 'fed':
                return isValidDateParam(value)
            case 'zoom':
                const zoom = parseInt(value)
                return !isNaN(zoom) && zoom >= 0 && zoom <= 22
            case 'lat':
                const lat = parseFloat(value)
                return !isNaN(lat) && lat >= -90 && lat <= 90
            case 'lon':
                const lon = parseFloat(value)
                return !isNaN(lon) && lon >= -180 && lon <= 180
            case 'se':
            case 'gc':
            case 'fbc':
            case 'sq':
                return value.length > 0
            default:
                return false
        }
    }

    // Gets a parameter value with fallbacks to defaults
    get(param: keyof UrlParams): string | number | null {
        const val = this._get(param)
        logr.info('browser', `Getting URL parameter ${param}=${val}`)
        return val
    }
    // Gets a parameter value with fallbacks to defaults
    _get(param: keyof UrlParams): string | number | null {
        const value = this.searchParams.get(param) || null

        // Return existing value
        if (value !== null) {
            return value
        }

        // Special case fallbacks
        if (param === 'fsd') return this.get('csd')
        if (param === 'fed') return this.get('ced')

        // Return default value if available
        if (param in this.defaultValues) {
            return this.defaultValues[param] as string | number
        }

        return null
    }

    // Sets one or more URL parameters. if value is null, the parameter is removed.
    set(params: { [key: string]: string | number | null }): void {
        const paramsCurrent = new URLSearchParams(this.searchParams.toString())

        Object.entries(params).forEach(([key, value]) => {
            if (value === null) {
                logr.info('browser', `Deleting URL parameter ${key}`)
                paramsCurrent.delete(key)
            } else {
                logr.info('browser', `Setting URL parameter ${key}=${value}`)
                paramsCurrent.set(key, value.toString())
            }
        })

        const newUrl = `${window.location.pathname}?${paramsCurrent.toString()}`
        window.history.replaceState({}, '', newUrl)
    }

    // Deletes specified parameters from the URL
    delete(paramsRemoving: string[]): void {
        const paramsCurrent = new URLSearchParams(this.searchParams.toString())

        logr.info('browser', `Deleting URL parameter(s) ${paramsRemoving}`)

        paramsRemoving.forEach((param) => paramsCurrent.delete(param))

        const newUrl = `${window.location.pathname}?${paramsCurrent.toString()}`
        window.history.replaceState({}, '', newUrl)
    }

    // Gets all parameters with defaults applied
    getAll(): UrlParams {
        const result: Partial<UrlParams> = {}

        this.getParamKeys().forEach((param) => {
            result[param] = this.get(param) as any
        })

        return result as UrlParams
    }

    // Checks if viewport parameters are valid
    isValidViewport(): boolean {
        const lat = this.get('lat') as number | null
        const lon = this.get('lon') as number | null
        const zoom = this.get('zoom') as number | null

        return lat !== null && lon !== null && zoom !== null && isValidViewport(lat, lon, zoom)
    }
}

// Factory functions
export const createUrlParamsManager = (searchParams?: URLSearchParams): UrlParamsManager => {
    return new UrlParamsManager(searchParams)
}

export const getValidatedUrlParams = (searchParams?: URLSearchParams): UrlParams => {
    return createUrlParamsManager(searchParams).getAll()
}
