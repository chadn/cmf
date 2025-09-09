import { CmfEvent, EventsSource } from '@/types/events'

/**
 * Formats a date for calendar applications (YYYYMMDDTHHMMSSZ format)
 */
function formatCalendarDate(date: Date): string {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/**
 * Builds description with event details and source information
 */
function buildDescription(event: CmfEvent, eventSources?: EventsSource[], forIcs: boolean = false): string {
    //  Add URLs even if description was empty
    let description = event.description || ''
    const separator = forIcs ? ' ' : '\n\n'

    // Add original event URL
    if (event.original_event_url) {
        description += `${separator}Original event: ${event.original_event_url}`
    }

    // Add event source URL
    let sourceUrl: string | null = null
    if (eventSources && eventSources.length > 0) {
        if (event.src && event.src > 0 && event.src <= eventSources.length) {
            sourceUrl = eventSources[event.src - 1]?.url || null
        } else if (eventSources.length === 1) {
            sourceUrl = eventSources[0]?.url || null
        }
    }

    if (sourceUrl) {
        description += `${separator}Event Source: ${sourceUrl}`
    }

    return description
}

/**
 * Generates a Google Calendar URL for adding an event
 */
export function generateGoogleCalendarUrl(event: CmfEvent, eventSources?: EventsSource[]): string {
    if (!event?.name || !event?.start || !event?.end) {
        return ''
    }

    const params = new URLSearchParams()
    params.set('text', event.name)

    // Format dates
    const startDate = new Date(event.start)
    const endDate = new Date(event.end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return ''
    }
    params.set('dates', `${formatCalendarDate(startDate)}/${formatCalendarDate(endDate)}`)

    // Add description with URLs
    params.set('details', buildDescription(event, eventSources))

    // Add location
    if (event.location) {
        params.set('location', event.location)
    }

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&${params.toString()}`
}

/**
 * Generates an ICS file content for Apple Calendar and other calendar apps
 */
export function generateIcsContent(event: CmfEvent, eventSources?: EventsSource[]): string {
    if (!event?.name || !event?.start || !event?.end) {
        return ''
    }

    const startDate = new Date(event.start)
    const endDate = new Date(event.end)
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return ''
    }

    const now = new Date()
    const uid = `cmf-${event.id}@${window.location.hostname}`

    // Build ICS content
    let icsContent = 'BEGIN:VCALENDAR\r\n'
    icsContent += 'VERSION:2.0\r\n'
    icsContent += 'PRODID:-//CMF//Calendar Event//EN\r\n'
    icsContent += 'BEGIN:VEVENT\r\n'
    icsContent += `UID:${uid}\r\n`
    icsContent += `DTSTAMP:${formatCalendarDate(now)}\r\n`
    icsContent += `DTSTART:${formatCalendarDate(startDate)}\r\n`
    icsContent += `DTEND:${formatCalendarDate(endDate)}\r\n`
    icsContent += `SUMMARY:${event.name.replace(/[,\n\r]/g, ' ')}\r\n`

    // Add description with URLs
    const description = buildDescription(event, eventSources, true)
    if (description) {
        // For ICS, sanitize problematic characters
        const icsDescription = description.replace(/[,\n\r]/g, ' ')
        icsContent += `DESCRIPTION:${icsDescription}\r\n`
    }

    // Add location (sanitize external location data)
    if (event.location) {
        icsContent += `LOCATION:${event.location.replace(/[,\n\r]/g, ' ')}\r\n`
    }

    // Add URL
    if (event.original_event_url) {
        icsContent += `URL:${event.original_event_url}\r\n`
    }

    icsContent += 'END:VEVENT\r\n'
    icsContent += 'END:VCALENDAR\r\n'

    return icsContent
}

/**
 * Downloads an ICS file for the given event
 */
export function downloadIcsFile(event: CmfEvent, eventSources?: EventsSource[]): void {
    if (!event?.name) {
        console.warn('Cannot download calendar file: event name is required')
        return
    }

    const icsContent = generateIcsContent(event, eventSources)
    if (!icsContent) {
        console.warn('Cannot download calendar file: invalid event data')
        return
    }

    try {
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)

        const link = document.createElement('a')
        link.href = url
        link.download = `${event.name.replace(/[^a-zA-Z0-9]/g, '-')}.ics`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        window.URL.revokeObjectURL(url)
    } catch (error) {
        console.error('Failed to download calendar file:', error)
    }
}
