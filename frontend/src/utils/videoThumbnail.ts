/**
 * Video Thumbnail Generator
 *
 * Generates thumbnail images from video files using HTML5 Canvas
 */

/**
 * Generate a thumbnail from a video file
 * @param file - Video file
 * @param seekTo - Time in seconds to capture frame (default: 1 second)
 * @returns Promise with thumbnail as data URL
 */
export async function generateVideoThumbnail(
  file: File,
  seekTo: number = 1.0
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Create video element
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    // Create object URL from file
    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    // When video metadata is loaded
    video.addEventListener('loadedmetadata', () => {
      // Set canvas dimensions to video dimensions
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Seek to specified time (or use duration if seekTo is too large)
      const seekTime = Math.min(seekTo, video.duration);
      video.currentTime = seekTime;
    });

    // When seeked to the frame
    video.addEventListener('seeked', () => {
      try {
        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert canvas to data URL (base64 image)
        const thumbnailDataURL = canvas.toDataURL('image/jpeg', 0.8);

        // Clean up
        URL.revokeObjectURL(videoURL);
        video.remove();
        canvas.remove();

        resolve(thumbnailDataURL);
      } catch (error) {
        URL.revokeObjectURL(videoURL);
        video.remove();
        canvas.remove();
        reject(error);
      }
    });

    // Error handling
    video.addEventListener('error', (error) => {
      URL.revokeObjectURL(videoURL);
      video.remove();
      canvas.remove();
      reject(new Error('Failed to load video'));
    });
  });
}

/**
 * Generate a thumbnail blob from a video file
 * @param file - Video file
 * @param seekTo - Time in seconds to capture frame (default: 1 second)
 * @returns Promise with thumbnail as Blob
 */
export async function generateVideoThumbnailBlob(
  file: File,
  seekTo: number = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      reject(new Error('Could not get canvas context'));
      return;
    }

    const videoURL = URL.createObjectURL(file);
    video.src = videoURL;
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const seekTime = Math.min(seekTo, video.duration);
      video.currentTime = seekTime;
    });

    video.addEventListener('seeked', () => {
      try {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(videoURL);
            video.remove();
            canvas.remove();

            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to generate thumbnail blob'));
            }
          },
          'image/jpeg',
          0.8
        );
      } catch (error) {
        URL.revokeObjectURL(videoURL);
        video.remove();
        canvas.remove();
        reject(error);
      }
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(videoURL);
      video.remove();
      canvas.remove();
      reject(new Error('Failed to load video'));
    });
  });
}

/**
 * Check if a file is a video
 * @param file - File to check
 * @returns true if file is a video
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Check if a MIME type is a video
 * @param mimeType - MIME type string
 * @returns true if MIME type is a video
 */
export function isVideoMimeType(mimeType?: string): boolean {
  return mimeType?.startsWith('video/') || false;
}
