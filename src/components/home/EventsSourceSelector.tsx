'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import ErrorMessage from '@/components/common/ErrorMessage'
import { logr } from '@/lib/utils/logr'
import { ExampleEventsSources } from '@/lib/events/examples'

const EventsSourceSelector: React.FC = () => {
    const router = useRouter()
    const [eventSourceId, setEventSourceId] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Log component mount - this will only run in the browser
    useEffect(() => {
        logr.info('component', 'EventsSourceSelector component mounted')
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

            // Construct the URL with the event source ID
            const url = `/?es=${encodeURIComponent(sourceId)}`
            router.push(url)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
            setIsLoading(false)
        }
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
                <h3 className="text-sm font-medium text-gray-500 mb-2">Examples:</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                    <ol className="pl-5 space-y-1" style={{ listStyleType: 'decimal' }}>
                        {ExampleEventsSources.map((source, index) => (
                            <li key={index}>
                                {source.ids ? (
                                    <div>
                                        <div className="font-medium text-gray-700 mb-1">{source.name}</div>
                                        <div className="text-sm">
                                            {Object.entries(source.ids).map(([key, value], index, array) => (
                                                <span key={key}>
                                                    <a
                                                        href={`/?es=${key}`}
                                                        className="hover:underline text-blue-600 hover:bg-blue-50 rounded"
                                                    >
                                                        {value}
                                                    </a>
                                                    {index < array.length - 1 && (
                                                        <span className="text-gray-400">, </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <a
                                        href={`/?es=${source.shortId ? source.shortId : source.id}`}
                                        className="hover:underline text-blue-600"
                                    >
                                        {source.name}
                                    </a>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </div>

            {/* Help text */}
            <div className="mt-8 text-sm text-gray-500">
                <p className="text-md mt-1">
                    <a
                        href="https://github.com/chadn/cmf/blob/main/docs/usage.md#initial-view-pick-event-source"
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
                    to find your Event Source ID and more on using this app.
                </p>
            </div>
        </div>
    )
}

export default EventsSourceSelector
