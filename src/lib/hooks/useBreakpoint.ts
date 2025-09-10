'use client'

import { useState, useEffect } from 'react'

/**
 * Custom hook for responsive breakpoint detection using media queries
 *
 * @param query - CSS media query string (default: '(min-width: 1024px)')
 * @returns boolean indicating if the media query matches
 */
export function useBreakpoint(query = '(min-width: 1024px)') {
    const [matches, setMatches] = useState(false)
    
    useEffect(() => {
        const media = window.matchMedia(query)
        if (media.matches !== matches) setMatches(media.matches)
        const listener = () => setMatches(media.matches)
        media.addEventListener('change', listener)
        return () => media.removeEventListener('change', listener)
    }, [matches, query])
    
    return matches
}