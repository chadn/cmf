import React, { useEffect } from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Footer from '../Footer'

// Mock Next.js Link component
jest.mock('next/link', () => {
    return ({
        children,
        href,
        className,
    }: {
        children: React.ReactNode
        href: string
        className?: string
    }) => {
        return (
            <a href={href} className={className} data-testid="next-link">
                {children}
            </a>
        )
    }
})

describe('Footer', () => {
    const originalDateNow = Date.prototype.getFullYear

    beforeAll(() => {
        // Mock Date.getFullYear to always return 2023
        Date.prototype.getFullYear = jest.fn(() => 2023)
    })

    afterAll(() => {
        Date.prototype.getFullYear = originalDateNow
    })

    it('renders the footer with copyright text', () => {
        render(<Footer />)

        // Use a more flexible text matcher
        const copyrightElement = screen.getByText((content) => {
            return content.includes('2023 Calendar Map Filter')
        })
        expect(copyrightElement).toBeInTheDocument()
    })

    it('renders privacy policy link', () => {
        render(<Footer />)

        const privacyLink = screen.getByText('Privacy Policy')
        expect(privacyLink).toBeInTheDocument()
        expect(privacyLink.closest('a')).toHaveAttribute('href', '/privacy')
    })

    it('renders terms of service link', () => {
        render(<Footer />)

        const termsLink = screen.getByText('Terms of Service')
        expect(termsLink).toBeInTheDocument()
        expect(termsLink.closest('a')).toHaveAttribute('href', '/terms')
    })

    it('renders GitHub link', () => {
        render(<Footer />)

        const githubLink = screen.getByText('GitHub')
        expect(githubLink).toBeInTheDocument()
        expect(githubLink.closest('a')).toHaveAttribute(
            'href',
            'https://github.com/yourusername/calendar-map-filter'
        )
        expect(githubLink.closest('a')).toHaveAttribute('target', '_blank')
        expect(githubLink.closest('a')).toHaveAttribute(
            'rel',
            'noopener noreferrer'
        )
    })

    it('renders disclaimer text', () => {
        render(<Footer />)

        expect(
            screen.getByText(
                /This application uses the Google Calendar API and MapLibre GL JS/
            )
        ).toBeInTheDocument()
        expect(
            screen.getByText(/not affiliated with or endorsed by Google/)
        ).toBeInTheDocument()
    })

    // Expose events data to window for debugging
    useEffect(() => {
        if (events.length > 0 && typeof window !== 'undefined') {
            window.cmf_events = {
                events,
                total_count: totalCount,
                unknown_locations_count: unknownLocationsCount,
                calendar_name: calendarName,
                calendar_id: calendarId,
            }
        }
    }, [events, totalCount, unknownLocationsCount, calendarName, calendarId])
})
