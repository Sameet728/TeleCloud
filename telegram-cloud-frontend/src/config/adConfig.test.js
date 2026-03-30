describe('adConfig', () => {
  const originalDevMode = import.meta.env.VITE_DEV_MODE
  const originalTestUrl = import.meta.env.VITE_VAST_TEST_URL
  const originalExoUrl = import.meta.env.VITE_EXOCLICK_VAST_URL
  const originalExoTestUrl = import.meta.env.VITE_EXOCLICK_TEST_VAST_URL
  const originalExoTestMode = import.meta.env.VITE_EXOCLICK_TEST_MODE
  const originalZoneId = import.meta.env.VITE_EXOCLICK_ZONE_ID
  const originalLegacyVast = import.meta.env.VITE_VAST_URL
  const originalForceTestAds =
    typeof window !== 'undefined' ? window.FORCE_TEST_ADS : undefined

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    if (originalDevMode === undefined) delete import.meta.env.VITE_DEV_MODE
    else import.meta.env.VITE_DEV_MODE = originalDevMode

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

    if (typeof window !== 'undefined') {
      if (originalForceTestAds === undefined) delete window.FORCE_TEST_ADS
      else window.FORCE_TEST_ADS = originalForceTestAds
    }

    vi.restoreAllMocks()
  })

  it('uses the Google test VAST in dev mode', async () => {
    import.meta.env.VITE_DEV_MODE = 'true'
    import.meta.env.VITE_VAST_TEST_URL = 'https://example.com/dev-test-vast.xml'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const adConfig = await import('./adConfig')

    expect(adConfig.getIsDevMode()).toBe(true)
    expect(adConfig.getVastTag()).toBe('https://example.com/dev-test-vast.xml')
    expect(adConfig.getVastTagSafe()).toBe('https://example.com/dev-test-vast.xml')
    expect(adConfig.getAdsModeLabel('https://example.com/dev-test-vast.xml')).toBe('DEV MODE (Test Ads)')
  })

  it('uses the configured ExoClick VAST in production', async () => {
    import.meta.env.VITE_DEV_MODE = 'false'
    delete import.meta.env.VITE_EXOCLICK_TEST_MODE
    import.meta.env.VITE_EXOCLICK_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5886606'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const adConfig = await import('./adConfig')

    expect(adConfig.getIsDevMode()).toBe(false)
    expect(adConfig.getVastTag()).toBe('https://s.magsrv.com/v1/vast.php?idzone=5886606')
    expect(adConfig.getAdsModeLabel('https://s.magsrv.com/v1/vast.php?idzone=5886606')).toBe('')
  })

  it('uses ExoClick official test inventory when ExoClick test mode is enabled', async () => {
    import.meta.env.VITE_DEV_MODE = 'false'
    import.meta.env.VITE_EXOCLICK_TEST_MODE = 'true'
    import.meta.env.VITE_EXOCLICK_TEST_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=2916384'
    import.meta.env.VITE_EXOCLICK_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5886606'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const adConfig = await import('./adConfig')

    expect(adConfig.getIsDevMode()).toBe(false)
    expect(adConfig.getIsExoClickTestMode()).toBe(true)
    expect(adConfig.getVastTag()).toBe('https://s.magsrv.com/v1/vast.php?idzone=2916384')
    expect(adConfig.getAdsModeLabel('https://s.magsrv.com/v1/vast.php?idzone=2916384')).toBe('EXOCLICK TEST MODE')
    expect(adConfig.isTestVastTag('https://s.magsrv.com/v1/vast.php?idzone=2916384')).toBe(true)
  })

  it('derives the ExoClick VAST from the zone id when needed', async () => {
    import.meta.env.VITE_DEV_MODE = 'false'
    delete import.meta.env.VITE_EXOCLICK_VAST_URL
    import.meta.env.VITE_EXOCLICK_ZONE_ID = '5886606'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const adConfig = await import('./adConfig')

    expect(adConfig.getVastTag()).toBe('https://s.magsrv.com/v1/vast.php?idzone=5886606')
  })

  it('falls back safely to the test VAST when production env is missing', async () => {
    import.meta.env.VITE_DEV_MODE = 'false'
    delete import.meta.env.VITE_EXOCLICK_VAST_URL
    delete import.meta.env.VITE_EXOCLICK_ZONE_ID
    import.meta.env.VITE_VAST_TEST_URL = 'https://example.com/test-fallback.xml'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const adConfig = await import('./adConfig')

    expect(adConfig.getVastTagSafe()).toBe('https://example.com/test-fallback.xml')
  })

  it('forces test ads at runtime when FORCE_TEST_ADS is enabled', async () => {
    import.meta.env.VITE_DEV_MODE = 'false'
    import.meta.env.VITE_EXOCLICK_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5886606'
    import.meta.env.VITE_VAST_TEST_URL = 'https://example.com/dev-test-vast.xml'
    window.FORCE_TEST_ADS = true
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const adConfig = await import('./adConfig')

    expect(adConfig.getVastTag()).toBe('https://example.com/dev-test-vast.xml')
  })
})
