describe('ads compatibility wrapper', () => {
  const originalDevMode = import.meta.env.VITE_DEV_MODE
  const originalTestUrl = import.meta.env.VITE_VAST_TEST_URL
  const originalExoUrl = import.meta.env.VITE_EXOCLICK_VAST_URL
  const originalZoneId = import.meta.env.VITE_EXOCLICK_ZONE_ID
  const originalLegacyVast = import.meta.env.VITE_VAST_URL

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

    if (originalZoneId === undefined) delete import.meta.env.VITE_EXOCLICK_ZONE_ID
    else import.meta.env.VITE_EXOCLICK_ZONE_ID = originalZoneId

    if (originalLegacyVast === undefined) delete import.meta.env.VITE_VAST_URL
    else import.meta.env.VITE_VAST_URL = originalLegacyVast

    vi.restoreAllMocks()
  })

  it('keeps exporting the current player-facing constants', async () => {
    import.meta.env.VITE_DEV_MODE = 'true'
    import.meta.env.VITE_VAST_TEST_URL = 'https://example.com/test-vast.xml'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const adsConfig = await import('./ads')

    expect(adsConfig.TEST_VAST_TAG).toBe('https://example.com/test-vast.xml')
    expect(adsConfig.VAST_TAG).toBe('https://example.com/test-vast.xml')
    expect(adsConfig.IS_TEST_VAST).toBe(true)
    expect(adsConfig.ADS_MODE_LABEL).toBe('DEV MODE (Test Ads)')
    expect(adsConfig.AD_INIT_TIMEOUT_MS).toBe(5500)
    expect(adsConfig.FALLBACK_BANNER_SRC).toBe('/ad.html?f=2018497')
  })
})
