import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import ErrorMessage from '@/components/common/ErrorMessage'
import '@testing-library/jest-dom'

describe('ErrorMessage', () => {
    it('renders the error message', () => {
        render(<ErrorMessage message="Test error message" />)
        expect(screen.getByText('Error')).toBeInTheDocument()
        expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('applies custom className', () => {
        render(<ErrorMessage message="Test error message" className="custom-class" />)
        const container = screen.getByTestId('error-message-container')
        expect(container.classList.contains('custom-class')).toBe(true)
    })

    it('calls onRetry when retry button is clicked', () => {
        const mockRetry = jest.fn()
        render(<ErrorMessage message="Test error message" onRetry={mockRetry} />)

        const retryButton = screen.getByText('Try again')
        fireEvent.click(retryButton)

        expect(mockRetry).toHaveBeenCalledTimes(1)
    })

    it('does not show retry button when onRetry is not provided', () => {
        render(<ErrorMessage message="Test error message" />)
        expect(screen.queryByText('Try again')).not.toBeInTheDocument()
    })
})
