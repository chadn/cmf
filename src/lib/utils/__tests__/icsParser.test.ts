import { parseIcsContent } from '../icsParser'

// Define interface for mock property values
interface MockPropertyValues {
    uid?: string
    summary?: string
    description?: string
    location?: string
    url?: string
    dtstart?: { toJSDate: () => Date } | null
    dtend?: { toJSDate: () => Date } | null
    [key: string]: unknown // Changed from any to unknown
}

// Mock ical.js
jest.mock('ical.js', () => {
    return {
        parse: jest.fn(),
        Component: jest.fn(),
    }
})

describe('icsParser', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    describe('parseIcsContent', () => {
        it('should parse ICS content and return events', () => {
            // Sample event data
            const mockUid = 'event-123'
            const mockSummary = 'Test Event'
            const mockDescription = 'Test Description'
            const mockLocation = 'Test Location'
            const mockUrl = 'https://example.com'
            const mockStartTime = new Date('2023-07-15T10:00:00Z')
            const mockEndTime = new Date('2023-07-15T12:00:00Z')

            // Mock event property values
            const mockPropertyValues: MockPropertyValues = {
                uid: mockUid,
                summary: mockSummary,
                description: mockDescription,
                location: mockLocation,
                url: mockUrl,
                dtstart: {
                    toJSDate: jest.fn().mockReturnValue(mockStartTime),
                },
                dtend: {
                    toJSDate: jest.fn().mockReturnValue(mockEndTime),
                },
            }

            // Mock vevent component
            const mockVevent = {
                getFirstPropertyValue: jest.fn((prop: string) => mockPropertyValues[prop]),
            }

            // Mock component with getAllSubcomponents
            const mockComponent = {
                getAllSubcomponents: jest.fn().mockReturnValue([mockVevent]),
            }

            // Setup ICAL.Component constructor mock
            const mockICAL = jest.mocked(jest.requireMock('ical.js'))
            mockICAL.parse.mockReturnValue('mockJcalData')
            mockICAL.Component.mockImplementation(() => mockComponent)

            // Test parseIcsContent
            const icsContent = 'BEGIN:VCALENDAR\nEND:VCALENDAR'
            const result = parseIcsContent(icsContent)

            // Verify parse was called with the content
            expect(mockICAL.parse).toHaveBeenCalledWith(icsContent)

            // Verify Component was constructed with the parsed data
            expect(mockICAL.Component).toHaveBeenCalledWith('mockJcalData')

            // Verify getAllSubcomponents was called to get events
            expect(mockComponent.getAllSubcomponents).toHaveBeenCalledWith('vevent')

            // Verify the event properties were accessed
            expect(mockVevent.getFirstPropertyValue).toHaveBeenCalledWith('uid')
            expect(mockVevent.getFirstPropertyValue).toHaveBeenCalledWith('summary')
            expect(mockVevent.getFirstPropertyValue).toHaveBeenCalledWith('description')
            expect(mockVevent.getFirstPropertyValue).toHaveBeenCalledWith('dtstart')
            expect(mockVevent.getFirstPropertyValue).toHaveBeenCalledWith('dtend')
            expect(mockVevent.getFirstPropertyValue).toHaveBeenCalledWith('location')
            expect(mockVevent.getFirstPropertyValue).toHaveBeenCalledWith('url')

            // Verify the result structure
            expect(result).toEqual([
                {
                    id: mockUid,
                    summary: mockSummary,
                    description: mockDescription,
                    startTime: mockStartTime,
                    endTime: mockEndTime,
                    location: mockLocation,
                    url: mockUrl,
                },
            ])
        })

        it('should handle missing optional properties', () => {
            // Mock event with only required properties
            const mockUid = 'event-456'
            const mockSummary = 'Required Event'
            const mockDescription = 'Required Description'
            const mockStartTime = new Date('2023-08-20T14:00:00Z')
            const mockEndTime = new Date('2023-08-20T15:00:00Z')

            // Mock event property values with missing optional properties
            const mockPropertyValues: MockPropertyValues = {
                uid: mockUid,
                summary: mockSummary,
                description: mockDescription,
                dtstart: {
                    toJSDate: jest.fn().mockReturnValue(mockStartTime),
                },
                dtend: {
                    toJSDate: jest.fn().mockReturnValue(mockEndTime),
                },
                // location and url are undefined
            }

            // Mock vevent component
            const mockVevent = {
                getFirstPropertyValue: jest.fn((prop: string) => mockPropertyValues[prop]),
            }

            // Mock component with getAllSubcomponents
            const mockComponent = {
                getAllSubcomponents: jest.fn().mockReturnValue([mockVevent]),
            }

            // Setup ICAL.Component constructor mock
            const mockICAL = jest.mocked(jest.requireMock('ical.js'))
            mockICAL.parse.mockReturnValue('mockJcalData')
            mockICAL.Component.mockImplementation(() => mockComponent)

            // Test parseIcsContent
            const result = parseIcsContent('BEGIN:VCALENDAR\nEND:VCALENDAR')

            // Verify the result structure with undefined optional properties
            expect(result).toEqual([
                {
                    id: mockUid,
                    summary: mockSummary,
                    description: mockDescription,
                    startTime: mockStartTime,
                    endTime: mockEndTime,
                    location: undefined,
                    url: undefined,
                },
            ])
        })

        it('should handle empty values for required properties', () => {
            // Mock event with empty required properties
            const mockPropertyValues: MockPropertyValues = {
                uid: '',
                summary: '',
                description: '',
                dtstart: {
                    toJSDate: jest.fn().mockReturnValue(new Date()),
                },
                dtend: {
                    toJSDate: jest.fn().mockReturnValue(new Date()),
                },
            }

            // Mock vevent component
            const mockVevent = {
                getFirstPropertyValue: jest.fn((prop: string) => mockPropertyValues[prop]),
            }

            // Mock component with getAllSubcomponents
            const mockComponent = {
                getAllSubcomponents: jest.fn().mockReturnValue([mockVevent]),
            }

            // Setup ICAL.Component constructor mock
            const mockICAL = jest.mocked(jest.requireMock('ical.js'))
            mockICAL.parse.mockReturnValue('mockJcalData')
            mockICAL.Component.mockImplementation(() => mockComponent)

            // Test parseIcsContent
            const result = parseIcsContent('BEGIN:VCALENDAR\nEND:VCALENDAR')

            // Verify empty strings are preserved
            expect(result[0].id).toBe('')
            expect(result[0].summary).toBe('')
            expect(result[0].description).toBe('')
        })

        it('should handle null dtstart and dtend by using current date', () => {
            // Mock event with null date properties
            const mockPropertyValues: MockPropertyValues = {
                uid: 'event-789',
                summary: 'Test Event',
                description: 'Test Description',
                dtstart: null,
                dtend: null,
            }

            // Mock vevent component
            const mockVevent = {
                getFirstPropertyValue: jest.fn((prop: string) => mockPropertyValues[prop]),
            }

            // Mock component with getAllSubcomponents
            const mockComponent = {
                getAllSubcomponents: jest.fn().mockReturnValue([mockVevent]),
            }

            // Setup ICAL.Component constructor mock
            const mockICAL = jest.mocked(jest.requireMock('ical.js'))
            mockICAL.parse.mockReturnValue('mockJcalData')
            mockICAL.Component.mockImplementation(() => mockComponent)

            // Mock Date.now for consistent testing
            const realDate = global.Date
            const mockDate = new Date('2023-01-01T00:00:00Z')
            // Using a more type-safe approach
            const MockDateClass = jest.fn(() => mockDate) as unknown as DateConstructor
            MockDateClass.UTC = realDate.UTC
            MockDateClass.parse = realDate.parse
            MockDateClass.now = jest.fn(() => mockDate.getTime())
            global.Date = MockDateClass

            // Test parseIcsContent
            const result = parseIcsContent('BEGIN:VCALENDAR\nEND:VCALENDAR')

            // Restore Date
            global.Date = realDate

            // Verify current date is used for null dates
            expect(result[0].startTime).toEqual(mockDate)
            expect(result[0].endTime).toEqual(mockDate)
        })

        it('should handle multiple events', () => {
            // Mock two events
            const mockVevent1 = {
                getFirstPropertyValue: jest.fn((prop: string) => {
                    if (prop === 'uid') return 'event-1'
                    if (prop === 'summary') return 'Event 1'
                    if (prop === 'description') return 'Description 1'
                    if (prop === 'dtstart') return { toJSDate: () => new Date('2023-09-01T10:00:00Z') }
                    if (prop === 'dtend') return { toJSDate: () => new Date('2023-09-01T11:00:00Z') }
                    return undefined
                }),
            }

            const mockVevent2 = {
                getFirstPropertyValue: jest.fn((prop: string) => {
                    if (prop === 'uid') return 'event-2'
                    if (prop === 'summary') return 'Event 2'
                    if (prop === 'description') return 'Description 2'
                    if (prop === 'dtstart') return { toJSDate: () => new Date('2023-09-02T10:00:00Z') }
                    if (prop === 'dtend') return { toJSDate: () => new Date('2023-09-02T11:00:00Z') }
                    return undefined
                }),
            }

            // Mock component with getAllSubcomponents returning multiple events
            const mockComponent = {
                getAllSubcomponents: jest.fn().mockReturnValue([mockVevent1, mockVevent2]),
            }

            // Setup ICAL.Component constructor mock
            const mockICAL = jest.mocked(jest.requireMock('ical.js'))
            mockICAL.parse.mockReturnValue('mockJcalData')
            mockICAL.Component.mockImplementation(() => mockComponent)

            // Test parseIcsContent
            const result = parseIcsContent('BEGIN:VCALENDAR\nEND:VCALENDAR')

            // Verify we got two events
            expect(result.length).toBe(2)
            expect(result[0].id).toBe('event-1')
            expect(result[1].id).toBe('event-2')
        })

        it('should return empty array when parsing fails', () => {
            // Setup ICAL.parse to throw an error
            const mockICAL = jest.mocked(jest.requireMock('ical.js'))
            mockICAL.parse.mockImplementation(() => {
                throw new Error('Invalid ICS content')
            })

            // Mock console.error
            const originalConsoleError = console.error
            console.error = jest.fn()

            // Test parseIcsContent with invalid content
            const result = parseIcsContent('INVALID CONTENT')

            // Restore console.error
            console.error = originalConsoleError

            // Verify error was logged - just check that we get an empty array
            expect(result).toEqual([])
        })
    })
})
