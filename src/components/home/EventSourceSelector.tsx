'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../common/LoadingSpinner'
import ErrorMessage from '../common/ErrorMessage'
import { logr } from '@/lib/utils/logr'
import { ExampleEventSources } from '@/lib/events/examples'

const EventSourceSelector: React.FC = () => {
    const router = useRouter()
    const [eventSourceId, setEventSourceId] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Log component mount - this will only run in the browser
    useEffect(() => {
        logr.info('component', 'EventSourceSelector component mounted')
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        try {
            // handle special case for facebook events
            // https://www.facebook.com/events/ical/upcoming/?uid=677700808&key=3RlHDZnbeH2YJMpJ
            const fbRegex = /facebook\.com\/events\/ical\/upcoming\/\?uid=(\d+)&key=([A-Za-z0-9]+)/
            const fbMatch = eventSourceId.match(fbRegex)

            let sourceId = eventSourceId
            if (fbMatch && fbMatch.length === 3) {
                // Extract uid and key from the matched groups
                const uid = fbMatch[1]
                const key = fbMatch[2]
                logr.info('component', 'Facebook URL detected, converting to fb format', { uid, key })
                sourceId = `fb:${uid}-${key}`
                setEventSourceId(sourceId)
            }

            // Validate event source ID format
            if (!sourceId.includes(':')) {
                throw new Error('Invalid event source format. Must include a colon (e.g., gc:example@gmail.com)')
            }

            // Construct the URL with the event source ID
            const url = `/?es=${encodeURIComponent(sourceId)}`
            router.push(url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
            setIsLoading(false)
        }
    }

    const handleExampleSelect = (id: string) => {
        const example = ExampleEventSources.find((es) => es.id === id)
        logr.info('calendar', 'Example event source selected', {
            id,
            name: example?.name,
        })
        setEventSourceId(id)
    }

    return (
        <div className="max-w-md mx-auto px-8 py-6 bg-white rounded-lg shadow-md border-t border-black">
            <h2 className="text-xl font-bold text-center mb-6 text-blue-600">Welcome to CMF - Calendar Map Filter</h2>
            <p className="text-sm text-gray-500 mb-4">
                If you love maps, and have many events in your Calendar, this is for you.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
                <div className="form-control">
                    <label htmlFor="event-source-id" className="form-label">
                        Enter Event Source ID string
                    </label>
                    <input
                        id="event-source-id"
                        type="text"
                        className="form-input"
                        placeholder="Enter your event source ID"
                        value={eventSourceId}
                        onChange={(e) => setEventSourceId(e.target.value)}
                        disabled={isLoading}
                    />
                    {error && <ErrorMessage message={error} className="mt-2" />}
                </div>

                <button type="submit" className="w-full btn btn-primary py-2" disabled={isLoading}>
                    {isLoading ? <LoadingSpinner size="small" color="white" /> : 'View Events'}
                </button>
            </form>

            {/* Example event sources */}
            <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Or try an example - click below then click View Events:
                </h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    {ExampleEventSources.map((source) => (
                        <button
                            key={`${source.id}`}
                            className="w-full text-left px-3 py-2 border rounded btn btn-secondary"
                            onClick={() => handleExampleSelect(source.id)}
                            disabled={isLoading}
                        >
                            <div className="font-medium text-white">{source.name}</div>
                            <div className="text-xs text-white truncate">{source.id}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Help text */}
            <div className="mt-8 text-sm text-gray-500">
                <p className="text-md mt-1">
                    <a
                        href="https://github.com/chadn/cmf/blob/main/docs/usage.md#how-to-use-cmf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        Read Usage Docs
                    </a>
                    <br />
                    to find your Calendar ID and more on using this app.
                </p>
            </div>
        </div>
    )
}

export default EventSourceSelector
