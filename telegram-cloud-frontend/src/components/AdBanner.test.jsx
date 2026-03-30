import { render, screen } from '@testing-library/react'
import AdSlot from './AdBanner'

describe('AdBanner', () => {
  it('uses the vendor-compatible iframe sandbox policy', () => {
    render(<AdSlot formatId="2018497" />)

    const iframe = screen.getByTitle(/advertisement/i)
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation'
    )
  })
})
