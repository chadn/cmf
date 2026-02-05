import { NextRequest } from 'next/server'
import { apiEvents, dynamic } from '../events/route'

export { dynamic }

export const maxDuration = 300 // 5 minutes

export async function GET(request: NextRequest) {
    return apiEvents(request)
}
