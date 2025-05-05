import { NextRequest, NextResponse } from 'next/server'
import { geocodeLocation } from '@/lib/api/geocoding'
import { logr } from '@/lib/utils/logr'

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

/**
 * API route handler for geocoding an address
 * @param request - NextRequest object containing the address to geocode
 * @returns NextResponse with the geocoded location data
 */
export async function GET(request: NextRequest) {
    try {
        const location =
            request.nextUrl.searchParams.get('location') ||
            request.nextUrl.searchParams.get('l') ||
            request.nextUrl.searchParams.get('address') ||
            request.nextUrl.searchParams.get('a')

        if (!location) {
            logr.info('api-geocode', 'Missing location in request')
            return NextResponse.json({ error: 'Location is required' }, { status: 400 })
        }
        // Use the existing geocodeLocation function from the geocoding module
        const [locationData, source, timings] = await geocodeLocation(location)

        logr.info('api-geocode', `Location "${location}" geocoded with status: ${locationData.status} (${source})`)
        return NextResponse.json({ resolved_location: locationData, source })
    } catch (error) {
        logr.info('api-geocode', 'Error processing geocoding request', error)
        console.error('Error processing geocoding request:', error)
        return NextResponse.json({ error: 'Failed to geocode address' }, { status: 500 })
    }
}
