import { AD_INIT_TIMEOUT_MS, TEST_VAST_TAG } from '../config/ads'
import {
  createImaOptions,
  createPlayerSource,
  initializePlayerPreroll,
  shouldAttemptPrerollOnOpen,
} from './useVideoPlayer'

describe('useVideoPlayer preroll bootstrap', () => {
  it('attempts preroll for a fresh open with no saved progress', () => {
    expect(shouldAttemptPrerollOnOpen(0, false)).toBe(true)
  })

  it('still attempts preroll when reopening from saved progress', () => {
    expect(shouldAttemptPrerollOnOpen(34, false)).toBe(true)
  })

  it('forces preroll for an explicit replay from the beginning', () => {
    expect(shouldAttemptPrerollOnOpen(34, true)).toBe(true)
  })

  it('uses the shared 5.5 second timeout and on-play request mode for IMA', () => {
    expect(createImaOptions(TEST_VAST_TAG)).toMatchObject({
      adTagUrl: TEST_VAST_TAG,
      requestMode: 'onPlay',
      vastLoadTimeout: AD_INIT_TIMEOUT_MS,
      contribAdsSettings: {
        prerollTimeout: AD_INIT_TIMEOUT_MS,
        timeout: AD_INIT_TIMEOUT_MS,
      },
    })
  })

  it('initializes IMA before assigning the content source', () => {
    const order = []
    const player = {
      ima: vi.fn(() => order.push('ima')),
      src: vi.fn(() => order.push('src')),
    }
    const source = createPlayerSource('https://example.com/video.mp4', 'video/mp4')

    initializePlayerPreroll(player, TEST_VAST_TAG, source)

    expect(order).toEqual(['ima', 'src'])
    expect(player.ima).toHaveBeenCalledWith(
      expect.objectContaining({
        adTagUrl: TEST_VAST_TAG,
        requestMode: 'onPlay',
      })
    )
    expect(player.src).toHaveBeenCalledWith(source)
  })
})
