import React from 'react'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '../LoadingSpinner'
import '@testing-library/jest-dom'

describe('LoadingSpinner', () => {
    it('renders with default props', () => {
        render(<LoadingSpinner />)
        const spinner = screen.getByRole('status')
        expect(spinner).toBeInTheDocument()
        expect(spinner.classList.contains('w-8')).toBe(true) // Default medium size
        expect(spinner.classList.contains('text-primary')).toBe(true) // Default primary color
    })

    it('renders with small size', () => {
        render(<LoadingSpinner size="small" />)
        const spinner = screen.getByRole('status')
        expect(spinner.classList.contains('w-4')).toBe(true)
    })

    it('renders with large size', () => {
        render(<LoadingSpinner size="large" />)
        const spinner = screen.getByRole('status')
        expect(spinner.classList.contains('w-12')).toBe(true)
    })

    it('renders with white color', () => {
        render(<LoadingSpinner color="white" />)
        const spinner = screen.getByRole('status')
        expect(spinner.classList.contains('text-white')).toBe(true)
    })

    it('applies custom className', () => {
        render(<LoadingSpinner className="custom-class" />)
        const container = screen.getByTestId('loading-spinner-container')
        expect(container.classList.contains('custom-class')).toBe(true)
    })
})
