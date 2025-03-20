'use client'

import React, { Suspense } from 'react'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'

function TermsContent() {
    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow container mx-auto px-4 py-8 max-w-4xl">
                <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>

                <div className="prose max-w-none">
                    <p className="mb-4">
                        Last updated: {new Date().toLocaleDateString()}
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Introduction
                    </h2>
                    <p>
                        Welcome to Calendar Map Filter. These terms and
                        conditions outline the rules and regulations for the use
                        of our website and services.
                    </p>
                    <p>
                        By accessing this website, we assume you accept these
                        terms and conditions in full. Do not continue to use
                        Calendar Map Filter if you do not accept all of the
                        terms and conditions stated on this page.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        License to Use
                    </h2>
                    <p>
                        Unless otherwise stated, Calendar Map Filter and/or its
                        licensors own the intellectual property rights for all
                        material on the website. All intellectual property
                        rights are reserved.
                    </p>
                    <p>
                        You may view and/or print pages from the website for
                        your own personal use subject to restrictions set in
                        these terms and conditions.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Restrictions
                    </h2>
                    <p>
                        You are specifically restricted from all of the
                        following:
                    </p>
                    <ul className="list-disc pl-6 mb-4">
                        <li>
                            Publishing any website material in any other media
                        </li>
                        <li>
                            Selling, sublicensing and/or otherwise
                            commercializing any website material
                        </li>
                        <li>
                            Publicly performing and/or showing any website
                            material
                        </li>
                        <li>
                            Using this website in any way that is or may be
                            damaging to this website
                        </li>
                        <li>
                            Using this website in any way that impacts user
                            access to this website
                        </li>
                        <li>
                            Using this website contrary to applicable laws and
                            regulations, or in a way that causes, or may cause,
                            harm to the website, or to any person or business
                            entity
                        </li>
                    </ul>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Your Content
                    </h2>
                    <p>
                        In these terms and conditions, "Your Content" shall mean
                        any audio, video, text, images or other material you
                        choose to display on this website. By displaying Your
                        Content, you grant Calendar Map Filter a non-exclusive,
                        worldwide, irrevocable, royalty-free, sublicensable
                        license to use, reproduce, adapt, publish, translate and
                        distribute it in any and all media.
                    </p>
                    <p>
                        Your Content must be your own and must not be infringing
                        on any third party's rights. Calendar Map Filter
                        reserves the right to remove any of Your Content from
                        this website at any time without notice.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        No Warranties
                    </h2>
                    <p>
                        This website is provided "as is," with all faults, and
                        Calendar Map Filter makes no express or implied
                        representations or warranties, of any kind related to
                        this website or the materials contained on this website.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Limitation of Liability
                    </h2>
                    <p>
                        In no event shall Calendar Map Filter, nor any of its
                        officers, directors and employees, be held liable for
                        anything arising out of or in any way connected with
                        your use of this website, whether such liability is
                        under contract, tort or otherwise.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        External Links
                    </h2>
                    <p>
                        Our website may contain links to external websites that
                        are not provided or maintained by or in any way
                        affiliated with Calendar Map Filter. Please note that
                        Calendar Map Filter does not guarantee the accuracy,
                        relevance, timeliness, or completeness of any
                        information on these external websites.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Changes to Terms
                    </h2>
                    <p>
                        Calendar Map Filter reserves the right to modify these
                        terms from time to time at our sole discretion.
                        Therefore, you should review these pages periodically.
                        When we change the Terms in a material manner, we will
                        notify you that material changes have been made to the
                        Terms. Your continued use of the Website after any such
                        change constitutes your acceptance of the new Terms.
                    </p>

                    <h2 className="text-xl font-semibold mt-6 mb-3">
                        Contact Us
                    </h2>
                    <p>
                        If you have any questions about these Terms, please
                        contact us at:
                    </p>
                    <p className="mb-4">Email: terms@example.com</p>
                </div>
            </main>
            <Footer />
        </div>
    )
}

export default function TermsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <TermsContent />
        </Suspense>
    )
}
