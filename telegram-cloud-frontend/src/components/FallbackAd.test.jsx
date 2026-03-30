import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FallbackAd from './FallbackAd'

describe('FallbackAd', () => {
  it('keeps the skip action disabled until the countdown ends', async () => {
    const onContinue = vi.fn()
    const user = userEvent.setup()

    const { rerender } = render(
      <FallbackAd
        open
        secondsRemaining={3}
        onContinue={onContinue}
      />
    )

    const countdownButton = screen.getByRole('button', { name: /continue in 3s/i })
    expect(countdownButton).toBeDisabled()

    rerender(
      <FallbackAd
        open
        secondsRemaining={0}
        onContinue={onContinue}
      />
    )

    const continueButton = screen.getByRole('button', { name: /continue to video/i })
    expect(continueButton).toBeEnabled()

    await user.click(continueButton)
    expect(onContinue).toHaveBeenCalledTimes(1)
  })

  it('renders the fallback iframe with the required sandbox policy', () => {
    render(
      <FallbackAd
        open
        secondsRemaining={5}
        onContinue={() => {}}
      />
    )

    const iframe = screen.getByTitle(/fallback advertisement/i)
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation'
    )
  })

  it('does not render when closed', () => {
    render(<FallbackAd open={false} secondsRemaining={5} onContinue={() => {}} />)

    expect(screen.queryByTitle(/fallback advertisement/i)).not.toBeInTheDocument()
  })
})
