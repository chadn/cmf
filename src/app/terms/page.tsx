'use client'

import React from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

export default function TermsPage() {
    return (
        <>
            <Header />
            <main className="prose mx-auto px-4 py-8">
                <h1>Terms / License</h1>
                <p>
                    This project, <strong>Calendar Map Filter (CMF)</strong>, is licensed under the{' '}
                    <a
                        href="https://www.apache.org/licenses/LICENSE-2.0"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline"
                    >
                        Apache License 2.0
                    </a>
                    .
                </p>
                <p>
                    © 2025 Chad Norwood. Use, modification, and distribution of this software are permitted under the
                    terms of the Apache 2.0 license. The software is provided “as is” without warranty of any kind.
                </p>
            </main>
            <Footer />
        </>
    )
}
