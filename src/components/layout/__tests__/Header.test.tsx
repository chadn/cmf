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
    return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => {
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

        expect(screen.getByText('CMF')).toBeInTheDocument()
    })

    it('displays calendar name when provided', () => {
        render(<Header calendarName="Test Calendar" />)

        expect(screen.getByText('Test Calendar')).toBeInTheDocument()
    })

    it('does not show calendar name when not provided', () => {
        render(<Header />)

        expect(screen.queryByText(/Test Calendar/)).not.toBeInTheDocument()
    })

    it('displays event count when provided', () => {
        render(<Header calendarName="Test Calendar" eventCount={{ shown: 5, total: 10 }} />)

        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText(/Showing/)).toBeInTheDocument()
        expect(screen.getByText(/of/)).toBeInTheDocument()
        expect(screen.getByText(/events/)).toBeInTheDocument()
    })

    it('has a link to the home page', () => {
        render(<Header />)

        const homeLink = screen.getByTestId('next-link')
        expect(homeLink).toHaveAttribute('href', '/')
    })
})
