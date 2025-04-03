import { NextRequest, NextResponse } from 'next/server'
import { logr } from '@/lib/utils/logr'

const HIDE_SENSITIVE = true
const SENSITIVE_KEY_INCLUDES = ['KV_URL', 'KEY', 'SECRET', 'PASSWORD', 'TOKEN']

// Export config to make this a dynamic API route
export const dynamic = 'force-dynamic'

/**
 * API route handler for environment variable information
 * This is useful for debugging purposes only and should be disabled in production
 */
export async function GET(request: NextRequest) {
    try {
        // Get all environment variables
        const envVars = { ...process.env }

        if (HIDE_SENSITIVE) {
            // Redact sensitive values
            Object.keys(envVars).forEach((key) => {
                if (SENSITIVE_KEY_INCLUDES.some((include) => key.includes(include))) {
                    envVars[key] = '[REDACTED]'
                }
            })
        }

        // Log the request
        logr.info('api-info', 'Environment variables requested', {
            ip: request.headers.get('x-forwarded-for') || 'unknown',
            hideSensitive: HIDE_SENSITIVE,
            requestedVars: envVars,
        })

        // Create a sorted array of keys and convert back to object
        const sortedVars = Object.keys(envVars)
            .sort()
            .reduce((obj: Record<string, string | undefined>, key) => {
                obj[key] = envVars[key]
                return obj
            }, {})

        return NextResponse.json({
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            variables: sortedVars,
        })
    } catch (error) {
        logr.info('api-info', 'Error processing environment variables request', error)
        console.error('Error processing environment variables request:', error)
        return NextResponse.json({ error: 'Failed to retrieve environment variables' }, { status: 500 })
    }
}
