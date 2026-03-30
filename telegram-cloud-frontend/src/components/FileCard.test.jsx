import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import FileCard from './FileCard'

vi.mock('../store/useStore', () => ({
  default: () => ({
    selected: new Set(),
    toggleSelect: vi.fn(),
  }),
}))

vi.mock('./AdBanner', () => ({
  useAdGuard: () => false,
}))

vi.mock('../services/api', () => ({
  filesAPI: {
    downloadUrl: vi.fn(() => '/download/mock'),
    thumbnail: vi.fn(() => '/thumb/mock'),
  },
}))

describe('FileCard', () => {
  const baseProps = {
    onPreview: vi.fn(),
    onOpenVideo: vi.fn(),
    onShare: vi.fn(),
    onDelete: vi.fn(),
    onToggleStar: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens the dedicated player for video files', async () => {
    const user = userEvent.setup()

    render(
      <FileCard
        {...baseProps}
        file={{
          _id: 'video-1',
          fileName: 'episode.mp4',
          mimeType: 'video/mp4',
          fileSize: 2048,
          createdAt: '2026-03-30T10:00:00.000Z',
        }}
      />
    )

    await user.click(screen.getByText(/episode\.mp4/i))

    expect(baseProps.onOpenVideo).toHaveBeenCalledWith(expect.objectContaining({ _id: 'video-1' }))
    expect(baseProps.onPreview).not.toHaveBeenCalled()
  })

  it('keeps non-video preview behavior intact', async () => {
    const user = userEvent.setup()

    render(
      <FileCard
        {...baseProps}
        file={{
          _id: 'image-1',
          fileName: 'cover.png',
          mimeType: 'image/png',
          fileSize: 1024,
          createdAt: '2026-03-30T10:00:00.000Z',
        }}
      />
    )

    await user.click(screen.getByText(/cover\.png/i))

    expect(baseProps.onPreview).toHaveBeenCalledWith(expect.objectContaining({ _id: 'image-1' }))
    expect(baseProps.onOpenVideo).not.toHaveBeenCalled()
  })
})
