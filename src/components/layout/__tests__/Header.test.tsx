import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Header from '@/components/layout/Header'

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
    useSearchParams: jest.fn(() => ({
        get: jest.fn((param) => (param === 'gc' ? 'test-calendar-id' : null)),
    })),
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
    const MockLink = ({
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

    MockLink.displayName = 'MockLink'
    return MockLink
})

describe('Header', () => {
    it('renders the header with app name', () => {
        render(<Header />)

        expect(screen.getByText('CMF')).toBeInTheDocument()
    })

    it('displays calendar name when provided', () => {
        render(<Header headerName="Test Calendar" />)

        expect(screen.getByText('Test Calendar')).toBeInTheDocument()
    })

    it('does not show calendar name when not provided', () => {
        render(<Header />)

        expect(screen.queryByText(/Test Calendar/)).not.toBeInTheDocument()
    })

    it('has a link to the home page', () => {
        render(<Header />)

        const homeLink = screen.getByTestId('next-link')
        expect(homeLink).toHaveAttribute('href', '/')
    })
})
