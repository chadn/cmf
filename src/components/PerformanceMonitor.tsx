'use client'

import { useEffect } from 'react'
import { setupPerformanceMonitoring } from '@/lib/utils/performance-monitor'

export function PerformanceMonitor() {
    useEffect(() => {
        // Only run in development
        if (process.env.NODE_ENV === 'development') {
            setupPerformanceMonitoring()
        }
    }, [])

    return null
}
