import { fetcherLogr } from '../utils'
import { logr } from '../logr'

// Mock fetch and logr
jest.mock('../logr', () => ({
    logr: {
        info: jest.fn(),
        debug: jest.fn(),
    },
}))

// Mock umami.ts
jest.mock('../umami', () => ({
    umamiTrack: jest.fn(),
}))

describe('utils', () => {
    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks()
        // Reset fetch mock
        global.fetch = jest.fn()
    })

    describe('fetcherLogr', () => {
        it('should successfully fetch and log data', async () => {
            const mockData = { test: 'data' }
            const mockResponse = {
                json: jest.fn().mockResolvedValue(mockData),
                status: 200,
            }
            ;(global.fetch as jest.Mock).mockResolvedValue(mockResponse)

            const url = 'https://api.example.com/data'
            const result = await fetcherLogr(url)

            expect(global.fetch).toHaveBeenCalledWith(url)
            expect(logr.info).toHaveBeenCalledWith('browser', `fetcherLogr request url: ${url}`)
            expect(logr.info).toHaveBeenCalledWith(
                'browser',
                expect.stringMatching(
                    /^fetcherLogr Response 200, \d+ bytes in \d+ms, url: https:\/\/api.example.com\/data$/
                )
            )
            expect(result).toEqual(mockData)
        })

        it('should handle fetch errors and log them', async () => {
            const mockError = new Error('Network error')
            ;(global.fetch as jest.Mock).mockRejectedValue(mockError)

            const url = 'https://api.example.com/data'

            await expect(fetcherLogr(url)).rejects.toThrow('Network error')
            expect(logr.info).toHaveBeenCalledWith('browser', `fetcherLogr request url: ${url}`)
            expect(logr.info).toHaveBeenCalledWith('browser', `Error from url: ${url}`, mockError)
        })
    })
})
