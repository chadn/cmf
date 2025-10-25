import { redisGet, redisSet, redisMGet, redisMSet } from '@/lib/cache/upstash'

// Mock pipeline object
const mockPipeline = {
    set: jest.fn().mockReturnThis(),
    exec: jest.fn(),
}

// Mock the Redis client
const mockRedisClient = {
    get: jest.fn(),
    set: jest.fn(),
    mget: jest.fn(),
    pipeline: jest.fn(() => mockPipeline),
}

jest.mock('@upstash/redis', () => ({
    Redis: jest.fn(() => mockRedisClient),
}))

// Mock logr to avoid console outputs during tests
jest.mock('@/lib/utils/logr', () => ({
    logr: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
    },
}))

describe('Upstash Redis Cache', () => {
    const OLD_ENV = process.env

    beforeEach(() => {
        jest.clearAllMocks()
        // Setup environment variables
        process.env = {
            ...OLD_ENV,
            KV_REST_API_URL: 'https://test-redis.upstash.io',
            KV_REST_API_TOKEN: 'test-token',
        }
    })

    afterAll(() => {
        process.env = OLD_ENV
    })

    describe('redisSet', () => {
        it('sets value with default TTL', async () => {
            await redisSet('test-key', { data: 'test' })

            expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', { data: 'test' }, { ex: 60 * 60 * 24 * 30 })
        })

        it('sets value with custom TTL', async () => {
            await redisSet('test-key', { data: 'test' }, '', 3600)

            expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', { data: 'test' }, { ex: 3600 })
        })

        it('sets value with no expiration when ttl is null', async () => {
            await redisSet('test-key', { data: 'test' }, '', null)

            expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', { data: 'test' })
        })

        it('sets value with no expiration when ttl is negative', async () => {
            await redisSet('test-key', { data: 'test' }, '', -1)

            expect(mockRedisClient.set).toHaveBeenCalledWith('test-key', { data: 'test' })
        })

        it('sets value with prefix', async () => {
            await redisSet('test-key', { data: 'test' }, 'prefix:', 3600)

            expect(mockRedisClient.set).toHaveBeenCalledWith('prefix:test-key', { data: 'test' }, { ex: 3600 })
        })

        it('does not set value if key is empty', async () => {
            await redisSet('', { data: 'test' })

            expect(mockRedisClient.set).not.toHaveBeenCalled()
        })

        it('does not set value if value is undefined', async () => {
            await redisSet('test-key', undefined)

            expect(mockRedisClient.set).not.toHaveBeenCalled()
        })
    })

    describe('redisGet', () => {
        it('gets value from cache', async () => {
            mockRedisClient.get.mockResolvedValue({ data: 'test' })

            const result = await redisGet<{ data: string }>('test-key')

            expect(mockRedisClient.get).toHaveBeenCalledWith('test-key')
            expect(result).toEqual({ data: 'test' })
        })

        it('gets value with prefix', async () => {
            mockRedisClient.get.mockResolvedValue({ data: 'test' })

            const result = await redisGet<{ data: string }>('test-key', 'prefix:')

            expect(mockRedisClient.get).toHaveBeenCalledWith('prefix:test-key')
            expect(result).toEqual({ data: 'test' })
        })

        it('returns null if value not found', async () => {
            mockRedisClient.get.mockResolvedValue(null)

            const result = await redisGet('test-key')

            expect(result).toBeNull()
        })

        it('returns null if key is empty', async () => {
            const result = await redisGet('')

            expect(mockRedisClient.get).not.toHaveBeenCalled()
            expect(result).toBeNull()
        })
    })

    describe('redisMSet', () => {
        it('sets multiple values with default TTL', async () => {
            const keys = ['key1', 'key2']
            const values = ['value1', 'value2']

            await redisMSet(keys, values)

            expect(mockPipeline.set).toHaveBeenCalledWith('key1', 'value1', { ex: 60 * 60 * 24 * 30 })
            expect(mockPipeline.set).toHaveBeenCalledWith('key2', 'value2', { ex: 60 * 60 * 24 * 30 })
            expect(mockPipeline.exec).toHaveBeenCalled()
        })

        it('sets multiple values with no expiration when ttl is null', async () => {
            const keys = ['key1', 'key2']
            const values = ['value1', 'value2']

            await redisMSet(keys, values, '', null)

            expect(mockPipeline.set).toHaveBeenCalledWith('key1', 'value1')
            expect(mockPipeline.set).toHaveBeenCalledWith('key2', 'value2')
            expect(mockPipeline.exec).toHaveBeenCalled()
        })

        it('sets multiple values with no expiration when ttl is negative', async () => {
            const keys = ['key1', 'key2']
            const values = ['value1', 'value2']

            await redisMSet(keys, values, '', -1)

            expect(mockPipeline.set).toHaveBeenCalledWith('key1', 'value1')
            expect(mockPipeline.set).toHaveBeenCalledWith('key2', 'value2')
            expect(mockPipeline.exec).toHaveBeenCalled()
        })

        it('sets multiple values with prefix', async () => {
            const keys = ['key1', 'key2']
            const values = ['value1', 'value2']

            await redisMSet(keys, values, 'prefix:', 3600)

            expect(mockPipeline.set).toHaveBeenCalledWith('prefix:key1', 'value1', { ex: 3600 })
            expect(mockPipeline.set).toHaveBeenCalledWith('prefix:key2', 'value2', { ex: 3600 })
            expect(mockPipeline.exec).toHaveBeenCalled()
        })

        it('does not set values if keys are empty', async () => {
            await redisMSet([], [])

            expect(mockRedisClient.pipeline).not.toHaveBeenCalled()
        })
    })

    describe('redisMGet', () => {
        it('gets multiple values from cache', async () => {
            mockRedisClient.mget.mockResolvedValue(['value1', 'value2'])

            const result = await redisMGet<string>(['key1', 'key2'])

            expect(mockRedisClient.mget).toHaveBeenCalledWith(['key1', 'key2'])
            expect(result).toEqual(['value1', 'value2'])
        })

        it('gets multiple values with prefix', async () => {
            mockRedisClient.mget.mockResolvedValue(['value1', 'value2'])

            const result = await redisMGet<string>(['key1', 'key2'], 'prefix:')

            expect(mockRedisClient.mget).toHaveBeenCalledWith(['prefix:key1', 'prefix:key2'])
            expect(result).toEqual(['value1', 'value2'])
        })

        it('returns null if keys are empty', async () => {
            const result = await redisMGet([])

            expect(mockRedisClient.mget).not.toHaveBeenCalled()
            expect(result).toBeNull()
        })
    })

    describe('missing credentials', () => {
        beforeEach(() => {
            delete process.env.KV_REST_API_URL
            delete process.env.KV_REST_API_TOKEN
        })

        it('redisGet returns null when credentials are missing', async () => {
            const result = await redisGet('test-key')

            expect(result).toBeNull()
            expect(mockRedisClient.get).not.toHaveBeenCalled()
        })

        it('redisSet does nothing when credentials are missing', async () => {
            await redisSet('test-key', 'test-value')

            expect(mockRedisClient.set).not.toHaveBeenCalled()
        })

        it('redisMGet returns null when credentials are missing', async () => {
            const result = await redisMGet(['key1', 'key2'])

            expect(result).toBeNull()
            expect(mockRedisClient.mget).not.toHaveBeenCalled()
        })

        it('redisMSet does nothing when credentials are missing', async () => {
            await redisMSet(['key1', 'key2'], ['value1', 'value2'])

            expect(mockRedisClient.pipeline).not.toHaveBeenCalled()
        })
    })
})
