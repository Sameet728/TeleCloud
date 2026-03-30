describe('useVideoPlayer VAST resolution', () => {
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

  it('uses the centralized resolved VAST tag when no override is provided', async () => {
    import.meta.env.VITE_DEV_MODE = 'true'
    import.meta.env.VITE_VAST_TEST_URL = 'https://example.com/dev-test-vast.xml'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { resolveVastTagUrl } = await import('./useVideoPlayer')

    expect(resolveVastTagUrl()).toBe('https://example.com/dev-test-vast.xml')
  })

  it('lets an explicit prop override win over env config', async () => {
    import.meta.env.VITE_DEV_MODE = 'false'
    import.meta.env.VITE_EXOCLICK_VAST_URL = 'https://s.magsrv.com/v1/vast.php?idzone=5886606'
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { resolveVastTagUrl } = await import('./useVideoPlayer')

    expect(resolveVastTagUrl('https://example.com/custom-vast.xml')).toBe('https://example.com/custom-vast.xml')
  })

  it('creates a plain video source object for deferred source assignment', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { createPlayerSource } = await import('./useVideoPlayer')

    expect(createPlayerSource('https://example.com/video.mp4', 'video/mp4')).toEqual({
      src: 'https://example.com/video.mp4',
      type: 'video/mp4',
    })
  })

  it('only exposes initializeAdDisplayContainer after preroll initialization runs', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { initializePlayerPreroll, createPlayerSource } = await import('./useVideoPlayer')
    const source = createPlayerSource('https://example.com/video.mp4', 'video/mp4')
    const player = {
      src: vi.fn(),
      ima: vi.fn(() => {
        player.ima.initializeAdDisplayContainer = vi.fn()
      }),
    }

    expect(typeof player.ima.initializeAdDisplayContainer).not.toBe('function')

    initializePlayerPreroll(player, 'https://example.com/vast.xml', source)

    expect(typeof player.ima.initializeAdDisplayContainer).toBe('function')
  })

  it('classifies VAST 303 responses as handled no-fill', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})

    const { isHandledNoFillError } = await import('./useVideoPlayer')

    expect(
      isHandledNoFillError({
        code: 303,
        message: 'No Ads VAST response after one or more Wrappers',
      })
    ).toBe(true)
  })
})
