'use client'

import React, { Suspense } from 'react'
import Link from 'next/link'

interface HeaderProps {
    headerName?: string
}

function HeaderContent({ headerName }: HeaderProps) {
    // Tailwind CSS prefixes, use to increase calendar name font size as screens go bigger
    // sm: - Small screens (640px and up)
    // md: - Medium screens (768px and up)
    // lg: - Large screens (1024px and up)
    // xl: - Extra large screens (1280px and up)
    // 2xl: - 2X Extra large screens (1536px and up)

    return (
        <header className="bg-white shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-center gap-4 h-16">
                    <Link href="/" className="flex items-center">
                        <span className="text-xl font-bold text-primary">CMF</span>
                    </Link>
                    <span className="text-sm sm:text-lg md:text-2xl font-semibold text-gray-800">{headerName}</span>
                </div>
            </div>
        </header>
    )
}

// Main component that wraps the content in a Suspense boundary
const Header: React.FC<HeaderProps> = (props) => {
    return (
        <Suspense fallback={<div className="h-16 bg-white shadow-sm" />}>
            <HeaderContent {...props} />
        </Suspense>
    )
}

export default Header
