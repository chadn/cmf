'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import LoadingSpinner from '../common/LoadingSpinner'
import { debugLog, clientDebug } from '@/lib/utils/debug'

// Basic debug log to verify DEBUG_LOGIC is enabled on the client
// This will be filtered out by the debug utility if running on the server

const CalendarSelector: React.FC = () => {
    const router = useRouter()
    const [calendarId, setCalendarId] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Log component mount - this will only run in the browser
    useEffect(() => {
        clientDebug.log('component', 'CalendarSelector component mounted')
    }, [])

    // Example calendar IDs for demonstration
    const exampleCalendars = [
        {
            name: 'US Holidays',
            id: 'en.usa#holiday@group.v.calendar.google.com',
        },
        {
            name: 'Example Tech Conference',
            id: 'example.tech.conference@group.calendar.google.com',
        },
    ]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        if (!calendarId.trim()) {
            clientDebug.log('calendar', 'Calendar submission error: empty ID')
            setError('Please enter a Calendar ID')
            return
        }

        clientDebug.log('calendar', 'Calendar ID submitted', { calendarId })
        setIsLoading(true)
        setError(null)

        // In a real app, you might validate the calendar ID here
        // For now, we'll just redirect to the main page with the calendar ID
        const redirectUrl = `/?gc=${encodeURIComponent(calendarId)}`
        clientDebug.log('calendar', 'Redirecting to', { redirectUrl })
        router.push(redirectUrl)
    }

    const handleExampleSelect = (id: string) => {
        clientDebug.log('calendar', 'Example calendar selected', {
            id,
            name: exampleCalendars.find((cal) => cal.id === id)?.name,
        })
        setCalendarId(id)
    }

    return (
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-center mb-6">
                Enter a Google Calendar ID
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="form-control">
                    <label htmlFor="calendar-id" className="form-label">
                        Calendar ID
                    </label>
                    <input
                        id="calendar-id"
                        type="text"
                        className="form-input"
                        placeholder="your_calendar_id@group.calendar.google.com"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                        disabled={isLoading}
                    />
                    {error && (
                        <p className="text-sm text-error mt-1">{error}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                        Find your Calendar ID in Google Calendar settings
                    </p>
                </div>

                <button
                    type="submit"
                    className="w-full btn btn-primary py-2"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <LoadingSpinner size="small" color="white" />
                    ) : (
                        'View Calendar'
                    )}
                </button>
            </form>

            {/* Example calendars */}
            <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                    Or try an example:
                </h3>
                <div className="space-y-2">
                    {exampleCalendars.map((calendar) => (
                        <button
                            key={calendar.id}
                            className="w-full text-left px-3 py-2 border rounded hover:bg-gray-50"
                            onClick={() => handleExampleSelect(calendar.id)}
                            disabled={isLoading}
                        >
                            <div className="font-medium">{calendar.name}</div>
                            <div className="text-xs text-gray-500 truncate">
                                {calendar.id}
                            </div>
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

export default CalendarSelector
