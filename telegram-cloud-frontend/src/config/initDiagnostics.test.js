import {
  createFilteredConsoleMethod,
  shouldIgnoreDiagnostic,
} from './initDiagnostics'

describe('initDiagnostics helpers', () => {
  it('suppresses known harmless diagnostics', () => {
    const originalMethod = vi.fn()
    const filteredMethod = createFilteredConsoleMethod(originalMethod)

    expect(
      shouldIgnoreDiagnostic(
        'detectIncognito somehow failed to query storage quota'
      )
    ).toBe(true)

    filteredMethod('detectIncognito somehow failed to query storage quota')

    expect(originalMethod).not.toHaveBeenCalled()
  })

  it('passes unknown warnings through', () => {
    const originalMethod = vi.fn()
    const filteredMethod = createFilteredConsoleMethod(originalMethod)

    filteredMethod('Unexpected warning from app code')

    expect(originalMethod).toHaveBeenCalledWith('Unexpected warning from app code')
  })

  it('suppresses skipLinearAdMode vendor noise', () => {
    expect(
      shouldIgnoreDiagnostic(
        'VIDEOJS: WARN: Unexpected skipLinearAdMode invocation (State via ContentPlayback)'
      )
    ).toBe(true)
  })
})
