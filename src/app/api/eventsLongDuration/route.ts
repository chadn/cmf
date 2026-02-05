import { NextRequest } from 'next/server'
import { apiEvents, dynamic } from '../events/route'

export { dynamic }

// Serverless Functions must have a maxDuration between 1 and 60 for plan hobby. : https://vercel.com/docs/concepts/limits/overview#serverless-function-execution-timeout
export const maxDuration = 60 // 60 seconds max for Hobby Plan

export async function GET(request: NextRequest) {
    return apiEvents(request)
}
