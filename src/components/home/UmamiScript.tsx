'use client'

import Script from 'next/script'
import { getUmamiWebsiteId } from '@/lib/utils/umami'

export function UmamiScript() {
    const websiteId = getUmamiWebsiteId()
    return (
        <Script src="https://umami-cmf.vercel.app/script.js" data-website-id={websiteId} strategy="afterInteractive" />
    )
}
