import { UrlParams } from '@/types/urlparams'

/**
 * URL parameter validation utilities
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
    private currentParams: UrlParams
    public initialParams: UrlParams

    constructor(searchParams?: URLSearchParams) {
        this.searchParams = searchParams || new URLSearchParams()

        // Create empty params objects
        const emptyParams = this.createEmptyParams()
        this.currentParams = emptyParams
        this.initialParams = emptyParams

        if (searchParams) {
            this.storeValidUrlParams(searchParams)
            this.initialParams = { ...this.currentParams }
        }
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
    storeValidUrlParams(searchParams: URLSearchParams): void {
        this.searchParams = searchParams
        this.currentParams = this.createEmptyParams()

        // Process each parameter
        this.getParamKeys().forEach((param) => {
            const value = searchParams.get(param)

            if (value && this.isValid(param)) {
                this.setTypedValue(param, value)
            } else if (value) {
                console.warn(`Invalid URL parameter ${param}=${value}`)
            }
        })
    }

    // Sets the correct typed value for a parameter
    private setTypedValue(param: keyof UrlParams, value: string): void {
        switch (param) {
            case 'lat':
            case 'lon':
                this.currentParams[param] = parseFloat(value)
                break
            case 'zoom':
                this.currentParams.zoom = parseInt(value)
                break
            default:
                ;(this.currentParams as any)[param] = value
        }
    }

    // Updates the URL to reflect current parameter values
    updateUrlParams(): void {
        const params = new URLSearchParams()

        // Only add non-null values to URL
        this.getParamKeys().forEach((param) => {
            const value = this.currentParams[param]
            if (value !== null) {
                params.set(param, value.toString())
            }
        })

        const newUrl = `${window.location.pathname}?${params.toString()}`
        window.history.replaceState({}, '', newUrl)
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
        const value = this.currentParams[param]

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

    // Sets one or more URL parameters
    set(params: { [key: string]: string | number }): void {
        const paramsCurrent = new URLSearchParams(this.searchParams.toString())

        Object.entries(params).forEach(([key, value]) => {
            paramsCurrent.set(key, value.toString())
        })

        const newUrl = `${window.location.pathname}?${paramsCurrent.toString()}`
        window.history.replaceState({}, '', newUrl)
    }

    // Checks if viewport parameters are valid
    isValidViewport(): boolean {
        const lat = this.get('lat') as number | null
        const lon = this.get('lon') as number | null
        const zoom = this.get('zoom') as number | null

        return lat !== null && lon !== null && zoom !== null && isValidViewport(lat, lon, zoom)
    }

    // Deletes specified parameters from the URL
    delete(paramsRemoving: string[]): void {
        const paramsCurrent = new URLSearchParams(this.searchParams.toString())

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

    // Resets parameters to their initial values
    resetToInitial(updateUrl: boolean = true): void {
        this.currentParams = { ...this.initialParams }

        if (updateUrl) {
            this.updateUrlParams()
        }
    }
}

// Factory functions
export const createUrlParamsManager = (searchParams?: URLSearchParams): UrlParamsManager => {
    return new UrlParamsManager(searchParams)
}

export const getValidatedUrlParams = (searchParams?: URLSearchParams): UrlParams => {
    return createUrlParamsManager(searchParams).getAll()
}
