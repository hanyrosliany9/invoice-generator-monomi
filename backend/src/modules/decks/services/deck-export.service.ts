import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../prisma/prisma.service';
import { PDFDocument } from 'pdf-lib';

export interface ExportJob {
  id: string;
  deckId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
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
  private readonly tempDir = path.join(process.cwd(), 'temp', 'exports');

  constructor(private prisma: PrismaService) {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }

    // Start cleanup interval
    setInterval(() => this.cleanupOldJobs(), 5 * 60 * 1000); // Every 5 minutes
  }

  async startPdfGeneration(
    deckId: string,
    quality: 'draft' | 'standard' | 'high' = 'standard',
  ): Promise<string> {
    // Verify deck exists
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    const jobId = uuidv4();
    const job: ExportJob = {
      id: jobId,
      deckId,
      status: 'pending',
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
    quality: 'draft' | 'standard' | 'high',
  ) {
    job.status = 'processing';

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
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Set viewport to slide dimensions (16:9)
      const width = 1920 * settings.scale;
      const height = 1080 * settings.scale;
      await page.setViewport({ width: Math.round(width), height: Math.round(height) });

      const pdfPages: Uint8Array[] = [];

      for (let i = 0; i < deck.slides.length; i++) {
        const slide = deck.slides[i];
        job.currentSlide = i + 1;
        job.progress = Math.round((i / deck.slides.length) * 100);

        this.logger.debug(`Rendering slide ${i + 1} of ${deck.slides.length} (job: ${job.id})`);

        // Create HTML for this slide
        const html = this.generateSlideHtml(slide, width, height);
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Wait for fonts and images to load
        try {
          // eslint-disable-next-line no-eval
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
          pageRanges: '1',
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
      const sanitizedTitle = deck.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${sanitizedTitle}_${Date.now()}.pdf`;
      const filePath = path.join(this.tempDir, filename);
      fs.writeFileSync(filePath, finalPdfBuffer);

      job.status = 'completed';
      job.progress = 100;
      job.filePath = filePath;
      job.filename = filename;

      this.logger.log(`PDF generation completed for job ${job.id}: ${filename}`);
    } catch (error) {
      this.logger.error(`PDF generation error for job ${job.id}:`, error);
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  private generateSlideHtml(slide: any, width: number, height: number): string {
    // Parse the canvas JSON data
    let canvasData = {};
    try {
      canvasData = JSON.parse(slide.data || '{}');
    } catch (e) {
      this.logger.error('Failed to parse canvas data:', e);
    }

    // Generate HTML that renders the fabric.js canvas data
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
          #canvas-container {
            width: ${width}px;
            height: ${height}px;
            background: ${(canvasData as any).background || '#ffffff'};
          }
          canvas {
            display: block;
          }
        </style>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
      </head>
      <body>
        <div id="canvas-container">
          <canvas id="slide-canvas" width="${width}" height="${height}"></canvas>
        </div>
        <script>
          const canvas = new fabric.StaticCanvas('slide-canvas', {
            width: ${width},
            height: ${height}
          });

          const data = ${JSON.stringify(canvasData)};

          if (data && data.objects) {
            canvas.loadFromJSON(data, function() {
              canvas.renderAll();
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  async exportSlideAsPng(deckId: string, slideIndex: number, scale: number): Promise<Buffer> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!deck) {
      throw new NotFoundException('Deck not found');
    }

    if (slideIndex < 0 || slideIndex >= deck.slides.length) {
      throw new BadRequestException('Invalid slide index');
    }

    const slide = deck.slides[slideIndex];
    const width = 1920 * scale;
    const height = 1080 * scale;

    let browser: puppeteer.Browser | null = null;

    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: Math.round(width), height: Math.round(height) });

      const html = this.generateSlideHtml(slide, width, height);
      await page.setContent(html, { waitUntil: 'networkidle0' });

      try {
        // eslint-disable-next-line no-eval
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
        type: 'png',
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
