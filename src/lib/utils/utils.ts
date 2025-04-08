import { logr } from '@/lib/utils/logr'

// Custom fetcher function, basically a wrapper to log API requests and responses
export const fetcherLogr = async (url: string) => {
    logr.info('browser', `Request to url: ${url}`)
    try {
        const response = await fetch(url)
        const data = await response.json()
        logr.info('browser', `Response from url: ${url} (${response.status})`, data)
        return data
    } catch (error) {
        logr.info('browser', `Error from url: ${url}`, error)
        throw error
    }
}
