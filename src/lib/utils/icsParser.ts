import ICAL from 'ical.js'

export interface ParsedIcsEvent {
    id: string
    summary: string
    description: string
    startTime: Date
    endTime: Date
    location?: string
    url?: string
}

/**
 * Parses ICS (iCalendar) content and extracts event information
 * @param icsContent - Raw ICS file content as string
 * @returns Array of parsed event objects
 */
export function parseIcsContent(icsContent: string): ParsedIcsEvent[] {
    try {
        const jcalData = ICAL.parse(icsContent)
        const comp = new ICAL.Component(jcalData)
        const events: ParsedIcsEvent[] = []

        for (const vevent of comp.getAllSubcomponents('vevent')) {
            const dtstart = vevent.getFirstPropertyValue('dtstart') as ICAL.Time
            const dtend = vevent.getFirstPropertyValue('dtend') as ICAL.Time

            events.push({
                id: (vevent.getFirstPropertyValue('uid') as string) || '',
                summary: (vevent.getFirstPropertyValue('summary') as string) || '',
                description: (vevent.getFirstPropertyValue('description') as string) || '',
                startTime: dtstart ? dtstart.toJSDate() : new Date(),
                endTime: dtend ? dtend.toJSDate() : new Date(),
                location: vevent.getFirstPropertyValue('location') as string | undefined,
                url: vevent.getFirstPropertyValue('url') as string | undefined,
            })
        }

        return events
    } catch (error) {
        console.error('Error parsing ICS content', error)
        return []
    }
}
