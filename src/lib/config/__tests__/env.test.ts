describe('env configuration', () => {
    let originalEnv: NodeJS.ProcessEnv

    beforeEach(() => {
        originalEnv = { ...process.env }
        jest.resetModules()
    })

    afterEach(() => {
        process.env = originalEnv
    })

    describe('parseNumber', () => {
        it('should use default when env var is not set', async () => {
            delete process.env.MAP_BOUNDS_CHANGE_UPDATE_DELAY
            const { env } = await import('../env')
            expect(env.MAP_BOUNDS_CHANGE_UPDATE_DELAY).toBe(200)
        })

        it('should parse valid number from env var', async () => {
            process.env.MAP_BOUNDS_CHANGE_UPDATE_DELAY = '500'
            const { env } = await import('../env')
            expect(env.MAP_BOUNDS_CHANGE_UPDATE_DELAY).toBe(500)
        })

        it('should use default for invalid number', async () => {
            process.env.MAP_BOUNDS_CHANGE_UPDATE_DELAY = 'invalid'
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
            const { env } = await import('../env')
            expect(env.MAP_BOUNDS_CHANGE_UPDATE_DELAY).toBe(200)
            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Invalid MAP_BOUNDS_CHANGE_UPDATE_DELAY')
            )
            consoleWarnSpy.mockRestore()
        })

        it('should parse cache TTL values', async () => {
            process.env.CACHE_TTL_API_EVENTSOURCE = '1200'
            process.env.CACHE_TTL_API_GEOCODE = '86400'
            process.env.CACHE_TTL_PLURA_SCRAPE = '3600'
            const { env } = await import('../env')
            expect(env.CACHE_TTL_API_EVENTSOURCE).toBe(1200)
            expect(env.CACHE_TTL_API_GEOCODE).toBe(86400)
            expect(env.CACHE_TTL_PLURA_SCRAPE).toBe(3600)
        })
    })

    describe('parseBoolean', () => {
        it('should use default when env var is not set', async () => {
            delete process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP
            const { env } = await import('../env')
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(false)
        })

        it('should parse "true" string as true', async () => {
            process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP = 'true'
            const { env } = await import('../env')
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(true)
        })

        it('should parse "1" string as true', async () => {
            process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP = '1'
            const { env } = await import('../env')
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(true)
        })

        it('should parse "false" string as false', async () => {
            process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP = 'false'
            const { env } = await import('../env')
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(false)
        })

        it('should parse "0" string as false', async () => {
            process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP = '0'
            const { env } = await import('../env')
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(false)
        })

        it('should be case insensitive', async () => {
            process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP = 'TRUE'
            const { env } = await import('../env')
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(true)
        })

        it('should use default for invalid boolean', async () => {
            process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP = 'invalid'
            const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
            const { env } = await import('../env')
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(false)
            expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid FEAT_CLEAR_SE_FROM_MAP_CHIP'))
            consoleWarnSpy.mockRestore()
        })

        it('should parse performance monitoring flag', async () => {
            process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING = 'true'
            const { env } = await import('../env')
            expect(env.ENABLE_PERFORMANCE_MONITORING).toBe(true)
        })
    })

    describe('default values', () => {
        it('should use all default values when no env vars are set', async () => {
            delete process.env.MAP_BOUNDS_CHANGE_UPDATE_DELAY
            delete process.env.FEAT_CLEAR_SE_FROM_MAP_CHIP
            delete process.env.NEXT_PUBLIC_ENABLE_PERFORMANCE_MONITORING
            delete process.env.CACHE_TTL_API_EVENTSOURCE
            delete process.env.CACHE_TTL_API_GEOCODE
            delete process.env.CACHE_TTL_PLURA_SCRAPE

            const { env } = await import('../env')
            expect(env.MAP_BOUNDS_CHANGE_UPDATE_DELAY).toBe(200)
            expect(env.FEAT_CLEAR_SE_FROM_MAP_CHIP).toBe(false)
            expect(env.ENABLE_PERFORMANCE_MONITORING).toBe(false)
            expect(env.CACHE_TTL_API_EVENTSOURCE).toBe(600)
            expect(env.CACHE_TTL_API_GEOCODE).toBe(7776000)
            expect(env.CACHE_TTL_PLURA_SCRAPE).toBe(172800)
        })
    })
})
