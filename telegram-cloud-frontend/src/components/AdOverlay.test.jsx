import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AdOverlay from './AdOverlay'

describe('AdOverlay', () => {
  it('starts playback when the idle shell surface is clicked', async () => {
    const onStartPlayback = vi.fn()
    const user = userEvent.setup()

    render(
      <AdOverlay
        playbackState="idle"
        adState="idle"
        title="Launch trailer"
        onStartPlayback={onStartPlayback}
      />
    )

    await user.click(screen.getByRole('button', { name: /start launch trailer/i }))

    expect(onStartPlayback).toHaveBeenCalledTimes(1)
  })

  it('keeps the idle CTA disabled while player warmup is still running', async () => {
    const onStartPlayback = vi.fn()
    const user = userEvent.setup()

    render(
      <AdOverlay
        playbackState="idle"
        adState="idle"
        adBootstrapState="warming"
        isAdBootstrapReady={false}
        title="Launch trailer"
        onStartPlayback={onStartPlayback}
      />
    )

    const button = screen.getByRole('button', { name: /preparing player/i })
    expect(button).toBeDisabled()

    await user.click(button)

    expect(onStartPlayback).not.toHaveBeenCalled()
  })

  it('supports keyboard activation on the idle shell', async () => {
    const onStartPlayback = vi.fn()
    const user = userEvent.setup()

    render(
      <AdOverlay
        playbackState="idle"
        adState="idle"
        title="Launch trailer"
        onStartPlayback={onStartPlayback}
      />
    )

    const shell = screen.getByRole('button', { name: /start launch trailer/i })
    shell.focus()
    await user.keyboard('{Enter}')

    expect(onStartPlayback).toHaveBeenCalledTimes(1)
  })

  it('shows the dev badge only when test ads are active', () => {
    const { rerender } = render(
      <AdOverlay
        playbackState="idle"
        adState="idle"
        title="Launch trailer"
        isTestAdsMode
        adsModeLabel="DEV MODE (Test Ads)"
        onStartPlayback={() => {}}
      />
    )

    expect(screen.getByText(/dev mode \(test ads\)/i)).toBeInTheDocument()

    rerender(
      <AdOverlay
        playbackState="idle"
        adState="idle"
        title="Launch trailer"
        isTestAdsMode={false}
        adsModeLabel=""
        onStartPlayback={() => {}}
      />
    )

    expect(screen.queryByText(/dev mode \(test ads\)/i)).not.toBeInTheDocument()
  })

  it('uses a generic loading veil during ad bootstrap', () => {
    render(
      <AdOverlay
        playbackState="loading_ad"
        adState="loading_ad"
        title="Launch trailer"
        onStartPlayback={() => {}}
      />
    )

    expect(screen.getByText(/loading ad/i)).toBeInTheDocument()
    expect(screen.queryByText(/exoclick/i)).not.toBeInTheDocument()
  })

  it('updates the resume copy to show preroll still runs before resume', () => {
    render(
      <AdOverlay
        playbackState="idle"
        adState="idle"
        adBootstrapState="ready"
        isAdBootstrapReady
        title="Launch trailer"
        isResumedPlayback
        onStartPlayback={() => {}}
      />
    )

    expect(
      screen.getByText(/start a fresh pre-roll, then telecloud resumes from your saved position/i)
    ).toBeInTheDocument()
  })

  it('shows the ad hud with countdown when an ad is playing', () => {
    render(
      <AdOverlay
        playbackState="playing_ad"
        adState="playing_ad"
        title="Launch trailer"
        adSkipCountdown={7}
        canSkipAd={false}
        adProgressPercent={42}
        onStartPlayback={() => {}}
        onSkipAd={() => {}}
      />
    )

    expect(screen.getByText(/ad/i)).toBeInTheDocument()
    expect(screen.getAllByText(/skip in 7s/i).length).toBeGreaterThan(0)
  })

  it('hides the preroll overlays once content is playing', () => {
    render(
      <AdOverlay
        playbackState="content_playing"
        adState="ad_completed"
        title="Launch trailer"
        isTestAdsMode
        adsModeLabel="DEV MODE (Test Ads)"
        onStartPlayback={() => {}}
      />
    )

    expect(screen.queryByText(/loading ad/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^ad$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/dev mode \(test ads\)/i)).not.toBeInTheDocument()
  })
})
