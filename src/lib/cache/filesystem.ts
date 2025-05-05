import fs from 'fs'
import path from 'path'
import { Location } from '@/types/events'

// Cache file path
const CACHE_DIR = path.join(process.cwd(), '.cache')
export const LOCATIONS_CACHE_FILE = path.join(CACHE_DIR, 'locations.json')
let isInitialized = false

// Ensure cache directory exists
function initializeCache(): void {
    if (isInitialized) {
        return
    }
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true })
    }
    isInitialized = true
}

// Helper to load the cache file
function loadCache(): Record<string, Location> {
    initializeCache()
    if (!fs.existsSync(LOCATIONS_CACHE_FILE)) {
        return {}
    }

    // todo: load file to memory, not read from disk each time

    try {
        const data = fs.readFileSync(LOCATIONS_CACHE_FILE, 'utf8')
        return JSON.parse(data)
    } catch (error) {
        console.error('Error loading cache file:', error)
        return {}
    }
}

// Helper to save the cache file
function saveCache(cache: Record<string, Location>): void {
    initializeCache()
    try {
        fs.writeFileSync(LOCATIONS_CACHE_FILE, JSON.stringify(cache, null, 2), 'utf8')
    } catch (error) {
        console.error('Error saving cache file:', error)
    }
}

/**
 * Gets a location from the filesystem cache
 * @param locationKey - The location string to use as a key
 * @returns Promise with the cached location or null if not found
 */
export async function getLocation(locationKey: string): Promise<Location | null> {
    const cache = loadCache()
    return cache[locationKey] || null
}

/**
 * Caches a location to the filesystem
 * @param locationKey - The location string to use as a key
 * @param location - The resolved location data to cache
 * @returns Promise that resolves when caching is complete
 */
export async function setLocation(locationKey: string, location: Location): Promise<void> {
    const cache = loadCache()
    cache[locationKey] = location
    saveCache(cache)
}
