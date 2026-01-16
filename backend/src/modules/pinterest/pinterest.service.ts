import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { StartDownloadDto, DownloadProgressDto } from "./dto/download.dto";
import { PinterestJobDto } from "./dto/job.dto";
import { PinterestPinDto } from "./dto/pin.dto";
import * as fs from "fs";
import * as path from "path";
import axios, { AxiosInstance } from "axios";
import * as archiver from "archiver";

interface PinterestPinData {
  pinId: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  videoUrl?: string;
  mediaType: "image" | "video";
  width?: number;
  height?: number;
}

interface ParsedUrl {
  type: "board" | "user" | "pin" | "section";
  username?: string;
  boardName?: string;
  pinId?: string;
  sectionName?: string;
}

// Pinterest API endpoints (reverse-engineered)
const PINTEREST_API = {
  BOARD_FEED: "https://www.pinterest.com/resource/BoardFeedResource/get/",
  BOARD_SECTION_PINS:
    "https://www.pinterest.com/resource/BoardSectionPinsResource/get/",
  USER_PINS: "https://www.pinterest.com/resource/UserPinsResource/get/",
  PIN_RESOURCE: "https://www.pinterest.com/resource/PinResource/get/",
};

@Injectable()
export class PinterestService {
  private readonly logger = new Logger(PinterestService.name);
  private readonly uploadPath: string;
  private activeJobs: Map<string, boolean> = new Map();
  private apiClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.uploadPath = this.configService.get("UPLOAD_PATH", "./uploads");

    // Create axios instance with Pinterest headers
    this.apiClient = axios.create({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/javascript, */*, q=0.01",
        "Accept-Language": "en-US,en;q=0.9",
        "X-Requested-With": "XMLHttpRequest",
        "X-Pinterest-AppState": "active",
        "X-Pinterest-Source-Url": "/",
        "X-Pinterest-PWS-Handler": "www/[username]/[slug].js",
        Referer: "https://www.pinterest.com/",
        Origin: "https://www.pinterest.com",
      },
      timeout: 30000,
    });
  }

  /**
   * Parse Pinterest URL to extract type and identifiers
   * Handles various Pinterest URL formats:
   * - https://pinterest.com/username/
   * - https://pinterest.com/username/board-name/
   * - https://www.pinterest.com/pin/123456789/
   * - https://pin.it/shortcode
   */
  parseUrl(url: string): ParsedUrl {
    try {
      const urlObj = new URL(url);

      // Remove trailing slashes and query parameters from pathname
      const pathname = urlObj.pathname.replace(/\/+$/, "").replace(/^\/+/, "");
      const parts = pathname.split("/").filter(Boolean);

      this.logger.log(
        `Parsing URL: ${url}, pathname: ${pathname}, parts: ${JSON.stringify(parts)}`,
      );

      // Handle pin.it shortlinks
      if (urlObj.hostname === "pin.it") {
        // pin.it links need to be resolved, but treat as pin type for now
        return { type: "pin", pinId: parts[0] };
      }

      // Single pin: /pin/{pinId} or /pin/{pinId}/anything
      if (parts[0] === "pin" && parts[1]) {
        const pinId = parts[1].replace(/\D/g, ""); // Extract numeric ID
        return { type: "pin", pinId };
      }

      // Skip common non-content paths
      const skipPaths = [
        "search",
        "today",
        "ideas",
        "explore",
        "settings",
        "business",
      ];
      if (skipPaths.includes(parts[0]?.toLowerCase())) {
        throw new BadRequestException(
          "This Pinterest URL type is not supported. Please use a board, user, or pin URL.",
        );
      }

      // User profile: /{username} or /{username}/_saved or /{username}/_created
      if (
        parts.length === 1 ||
        (parts.length === 2 && parts[1].startsWith("_"))
      ) {
        return { type: "user", username: parts[0] };
      }

      // Board: /{username}/{boardName}
      // Clean up board name (remove trailing segments like 'more-ideas')
      if (parts.length >= 2) {
        const username = parts[0];
        let boardName = parts[1];

        // Handle URL-encoded board names
        boardName = decodeURIComponent(boardName);

        // Check if this is a section
        if (
          parts.length >= 3 &&
          !parts[2].startsWith("_") &&
          parts[2] !== "more-ideas"
        ) {
          return {
            type: "section",
            username,
            boardName,
            sectionName: decodeURIComponent(parts[2]),
          };
        }

        return { type: "board", username, boardName };
      }

      throw new BadRequestException("Invalid Pinterest URL format");
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error(`Failed to parse URL: ${url}`);
      throw new BadRequestException(
        "Invalid Pinterest URL. Please provide a valid Pinterest board, user, or pin URL.",
      );
    }
  }

  /**
   * Fetch pins from Pinterest using proper API endpoints
   * Based on reverse-engineered Pinterest API from limkokhole/pinterest-downloader
   */
  async fetchPins(
    url: string,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): Promise<PinterestPinData[]> {
    const parsed = this.parseUrl(url);
    this.logger.log(`Fetching pins from ${url} (type: ${parsed.type})`);

    try {
      let pins: PinterestPinData[] = [];

      // First, fetch the page to get initialReduxState data
      const pageData = await this.fetchPageData(url);

      if (pageData.pins && Object.keys(pageData.pins).length > 0) {
        this.logger.log(
          `Found ${Object.keys(pageData.pins).length} pins in page data`,
        );
        pins = this.extractPinsFromReduxState(pageData, options);
      }

      // If no pins found from page, try API endpoints
      if (pins.length === 0) {
        this.logger.log("No pins in page data, trying API endpoints...");

        if (parsed.type === "board") {
          pins = await this.fetchBoardPins(
            parsed.username!,
            parsed.boardName!,
            options,
          );
        } else if (parsed.type === "user") {
          pins = await this.fetchUserPins(parsed.username!, options);
        } else if (parsed.type === "pin" && parsed.pinId) {
          const pin = await this.fetchSinglePinData(parsed.pinId, options);
          if (pin) pins = [pin];
        } else if (parsed.type === "section") {
          pins = await this.fetchSectionPins(
            parsed.username!,
            parsed.boardName!,
            parsed.sectionName!,
            options,
          );
        }
      }

      this.logger.log(`Total extracted ${pins.length} pins from ${url}`);
      return pins;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Failed to fetch pins from ${url}: ${errorMessage}`);
      throw new BadRequestException(`Failed to fetch pins: ${errorMessage}`);
    }
  }

  /**
   * Fetch page and extract initialReduxState data
   */
  private async fetchPageData(url: string): Promise<any> {
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 30000,
    });

    const html = response.data as string;

    // Try multiple extraction methods
    // Method 1: __PWS_DATA__ (newer Pinterest)
    const pwsMatch = html.match(
      /<script[^>]*id="__PWS_DATA__"[^>]*>([\s\S]*?)<\/script>/,
    );
    if (pwsMatch) {
      try {
        const data = JSON.parse(pwsMatch[1]);
        // Navigate to props.initialReduxState
        if (data?.props?.initialReduxState) {
          this.logger.log("Found initialReduxState in PWS_DATA");
          return data.props.initialReduxState;
        }
        return data;
      } catch {
        this.logger.warn("Failed to parse PWS_DATA");
      }
    }

    // Method 2: Look for initialReduxState directly in scripts
    const reduxMatch = html.match(
      /initialReduxState['"]\s*:\s*({[\s\S]*?})\s*,\s*['"]/,
    );
    if (reduxMatch) {
      try {
        return JSON.parse(reduxMatch[1]);
      } catch {
        this.logger.warn("Failed to parse initialReduxState");
      }
    }

    // Method 3: Look for pins object in any script
    const pinsMatch = html.match(
      /"pins"\s*:\s*(\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/,
    );
    if (pinsMatch) {
      try {
        return { pins: JSON.parse(pinsMatch[1]) };
      } catch {
        this.logger.warn("Failed to parse pins object");
      }
    }

    return { pins: {} };
  }

  /**
   * Extract pins from Redux state data
   */
  private extractPinsFromReduxState(
    data: any,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): PinterestPinData[] {
    const pins: PinterestPinData[] = [];
    const pinsData = data.pins || {};

    for (const pinId of Object.keys(pinsData)) {
      const pinObj = pinsData[pinId];
      const pin = this.extractPinFromObject(pinObj, options);
      if (pin) {
        pins.push(pin);
      }
    }

    return pins;
  }

  /**
   * Fetch pins from a board using Pinterest API
   */
  private async fetchBoardPins(
    username: string,
    boardName: string,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): Promise<PinterestPinData[]> {
    const pins: PinterestPinData[] = [];
    let bookmark = "";
    let pageCount = 0;
    const maxPages = 20;

    while (pageCount < maxPages) {
      try {
        const requestOptions: any = {
          board_url: `/${username}/${boardName}/`,
          page_size: 25,
          field_set_key: "react_grid_pin",
        };
        if (bookmark) {
          requestOptions.bookmarks = [bookmark];
        }

        const params = new URLSearchParams({
          source_url: `/${username}/${boardName}/`,
          data: JSON.stringify({ options: requestOptions, context: {} }),
        });

        const response = await this.apiClient.get(
          `${PINTEREST_API.BOARD_FEED}?${params.toString()}`,
        );
        const data = response.data;

        if (!data?.resource_response?.data) {
          this.logger.warn("No data in board feed response");
          break;
        }

        const boardPins = data.resource_response.data;
        if (!Array.isArray(boardPins) || boardPins.length === 0) break;

        for (const pinObj of boardPins) {
          const pin = this.extractPinFromObject(pinObj, options);
          if (pin) {
            pins.push(pin);
          }
        }

        this.logger.log(
          `Fetched page ${pageCount + 1}: ${boardPins.length} pins (total: ${pins.length})`,
        );

        // Get next page bookmark
        bookmark = data.resource_response.bookmark;
        if (!bookmark || bookmark === "-end-") break;

        pageCount++;

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown";
        this.logger.error(`Board API error on page ${pageCount}: ${msg}`);
        break;
      }
    }

    return pins;
  }

  /**
   * Fetch pins from a user profile
   */
  private async fetchUserPins(
    username: string,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): Promise<PinterestPinData[]> {
    const pins: PinterestPinData[] = [];
    let bookmark = "";
    let pageCount = 0;
    const maxPages = 20;

    while (pageCount < maxPages) {
      try {
        const requestOptions: any = {
          username,
          page_size: 25,
          field_set_key: "grid_item",
        };
        if (bookmark) {
          requestOptions.bookmarks = [bookmark];
        }

        const params = new URLSearchParams({
          source_url: `/${username}/`,
          data: JSON.stringify({ options: requestOptions, context: {} }),
        });

        const response = await this.apiClient.get(
          `${PINTEREST_API.USER_PINS}?${params.toString()}`,
        );
        const data = response.data;

        if (!data?.resource_response?.data) break;

        const userPins = data.resource_response.data;
        if (!Array.isArray(userPins) || userPins.length === 0) break;

        for (const pinObj of userPins) {
          const pin = this.extractPinFromObject(pinObj, options);
          if (pin) {
            pins.push(pin);
          }
        }

        bookmark = data.resource_response.bookmark;
        if (!bookmark || bookmark === "-end-") break;

        pageCount++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(
          `User pins API error: ${error instanceof Error ? error.message : "Unknown"}`,
        );
        break;
      }
    }

    return pins;
  }

  /**
   * Fetch pins from a board section
   */
  private async fetchSectionPins(
    username: string,
    boardName: string,
    sectionName: string,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): Promise<PinterestPinData[]> {
    const pins: PinterestPinData[] = [];
    let bookmark = "";
    let pageCount = 0;
    const maxPages = 20;

    while (pageCount < maxPages) {
      try {
        const requestOptions: any = {
          section_url: `/${username}/${boardName}/${sectionName}/`,
          page_size: 25,
        };
        if (bookmark) {
          requestOptions.bookmarks = [bookmark];
        }

        const params = new URLSearchParams({
          source_url: `/${username}/${boardName}/${sectionName}/`,
          data: JSON.stringify({ options: requestOptions, context: {} }),
        });

        const response = await this.apiClient.get(
          `${PINTEREST_API.BOARD_SECTION_PINS}?${params.toString()}`,
        );
        const data = response.data;

        if (!data?.resource_response?.data) break;

        const sectionPins = data.resource_response.data;
        if (!Array.isArray(sectionPins) || sectionPins.length === 0) break;

        for (const pinObj of sectionPins) {
          const pin = this.extractPinFromObject(pinObj, options);
          if (pin) {
            pins.push(pin);
          }
        }

        bookmark = data.resource_response.bookmark;
        if (!bookmark || bookmark === "-end-") break;

        pageCount++;
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.error(
          `Section pins API error: ${error instanceof Error ? error.message : "Unknown"}`,
        );
        break;
      }
    }

    return pins;
  }

  /**
   * Fetch a single pin by ID
   */
  private async fetchSinglePinData(
    pinId: string,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): Promise<PinterestPinData | null> {
    this.logger.log(`Fetching single pin: ${pinId}`);

    // Try direct page scraping first (more reliable for videos)
    try {
      const pinUrl = `https://www.pinterest.com/pin/${pinId}/`;
      const response = await axios.get(pinUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Accept-Encoding": "gzip, deflate, br",
        },
        timeout: 30000,
        decompress: true,
      });

      const html = response.data as string;
      this.logger.log(`Got HTML response, length: ${html.length}`);

      // Extract PWS_DATA JSON
      const pwsMatch = html.match(
        /<script[^>]*id="__PWS_DATA__"[^>]*>([^<]+)<\/script>/,
      );
      if (pwsMatch) {
        try {
          const data = JSON.parse(pwsMatch[1]);
          const redux = data?.props?.initialReduxState;
          if (redux?.pins) {
            const pins = Object.values(redux.pins) as any[];
            this.logger.log(`Found ${pins.length} pins in redux state`);
            for (const pinObj of pins) {
              const pin = this.extractPinFromObject(pinObj, options);
              if (pin) {
                // If we want videos but didn't find one in structured data, try HTML extraction
                if (options.downloadVideos && !pin.videoUrl) {
                  const videoUrl = this.extractVideoUrlFromHtml(html);
                  if (videoUrl) {
                    pin.videoUrl = videoUrl;
                    pin.mediaType = "video";
                    this.logger.log(
                      `Found video URL via HTML extraction: ${videoUrl}`,
                    );
                  }
                }
                return pin;
              }
            }
          }
        } catch (e) {
          this.logger.warn(`Failed to parse PWS_DATA: ${e}`);
        }
      }

      // Direct HTML extraction fallback for videos
      if (options.downloadVideos) {
        const videoUrl = this.extractVideoUrlFromHtml(html);
        if (videoUrl) {
          this.logger.log(
            `Found video URL via direct HTML extraction: ${videoUrl}`,
          );
          return {
            pinId,
            mediaType: "video",
            videoUrl,
          };
        }
      }

      // Try to extract image URL from HTML
      if (options.downloadImages) {
        const imageMatch = html.match(
          /https:\/\/i\.pinimg\.com\/originals\/[^"]+\.(jpg|png|gif|webp)/,
        );
        if (imageMatch) {
          return {
            pinId,
            mediaType: "image",
            imageUrl: imageMatch[0],
          };
        }
      }
    } catch (error) {
      this.logger.warn(
        `Page scrape failed for pin ${pinId}: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }

    // Fallback to API endpoint
    try {
      const params = new URLSearchParams({
        source_url: `/pin/${pinId}/`,
        data: JSON.stringify({
          options: { id: pinId, field_set_key: "detailed" },
          context: {},
        }),
      });

      const response = await this.apiClient.get(
        `${PINTEREST_API.PIN_RESOURCE}?${params.toString()}`,
      );
      const data = response.data;

      if (data?.resource_response?.data) {
        return this.extractPinFromObject(data.resource_response.data, options);
      }
    } catch (error) {
      this.logger.warn(
        `Pin API failed for ${pinId}: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }

    return null;
  }

  /**
   * Extract pin data from a Pinterest pin object
   */
  private extractPinFromObject(
    obj: any,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): PinterestPinData | null {
    if (!obj || !obj.id) return null;

    const pin: PinterestPinData = {
      pinId: obj.id?.toString(),
      title:
        obj.grid_title ||
        obj.title ||
        obj.closeup_unified_description?.substring(0, 100),
      description:
        obj.description ||
        obj.closeup_unified_description ||
        obj.closeup_description,
      mediaType: "image",
    };

    // Get image URL - try multiple paths
    if (options.downloadImages && obj.images) {
      pin.imageUrl = this.getBestImageUrl(obj.images);
      if (obj.images.orig) {
        pin.width = obj.images.orig.width;
        pin.height = obj.images.orig.height;
      }
    }

    // Get video URL - try multiple paths
    if (options.downloadVideos) {
      const videoList = obj.videos?.video_list || obj.video_list;
      if (videoList) {
        pin.videoUrl = this.getBestVideoUrl(videoList);
        if (pin.videoUrl) {
          pin.mediaType = "video";
        }
      }

      // Check for story pin videos
      if (!pin.videoUrl && obj.story_pin_data?.pages) {
        for (const page of obj.story_pin_data.pages) {
          if (page.blocks) {
            for (const block of page.blocks) {
              if (block.video?.video_list) {
                pin.videoUrl = this.getBestVideoUrl(block.video.video_list);
                if (pin.videoUrl) {
                  pin.mediaType = "video";
                  break;
                }
              }
            }
          }
          if (pin.videoUrl) break;
        }
      }
    }

    // Must have at least an image or video URL
    if (!pin.imageUrl && !pin.videoUrl) return null;

    return pin;
  }

  /**
   * Extract pins from Pinterest's JSON data structure
   */
  private extractPinsFromJson(
    data: any,
    options: { downloadImages: boolean; downloadVideos: boolean },
  ): PinterestPinData[] {
    const pins: PinterestPinData[] = [];

    const traverse = (obj: any) => {
      if (!obj || typeof obj !== "object") return;

      // Check if this is a pin object
      if (obj.type === "pin" || obj.ptype === "pin") {
        const pin: PinterestPinData = {
          pinId: obj.id?.toString(),
          title: obj.title || obj.grid_title,
          description: obj.description || obj.closeup_description,
          mediaType: "image",
        };

        // Get image URL
        if (obj.images && options.downloadImages) {
          pin.imageUrl = this.getBestImageUrl(obj.images);
          if (obj.images.orig) {
            pin.width = obj.images.orig.width;
            pin.height = obj.images.orig.height;
          }
        }

        // Get video URL
        if (obj.videos?.video_list && options.downloadVideos) {
          pin.videoUrl = this.getBestVideoUrl(obj.videos.video_list);
          if (pin.videoUrl) {
            pin.mediaType = "video";
          }
        }

        if (pin.pinId && (pin.imageUrl || pin.videoUrl)) {
          pins.push(pin);
        }
      }

      // Recursively search
      if (Array.isArray(obj)) {
        obj.forEach(traverse);
      } else {
        Object.values(obj).forEach(traverse);
      }
    };

    traverse(data);
    return pins;
  }

  /**
   * Get the best quality image URL from Pinterest's image variants
   */
  private getBestImageUrl(images: any): string | undefined {
    // Pinterest image sizes in order of preference
    const sizes = ["orig", "1200x", "736x", "564x", "474x", "236x", "170x"];

    for (const size of sizes) {
      if (images[size]?.url) {
        return images[size].url;
      }
    }

    return undefined;
  }

  /**
   * Get the best quality video URL from Pinterest's video variants
   */
  private getBestVideoUrl(videoList: any): string | undefined {
    // Video qualities in order of preference (prefer MP4 over HLS for direct download)
    const qualities = [
      "V_720P",
      "V_480P",
      "V_360P",
      "V_EXP7",
      "V_EXP6",
      "V_EXP5",
      "V_EXP4",
      "V_EXP3",
    ];

    for (const quality of qualities) {
      if (videoList[quality]?.url) {
        const url = videoList[quality].url;
        // Skip HLS streams, prefer direct MP4
        if (!url.includes(".m3u8")) {
          return url;
        }
      }
    }

    // Try to find any MP4 URL
    for (const key of Object.keys(videoList)) {
      const video = videoList[key];
      if (video?.url && video.url.includes(".mp4")) {
        return video.url;
      }
    }

    // Last resort: any video URL (including HLS)
    const firstVideo = Object.values(videoList).find((v: any) => v?.url);
    return (firstVideo as any)?.url;
  }

  /**
   * Extract video URL directly from HTML content (fallback method)
   */
  private extractVideoUrlFromHtml(html: string): string | undefined {
    // Look for highest quality MP4 (_t4 is usually best, then _t3, _t2, _t1)
    const patterns = [
      /https:\/\/v1\.pinimg\.com\/videos\/[^"]*_t4\.mp4/,
      /https:\/\/v1\.pinimg\.com\/videos\/[^"]*_t3\.mp4/,
      /https:\/\/v1\.pinimg\.com\/videos\/[^"]*_t2\.mp4/,
      /https:\/\/v1\.pinimg\.com\/videos\/[^"]*_t1\.mp4/,
      /https:\/\/v1\.pinimg\.com\/videos\/[^"]*\.mp4/,
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return undefined;
  }

  /**
   * Download a single pin's media file
   */
  async downloadPin(
    pin: PinterestPinData,
    outputDir: string,
  ): Promise<{ localPath: string; fileSize: number } | null> {
    const mediaUrl = pin.videoUrl || pin.imageUrl;
    if (!mediaUrl) return null;

    try {
      // Determine file extension
      const ext =
        pin.mediaType === "video" ? ".mp4" : this.getExtensionFromUrl(mediaUrl);
      const filename = `${pin.pinId}${ext}`;
      const localPath = path.join(outputDir, filename);

      // Skip if file already exists
      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        return { localPath, fileSize: stats.size };
      }

      // Download with retry
      const response = await this.downloadWithRetry(mediaUrl, 3);

      // Ensure directory exists
      fs.mkdirSync(outputDir, { recursive: true });

      // Write file
      fs.writeFileSync(localPath, response.data);

      const stats = fs.statSync(localPath);
      return { localPath, fileSize: stats.size };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.warn(`Failed to download pin ${pin.pinId}: ${errorMessage}`);
      return null;
    }
  }

  /**
   * Download with exponential backoff retry
   */
  private async downloadWithRetry(
    url: string,
    maxRetries: number,
  ): Promise<any> {
    let lastError: Error = new Error("Download failed");

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 60000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        return response;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error("Download failed");
        if (attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get file extension from URL
   */
  private getExtensionFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const ext = path.extname(pathname);
      return ext || ".jpg";
    } catch {
      return ".jpg";
    }
  }

  /**
   * Start a new download job
   */
  async startDownload(
    userId: string,
    dto: StartDownloadDto,
    onProgress?: (progress: DownloadProgressDto) => void,
  ): Promise<PinterestJobDto> {
    const parsed = this.parseUrl(dto.url);

    // Create download job in database
    const job = await this.prisma.pinterestDownload.create({
      data: {
        url: dto.url,
        type: parsed.type,
        username: parsed.username,
        boardName: parsed.boardName,
        status: "pending",
        userId,
      },
    });

    // Start download in background
    this.processDownload(job.id, dto, onProgress).catch((error) => {
      this.logger.error(`Download job ${job.id} failed: ${error.message}`);
    });

    return this.mapJobToDto(job);
  }

  /**
   * Process download job asynchronously
   */
  private async processDownload(
    jobId: string,
    dto: StartDownloadDto,
    onProgress?: (progress: DownloadProgressDto) => void,
  ): Promise<void> {
    this.activeJobs.set(jobId, true);

    try {
      // Update status to running
      const job = await this.prisma.pinterestDownload.update({
        where: { id: jobId },
        data: { status: "running", startedAt: new Date() },
      });

      // Create output directory
      const outputDir = path.join(
        this.uploadPath,
        "pinterest",
        job.username || "unknown",
        job.boardName || "pins",
      );
      fs.mkdirSync(outputDir, { recursive: true });

      // Fetch pins
      const pins = await this.fetchPins(dto.url, {
        downloadImages: dto.downloadImages ?? true,
        downloadVideos: dto.downloadVideos ?? true,
      });

      // Update total count
      await this.prisma.pinterestDownload.update({
        where: { id: jobId },
        data: { totalPins: pins.length, outputPath: outputDir },
      });

      // Create pin records
      for (const pin of pins) {
        await this.prisma.pinterestPin.upsert({
          where: {
            pinId_downloadId: { pinId: pin.pinId, downloadId: jobId },
          },
          create: {
            pinId: pin.pinId,
            title: pin.title,
            description: pin.description,
            imageUrl: pin.imageUrl,
            videoUrl: pin.videoUrl,
            mediaType: pin.mediaType,
            width: pin.width,
            height: pin.height,
            downloadId: jobId,
          },
          update: {},
        });
      }

      // Download each pin
      let downloaded = 0;
      let failed = 0;
      let skipped = 0;

      for (const pin of pins) {
        // Check for cancellation
        if (!this.activeJobs.get(jobId)) {
          this.logger.log(`Job ${jobId} was cancelled`);
          break;
        }

        try {
          const result = await this.downloadPin(pin, outputDir);

          if (result) {
            downloaded++;
            await this.prisma.pinterestPin.update({
              where: {
                pinId_downloadId: { pinId: pin.pinId, downloadId: jobId },
              },
              data: {
                localPath: result.localPath,
                fileSize: result.fileSize,
                downloaded: true,
              },
            });
          } else {
            skipped++;
          }
        } catch (error) {
          failed++;
          const errorMessage =
            error instanceof Error ? error.message : "Download failed";
          await this.prisma.pinterestPin.update({
            where: {
              pinId_downloadId: { pinId: pin.pinId, downloadId: jobId },
            },
            data: {
              error: errorMessage,
              downloaded: false,
            },
          });
        }

        // Update progress
        await this.prisma.pinterestDownload.update({
          where: { id: jobId },
          data: {
            downloadedPins: downloaded,
            failedPins: failed,
            skippedPins: skipped,
          },
        });

        // Emit progress
        if (onProgress) {
          onProgress({
            jobId,
            status: "running",
            totalPins: pins.length,
            downloadedPins: downloaded,
            failedPins: failed,
            skippedPins: skipped,
            percentage: Math.round(
              ((downloaded + failed + skipped) / pins.length) * 100,
            ),
            currentPin: pin.pinId,
          });
        }
      }

      // Mark as completed
      await this.prisma.pinterestDownload.update({
        where: { id: jobId },
        data: {
          status: "completed",
          completedAt: new Date(),
        },
      });

      // Final progress update
      if (onProgress) {
        onProgress({
          jobId,
          status: "completed",
          totalPins: pins.length,
          downloadedPins: downloaded,
          failedPins: failed,
          skippedPins: skipped,
          percentage: 100,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.logger.error(`Download job ${jobId} failed: ${errorMessage}`);
      await this.prisma.pinterestDownload.update({
        where: { id: jobId },
        data: {
          status: "failed",
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      if (onProgress) {
        onProgress({
          jobId,
          status: "failed",
          totalPins: 0,
          downloadedPins: 0,
          failedPins: 0,
          skippedPins: 0,
          percentage: 0,
        });
      }
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Get jobs for a user with pagination
   */
  async getJobs(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PinterestJobDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const [jobs, total] = await Promise.all([
      this.prisma.pinterestDownload.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.pinterestDownload.count({ where: { userId } }),
    ]);

    return {
      data: jobs.map(this.mapJobToDto),
      total,
      page,
      limit,
    };
  }

  /**
   * Get a single job by ID
   */
  async getJob(jobId: string, userId: string): Promise<PinterestJobDto> {
    const job = await this.prisma.pinterestDownload.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new NotFoundException("Download job not found");
    }

    return this.mapJobToDto(job);
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.pinterestDownload.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new NotFoundException("Download job not found");
    }

    if (job.status !== "running" && job.status !== "pending") {
      throw new BadRequestException("Job is not running");
    }

    // Signal cancellation
    this.activeJobs.set(jobId, false);

    await this.prisma.pinterestDownload.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: "Cancelled by user",
        completedAt: new Date(),
      },
    });
  }

  /**
   * Delete a job and its associated pins
   */
  async deleteJob(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.pinterestDownload.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new NotFoundException("Download job not found");
    }

    // Delete the job (cascade will delete pins)
    await this.prisma.pinterestDownload.delete({
      where: { id: jobId },
    });

    // Optionally delete files
    if (job.outputPath && fs.existsSync(job.outputPath)) {
      try {
        fs.rmSync(job.outputPath, { recursive: true, force: true });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        this.logger.warn(
          `Failed to delete files at ${job.outputPath}: ${errorMessage}`,
        );
      }
    }
  }

  /**
   * Get pins for a download job
   */
  async getPins(
    downloadId: string,
    userId: string,
  ): Promise<{ data: PinterestPinDto[]; total: number }> {
    // Verify job belongs to user
    const job = await this.prisma.pinterestDownload.findFirst({
      where: { id: downloadId, userId },
    });

    if (!job) {
      throw new NotFoundException("Download job not found");
    }

    const [pins, total] = await Promise.all([
      this.prisma.pinterestPin.findMany({
        where: { downloadId },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.pinterestPin.count({ where: { downloadId } }),
    ]);

    return {
      data: pins.map(this.mapPinToDto),
      total,
    };
  }

  /**
   * Get file path for a pin
   */
  async getPinFile(pinId: string, userId: string): Promise<string> {
    const pin = await this.prisma.pinterestPin.findFirst({
      where: { id: pinId },
      include: { download: true },
    });

    if (!pin || pin.download.userId !== userId) {
      throw new NotFoundException("Pin not found");
    }

    if (!pin.localPath || !fs.existsSync(pin.localPath)) {
      throw new NotFoundException("File not found");
    }

    return pin.localPath;
  }

  /**
   * Create a ZIP archive of all downloaded pins for a job
   */
  async createJobZip(
    jobId: string,
    userId: string,
  ): Promise<{ stream: archiver.Archiver; filename: string }> {
    const job = await this.prisma.pinterestDownload.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new NotFoundException("Download job not found");
    }

    const pins = await this.prisma.pinterestPin.findMany({
      where: { downloadId: jobId, downloaded: true },
    });

    if (pins.length === 0) {
      throw new BadRequestException("No downloaded files available");
    }

    // Create archive
    const archive = archiver.default("zip", {
      zlib: { level: 5 }, // Medium compression for balance of speed and size
    });

    // Add files to archive
    for (const pin of pins) {
      if (pin.localPath && fs.existsSync(pin.localPath)) {
        const filename = path.basename(pin.localPath);
        archive.file(pin.localPath, { name: filename });
      }
    }

    // Generate filename
    const boardName = job.boardName || job.username || "pinterest";
    const sanitizedName = boardName.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const filename = `${sanitizedName}_${job.id.slice(0, 8)}.zip`;

    return { stream: archive, filename };
  }

  /**
   * Get output directory path for a job
   */
  async getJobOutputPath(jobId: string, userId: string): Promise<string> {
    const job = await this.prisma.pinterestDownload.findFirst({
      where: { id: jobId, userId },
    });

    if (!job) {
      throw new NotFoundException("Download job not found");
    }

    if (!job.outputPath || !fs.existsSync(job.outputPath)) {
      throw new NotFoundException("Output folder not found");
    }

    return job.outputPath;
  }

  /**
   * Quick download a single pin - returns binary data for direct browser download
   * This allows the file to go directly to the user's Downloads folder
   */
  async quickDownloadPin(
    url: string,
  ): Promise<{ data: Buffer; filename: string; contentType: string }> {
    const parsed = this.parseUrl(url);

    if (parsed.type !== "pin") {
      throw new BadRequestException(
        "Quick download only works with single pin URLs. For boards/users, use the batch download feature.",
      );
    }

    this.logger.log(`Quick downloading pin: ${parsed.pinId}`);

    // Fetch pin data
    const pin = await this.fetchSinglePinData(parsed.pinId!, {
      downloadImages: true,
      downloadVideos: true,
    });

    if (!pin) {
      throw new BadRequestException(
        "Could not fetch pin data. The pin might be private or deleted.",
      );
    }

    const mediaUrl = pin.videoUrl || pin.imageUrl;
    if (!mediaUrl) {
      throw new BadRequestException(
        "No downloadable media found for this pin.",
      );
    }

    this.logger.log(`Downloading media from: ${mediaUrl}`);

    // Download the media
    const response = await this.downloadWithRetry(mediaUrl, 3);

    // Determine filename and content type
    let ext = ".jpg";
    let contentType = "image/jpeg";

    if (pin.mediaType === "video" || mediaUrl.includes(".mp4")) {
      ext = ".mp4";
      contentType = "video/mp4";
    } else if (mediaUrl.includes(".png")) {
      ext = ".png";
      contentType = "image/png";
    } else if (mediaUrl.includes(".gif")) {
      ext = ".gif";
      contentType = "image/gif";
    } else if (mediaUrl.includes(".webp")) {
      ext = ".webp";
      contentType = "image/webp";
    }

    const filename = `pinterest_${pin.pinId}${ext}`;

    return {
      data: response.data,
      filename,
      contentType,
    };
  }

  /**
   * Get pin info without downloading - for preview
   */
  async getPinInfo(url: string): Promise<{
    pinId: string;
    title?: string;
    description?: string;
    mediaType: "image" | "video";
    previewUrl?: string;
  }> {
    const parsed = this.parseUrl(url);

    if (parsed.type !== "pin") {
      throw new BadRequestException(
        "This URL is not a single pin. It appears to be a " + parsed.type,
      );
    }

    const pin = await this.fetchSinglePinData(parsed.pinId!, {
      downloadImages: true,
      downloadVideos: true,
    });

    if (!pin) {
      throw new BadRequestException(
        "Could not fetch pin data. The pin might be private or deleted.",
      );
    }

    return {
      pinId: pin.pinId,
      title: pin.title,
      description: pin.description,
      mediaType: pin.mediaType,
      previewUrl: pin.imageUrl, // Always return image URL for preview, even for videos
    };
  }

  private mapJobToDto(job: any): PinterestJobDto {
    return {
      id: job.id,
      url: job.url,
      type: job.type,
      username: job.username,
      boardName: job.boardName,
      status: job.status,
      totalPins: job.totalPins,
      downloadedPins: job.downloadedPins,
      failedPins: job.failedPins,
      skippedPins: job.skippedPins,
      outputPath: job.outputPath,
      error: job.error,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      createdAt: job.createdAt,
    };
  }

  private mapPinToDto(pin: any): PinterestPinDto {
    return {
      id: pin.id,
      pinId: pin.pinId,
      title: pin.title,
      description: pin.description,
      imageUrl: pin.imageUrl,
      videoUrl: pin.videoUrl,
      localPath: pin.localPath,
      mediaType: pin.mediaType,
      width: pin.width,
      height: pin.height,
      fileSize: pin.fileSize,
      downloaded: pin.downloaded,
      error: pin.error,
      createdAt: pin.createdAt,
    };
  }
}
