'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../common/LoadingSpinner'
import { logr } from '@/lib/utils/logr'
// Basic debug log to verify DEBUG_LOGIC is enabled on the client
// This will be filtered out by the debug utility if running on the server

const EventSourceSelector: React.FC = () => {
    const router = useRouter()
    const [eventSourceId, setEventSourceId] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Log component mount - this will only run in the browser
    useEffect(() => {
        logr.info('component', 'EventSourceSelector component mounted')
    }, [])

    // Example event sources for demonstration
    const exampleEventSources = [
        {
            name: 'SF Bay Area Facebook Events (Google Calendar)',
            id: 'gc:aabe6c219ee2af5b791ea6719e04a92990f9ccd1e68a3ff0d89bacd153a0b36d@group.calendar.google.com',
        },
        {
            name: 'Geocaching in Spain (Google Calendar)',
            id: 'gc:geocachingspain@gmail.com',
        },
        // Facebook examples will be added when supported
        // {
        //     name: 'Sample Facebook Events',
        //     id: 'sample-facebook-id',
        // },
    ]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!eventSourceId.trim()) {
            logr.info('calendar', 'Calendar submission error: empty ID')
            setError('Please enter a source ID')
            return
        }

        logr.info('calendar', 'Event source ID submitted', { sourceId: eventSourceId })
        if (typeof umami !== 'undefined') {
            umami.track('ViewEventSource', { id: eventSourceId })
        }
        setIsLoading(true)
        setError(null)

        // Redirect to the main page with the event source
        const redirectUrl = `/?es=${encodeURIComponent(eventSourceId)}`
        logr.info('calendar', 'Redirecting to', { redirectUrl })
        router.push(redirectUrl)
    }

    const handleExampleSelect = (id: string) => {
        const example = exampleEventSources.find((es) => es.id === id)
        logr.info('calendar', 'Example event source selected', {
            id,
            name: example?.name,
        })
        setEventSourceId(id)
    }

    return (
        <div className="max-w-md mx-auto px-8 py-6 bg-white rounded-lg shadow-md border-t border-black">
            <h2 className="text-xl font-bold text-center mb-6 text-blue-600">Welcome to Calendar Map Filter</h2>
            <p className="text-sm text-gray-500 mb-4">
                If you love maps, and have many events in your Calendar, this is for you.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
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
                    {error && <p className="text-sm text-error mt-1">{error}</p>}
                    <p className="text-xs text-gray-500 mt-1">More here on finding event source id</p>
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
                <div className="space-y-2">
                    {exampleEventSources.map((source) => (
                        <button
                            key={`${source.id}`}
                            className="w-full text-left px-3 py-2 border rounded btn btn-primary"
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
                <p className="mb-2">
                    <strong>How to find your Calendar ID:</strong>
                </p>
                <ol className="list-decimal pl-5 space-y-1">
                    <li>Go to Google Calendar</li>
                    <li>Click on the three dots next to your calendar name</li>
                    <li>Select "Settings and sharing"</li>
                    <li>Scroll down to "Integrate calendar"</li>
                    <li>Copy the Calendar ID</li>
                </ol>
            </div>
        </div>
    )
}

export default EventSourceSelector
