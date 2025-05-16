import { logr } from '@/lib/utils/logr'
import axios from 'axios'
import { getSizeOfAny } from '@/lib/utils/utils-shared'

// Axios configuration for requests
export const axiosConfig = {
    headers: {
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    },
}

// custom fetcher using axios.get
// ignore warning about using 'any'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const axiosGet = async (url: string, params?: any) => {
    try {
        const startTime = performance.now()
        logr.info('utils-server', `axiosGet request url: ${url}`)

        const response = await axios.get(url, { ...axiosConfig, params })

        const finalUrl = response.request.res.responseUrl
        const newUrl = finalUrl && finalUrl !== url ? ` (redirected to ${finalUrl})` : ''
        const data = await response.data
        const ms = Math.round(performance.now() - startTime)

        let sizeOfResponse
        try {
            const contentLength = response.headers['content-length']
            if (contentLength) {
                sizeOfResponse = parseInt(contentLength, 10).toString() + ' content-length'
            } else {
                sizeOfResponse = getSizeOfAny(data)
            }
        } catch {
            sizeOfResponse = 'unknown size'
        }
        logr.info(
            'utils-server',
            `axiosGet Response ${response.status} ${sizeOfResponse} in ${ms}ms url: ${url}${newUrl}`
        )
        logr.debug('utils-server', `axiosGet Response ${response.status} url: ${url}`, data)
        if (typeof data === 'object' && data !== null) {
            response.data.httpStatus = response.status
        }
        return response
    } catch (error) {
        if (axios.isAxiosError(error)) {
            logr.warn('utils-server', `axiosGet isAxiosError ${url} ${error.response?.statusText}`)
            throw new Error(`HTTP ${error.response?.status || 500}: ${error.response?.statusText}`)
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        logr.warn('utils-server', `axiosGet error  ${url} ${errorMessage.substring(0, 200)}`)
        throw new Error(`HTTP 500: ${errorMessage}`)
    }
}
