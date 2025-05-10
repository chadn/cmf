import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Footer from '../Footer'

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

describe('Footer', () => {
    it('renders the footer with correct copyright text', () => {
        render(<Footer />)

        // Check for copyright notice
        expect(screen.getByText(/© \d{4} Calendar Map Filter/)).toBeInTheDocument()

        // Check for links
        expect(screen.getByText('Terms of Service')).toBeInTheDocument()
        expect(screen.getByText('Privacy Policy')).toBeInTheDocument()
    })

    it('renders the current year in the copyright notice', () => {
        render(<Footer />)
        const currentYear = new Date().getFullYear().toString()
        expect(screen.getByText(new RegExp(`© ${currentYear}`))).toBeInTheDocument()
    })

    it('has links to terms and privacy pages', () => {
        render(<Footer />)

        const termsLink = screen.getByText('Terms of Service').closest('a')
        const privacyLink = screen.getByText('Privacy Policy').closest('a')

        expect(termsLink).toHaveAttribute('href', '/terms')
        expect(privacyLink).toHaveAttribute('href', '/privacy')
    })

    it('renders GitHub link', () => {
        render(<Footer />)

        const githubLink = screen.getByText('GitHub')
        expect(githubLink).toBeInTheDocument()
        expect(githubLink.closest('a')).toHaveAttribute('href', 'https://github.com/chadn/cmf')
        expect(githubLink.closest('a')).toHaveAttribute('target', '_blank')
        expect(githubLink.closest('a')).toHaveAttribute('rel', 'noopener noreferrer')
    })

    it('renders disclaimer text', () => {
        render(<Footer />)

        expect(screen.getByText(/This application uses the Google Calendar API and MapLibre GL JS/)).toBeInTheDocument()
        expect(screen.getByText(/not affiliated with or endorsed by Google/)).toBeInTheDocument()
    })
})
