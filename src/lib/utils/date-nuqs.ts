import { createParser } from 'nuqs'
import { logr } from '@/lib/utils/logr'
import {getDateFromUrlDateString} from '@/lib/utils/date'
import { dateQuickFilterLabels } from '@/lib/utils/date-constants'

// Custom parsers to read and write values to the URL
// url params have a value of null if they do not or should not exist.
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
        return value
    },
})

export const parseAsDateQuickFilter = createParser({
    parse(queryValue) {
        logr.info('date', 'parseAsDateQuickFilter parse queryValue:', queryValue)
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
        logr.info('date', 'parseAsDateQuickFilter serialize queryValue:', value)
        return value
    },
})
