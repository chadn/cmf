import { logr } from '@/lib/utils/logr'

// Custom fetcher function, basically a wrapper to log API requests and responses
export const fetcherLogr = async (url: string) => {
    try {
        const startTime = performance.now()
        logr.info('browser', `fetcherLogr request url: ${url}`)

        const response = await fetch(url)

        const data = await response.json()
        let ms = Math.round(performance.now() - startTime)
        const sizeOfResponse = JSON.stringify(data).length
        logr.info('browser', `fetcherLogr Response ${response.status}, ${sizeOfResponse} bytes in ${ms}ms, url: ${url}`)
        logr.debug('browser', `fetcherLogr Response ${response.status} url: ${url}`, data)
        data.httpStatus = response.status
        if (typeof umami !== 'undefined') {
            umami.track('ClientFetch', { url, status: response.status, size: sizeOfResponse, ms: ms })
        }
        return data
    } catch (error) {
        logr.info('browser', `Error from url: ${url}`, error)
        throw error
    }
}
