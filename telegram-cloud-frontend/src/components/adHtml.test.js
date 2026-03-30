import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('fallback ad creative page', () => {
  it('contains deterministic banner zone mount targets and query-aware bootstrap logic', () => {
    const adHtml = readFileSync(
      resolve(process.cwd(), 'public', 'ad.html'),
      'utf8'
    )

    expect(adHtml).toContain('<div id="2018497" class="ad-zone"></div>')
    expect(adHtml).toContain('<div id="2018498" class="ad-zone"></div>')
    expect(adHtml).toContain("var requestedFormatId = (params.get('f') || '').trim();")
    expect(adHtml).toContain("var KNOWN_ZONE_IDS = ['2018497', '2018498'];")
    expect(adHtml).toContain('function buildMountTargets()')
    expect(adHtml).toContain('function installConsoleNoiseFilter()')
    expect(adHtml).toContain("script.dataset.telecloudMybid = 'true';")
    expect(adHtml).toContain("document.addEventListener('DOMContentLoaded', bootstrapAdDocument, { once: true });")
  })
})
