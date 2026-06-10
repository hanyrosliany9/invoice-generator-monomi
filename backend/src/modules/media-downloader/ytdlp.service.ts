import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const execFileAsync = promisify(execFile);

export interface MediaInfo {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  uploaderUrl?: string;
  viewCount?: number;
  likeCount?: number;
  uploadDate?: string;
  extractor: string; // youtube, instagram, tiktok, etc.
  webpageUrl: string;
  formats?: FormatInfo[];
  requestedFormats?: FormatInfo[];
  ext: string;
  width?: number;
  height?: number;
  filesize?: number;
  filesizeApprox?: number;
}

export interface FormatInfo {
  formatId: string;
  formatNote?: string;
  ext: string;
  resolution?: string;
  width?: number;
  height?: number;
  fps?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesizeApprox?: number;
  tbr?: number; // total bitrate
  abr?: number; // audio bitrate
  vbr?: number; // video bitrate
}

export interface DownloadOptions {
  format?: string; // yt-dlp format string
  quality?: "best" | "worst" | "1080p" | "720p" | "480p" | "360p" | "audio";
  audioOnly?: boolean;
  outputPath?: string;
  filename?: string;
  cookies?: string; // Path to cookies file for auth
}

export interface DownloadResult {
  data: Buffer;
  filename: string;
  contentType: string;
  info: MediaInfo;
}

@Injectable()
export class YtdlpService {
  private readonly logger = new Logger(YtdlpService.name);
  private readonly ytdlpPath: string;

  constructor() {
    // Try to find yt-dlp in common locations
    const possiblePaths = [
      path.join(os.homedir(), ".local", "bin", "yt-dlp"),
      "/usr/local/bin/yt-dlp",
      "/usr/bin/yt-dlp",
      "yt-dlp", // System PATH
    ];

    for (const p of possiblePaths) {
      try {
        if (fs.existsSync(p)) {
          this.ytdlpPath = p;
          break;
        }
      } catch {
        // Continue checking
      }
    }

    if (!this.ytdlpPath) {
      this.ytdlpPath = possiblePaths[0]; // Default to user's local bin
    }

    this.logger.log(`Using yt-dlp at: ${this.ytdlpPath}`);
  }

  /**
   * Get supported extractors/platforms
   */
  getSupportedPlatforms(): string[] {
    return [
      "youtube",
      "instagram",
      "tiktok",
      "twitter",
      "facebook",
      "vimeo",
      "dailymotion",
      "twitch",
      "reddit",
      "soundcloud",
    ];
  }

  /**
   * Check if a URL is supported
   */
  async isSupported(url: string): Promise<boolean> {
    try {
      await execFileAsync(
        this.ytdlpPath,
        ["--simulate", "--no-warnings", "--no-playlist", url],
        { timeout: 10000 },
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): string {
    const urlLower = url.toLowerCase();

    if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) {
      return "youtube";
    }
    if (urlLower.includes("instagram.com")) {
      return "instagram";
    }
    if (urlLower.includes("tiktok.com")) {
      return "tiktok";
    }
    if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) {
      return "twitter";
    }
    if (urlLower.includes("facebook.com") || urlLower.includes("fb.watch")) {
      return "facebook";
    }
    if (urlLower.includes("vimeo.com")) {
      return "vimeo";
    }
    if (urlLower.includes("pinterest.com") || urlLower.includes("pin.it")) {
      return "pinterest";
    }

    return "unknown";
  }

  /**
   * Get media information without downloading
   */
  async getInfo(url: string): Promise<MediaInfo> {
    this.logger.log(`Getting info for: ${url}`);

    try {
      const { stdout } = await execFileAsync(
        this.ytdlpPath,
        // --no-playlist: a YouTube Mix/Radio URL (…&list=RD…&start_radio=1) is an
        // INFINITE auto-generated playlist; without this flag --dump-json tries to
        // enumerate the endless mix and hangs until the exec timeout → 400 error.
        ["--dump-json", "--no-download", "--no-warnings", "--no-playlist", url],
        { timeout: 30000, maxBuffer: 10 * 1024 * 1024 },
      );

      const info = JSON.parse(stdout);
      return this.normalizeMediaInfo(info);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to get info: ${message}`);
      throw new BadRequestException(`Failed to get media info: ${message}`);
    }
  }

  /**
   * Get available formats for a URL
   */
  async getFormats(url: string): Promise<FormatInfo[]> {
    const info = await this.getInfo(url);
    return info.formats || [];
  }

  /**
   * Quick download - streams directly to buffer for browser download
   */
  async quickDownload(
    url: string,
    options: DownloadOptions = {},
  ): Promise<DownloadResult> {
    this.logger.log(`Quick download: ${url}`);

    // First get info to determine filename and content type
    const info = await this.getInfo(url);

    // Create temp file for download (yt-dlp works better with files than stdout for complex formats)
    const tempDir = path.join(os.tmpdir(), "ytdlp-downloads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const safeTitle = this.sanitizeFilename(info.title || info.id);
    const tempFile = path.join(tempDir, `${safeTitle}_${Date.now()}.%(ext)s`);

    // Build args array (no shell interpretation)
    // --no-playlist keeps a Mix/Radio or playlist URL to the single chosen video.
    const args: string[] = [
      "--no-warnings",
      "--no-progress",
      "--no-playlist",
      "-o",
      tempFile,
    ];

    // Add format argument
    const formatString = this.getFormatString(options);
    if (formatString) {
      args.push("-f", formatString);
    }

    // Add audio-only options
    if (options.audioOnly) {
      args.push("-x", "--audio-format", "mp3");
    } else {
      // Force MP4 container. yt-dlp otherwise defaults to MKV whenever it has
      // to merge separate video+audio streams; --remux-video rewraps a
      // non-mp4 single file into mp4 too (no re-encode, requires ffmpeg).
      args.push("--merge-output-format", "mp4", "--remux-video", "mp4");
    }

    // Add URL (no quotes needed with execFile)
    args.push(url);

    this.logger.debug(`Running: ${this.ytdlpPath} ${args.join(" ")}`);

    try {
      await execFileAsync(this.ytdlpPath, args, {
        timeout: 300000, // 5 minutes
        maxBuffer: 50 * 1024 * 1024,
      });

      // Find the downloaded file
      const downloadedFiles = fs
        .readdirSync(tempDir)
        .filter(
          (f) =>
            f.startsWith(safeTitle) &&
            f.includes(String(Date.now()).slice(0, -3)),
        );

      if (downloadedFiles.length === 0) {
        // Try finding by pattern
        const files = fs.readdirSync(tempDir);
        const recentFile = files
          .map((f) => ({ name: f, stat: fs.statSync(path.join(tempDir, f)) }))
          .filter((f) => Date.now() - f.stat.mtimeMs < 60000) // Within last minute
          .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];

        if (recentFile) {
          downloadedFiles.push(recentFile.name);
        }
      }

      if (downloadedFiles.length === 0) {
        throw new Error("Downloaded file not found");
      }

      const downloadedPath = path.join(tempDir, downloadedFiles[0]);
      const data = fs.readFileSync(downloadedPath);
      const ext = path.extname(downloadedFiles[0]).toLowerCase();

      // Clean up temp file
      try {
        fs.unlinkSync(downloadedPath);
      } catch {
        // Ignore cleanup errors
      }

      const filename = options.filename || `${safeTitle}${ext}`;
      const contentType = this.getContentType(ext);

      return {
        data,
        filename,
        contentType,
        info,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Download failed: ${message}`);
      throw new BadRequestException(`Download failed: ${message}`);
    }
  }

  /**
   * Download to a specific path (for batch downloads)
   */
  async downloadToPath(
    url: string,
    outputDir: string,
    options: DownloadOptions = {},
  ): Promise<string> {
    const outputTemplate = path.join(outputDir, "%(title)s.%(ext)s");

    // Build args as an array — never interpolated into a shell string
    const args: string[] = [
      "--no-warnings",
      "--no-playlist",
      "-o",
      outputTemplate,
    ];

    const formatString = this.getFormatString(options);
    if (formatString) {
      args.push("-f", formatString);
    }

    if (options.audioOnly) {
      args.push("-x", "--audio-format", "mp3");
    } else {
      // Force MP4 container instead of yt-dlp's default MKV on merge.
      args.push("--merge-output-format", "mp4", "--remux-video", "mp4");
    }

    args.push(url);

    await execFileAsync(this.ytdlpPath, args, {
      timeout: 600000, // 10 minutes
      maxBuffer: 50 * 1024 * 1024,
    });

    return outputDir;
  }

  /**
   * Get format string for yt-dlp (without -f prefix)
   * Used with execFile where we pass args as array
   */
  private getFormatString(options: DownloadOptions): string | null {
    if (options.format) {
      return options.format;
    }

    if (options.audioOnly) {
      return "bestaudio";
    }

    // Prefer MP4-native streams (mp4 video + m4a audio) so the merge produces a
    // clean MP4 without re-encoding; fall back to any best stream if a source
    // only offers webm/VP9 (those get remuxed to MP4 via --merge-output-format).
    switch (options.quality) {
      case "1080p":
        return "bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=1080]+bestaudio/best[height<=1080]";
      case "720p":
        return "bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=720]+bestaudio/best[height<=720]";
      case "480p":
        return "bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=480]+bestaudio/best[height<=480]";
      case "360p":
        return "bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<=360]+bestaudio/best[height<=360]";
      case "worst":
        return "worst";
      case "audio":
        return "bestaudio";
      case "best":
      default:
        return "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best";
    }
  }

  /**
   * Normalize yt-dlp output to our MediaInfo interface
   */
  private normalizeMediaInfo(raw: any): MediaInfo {
    return {
      id: raw.id,
      title: raw.title || raw.id,
      description: raw.description,
      thumbnail: raw.thumbnail,
      duration: raw.duration,
      uploader: raw.uploader || raw.channel,
      uploaderUrl: raw.uploader_url || raw.channel_url,
      viewCount: raw.view_count,
      likeCount: raw.like_count,
      uploadDate: raw.upload_date,
      extractor:
        raw.extractor_key?.toLowerCase() || raw.extractor?.toLowerCase(),
      webpageUrl: raw.webpage_url || raw.url,
      formats: raw.formats?.map((f: any) => ({
        formatId: f.format_id,
        formatNote: f.format_note,
        ext: f.ext,
        resolution: f.resolution,
        width: f.width,
        height: f.height,
        fps: f.fps,
        vcodec: f.vcodec,
        acodec: f.acodec,
        filesize: f.filesize,
        filesizeApprox: f.filesize_approx,
        tbr: f.tbr,
        abr: f.abr,
        vbr: f.vbr,
      })),
      ext: raw.ext,
      width: raw.width,
      height: raw.height,
      filesize: raw.filesize,
      filesizeApprox: raw.filesize_approx,
    };
  }

  /**
   * Sanitize filename for filesystem
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, "")
      .replace(/\s+/g, "_")
      .slice(0, 100);
  }

  /**
   * Get content type from extension
   */
  private getContentType(ext: string): string {
    const types: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mkv": "video/x-matroska",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mp3": "audio/mpeg",
      ".m4a": "audio/mp4",
      ".wav": "audio/wav",
      ".ogg": "audio/ogg",
      ".flac": "audio/flac",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    return types[ext] || "application/octet-stream";
  }
}
