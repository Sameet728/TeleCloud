describe('validateEnv', () => {
  const originalDevMode = import.meta.env.VITE_DEV_MODE
  const originalEnableAds = import.meta.env.VITE_ENABLE_ADS
  const originalTestUrl = import.meta.env.VITE_VAST_TEST_URL
  const originalExoUrl = import.meta.env.VITE_EXOCLICK_VAST_URL
  const originalExoTestUrl = import.meta.env.VITE_EXOCLICK_TEST_VAST_URL
  const originalExoTestMode = import.meta.env.VITE_EXOCLICK_TEST_MODE
  const originalZoneId = import.meta.env.VITE_EXOCLICK_ZONE_ID
  const originalLegacyVast = import.meta.env.VITE_VAST_URL

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalDevMode === undefined) delete import.meta.env.VITE_DEV_MODE
    else import.meta.env.VITE_DEV_MODE = originalDevMode

    if (originalEnableAds === undefined) delete import.meta.env.VITE_ENABLE_ADS
    else import.meta.env.VITE_ENABLE_ADS = originalEnableAds

    if (originalTestUrl === undefined) delete import.meta.env.VITE_VAST_TEST_URL
    else import.meta.env.VITE_VAST_TEST_URL = originalTestUrl

    if (originalExoUrl === undefined) delete import.meta.env.VITE_EXOCLICK_VAST_URL
    else import.meta.env.VITE_EXOCLICK_VAST_URL = originalExoUrl

    if (originalExoTestUrl === undefined) delete import.meta.env.VITE_EXOCLICK_TEST_VAST_URL
    else import.meta.env.VITE_EXOCLICK_TEST_VAST_URL = originalExoTestUrl

    if (originalExoTestMode === undefined) delete import.meta.env.VITE_EXOCLICK_TEST_MODE
    else import.meta.env.VITE_EXOCLICK_TEST_MODE = originalExoTestMode

    if (originalZoneId === undefined) delete import.meta.env.VITE_EXOCLICK_ZONE_ID
    else import.meta.env.VITE_EXOCLICK_ZONE_ID = originalZoneId

    if (originalLegacyVast === undefined) delete import.meta.env.VITE_VAST_URL
    else import.meta.env.VITE_VAST_URL = originalLegacyVast

    vi.restoreAllMocks()
  })

  it('logs the active dev environment summary without warnings when env is healthy', async () => {
    import.meta.env.VITE_ENABLE_ADS = 'true'
    import.meta.env.VITE_DEV_MODE = 'true'
    import.meta.env.VITE_VAST_TEST_URL = 'https://example.com/test-vast.xml'
    delete import.meta.env.VITE_VAST_URL

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { validateEnv } = await import('./validateEnv')
    const result = validateEnv()

    expect(result).toEqual({
      mode: 'DEV',
      exoClickTestMode: false,
      adsEnabled: true,
      activeVastUrl: 'https://example.com/test-vast.xml',
      warnings: [],
    })
    expect(warnSpy).not.toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledWith('[tc-env]', 'Active mode:', 'DEV')
    expect(infoSpy).toHaveBeenCalledWith('[tc-env]', 'ExoClick test mode:', 'false')
    expect(infoSpy).toHaveBeenCalledWith('[tc-env]', 'Ads enabled:', 'true')
    expect(infoSpy).toHaveBeenCalledWith('[tc-env]', 'Active VAST URL:', 'https://example.com/test-vast.xml')
  })

  it('reports ExoClick test mode cleanly when enabled outside dev', async () => {
    import.meta.env.VITE_ENABLE_ADS = 'true'
    import.meta.env.VITE_API_BASE_URL = 'https://ads.telecloud.example'
    import.meta.env.VITE_DEV_MODE = 'false'
    import.meta.env.VITE_EXOCLICK_TEST_MODE = 'true'
    import.meta.env.VITE_EXOCLICK_TEST_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=2916384'
    delete import.meta.env.VITE_EXOCLICK_VAST_URL
    delete import.meta.env.VITE_EXOCLICK_ZONE_ID
    delete import.meta.env.VITE_VAST_URL

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { validateEnv } = await import('./validateEnv')
    const result = validateEnv()

    expect(result).toEqual({
      mode: 'PROD',
      exoClickTestMode: true,
      adsEnabled: true,
      activeVastUrl: 'https://s.magsrv.com/v1/vast.php?idzone=2916384',
      warnings: [
        'VITE_EXOCLICK_TEST_MODE is enabled; disable it before live production monetization.',
      ],
    })
    expect(warnSpy).toHaveBeenCalled()
    expect(infoSpy).toHaveBeenCalledWith('[tc-env]', 'ExoClick test mode:', 'true')
  })

  it('warns when deprecated or missing values are present', async () => {
    delete import.meta.env.VITE_ENABLE_ADS
    import.meta.env.VITE_API_BASE_URL = 'https://your-api.com'
    import.meta.env.VITE_DEV_MODE = 'false'
    delete import.meta.env.VITE_EXOCLICK_VAST_URL
    delete import.meta.env.VITE_EXOCLICK_ZONE_ID
    import.meta.env.VITE_VAST_URL = 'https://legacy.example.com/vast.xml'

    vi.spyOn(console, 'info').mockImplementation(() => {})
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { validateEnv } = await import('./validateEnv')
    const result = validateEnv()

    expect(result.mode).toBe('PROD')
    expect(result.adsEnabled).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining('VITE_ENABLE_ADS is missing'),
        expect.stringContaining('VITE_API_BASE_URL still uses the placeholder value'),
        expect.stringContaining('VITE_VAST_URL is deprecated'),
        expect.stringContaining('Production ads are missing'),
      ])
    )
    expect(warnSpy).toHaveBeenCalled()
  })
})
