/**
 * Plura Events Source - Utility Functions
 *
 * This module provides utility functions for the Plura event source:
 * - URL normalization for comparing URLs from different domains
 * - Date string parsing for various Plura date formats
 * - City name extraction from URLs
 * - HTML structure logging for debugging
 *
 * These utilities are used across the other modules to avoid code duplication
 * and provide consistent behavior.
 */

import { logr } from '@/lib/utils/logr'
import { PluraDomain } from './types'
import { knownCitiesAsKeys } from './index'
import { ValidLocations } from './types'

// Normalize URLs for comparison only - DO NOT use for requests
export const normalizeUrl = (url: string): string => {
    return url.replace('https://heyplura.com/', 'https://plra.io/')
    //return url.replace('https://plra.io/', 'https://heyplura.com/')
}

/**
 * Build a city URL from a domain and city name
 * @param cityName City name (will be formatted)
 * @param domain Base domain
 * @param option 1 or 2, 1 is the default, 2 is the alternative URL
 * @returns Full city URL
 */
export function convertCityNameToUrl(cityName: string, domain: string = '', option: number = 1): string {
    domain = domain || PluraDomain
    let ret = ''
    if (option === 1) {
        ret = `${domain}/events/city/` + cityName.replace(/,\s*/g, '_').replace(/\s+/g, '%20')
    } else if (option === 2) {
        // ex: https://plra.io/events/city/Amsterdam__NL
        ret = `${domain}/events/city/` + cityName.replace(/,\s*/g, '__').replace(/\s+/g, '%20')
    }
    logr.debug('api-es-plura', `convertCityNameToUrl(${cityName}, ${domain}, ${option}) = ${ret}`)
    return ret
}
/**
 * convert a city name to a key for a record
 * @param cityName City name (will be formatted)
 * @returns Full city URL
 */
export function convertCityNameToKey(cityName: string): string {
    return cityName.replace(/,\s*/g, '_').replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Extract city name from URL
 * @param url City URL like https://heyplura.com/events/city/Oakland_CA
 * @returns City name like "Oakland, CA"
 */
export function convertUrlToCityName(url: string): string {
    try {
        if (!url) return ''

        // Extract the last part of the URL
        const urlParts = url.split('/')
        const lastPart = urlParts[urlParts.length - 1]

        if (!lastPart) return url

        // Convert URL format to display format (e.g., Oakland_CA -> Oakland, CA)
        return decodeURIComponent(lastPart).replace(/_/g, ', ').replace(/%20/g, ' ')
    } catch {
        return url || ''
    }
}

export function improveLocation(locationText: string, cityName: string): string {
    if (!locationText) {
        //const ret = cityName || ''
        const ret = 'zoom online'
        logr.debug('api-es-plura', `improveLocation no location, return(${ret})`)
        return ret
    }

    // first check if locationText is in our list of valid locations
    if (ValidLocations[locationText as keyof typeof ValidLocations]) {
        logr.info(
            'api-es-plura',
            `improveLocation found ${locationText} in ValidLocations`,
            ValidLocations[locationText]
        )
        return ValidLocations[locationText]
    }

    // then see if it's a city in the list of known cities
    const locationTextKey = convertCityNameToKey(locationText)
    const knownCities = knownCitiesAsKeys(locationTextKey)
    if (knownCities.includes(locationTextKey)) {
        logr.info('api-es-plura', `improveLocation found ${locationText} in knownCitiesAsKeys`, knownCities)
        return locationText
    }

    if (!cityName) {
        logr.debug('api-es-plura', `improveLocation no city, return unchanged "${locationText}"`)
        return locationText
    }

    // Extract city suffix (could be state or state and country)
    const commaIndex = cityName.indexOf(',')
    if (commaIndex === -1) {
        logr.debug('api-es-plura', `improveLocation city w/o suffix, return unchanged "${locationText}"`)
        return locationText // No suffix to add
    }
    const citySuffix = cityName.substring(commaIndex)

    // Check if locationText already has a similar suffix
    if (locationText.includes(citySuffix) || locationText.endsWith(citySuffix.trim())) {
        logr.debug('api-es-plura', `improveLocation city and location same suffix, return unchanged "${locationText}"`)
        return locationText
    }

    // Append the city suffix to the location
    logr.debug('api-es-plura', `improveLocation adding ${citySuffix}, to end of "${locationText}"`)
    return `${locationText}${citySuffix}`
}

/**
 * Parse a date string from Plura format
 * @param dateString Date string in format like "Wednesday, May 14th at 1:30am"
 * @returns Object with startDate and endDate
 */
export function parseDateString(dateString: string): { startDate: Date | null; endDate: Date | null } {
    try {
        if (!dateString || typeof dateString !== 'string') {
            return { startDate: null, endDate: null }
        }

        const currentYear = new Date().getFullYear()

        // Create regex to extract date components
        // Handles formats like:
        // - "Wednesday, May 14th at 1:30am"
        // - "May 14th at 1:30am"
        // - "May 14, 2023 at 1:30am"
        const dateRegex =
            /(?:([A-Za-z]+),\s+)?([A-Za-z]+)\s+(\d+)(?:st|nd|rd|th)(?:,\s+(\d{4}))?(?:\s+at\s+(\d+)(?::(\d+))?([ap]m))?/i
        const match = dateString.match(dateRegex)

        if (!match) {
            logr.warn('api-es-plura', `Failed to parse date string: ${dateString}`)
            return { startDate: null, endDate: null }
        }

        // Extract the components we need
        const [, , month, day, year, hour, minute, ampm] = match

        // Create date string in format that JS Date can parse
        let dateStr = `${month} ${day}, ${year || currentYear}`

        // Handle time if available
        let timeStr = ''
        if (hour) {
            timeStr = `${hour}:${minute || '00'} ${ampm || 'am'}`
            dateStr += ` ${timeStr}`
        }

        const startDate = new Date(dateStr)
        if (isNaN(startDate.getTime())) {
            logr.warn('api-es-plura', `Invalid date created from string: ${dateStr}`)
            return { startDate: null, endDate: null }
        }

        // Default duration is 1 hour if not specified
        const endDate = new Date(startDate)
        endDate.setHours(endDate.getHours() + 1)

        return { startDate, endDate }
    } catch (error: unknown) {
        logr.error('api-es-plura', `Error parsing date: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return { startDate: null, endDate: null }
    }
}

/**
 * Log HTML page structure to help diagnose scraping issues
 * @param $ Cheerio instance
 * @param contextName Name for logging context
 */
export function logPageStructure($: cheerio.Root, contextName: string): void {
    logr.warn('api-es-plura', `Analyzing HTML structure for ${contextName}`)

    // Log overall structure stats
    logr.info(
        'api-es-plura',
        `Page has ${$('a').length} links, ${$('section').length} sections, ${$('div').length} divs`
    )

    // Log all link hrefs to see what's available
    const allLinks = $('a')
        .map((_, el) => $(el).attr('href'))
        .get()
    logr.info('api-es-plura', `Sample links: ${allLinks.slice(0, 5).join(', ')}`)

    // Look for section patterns
    const sectionClasses = $('section')
        .map((_, el) => $(el).attr('class'))
        .get()
    logr.info('api-es-plura', `Section classes: ${sectionClasses.slice(0, 5).join(', ')}`)

    // Look for titles
    const titles = $('h1, h2, h3')
        .map((_, el) => $(el).text().trim())
        .get()
    logr.info('api-es-plura', `Titles: ${titles.slice(0, 5).join(', ')}`)
}
