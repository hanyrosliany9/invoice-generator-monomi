import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { PrismaService } from "../../prisma/prisma.service";
import { escapeHtml } from "../../pdf/templates/escape-html.util";
import { buildReportHtml } from "../utils/report-pdf-html";

/** Chromium processes rendering report PDFs at once (per backend process). */
export const MAX_CONCURRENT_RENDERS = 2;
/** Requests allowed to wait for a slot before new ones are turned away. */
export const MAX_QUEUED_RENDERS = 20;
const RENDER_TIMEOUT_MS = 60_000;

/** Minimal counting semaphore with a bounded FIFO wait queue. */
export class RenderSemaphore {
  private active = 0;
  private readonly waiting: (() => void)[] = [];

  constructor(
    private readonly limit: number,
    private readonly maxQueue: number,
  ) {}

  /** Resolves with a release function once a slot is free. */
  async acquire(): Promise<() => void> {
    if (this.active >= this.limit) {
      if (this.waiting.length >= this.maxQueue) {
        throw new ServiceUnavailableException(
          "Server sedang sibuk membuat PDF lain. Coba lagi dalam beberapa saat.",
        );
      }
      // The releaser hands its slot straight to us (active stays counted).
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    } else {
      this.active++;
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      const next = this.waiting.shift();
      if (next) next();
      else this.active--;
    };
  }

  get inUse(): number {
    return this.active;
  }

  get queued(): number {
    return this.waiting.length;
  }
}

/**
 * Renders social media reports to PDF on demand (staff download and client
 * portal download share this one path; nothing is stored).
 *
 * The document is built from each section's data and visualizations
 * (see utils/report-pdf-html.ts): cover, KPI summary, per-section charts as
 * inline SVG, a one-line takeaway per chart and a compact data table. No
 * network, scripts or external fonts are needed at render time.
 */
@Injectable()
export class PDFGeneratorService {
  private readonly logger = new Logger(PDFGeneratorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Full report PDF (cover + summary + every section). */
  async generateFullReportPDFFromData(reportId: string): Promise<Buffer> {
    const { html, title } = await this.buildHtml(reportId);
    return this.htmlToPdf(html, title);
  }

  /** PDF of a single section of a report (same design, section only). */
  async generatePDFFromData(reportId: string, sectionId: string): Promise<Buffer> {
    const { html, title } = await this.buildHtml(reportId, sectionId);
    return this.htmlToPdf(html, title);
  }

  /** The HTML that is printed (exposed for tests and visual checks). */
  async buildHtml(
    reportId: string,
    sectionId?: string,
  ): Promise<{ html: string; title: string }> {
    const report = await this.prisma.socialMediaReport.findUnique({
      where: { id: reportId },
      include: {
        sections: { orderBy: { order: "asc" } },
        project: { include: { client: true } },
      },
    });
    if (!report) {
      throw new NotFoundException(`Report ${reportId} not found`);
    }
    // Sections copied from last month and not yet filled have no data; they
    // would only be empty frames, so leave them out (unless that is everything).
    const hasRows = (s: { rowCount: number }) => s.rowCount > 0;
    const filled = report.sections.filter(hasRows);
    const sections = sectionId
      ? report.sections.filter((s) => s.id === sectionId)
      : filled.length > 0
        ? filled
        : report.sections;
    if (sectionId && sections.length === 0) {
      throw new NotFoundException(
        `Section ${sectionId} not found in report ${reportId}`,
      );
    }
    this.logger.log(
      `Rendering report ${reportId}: ${sections.length} section(s) for PDF`,
    );
    const html = buildReportHtml({
      title: report.title,
      description: report.description,
      month: report.month,
      year: report.year,
      clientName: report.project?.client?.name,
      projectNumber: report.project?.number,
      projectName: report.project?.description,
      sections,
    });
    return { html, title: report.title };
  }

  /**
   * Print the HTML. The document is self-contained (inline SVG charts, no
   * scripts, no remote assets), so the page runs with JavaScript disabled and
   * every request other than data:/about: is aborted: report text that slips
   * past escaping still cannot run script or reach the network (SSRF).
   *
   * Renders are capped at MAX_CONCURRENT_RENDERS (each one is a Chromium
   * process) with a bounded wait queue; excess requests get a 503.
   */
  private async htmlToPdf(html: string, title: string): Promise<Buffer> {
    const release = await PDFGeneratorService.renderSlots.acquire();
    let browser: puppeteer.Browser | null = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        // --no-sandbox: the production image runs Alpine Chromium as the
        // non-root `appuser` without CAP_SYS_ADMIN or a Chrome seccomp
        // profile, where the setuid/namespace sandbox cannot start. The
        // page-level controls below (no JS, no network) are what contain
        // rendered content. Drop these two flags if the container gains a
        // working sandbox.
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
        ],
      });
      const page = await browser.newPage();
      page.setDefaultTimeout(RENDER_TIMEOUT_MS);
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on("request", (req) => {
        if (req.isInterceptResolutionHandled()) return;
        const url = req.url();
        if (url.startsWith("data:") || url.startsWith("about:")) {
          void req.continue();
        } else {
          void req.abort("blockedbyclient");
        }
      });
      await page.emulateMediaType("print");
      await page.setContent(html, { waitUntil: "load", timeout: RENDER_TIMEOUT_MS });
      const footer = `<div style="width:100%;padding:0 20mm;font-family:Helvetica,Arial,sans-serif;font-size:8px;color:#6B7280;display:flex;justify-content:space-between"><span>${escapeHtml(title)}</span><span>Halaman <span class="pageNumber"></span> dari <span class="totalPages"></span></span></div>`;
      const pdf = await page.pdf({
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate: footer,
        timeout: RENDER_TIMEOUT_MS,
      });
      return Buffer.from(pdf);
    } catch (error) {
      this.logger.error("Report PDF generation failed", error);
      throw error;
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
      release();
    }
  }

  /** Shared by every instance: the limit is per process, not per injector. */
  private static readonly renderSlots = new RenderSemaphore(
    MAX_CONCURRENT_RENDERS,
    MAX_QUEUED_RENDERS,
  );
}
