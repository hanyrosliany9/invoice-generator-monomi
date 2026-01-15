import { apiClient } from '../config/api'

export interface PinterestJob {
  id: string
  url: string
  type: string
  username?: string
  boardName?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  totalPins: number
  downloadedPins: number
  failedPins: number
  skippedPins: number
  outputPath?: string
  error?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

export interface PinterestPin {
  id: string
  pinId: string
  title?: string
  description?: string
  imageUrl?: string
  videoUrl?: string
  localPath?: string
  mediaType: 'image' | 'video'
  width?: number
  height?: number
  fileSize?: number
  downloaded: boolean
  error?: string
  createdAt: string
}

export interface StartDownloadOptions {
  downloadImages?: boolean
  downloadVideos?: boolean
}

export interface JobsResponse {
  data: PinterestJob[]
  total: number
  page: number
  limit: number
}

export interface PinsResponse {
  data: PinterestPin[]
  total: number
}

export const pinterestService = {
  /**
   * Start a new Pinterest download job
   */
  startDownload: async (url: string, options?: StartDownloadOptions): Promise<PinterestJob> => {
    const response = await apiClient.post('/pinterest/download', {
      url,
      downloadImages: options?.downloadImages ?? true,
      downloadVideos: options?.downloadVideos ?? true,
    })
    // API wraps response in {success, data, timestamp, path}
    return response.data?.data || response.data
  },

  /**
   * Get all download jobs for the current user
   */
  getJobs: async (page: number = 1, limit: number = 20): Promise<JobsResponse> => {
    const response = await apiClient.get('/pinterest/jobs', {
      params: { page, limit },
    })
    // API wraps response in {success, data, timestamp, path}
    return response.data?.data || response.data
  },

  /**
   * Get a specific download job
   */
  getJob: async (jobId: string): Promise<PinterestJob> => {
    const response = await apiClient.get(`/pinterest/jobs/${jobId}`)
    return response.data?.data || response.data
  },

  /**
   * Cancel a running download job
   */
  cancelJob: async (jobId: string): Promise<void> => {
    await apiClient.post(`/pinterest/jobs/${jobId}/cancel`)
  },

  /**
   * Delete a download job and its files
   */
  deleteJob: async (jobId: string): Promise<void> => {
    await apiClient.delete(`/pinterest/jobs/${jobId}`)
  },

  /**
   * Get pins for a download job
   */
  getPins: async (downloadId: string): Promise<PinsResponse> => {
    const response = await apiClient.get('/pinterest/pins', {
      params: { downloadId },
    })
    // API wraps response in {success, data, timestamp, path}
    return response.data?.data || response.data
  },

  /**
   * Get the file URL for a downloaded pin
   */
  getPinFileUrl: (pinId: string): string => {
    return `/api/v1/pinterest/pins/${pinId}/file`
  },

  /**
   * Get the download URL for a job's ZIP file
   */
  getJobDownloadUrl: (jobId: string): string => {
    return `/api/v1/pinterest/jobs/${jobId}/download`
  },

  /**
   * Get the local folder path for a job
   */
  getJobPath: async (jobId: string): Promise<string> => {
    const response = await apiClient.get(`/pinterest/jobs/${jobId}/path`)
    return response.data?.data?.path || response.data?.path
  },

  /**
   * Quick download a single pin - triggers browser download
   */
  quickDownload: async (url: string): Promise<void> => {
    const response = await apiClient.post(
      '/pinterest/quick-download',
      { url },
      { responseType: 'blob' }
    )

    // Get filename from Content-Disposition header or generate one
    const contentDisposition = response.headers['content-disposition']
    let filename = 'pinterest_download'
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="([^"]+)"/)
      if (match) {
        filename = match[1]
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
   * Get info about a pin URL without downloading
   */
  getPinInfo: async (url: string): Promise<{
    pinId: string
    title?: string
    description?: string
    mediaType: 'image' | 'video'
    previewUrl?: string
    isPin: boolean
    urlType: string
  }> => {
    const response = await apiClient.post('/pinterest/pin-info', { url })
    return response.data?.data || response.data
  },
}
