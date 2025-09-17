function parseNumber(value: string | undefined, defaultValue: number, varName: string): number {
    if (!value) return defaultValue
    const parsed = parseInt(value, 10)
    if (isNaN(parsed)) {
        console.warn(`Invalid ${varName}: "${value}", using default: ${defaultValue}`)
        return defaultValue
    }
    return parsed
}

function parseBoolean(value: string | undefined, defaultValue: boolean, varName: string): boolean {
    if (!value) return defaultValue
    const normalized = value.toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
    console.warn(`Invalid ${varName}: "${value}", using default: ${defaultValue}`)
    return defaultValue
}

export const env = {
    MAP_BOUNDS_CHANGE_UPDATE_DELAY: parseNumber(
        process.env.MAP_BOUNDS_CHANGE_UPDATE_DELAY,
        200, // higher number for slower devices, lower number for faster devices
        'MAP_BOUNDS_CHANGE_UPDATE_DELAY'
    ),
    FEAT_CLEAR_SE_FROM_MAP_CHIP: parseBoolean(
        process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP,
        false,
        'FEAT_CLEAR_SE_FROM_MAP_CHIP'
    ),
    CACHE_TTL_API_EVENTSOURCE: parseNumber(process.env.CACHE_TTL_API_EVENTSOURCE, 600, 'CACHE_TTL_API_EVENTSOURCE'),
    CACHE_TTL_API_GEOCODE: parseNumber(process.env.CACHE_TTL_API_GEOCODE, 7776000, 'CACHE_TTL_API_GEOCODE'),
    CACHE_TTL_PLURA_SCRAPE: parseNumber(process.env.CACHE_TTL_PLURA_SCRAPE, 172800, 'CACHE_TTL_PLURA_SCRAPE'),
} as const
