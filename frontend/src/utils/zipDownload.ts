import JSZip from 'jszip';
import { saveAs } from 'file-saver';

interface MediaItem {
  url: string;
  originalName?: string;
  id: string;
}

/**
 * Downloads multiple media files as a ZIP archive
 * @param mediaItems Array of media items to download
 * @param zipName Name of the ZIP file (default: 'content-media.zip')
 * @returns Promise that resolves when download completes
 */
export async function downloadMediaAsZip(
  mediaItems: MediaItem[],
  zipName: string = 'content-media.zip'
): Promise<void> {
  const zip = new JSZip();

  // Limit to 20 files to prevent timeout
  const itemsToDownload = mediaItems.slice(0, 20);

  try {
    // Fetch all files in parallel
    const promises = itemsToDownload.map(async (media, index) => {
      try {
        const response = await fetch(media.url);
        if (!response.ok) {
          console.warn(`Failed to fetch ${media.url}: ${response.statusText}`);
          return null;
        }

        // Try to get original filename from Content-Disposition header
        const contentDisposition = response.headers.get('Content-Disposition');
        const serverFilename = extractFilenameFromHeader(contentDisposition);

        const blob = await response.blob();
        // Priority: server-provided filename > media.originalName > fallback
        const fileName = serverFilename || media.originalName || `media-${index + 1}`;
        zip.file(fileName, blob);
        return fileName;
      } catch (error) {
        console.error(`Error fetching ${media.url}:`, error);
        return null;
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r !== null).length;

    if (successCount === 0) {
      throw new Error('Failed to download any files');
    }

    // Generate and download ZIP
    const content = await zip.generateAsync({
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: {
        level: 6 // Balance between speed and compression
      }
    });

    saveAs(content, zipName);
  } catch (error) {
    console.error('Error creating ZIP:', error);
    throw error;
  }
}

/**
 * Extract filename from Content-Disposition header
 * @param contentDisposition Content-Disposition header value
 * @returns Extracted filename or null
 */
function extractFilenameFromHeader(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  // Try to extract filename from Content-Disposition header
  // Supports both filename="..." and filename*=UTF-8''... formats
  const filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i) ||
                        contentDisposition.match(/filename="?([^";\n]+)"?/i);

  if (filenameMatch && filenameMatch[1]) {
    // Decode URI component if it's the UTF-8 encoded version
    try {
      return decodeURIComponent(filenameMatch[1]);
    } catch {
      return filenameMatch[1];
    }
  }

  return null;
}

/**
 * Downloads a single media file
 * @param url URL of the media file
 * @param fileName Fallback name to save the file as (used if server doesn't provide filename)
 */
export async function downloadSingleMedia(
  url: string,
  fileName: string
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }

    // Try to get original filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    const serverFilename = extractFilenameFromHeader(contentDisposition);

    // Use server-provided filename if available, otherwise use the fallback
    const finalFilename = serverFilename || fileName;

    const blob = await response.blob();
    const urlObj = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = urlObj;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(urlObj);

    console.log(`Downloaded file as: ${finalFilename} (server provided: ${!!serverFilename})`);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
}
