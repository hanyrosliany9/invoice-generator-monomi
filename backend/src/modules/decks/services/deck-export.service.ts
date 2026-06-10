import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import * as puppeteer from "puppeteer";
import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { PDFDocument } from "pdf-lib";

export interface ExportJob {
  id: string;
  deckId: string;
  userId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  totalSlides: number;
  currentSlide: number;
  filePath?: string;
  filename?: string;
  error?: string;
  createdAt: Date;
}

@Injectable()
export class DeckExportService {
  private readonly logger = new Logger(DeckExportService.name);
  private jobs: Map<string, ExportJob> = new Map();
  private readonly tempDir = path.join(process.cwd(), "temp", "exports");

  constructor(private prisma: PrismaService) {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Start cleanup interval — guard with try/catch so a throw never
    // crashes the process or emits an unhandled rejection.
    setInterval(() => {
      try {
        this.cleanupOldJobs();
      } catch (err) {
        this.logger.error("cleanupOldJobs interval error", err);
      }
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  async startPdfGeneration(
    deckId: string,
    quality: "draft" | "standard" | "high" = "standard",
    userId: string,
  ): Promise<string> {
    // Enforce membership: only deck collaborators/owners may export
    const membership = await this.prisma.deckCollaborator.findFirst({
      where: { deckId, userId, status: "ACCEPTED" },
    });
    if (!membership) {
      throw new ForbiddenException("Access denied to this deck");
    }

    // Verify deck exists. Include the per-slide `elements` (the real source of
    // truth for user-authored content) ordered by zIndex so they paint back to
    // front, mirroring the editor/presentation renderer.
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: {
          orderBy: { order: "asc" },
          include: {
            elements: { orderBy: { zIndex: "asc" } },
          },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException("Deck not found");
    }

    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      deckId,
      userId,
      status: "pending",
      progress: 0,
      totalSlides: deck.slides.length,
      currentSlide: 0,
      createdAt: new Date(),
    };

    this.jobs.set(jobId, job);

    // Start async generation (fire and forget)
    this.generatePdfAsync(job, deck, quality).catch((err) => {
      this.logger.error(`PDF generation failed for job ${jobId}:`, err);
    });

    return jobId;
  }

  private async generatePdfAsync(
    job: ExportJob,
    deck: any,
    quality: "draft" | "standard" | "high",
  ) {
    job.status = "processing";

    const qualitySettings = {
      draft: { scale: 1, quality: 80 },
      standard: { scale: 1.5, quality: 90 },
      high: { scale: 2, quality: 100 },
    };

    const settings = qualitySettings[quality];

    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();

      // Use the deck's real dimensions so 16:9, 1:1 and 9:16 decks all export
      // at their true aspect ratio (no hardcoded 1920x1080 distortion).
      const baseWidth = deck.slideWidth || 1920;
      const baseHeight = deck.slideHeight || 1080;
      const width = baseWidth * settings.scale;
      const height = baseHeight * settings.scale;
      await page.setViewport({
        width: Math.round(width),
        height: Math.round(height),
      });

      const pdfPages: Uint8Array[] = [];

      for (let i = 0; i < deck.slides.length; i++) {
        const slide = deck.slides[i];
        job.currentSlide = i + 1;
        job.progress = Math.round((i / deck.slides.length) * 100);

        this.logger.debug(
          `Rendering slide ${i + 1} of ${deck.slides.length} (job: ${job.id})`,
        );

        // Create HTML for this slide
        const html = this.generateSlideHtml(slide, width, height, baseWidth);
        await page.setContent(html, { waitUntil: "networkidle0" });

        // Wait for fonts and images to load
        try {
          await page.evaluate(() => {
            // @ts-ignore - document is available in browser context
            const doc = document as any;
            if (doc?.fonts) {
              return doc.fonts.ready;
            }
            return Promise.resolve();
          });
        } catch (e) {
          // Fonts may not be available in headless mode
        }
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Generate PDF for this page
        const slideBuffer = await page.pdf({
          width: `${width}px`,
          height: `${height}px`,
          printBackground: true,
          pageRanges: "1",
        });

        pdfPages.push(new Uint8Array(slideBuffer));
      }

      // Combine all pages into single PDF
      const mergedPdf = await PDFDocument.create();

      for (const pdfBuffer of pdfPages) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      const finalPdfBuffer = await mergedPdf.save();

      // Save to file
      const sanitizedTitle = deck.title
        .replace(/[^a-z0-9]/gi, "_")
        .toLowerCase();
      const filename = `${sanitizedTitle}_${Date.now()}.pdf`;
      const filePath = path.join(this.tempDir, filename);
      fs.writeFileSync(filePath, finalPdfBuffer);

      job.status = "completed";
      job.progress = 100;
      job.filePath = filePath;
      job.filename = filename;

      this.logger.log(
        `PDF generation completed for job ${job.id}: ${filename}`,
      );
    } catch (error) {
      this.logger.error(`PDF generation error for job ${job.id}:`, error);
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Unknown error";
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Return true only when the URL is safe to embed as a CSS background-image
   * inside Puppeteer-rendered HTML.  We require https and reject anything that
   * could be a loopback / private-range / file-system URL.
   */
  private isSafeBackgroundUrl(raw: string): boolean {
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return false;
    }
    if (parsed.protocol !== "https:") {
      // Reject file:, http:, data:, blob:, etc.
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Reject loopback / link-local / private ranges expressed as hostnames
    const blockedPatterns = [
      /^localhost$/,
      /^127\./,
      /^0\.0\.0\.0$/,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // link-local / IMDS
      /^::1$/,
      /^\[::1\]$/,
      /^fd[0-9a-f]{2}:/i, // ULA IPv6
    ];
    if (blockedPatterns.some((re) => re.test(hostname))) {
      return false;
    }
    return true;
  }

  /**
   * Escape a string for safe insertion into HTML text/attribute context.
   * Prevents an attacker-controlled element value (text, color, font name…)
   * from breaking out of its tag/attribute or injecting markup.
   */
  private escapeHtml(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Render a single DeckSlideElement as an absolutely-positioned HTML node.
   * x/y/width/height are PERCENTAGES of the slide box; rotation is in degrees.
   * Mirrors the frontend PresentSlideRenderer (DOM, not headless fabric).
   *
   * `fontScale` converts a content fontSize (canvas px, relative to the deck's
   * authoring dimensions) to the export slide size: exportWidth / deckWidth.
   */
  private renderElementHtml(el: any, fontScale: number): string {
    const type = String(el?.type || "").toUpperCase();
    const content: Record<string, any> =
      el?.content && typeof el.content === "object" ? el.content : {};

    const x = Number.isFinite(el?.x) ? el.x : 0;
    const y = Number.isFinite(el?.y) ? el.y : 0;
    const w = Number.isFinite(el?.width) ? el.width : 100;
    const h = Number.isFinite(el?.height) ? el.height : 100;
    const rotation = Number.isFinite(el?.rotation) ? el.rotation : 0;
    const zIndex = Number.isFinite(el?.zIndex) ? el.zIndex : 0;

    const transform = rotation ? `transform: rotate(${rotation}deg);` : "";
    const wrapperStyle =
      `position:absolute; left:${x}%; top:${y}%; width:${w}%; height:${h}%; ` +
      `${transform} transform-origin: top left; z-index:${zIndex}; overflow:hidden;`;

    const inner = this.renderElementInner(type, content, fontScale);
    return `<div style="${wrapperStyle}">${inner}</div>`;
  }

  /** Build the inner markup for an element given its (normalized) type. */
  private renderElementInner(
    type: string,
    content: Record<string, any>,
    fontScale: number,
  ): string {
    if (type === "TEXT") {
      const text = this.escapeHtml(content.text ?? "");
      const rawSize = Number(content.fontSize);
      const fontSize = (Number.isFinite(rawSize) ? rawSize : 24) * fontScale;
      const fontFamily = content.fontFamily || "Inter, Arial, sans-serif";
      const fontWeight = content.fontWeight ?? "normal";
      const fontStyle = content.fontStyle ?? "normal";
      const color = content.fill || content.color || "#000000";
      const textAlign = content.textAlign || "left";
      const lineHeight =
        content.lineHeight != null ? `line-height:${content.lineHeight};` : "";
      const letterSpacing =
        content.letterSpacing != null
          ? `letter-spacing:${content.letterSpacing}px;`
          : "";
      const decorations = [
        content.underline || content.textDecoration === "underline"
          ? "underline"
          : "",
        content.linethrough || content.textDecoration === "line-through"
          ? "line-through"
          : "",
      ]
        .filter(Boolean)
        .join(" ");
      const textDecoration = decorations
        ? `text-decoration:${decorations};`
        : "";

      const style =
        `width:100%; height:100%; display:block; white-space:pre-wrap; word-break:break-word; ` +
        `font-size:${fontSize}px; font-family:${this.escapeHtml(fontFamily)}; ` +
        `font-weight:${this.escapeHtml(fontWeight)}; font-style:${this.escapeHtml(fontStyle)}; ` +
        `color:${this.escapeHtml(color)}; text-align:${this.escapeHtml(textAlign)}; ` +
        `${lineHeight}${letterSpacing}${textDecoration}`;
      return `<div style="${style}">${text}</div>`;
    }

    if (type === "IMAGE") {
      const rawUrl = typeof content.url === "string" ? content.url : null;
      // SSRF guard: only embed https public URLs; drop everything else.
      const safe = rawUrl && this.isSafeBackgroundUrl(rawUrl) ? rawUrl : null;
      if (safe) {
        const objectFit = ["contain", "cover", "fill", "none", "scale-down"].includes(
          content.objectFit,
        )
          ? content.objectFit
          : "contain";
        return `<img src="${this.escapeHtml(safe)}" alt="${this.escapeHtml(
          content.alt ?? "",
        )}" style="width:100%; height:100%; object-fit:${objectFit};" />`;
      }
      // Placeholder for placeholders / unsafe / missing URLs so nothing crashes.
      return `<div style="width:100%; height:100%; background:#f3f4f6; border:1px dashed #d1d5db; box-sizing:border-box;"></div>`;
    }

    if (type === "SHAPE") {
      return this.renderShapeHtml(content);
    }

    if (type === "VIDEO") {
      // Render the poster image if we have a safe one, else a dark placeholder.
      const poster =
        typeof content.poster === "string" ? content.poster : null;
      const safePoster =
        poster && this.isSafeBackgroundUrl(poster) ? poster : null;
      if (safePoster) {
        return `<img src="${this.escapeHtml(
          safePoster,
        )}" alt="" style="width:100%; height:100%; object-fit:cover;" />`;
      }
      return `<div style="width:100%; height:100%; background:#1a1a1a; display:flex; align-items:center; justify-content:center; color:#ffffff; font-family:Arial,sans-serif; font-size:24px;">&#9654;</div>`;
    }

    if (type === "ICON") {
      // content.svg is full <svg> markup authored by the editor.
      // Defensively strip any <script> blocks before inlining.
      const rawSvg = typeof content.svg === "string" ? content.svg : "";
      if (!rawSvg.trim()) {
        return `<div style="width:100%; height:100%; background:#f3f4f6; border:1px dashed #d1d5db; box-sizing:border-box;"></div>`;
      }
      // Strip <script> tags (case-insensitive, including attributes).
      const safeSvg = rawSvg.replace(/<script[\s\S]*?<\/script>/gi, "");

      // Apply tinting: inject `color` + `fill` CSS onto the root <svg> element
      // so currentColor-based icons pick up the tint automatically.
      const color = content.color
        ? this.escapeHtml(content.color)
        : null;
      const tintStyle = color
        ? ` style="width:100%;height:100%;color:${color};fill:${color};"`
        : ` style="width:100%;height:100%;"`;

      // Replace the opening <svg tag with one that carries our sizing + tint.
      // We only replace the very first occurrence so nested <svg> are untouched.
      const tinted = safeSvg.replace(
        /^(\s*<svg)(\s)/i,
        `$1${tintStyle}$2`,
      );
      return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;overflow:hidden;">${tinted}</div>`;
    }

    if (type === "TABLE") {
      const rows = Number.isFinite(Number(content.rows)) ? Number(content.rows) : 0;
      const cols = Number.isFinite(Number(content.cols)) ? Number(content.cols) : 0;
      const cells: string[][] = Array.isArray(content.cells) ? content.cells : [];
      const headerRow = Boolean(content.headerRow);
      const borderColor = this.escapeHtml(content.borderColor || "#cccccc");
      const headerBg = this.escapeHtml(content.headerBg || "#374151");
      const textColor = this.escapeHtml(content.textColor || "#111111");
      const rawSize = Number(content.fontSize);
      const fontSize = (Number.isFinite(rawSize) ? rawSize : 14) * fontScale;

      if (rows === 0 || cols === 0) {
        return `<div style="width:100%; height:100%; background:#f3f4f6; border:1px dashed #d1d5db; box-sizing:border-box;"></div>`;
      }

      // Build rows.  Each row gets equal height (100/rows)%; each cell equal
      // width (100/cols)%.  The header row (index 0) gets the headerBg when
      // headerRow is true.
      const colWidth = (100 / cols).toFixed(4);
      const rowHeight = (100 / rows).toFixed(4);

      let tbody = "";
      for (let r = 0; r < rows; r++) {
        const isHeader = headerRow && r === 0;
        const rowBg = isHeader ? headerBg : "transparent";
        const fontWt = isHeader ? "bold" : "normal";
        const rowColor = isHeader ? "#ffffff" : textColor;
        let tds = "";
        for (let c = 0; c < cols; c++) {
          const cellText = this.escapeHtml(
            cells[r] != null && cells[r][c] != null ? cells[r][c] : "",
          );
          tds +=
            `<td style="width:${colWidth}%;height:${rowHeight}%;` +
            `padding:2px 4px;overflow:hidden;word-break:break-word;` +
            `border:1px solid ${borderColor};` +
            `background:${rowBg};color:${rowColor};` +
            `font-weight:${fontWt};font-size:${fontSize.toFixed(2)}px;` +
            `font-family:Inter,Arial,sans-serif;vertical-align:middle;">` +
            `${cellText}</td>`;
        }
        tbody += `<tr>${tds}</tr>`;
      }

      return (
        `<table style="width:100%;height:100%;border-collapse:collapse;` +
        `table-layout:fixed;color:${textColor};font-size:${fontSize.toFixed(2)}px;` +
        `font-family:Inter,Arial,sans-serif;">` +
        `<tbody>${tbody}</tbody></table>`
      );
    }

    if (type === "CHART") {
      return this.renderChartSvg(content, fontScale);
    }

    // Unknown type — render nothing visible rather than crash.
    return "";
  }

  /** Render a SHAPE element honoring its shapeType, fill, stroke, etc. */
  private renderShapeHtml(content: Record<string, any>): string {
    const shape = String(
      content.shapeType || content.shape || "RECT",
    ).toUpperCase();
    const fill = this.escapeHtml(content.fill || "#e0e0e0");
    const stroke = this.escapeHtml(content.stroke || "#333333");
    const strokeWidth = Number.isFinite(Number(content.strokeWidth))
      ? Number(content.strokeWidth)
      : 2;

    // SVG-based shapes (use a non-uniform viewBox so they fill the % box).
    const svgOpen = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style="display:block;">`;

    switch (shape) {
      case "CIRCLE":
      case "ELLIPSE":
        return `<div style="width:100%; height:100%; box-sizing:border-box; border-radius:50%; background:${fill}; border:${strokeWidth}px solid ${stroke};"></div>`;
      case "TRIANGLE":
        return `${svgOpen}<polygon points="50,0 100,100 0,100" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" /></svg>`;
      case "DIAMOND":
        return `${svgOpen}<polygon points="50,0 100,50 50,100 0,50" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" /></svg>`;
      case "STAR": {
        // 5-point star in a 0..100 box.
        const pts = this.starPoints(50, 50, 50, 22, 5);
        return `${svgOpen}<polygon points="${pts}" fill="${this.escapeHtml(
          content.fill || "#ffd700",
        )}" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" /></svg>`;
      }
      case "LINE":
        return `${svgOpen}<line x1="0" y1="50" x2="100" y2="50" stroke="${stroke}" stroke-width="${strokeWidth}" vector-effect="non-scaling-stroke" /></svg>`;
      case "ARROW":
        return `${svgOpen}<g stroke="${stroke}" stroke-width="${strokeWidth}" fill="none" vector-effect="non-scaling-stroke"><line x1="0" y1="50" x2="92" y2="50" vector-effect="non-scaling-stroke" /><polyline points="78,30 100,50 78,70" vector-effect="non-scaling-stroke" /></g></svg>`;
      case "RECT":
      case "RECTANGLE":
      default: {
        const rx = Number(content.rx);
        const borderRadius =
          Number.isFinite(rx) && rx > 0 ? `border-radius:${rx}px;` : "";
        return `<div style="width:100%; height:100%; box-sizing:border-box; background:${fill}; border:${strokeWidth}px solid ${stroke}; ${borderRadius}"></div>`;
      }
    }
  }

  /** SVG points string for an N-point star centered at (cx,cy). */
  private starPoints(
    cx: number,
    cy: number,
    outer: number,
    inner: number,
    points: number,
  ): string {
    const coords: string[] = [];
    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outer : inner;
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const x = cx + radius * Math.cos(angle);
      const y = cy + radius * Math.sin(angle);
      coords.push(`${x.toFixed(2)},${y.toFixed(2)}`);
    }
    return coords.join(" ");
  }

  /**
   * Render a CHART element as an inline SVG.
   * Supports chartType: 'bar' | 'line' | 'pie'.
   * All coordinates are in a fixed 400×300 viewBox so the SVG scales cleanly
   * with width="100%" height="100%".
   */
  private renderChartSvg(
    content: Record<string, any>,
    fontScale: number,
  ): string {
    const chartType = String(content.chartType || "bar").toLowerCase() as
      | "bar"
      | "line"
      | "pie";
    const labels: string[] = Array.isArray(content.labels) ? content.labels : [];
    const series: { name: string; color: string; values: number[] }[] =
      Array.isArray(content.series) ? content.series : [];
    const title: string = typeof content.title === "string" ? content.title : "";
    const showLegend = Boolean(content.showLegend);

    // Fixed viewBox dimensions
    const VW = 400;
    const VH = 300;

    // Reserve space for title and legend
    const titleH = title ? 24 : 0;
    const legendH = showLegend && series.length > 0 ? 20 : 0;

    // Chart area padding
    const padLeft = 40;
    const padRight = 10;
    const padTop = titleH + 8;
    const padBottom = legendH + 24; // room for x-axis labels

    const chartX = padLeft;
    const chartY = padTop;
    const chartW = VW - padLeft - padRight;
    const chartH = VH - padTop - padBottom;

    // Collect all values to compute y-axis scale
    const allValues: number[] = series.flatMap((s) =>
      Array.isArray(s.values) ? s.values.map(Number).filter(Number.isFinite) : [],
    );
    const maxVal = allValues.length > 0 ? Math.max(...allValues, 0) : 1;
    const minVal = chartType !== "pie" ? Math.min(...allValues, 0) : 0;
    const valueRange = maxVal - minVal || 1;

    // Helper: map a data value to a y coordinate inside chartH
    const toY = (v: number): number =>
      chartY + chartH - ((v - minVal) / valueRange) * chartH;

    // Default fallback colors
    const defaultColors = [
      "#3b82f6", "#ef4444", "#10b981", "#f59e0b",
      "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
    ];
    const seriesColor = (i: number, s: { color?: string }): string =>
      s.color || defaultColors[i % defaultColors.length];

    // ── Axis helpers ─────────────────────────────────────────────────
    const axisColor = "#9ca3af";
    const gridColor = "#e5e7eb";
    const labelFs = Math.max(9, 11 * fontScale);

    const xAxisLine = `<line x1="${chartX}" y1="${toY(0)}" x2="${chartX + chartW}" y2="${toY(0)}" stroke="${axisColor}" stroke-width="1"/>`;
    const yAxisLine = `<line x1="${chartX}" y1="${chartY}" x2="${chartX}" y2="${chartY + chartH}" stroke="${axisColor}" stroke-width="1"/>`;

    // 4 horizontal grid lines
    let gridLines = "";
    for (let g = 1; g <= 4; g++) {
      const gy = chartY + (chartH * g) / 4;
      const gv = (maxVal - (valueRange * g) / 4).toFixed(1);
      gridLines +=
        `<line x1="${chartX}" y1="${gy.toFixed(2)}" x2="${chartX + chartW}" y2="${gy.toFixed(2)}" stroke="${gridColor}" stroke-width="0.5" stroke-dasharray="3,3"/>` +
        `<text x="${(chartX - 4).toFixed(2)}" y="${(gy + 4).toFixed(2)}" text-anchor="end" font-size="${labelFs.toFixed(1)}" fill="${axisColor}" font-family="Arial,sans-serif">${this.escapeHtml(gv)}</text>`;
    }

    let chartBody = "";

    // ── BAR chart ────────────────────────────────────────────────────
    if (chartType === "bar") {
      const numGroups = labels.length || 1;
      const numSeries = series.length || 1;
      const groupW = chartW / numGroups;
      const barW = Math.max(2, (groupW * 0.7) / numSeries);
      const groupPad = (groupW - barW * numSeries) / 2;

      let bars = "";
      let xLabels = "";

      for (let g = 0; g < numGroups; g++) {
        const gx = chartX + g * groupW;
        const labelX = gx + groupW / 2;
        const labelY = chartY + chartH + 14;
        xLabels += `<text x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}" text-anchor="middle" font-size="${labelFs.toFixed(1)}" fill="${axisColor}" font-family="Arial,sans-serif">${this.escapeHtml(String(labels[g] ?? g))}</text>`;

        for (let s = 0; s < series.length; s++) {
          const bx = gx + groupPad + s * barW;
          const val = Number.isFinite(series[s].values?.[g])
            ? series[s].values[g]
            : 0;
          const barTop = toY(Math.max(val, minVal));
          const barBase = toY(Math.max(0, minVal));
          const barH = Math.abs(barBase - barTop);
          bars +=
            `<rect x="${bx.toFixed(2)}" y="${Math.min(barTop, barBase).toFixed(2)}" ` +
            `width="${barW.toFixed(2)}" height="${Math.max(barH, 1).toFixed(2)}" ` +
            `fill="${this.escapeHtml(seriesColor(s, series[s]))}" opacity="0.9"/>`;
        }
      }
      chartBody = gridLines + xAxisLine + yAxisLine + bars + xLabels;
    }

    // ── LINE chart ────────────────────────────────────────────────────
    else if (chartType === "line") {
      const numPts = labels.length || 1;
      const stepX = numPts > 1 ? chartW / (numPts - 1) : chartW;

      let xLabels = "";
      for (let g = 0; g < numPts; g++) {
        const lx = chartX + g * (numPts > 1 ? stepX : 0);
        xLabels += `<text x="${lx.toFixed(2)}" y="${(chartY + chartH + 14).toFixed(2)}" text-anchor="middle" font-size="${labelFs.toFixed(1)}" fill="${axisColor}" font-family="Arial,sans-serif">${this.escapeHtml(String(labels[g] ?? g))}</text>`;
      }

      let polylines = "";
      let dots = "";
      for (let s = 0; s < series.length; s++) {
        const color = this.escapeHtml(seriesColor(s, series[s]));
        const pts = series[s].values
          .map((v, i) => {
            const px = chartX + i * (numPts > 1 ? stepX : 0);
            const py = toY(Number.isFinite(v) ? v : 0);
            return `${px.toFixed(2)},${py.toFixed(2)}`;
          })
          .join(" ");
        polylines += `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round"/>`;
        // Small dot per data point
        series[s].values.forEach((v, i) => {
          const px = chartX + i * (numPts > 1 ? stepX : 0);
          const py = toY(Number.isFinite(v) ? v : 0);
          dots += `<circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="3" fill="${color}"/>`;
        });
      }
      chartBody = gridLines + xAxisLine + yAxisLine + polylines + dots + xLabels;
    }

    // ── PIE chart ─────────────────────────────────────────────────────
    else {
      // Only the first series is used for pie.
      const pieSeries = series[0];
      const pieValues: number[] = pieSeries
        ? (pieSeries.values || []).map(Number).filter((v) => v > 0)
        : [];
      const pieTotal = pieValues.reduce((a, b) => a + b, 0) || 1;
      const piePieColors = series[0]
        ? pieValues.map((_, i) =>
            this.escapeHtml(defaultColors[i % defaultColors.length]),
          )
        : [];

      // Center pie in chart area
      const cx = chartX + chartW / 2;
      const cy = chartY + chartH / 2;
      const r = Math.min(chartW, chartH) / 2 - 4;

      let angle = -Math.PI / 2; // start at top
      let slices = "";
      pieValues.forEach((val, i) => {
        const sweep = (val / pieTotal) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(angle + sweep);
        const y2 = cy + r * Math.sin(angle + sweep);
        const largeArc = sweep > Math.PI ? 1 : 0;
        const pathD =
          `M ${cx.toFixed(2)} ${cy.toFixed(2)} ` +
          `L ${x1.toFixed(2)} ${y1.toFixed(2)} ` +
          `A ${r.toFixed(2)} ${r.toFixed(2)} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
        slices += `<path d="${pathD}" fill="${piePieColors[i] || "#ccc"}" stroke="#fff" stroke-width="1"/>`;
        angle += sweep;
      });

      // Pie x-axis labels replaced by a simple % label at slice midpoint
      let pieLabels = "";
      angle = -Math.PI / 2;
      pieValues.forEach((val, i) => {
        const sweep = (val / pieTotal) * 2 * Math.PI;
        const mid = angle + sweep / 2;
        const lr = r * 0.6;
        const lx = cx + lr * Math.cos(mid);
        const ly = cy + lr * Math.sin(mid);
        const pct = ((val / pieTotal) * 100).toFixed(0) + "%";
        pieLabels += `<text x="${lx.toFixed(2)}" y="${(ly + 4).toFixed(2)}" text-anchor="middle" font-size="${Math.max(8, 9 * fontScale).toFixed(1)}" fill="#fff" font-weight="bold" font-family="Arial,sans-serif">${this.escapeHtml(pct)}</text>`;
        angle += sweep;
      });

      chartBody = slices + pieLabels;
    }

    // ── Title ─────────────────────────────────────────────────────────
    const titleSvg = title
      ? `<text x="${(VW / 2).toFixed(2)}" y="${(titleH - 4).toFixed(2)}" text-anchor="middle" font-size="${Math.max(12, 14 * fontScale).toFixed(1)}" fill="#1f2937" font-weight="bold" font-family="Arial,sans-serif">${this.escapeHtml(title)}</text>`
      : "";

    // ── Legend ────────────────────────────────────────────────────────
    let legendSvg = "";
    if (showLegend && series.length > 0) {
      const ly = VH - legendH + 4;
      const itemW = Math.floor(VW / series.length);
      series.forEach((s, i) => {
        const lx = i * itemW + 8;
        legendSvg +=
          `<rect x="${lx}" y="${ly}" width="10" height="10" fill="${this.escapeHtml(seriesColor(i, s))}"/>` +
          `<text x="${lx + 13}" y="${ly + 9}" font-size="${Math.max(8, 10 * fontScale).toFixed(1)}" fill="#374151" font-family="Arial,sans-serif">${this.escapeHtml(s.name || `Series ${i + 1}`)}</text>`;
      });
    }

    return (
      `<svg width="100%" height="100%" viewBox="0 0 ${VW} ${VH}" ` +
      `preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" ` +
      `style="display:block;background:transparent;">` +
      `${titleSvg}${chartBody}${legendSvg}` +
      `</svg>`
    );
  }

  private generateSlideHtml(
    slide: any,
    width: number,
    height: number,
    deckBaseWidth: number,
  ): string {
    // DeckSlide has no `data` field — read the real Prisma columns:
    // title, subtitle, backgroundColor, backgroundImage, and the `elements`
    // relation (the real source of truth for user-authored content).
    const bgColor = slide.backgroundColor || "#ffffff";
    const rawBgImage: string | null = slide.backgroundImage || null;
    const title = slide.title || "";
    const subtitle = slide.subtitle || "";
    const elements: any[] = Array.isArray(slide.elements) ? slide.elements : [];

    // SSRF / path-traversal guard: only embed background images from https
    // public URLs; silently drop anything else (file:, http:, internal hosts).
    const safeBgImage =
      rawBgImage && this.isSafeBackgroundUrl(rawBgImage) ? rawBgImage : null;

    const bgStyle = safeBgImage
      ? `background: url('${this.escapeHtml(safeBgImage)}') center center / cover no-repeat; background-color: ${this.escapeHtml(bgColor)};`
      : `background-color: ${this.escapeHtml(bgColor)};`;

    // Content fontSize is in canvas px relative to the deck's authoring width;
    // scale it proportionally to the export slide width.
    const fontScale = deckBaseWidth > 0 ? width / deckBaseWidth : 1;

    // Render each element back-to-front (already ordered by zIndex asc).
    const elementsHtml = elements
      .map((el) => this.renderElementHtml(el, fontScale))
      .join("\n");

    // Legacy fallback: only show slide.title/subtitle when a slide has NO
    // elements (template-only / legacy slides) so nothing regresses.
    const fallbackHtml =
      elements.length === 0 && (title || subtitle)
        ? `${
            title
              ? `<div class="slide-title">${this.escapeHtml(title)}</div>`
              : ""
          }${
            subtitle
              ? `<div class="slide-subtitle">${this.escapeHtml(subtitle)}</div>`
              : ""
          }`
        : "";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body {
            width: ${width}px;
            height: ${height}px;
            overflow: hidden;
          }
          #slide-wrapper {
            width: ${width}px;
            height: ${height}px;
            position: relative;
            ${bgStyle}
          }
          .slide-title {
            position: absolute;
            bottom: 60px;
            left: 60px;
            right: 60px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${Math.round(width * 0.03)}px;
            font-weight: bold;
            color: #ffffff;
            text-shadow: 0 2px 8px rgba(0,0,0,0.6);
            z-index: 1000000;
          }
          .slide-subtitle {
            position: absolute;
            bottom: 20px;
            left: 60px;
            right: 60px;
            font-family: Arial, Helvetica, sans-serif;
            font-size: ${Math.round(width * 0.018)}px;
            color: rgba(255,255,255,0.85);
            text-shadow: 0 1px 4px rgba(0,0,0,0.5);
            z-index: 1000000;
          }
        </style>
      </head>
      <body>
        <div id="slide-wrapper">
          ${elementsHtml}
          ${fallbackHtml}
        </div>
      </body>
      </html>
    `;
  }

  async exportSlideAsPng(
    deckId: string,
    slideIndex: number,
    scale: number,
  ): Promise<Buffer> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: {
          orderBy: { order: "asc" },
          include: {
            elements: { orderBy: { zIndex: "asc" } },
          },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException("Deck not found");
    }

    if (slideIndex < 0 || slideIndex >= deck.slides.length) {
      throw new BadRequestException("Invalid slide index");
    }

    const slide = deck.slides[slideIndex];
    // Use the deck's real dimensions so non-16:9 decks are not distorted.
    const baseWidth = deck.slideWidth || 1920;
    const baseHeight = deck.slideHeight || 1080;
    const width = baseWidth * scale;
    const height = baseHeight * scale;

    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setViewport({
        width: Math.round(width),
        height: Math.round(height),
      });

      const html = this.generateSlideHtml(slide, width, height, baseWidth);
      await page.setContent(html, { waitUntil: "networkidle0" });

      try {
        await page.evaluate(() => {
          // @ts-ignore - document is available in browser context
          const doc = document as any;
          if (doc?.fonts) {
            return doc.fonts.ready;
          }
          return Promise.resolve();
        });
      } catch (e) {
        // Fonts may not be available
      }
      await new Promise((resolve) => setTimeout(resolve, 500));

      const screenshot = await page.screenshot({
        type: "png",
        fullPage: false,
      });

      return Buffer.from(screenshot);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  getJobStatus(jobId: string): ExportJob | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    // Don't expose file path in status
    const { filePath, ...safeJob } = job;
    return safeJob as ExportJob;
  }

  getJobResult(jobId: string): ExportJob | null {
    return this.jobs.get(jobId) || null;
  }

  cleanupJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (job?.filePath && fs.existsSync(job.filePath)) {
      try {
        fs.unlinkSync(job.filePath);
        this.logger.debug(`Cleaned up job file: ${job.filePath}`);
      } catch (err) {
        this.logger.error(`Failed to cleanup job file: ${job.filePath}`, err);
      }
    }
    this.jobs.delete(jobId);
  }

  // Clean up old jobs (call periodically)
  cleanupOldJobs() {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [jobId, job] of this.jobs.entries()) {
      if (now.getTime() - job.createdAt.getTime() > maxAge) {
        this.logger.debug(`Cleaning up old job: ${jobId}`);
        this.cleanupJob(jobId);
      }
    }
  }
}
