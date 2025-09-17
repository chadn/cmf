import { generateGoogleCalendarUrl, generateIcsContent, downloadIcsFile } from '@/lib/utils/calendar'
import { CmfEvent, EventsSource } from '@/types/events'

// Mock window.location for the tests
Object.defineProperty(window, 'location', {
    value: {
        hostname: 'test.example.com',
    },
    writable: true,
})

describe('Calendar utilities', () => {
    const mockEvent: CmfEvent = {
        id: 'test-event-123',
        name: 'Test Event',
        start: '2023-01-01T14:30:00Z',
        end: '2023-01-01T16:00:00Z',
        location: 'Test Location',
        description: 'Test Description for the event',
        description_urls: [],
        original_event_url: 'https://example.com/event/123',
        src: 1,
    }

    const mockEventSources: EventsSource[] = [
        {
            prefix: '19hz',
            name: '19hz.info Music Events',
            url: 'https://19hz.info/eventlisting_BayArea.php',
        },
    ]

    describe('generateGoogleCalendarUrl', () => {
        it('generates correct Google Calendar URL', () => {
            const url = generateGoogleCalendarUrl(mockEvent, mockEventSources)

            expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
            expect(url).toContain('text=Test+Event')
            expect(url).toContain('dates=20230101T143000Z%2F20230101T160000Z')
            expect(url).toContain('location=Test+Location')
            expect(url).toContain('details=Test+Description+for+the+event')
            expect(url).toContain('Original+event%3A+https%3A%2F%2Fexample.com%2Fevent%2F123')
            expect(url).toContain('Event+Source%3A+https%3A%2F%2F19hz.info%2Feventlisting_BayArea.php')
        })

        it('handles event without description', () => {
            const eventNoDesc = { ...mockEvent, description: '' }
            const url = generateGoogleCalendarUrl(eventNoDesc)

            expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
            expect(url).toContain('text=Test+Event')
            expect(url).toContain('details=')
            expect(url).toContain('Original+event%3A+https%3A%2F%2Fexample.com%2Fevent%2F123')
        })

        it('handles event without location', () => {
            const eventNoLocation = { ...mockEvent, location: '' }
            const url = generateGoogleCalendarUrl(eventNoLocation)

            expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
            expect(url).toContain('text=Test+Event')
            expect(url).not.toContain('location=')
        })

        it('handles event without event sources', () => {
            const url = generateGoogleCalendarUrl(mockEvent)

            expect(url).toContain('https://calendar.google.com/calendar/render?action=TEMPLATE')
            expect(url).toContain('text=Test+Event')
            expect(url).toContain('Original+event%3A+https%3A%2F%2Fexample.com%2Fevent%2F123')
            expect(url).not.toContain('Event+Source%3A')
        })

        it('handles event with multiple sources using src index', () => {
            const multipleEventSources: EventsSource[] = [
                {
                    prefix: '19hz',
                    name: '19hz.info Music Events',
                    url: 'https://19hz.info/eventlisting_BayArea.php',
                },
                {
                    prefix: 'gc',
                    name: 'Google Calendar',
                    url: 'https://calendar.google.com/',
                },
            ]
            const eventFromSecondSource = { ...mockEvent, src: 2 }
            const url = generateGoogleCalendarUrl(eventFromSecondSource, multipleEventSources)

            expect(url).toContain('Event+Source%3A+https%3A%2F%2Fcalendar.google.com%2F')
        })
    })

    describe('generateIcsContent', () => {
        it('generates valid ICS content', () => {
            const icsContent = generateIcsContent(mockEvent, mockEventSources)

            expect(icsContent).toContain('BEGIN:VCALENDAR')
            expect(icsContent).toContain('VERSION:2.0')
            expect(icsContent).toContain('PRODID:-//CMF//Calendar Event//EN')
            expect(icsContent).toContain('BEGIN:VEVENT')
            expect(icsContent).toContain('UID:cmf-test-event-123@test.example.com')
            expect(icsContent).toContain('DTSTART:20230101T143000Z')
            expect(icsContent).toContain('DTEND:20230101T160000Z')
            expect(icsContent).toContain('SUMMARY:Test Event')
            expect(icsContent).toContain(
                'DESCRIPTION:Test Description for the event Original event: https://example.com/event/123 Event Source: https://19hz.info/eventlisting_BayArea.php'
            )
            expect(icsContent).toContain('LOCATION:Test Location')
            expect(icsContent).toContain('URL:https://example.com/event/123')
            expect(icsContent).toContain('END:VEVENT')
            expect(icsContent).toContain('END:VCALENDAR')
        })

        it('handles event without description', () => {
            const eventNoDesc = { ...mockEvent, description: '' }
            const icsContent = generateIcsContent(eventNoDesc)

            expect(icsContent).toContain('BEGIN:VCALENDAR')
            expect(icsContent).toContain('SUMMARY:Test Event')
            expect(icsContent).not.toMatch(/DESCRIPTION:[^\\r\\n]*Test Description/)
        })

        it('handles event without location', () => {
            const eventNoLocation = { ...mockEvent, location: '' }
            const icsContent = generateIcsContent(eventNoLocation)

            expect(icsContent).toContain('BEGIN:VCALENDAR')
            expect(icsContent).toContain('SUMMARY:Test Event')
            expect(icsContent).not.toMatch(/LOCATION:[^\\r\\n]*Test Location/)
        })

        it('handles event without event sources', () => {
            const icsContent = generateIcsContent(mockEvent)

            expect(icsContent).toContain('BEGIN:VCALENDAR')
            expect(icsContent).toContain('SUMMARY:Test Event')
            expect(icsContent).toContain(
                'DESCRIPTION:Test Description for the event Original event: https://example.com/event/123'
            )
            expect(icsContent).not.toContain('Event Source:')
        })

        it('sanitizes content with commas and newlines', () => {
            const eventWithSpecialChars = {
                ...mockEvent,
                name: 'Event, with commas\nand newlines\rtest',
                description: 'Description, with commas\nand newlines\rtest',
                location: 'Location, with commas\nand newlines\rtest',
            }
            const icsContent = generateIcsContent(eventWithSpecialChars)

            expect(icsContent).toContain('SUMMARY:Event  with commas and newlines test')
            expect(icsContent).toContain('DESCRIPTION:Description  with commas and newlines test')
            expect(icsContent).toContain('LOCATION:Location  with commas and newlines test')
        })
    })

    describe('downloadIcsFile', () => {
        let mockCreateElement: jest.SpyInstance
        let mockAppendChild: jest.SpyInstance
        let mockRemoveChild: jest.SpyInstance
        let mockClick: jest.SpyInstance
        let mockLink: HTMLAnchorElement

        beforeEach(() => {
            mockLink = {
                href: '',
                download: '',
                click: jest.fn(),
            } as unknown as HTMLAnchorElement

            mockClick = mockLink.click as jest.Mock
            mockCreateElement = jest.spyOn(document, 'createElement').mockReturnValue(mockLink)
            mockAppendChild = jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink)
            mockRemoveChild = jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink)

            // Mock URL object
            Object.defineProperty(window, 'URL', {
                value: {
                    createObjectURL: jest.fn(() => 'blob:test-url'),
                    revokeObjectURL: jest.fn(),
                },
                writable: true,
            })
        })

        afterEach(() => {
            mockCreateElement.mockRestore()
            mockAppendChild.mockRestore()
            mockRemoveChild.mockRestore()
        })

        it('downloads ICS file with correct filename', () => {
            downloadIcsFile(mockEvent)

            expect(mockCreateElement).toHaveBeenCalledWith('a')
            expect(mockLink.href).toBe('blob:test-url')
            expect(mockLink.download).toBe('Test-Event.ics')
            expect(mockAppendChild).toHaveBeenCalledWith(mockLink)
            expect(mockClick).toHaveBeenCalled()
            expect(mockRemoveChild).toHaveBeenCalledWith(mockLink)
            expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url')
        })

        it('sanitizes filename for download', () => {
            const eventWithSpecialChars = {
                ...mockEvent,
                name: 'Event/with\\special:chars*test?<>|',
            }

            downloadIcsFile(eventWithSpecialChars)

            expect(mockLink.download).toBe('Event-with-special-chars-test----.ics')
        })
    })
})
