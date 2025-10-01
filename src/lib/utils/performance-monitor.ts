/**
 * Performance monitoring utility to track long tasks and identify bottlenecks
 *
 * Usage: Import and call setupPerformanceMonitoring() once in your app root
 */

export function setupPerformanceMonitoring() {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
        return
    }

    // Track long tasks (>50ms)
    const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            // Log tasks longer than 50ms
            if (entry.duration > 50) {
                const attribution = (entry as any).attribution?.[0]
                const containerType = attribution?.containerType || 'unknown'
                const containerName = attribution?.containerName || 'unknown'

                console.warn(`⚠️ LONG TASK: ${entry.duration.toFixed(0)}ms`, {
                    duration: `${entry.duration.toFixed(0)}ms`,
                    container: `${containerType}:${containerName}`,
                    startTime: `${(entry.startTime / 1000).toFixed(1)}s`,
                })

                // Log recent performance marks to understand context
                const recentMarks = performance.getEntriesByType('measure').slice(-5)
                if (recentMarks.length > 0) {
                    console.log(
                        'Recent performance measures:',
                        recentMarks.map((m) => ({ name: m.name, duration: m.duration }))
                    )
                }
            }
        }
    })

    try {
        longTaskObserver.observe({ entryTypes: ['longtask'] })
        console.log('✅ Performance monitoring active - tracking tasks >50ms')
    } catch (e) {
        // longtask not supported in all browsers
        console.log('⚠️ Long task monitoring not supported in this browser')
    }

    // Track event handler timing
    const eventTimingObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            const eventEntry = entry as PerformanceEventTiming
            // Log slow event handlers (>100ms processing time)
            if (eventEntry.processingStart && eventEntry.processingEnd) {
                const processingTime = eventEntry.processingEnd - eventEntry.processingStart
                if (processingTime > 100) {
                    console.warn(`⚠️ SLOW EVENT HANDLER: ${eventEntry.name} took ${processingTime.toFixed(0)}ms`, {
                        eventType: eventEntry.name,
                        processingTime: processingTime.toFixed(2),
                        startTime: eventEntry.startTime,
                        target: eventEntry.target,
                    })
                    console.trace('Slow event handler stack trace')
                }
            }
        }
    })

    try {
        eventTimingObserver.observe({ entryTypes: ['event'] })
        console.log('✅ Event timing monitoring active - tracking handlers >100ms')
    } catch (e) {
        // event timing not supported in all browsers
        console.log('⚠️ Event timing monitoring not supported in this browser')
    }

    // Track 'message' events specifically
    const originalAddEventListener = window.addEventListener
    window.addEventListener = function (type: string, listener: any, options?: any) {
        if (type === 'message') {
            const wrappedListener = function (this: any, event: Event) {
                const start = performance.now()
                const result = typeof listener === 'function' ? listener.call(this, event) : listener.handleEvent(event)
                const duration = performance.now() - start

                if (duration > 50) {
                    console.warn(`⚠️ SLOW MESSAGE HANDLER: ${duration.toFixed(0)}ms`, {
                        duration: duration.toFixed(2),
                        origin: (event as MessageEvent).origin,
                        data: (event as MessageEvent).data,
                        source: (event as MessageEvent).source,
                    })
                    console.trace('Message handler stack trace')
                }
                return result
            }
            return originalAddEventListener.call(this, type, wrappedListener, options)
        }
        return originalAddEventListener.call(this, type, listener, options)
    }
    console.log('✅ Message event monitoring active - tracking message handlers >50ms')
}

interface PerformanceEventTiming extends PerformanceEntry {
    processingStart: number
    processingEnd: number
    target: EventTarget | null
}
