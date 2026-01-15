import { apiClient } from '../config/api'

export type VideoQuality = 'best' | '1080p' | '720p' | '480p' | '360p' | 'worst' | 'audio'

export interface MediaInfo {
  id: string
  title: string
  description?: string
  thumbnail?: string
  duration?: number
  uploader?: string
  viewCount?: number
  platform: string
  url: string
  width?: number
  height?: number
  filesize?: number
  availableQualities?: string[]
}

export interface PlatformDetection {
  platform: string
  isSupported: boolean
  contentType?: string
}

export interface QuickDownloadOptions {
  url: string
  quality?: VideoQuality
  audioOnly?: boolean
}

export const mediaDownloaderService = {
  /**
   * Get list of supported platforms
   */
  getSupportedPlatforms: async (): Promise<string[]> => {
    const response = await apiClient.get('/media-downloader/platforms')
    return response.data?.data?.platforms || response.data?.platforms || []
  },

  /**
   * Detect platform from URL
   */
  detectPlatform: async (url: string): Promise<PlatformDetection> => {
    const response = await apiClient.get('/media-downloader/detect', {
      params: { url },
    })
    return response.data?.data || response.data
  },

  /**
   * Get media information without downloading
   */
  getMediaInfo: async (url: string): Promise<MediaInfo> => {
    const response = await apiClient.post('/media-downloader/info', { url })
    return response.data?.data || response.data
  },

  /**
   * Quick download - triggers browser download
   */
  quickDownload: async (options: QuickDownloadOptions): Promise<void> => {
    const response = await apiClient.post(
      '/media-downloader/download',
      {
        url: options.url,
        quality: options.quality || 'best',
        audioOnly: options.audioOnly || false,
      },
      { responseType: 'blob' }
    )

    // Get filename from Content-Disposition header
    const contentDisposition = response.headers['content-disposition']
    let filename = 'download'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="([^"]+)"/)
      if (match) {
        filename = decodeURIComponent(match[1])
      }
    }

    // Create blob URL and trigger download
    const blob = new Blob([response.data], {
      type: response.headers['content-type'] || 'application/octet-stream',
    })
    const blobUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(blobUrl)
  },

  /**
   * Get available formats for a URL
   */
  getFormats: async (url: string): Promise<{
    video: { quality: string; format: string; ext: string; filesize?: number }[]
    audio: { quality: string; format: string; ext: string; filesize?: number; bitrate?: number }[]
  }> => {
    const response = await apiClient.post('/media-downloader/formats', { url })
    return response.data?.data || response.data
  },
}
