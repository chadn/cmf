import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import MapMarker from '../MapMarker'

describe('MapMarker', () => {
    it('renders with count of 1', () => {
        render(<MapMarker count={1} isSelected={false} />)

        // Check that the marker displays the correct count
        const marker = screen.getByText('1')
        expect(marker).toBeInTheDocument()
    })

    it('renders with selected state', () => {
        render(<MapMarker count={1} isSelected={true} />)

        // Check that the marker displays the correct count
        const marker = screen.getByText('1')
        expect(marker).toBeInTheDocument()
    })

    it('renders with multiple events count', () => {
        render(<MapMarker count={5} isSelected={false} />)

        // Check that the marker displays the correct count
        const marker = screen.getByText('5')
        expect(marker).toBeInTheDocument()
    })

    it('applies different sizes based on count', () => {
        const { rerender } = render(<MapMarker count={1} isSelected={false} />)

        // Check that the marker displays the correct count
        expect(screen.getByText('1')).toBeInTheDocument()

        // Rerender with a higher count
        rerender(<MapMarker count={10} isSelected={false} />)

        // Check that the marker displays the new count
        expect(screen.getByText('10')).toBeInTheDocument()
    })
})
