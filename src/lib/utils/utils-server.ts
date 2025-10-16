import axios from 'axios'
import curlirize from 'axios-curlirize'
import { logr } from '@/lib/utils/logr'
import { getSizeOfAny } from '@/lib/utils/utils-shared'
import { HttpError } from '@/types/error'
import { stringify } from '@/lib/utils/utils-shared'

if (process.env.NODE_ENV === 'development') {
    curlirize(axios)
}

/**
 * Axios configuration for requests with browser-like User-Agent
 */
export const axiosConfig = {
    headers: {
        'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
    },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type axiosCmfOptions = { method?: 'GET' | 'POST'; params?: any; data?: any; headers?: any }

/**
 * Custom fetcher using axios with logging and error handling
 * @param url - URL to fetch
 * @param options - Optional config: method ('GET' | 'POST'), params (query params), data (POST body), headers
 * @returns Axios response with additional logging
 * @throws {HttpError} When request fails
 */
export const axiosCmf = async (url: string, options?: axiosCmfOptions) => {
    const method = options?.method || 'GET'
    try {
        const startTime = performance.now()
        logr.info('utils-server', `axiosCmf ${method} request url: ${url}`)

        const config = {
            ...axiosConfig,
            headers: { ...axiosConfig.headers, ...options?.headers },
            ...(options?.params && { params: options.params }),
        }

        const response = method === 'POST' ? await axios.post(url, options?.data, config) : await axios.get(url, config)

        const finalUrl = response.request.res?.responseUrl
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
            `axiosCmf ${method} Response ${response.status} ${sizeOfResponse} in ${ms}ms url: ${url}${newUrl}`
        )
        logr.debug('utils-server', `axiosCmf ${method} Response ${response.status} url: ${url}`, data)
        if (typeof data === 'object' && data !== null) {
            response.data.httpStatus = response.status
        }
        return response
    } catch (error) {
        if (axios.isAxiosError(error)) {
            if (error.response) {
                // The request was made and the server responded with a status code
                // that falls out of the range of 2xx
                logr.info('utils-server', `isAxiosError error.response.data: ${stringify(error.response.data)}`)
                logr.info(
                    'utils-server',
                    `isAxiosError error.response.status: ${JSON.stringify(error.response.status)}`
                )
                logr.debug(
                    'utils-server',
                    `isAxiosError error.response.headers: ${JSON.stringify(error.response.headers)}`
                )
            } else if (error.request) {
                // The request was made but no response was received
                // `error.request` is an instance of XMLHttpRequest in the browser
                // and an instance of http.ClientRequest in node.js
                logr.info('utils-server', `isAxiosError error.request: ${JSON.stringify(error.request)}`)
            } else {
                // Something happened in setting up the request that triggered an Error
                logr.info('utils-server', `isAxiosError error.message: ${JSON.stringify(error.message)}`)
            }

            logr.warn('utils-server', `axiosCmf returning 503 isAxiosError ${error.response?.statusText} ${url}`)
            throw new HttpError(503, error.response?.statusText || 'Service Unavailable')
        }
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
        logr.warn('utils-server', `axiosCmf error  ${url} ${errorMessage.substring(0, 200)}`)
        throw new HttpError(500, errorMessage)
    }
}

// Backwards compatibility - keep axiosGet with original signature
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const axiosGet = async (url: string, params?: any, headers?: any) => {
    return axiosCmf(url, { method: 'GET', params, headers })
}
