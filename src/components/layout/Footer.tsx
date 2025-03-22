'use client'

import React from 'react'
import Link from 'next/link'

const Footer: React.FC = () => {
    return (
        <footer className="bg-white border-t border-gray-200 py-4">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-center">
                    <div className="mb-4 md:mb-0">
                        <p className="text-sm text-gray-500">
                            &copy; {new Date().getFullYear()} Calendar Map
                            Filter
                        </p>
                    </div>

                    <div className="flex space-x-6">
                        <Link
                            href="/privacy"
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Privacy Policy
                        </Link>
                        <Link
                            href="/terms"
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Terms of Service
                        </Link>
                        <a
                            href="https://github.com/chadn/cmf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            GitHub
                        </a>
                    </div>
                </div>

                <div className="mt-4 text-xs text-gray-400 text-center">
                    <p>
                        This application uses the Google Calendar API and
                        MapLibre GL JS. It is not affiliated with or endorsed by
                        Google.
                    </p>
                </div>
            </div>
        </footer>
    )
}

export default Footer
