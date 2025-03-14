import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from '../Header'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(() => ({
        get: jest.fn((param) => (param === 'gc' ? 'test-calendar-id' : null)),
    })),
}))

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

describe('Header', () => {
    it('renders the header with app name', () => {
        render(<Header />)

        expect(screen.getByText('Calendar Map Filter')).toBeInTheDocument()
    })

    it('displays calendar name when provided', () => {
        render(<Header calendarName="Test Calendar" />)

        expect(screen.getByText('Test Calendar')).toBeInTheDocument()
    })

    it('shows "Change Calendar" link when calendar ID is present', () => {
        render(<Header />)

        const changeCalendarLink = screen.getByText('Change Calendar')
        expect(changeCalendarLink).toBeInTheDocument()
        expect(changeCalendarLink.closest('a')).toHaveAttribute('href', '/')
    })

    it('renders the help button', () => {
        render(<Header />)

        const helpButton = screen.getByLabelText('Help')
        expect(helpButton).toBeInTheDocument()
    })

    it('does not show calendar name when not provided', () => {
        render(<Header />)

        expect(screen.queryByText(/Test Calendar/)).not.toBeInTheDocument()
    })
})
