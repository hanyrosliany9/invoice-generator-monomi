# Phase 10: PDF Export

> **Executor**: Claude Code Haiku 4.5
> **Prerequisite**: Complete `DECK_OPT_09_PRESENTATION.md` first
> **Estimated Complexity**: Medium

## Overview

Enable PDF export of deck presentations using Puppeteer on the backend, with progress feedback on the frontend.

---

## Step 1: Create Export Endpoint (Backend)

**File**: `backend/src/modules/decks/deck-export.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Param,
  Res,
  Query,
  UseGuards,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DeckExportService } from './deck-export.service';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('Deck Export')
@Controller('decks/:id/export')
@UseGuards(JwtAuthGuard)
export class DeckExportController {
  constructor(private readonly exportService: DeckExportService) {}

  @Post('pdf')
  @ApiOperation({ summary: 'Generate PDF from deck' })
  @ApiQuery({ name: 'quality', enum: ['draft', 'standard', 'high'], required: false })
  @ApiResponse({ status: 200, description: 'Returns job ID for tracking' })
  async generatePdf(
    @Param('id') deckId: string,
    @Query('quality') quality: 'draft' | 'standard' | 'high' = 'standard',
  ) {
    const jobId = await this.exportService.startPdfGeneration(deckId, quality);
    return { jobId, message: 'PDF generation started' };
  }

  @Get('pdf/status/:jobId')
  @ApiOperation({ summary: 'Check PDF generation status' })
  async getPdfStatus(@Param('jobId') jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Get('pdf/download/:jobId')
  @ApiOperation({ summary: 'Download generated PDF' })
  async downloadPdf(
    @Param('jobId') jobId: string,
    @Res() res: Response,
  ) {
    const result = await this.exportService.getJobResult(jobId);

    if (!result || !result.filePath) {
      throw new BadRequestException('PDF not ready or job not found');
    }

    res.download(result.filePath, result.filename, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
      // Clean up file after download
      this.exportService.cleanupJob(jobId);
    });
  }

  @Post('png')
  @ApiOperation({ summary: 'Export single slide as PNG' })
  @ApiQuery({ name: 'slideIndex', required: true })
  @ApiQuery({ name: 'scale', required: false })
  async exportSlidePng(
    @Param('id') deckId: string,
    @Query('slideIndex') slideIndex: number,
    @Query('scale') scale: number = 2,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportSlideAsPng(deckId, slideIndex, scale);

    res.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="slide-${slideIndex + 1}.png"`,
    });

    res.send(buffer);
  }
}
```

---

## Step 2: Create Export Service (Backend)

**File**: `backend/src/modules/decks/deck-export.service.ts`

```typescript
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';

interface ExportJob {
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
  private jobs: Map<string, ExportJob> = new Map();
  private readonly tempDir = path.join(process.cwd(), 'temp', 'exports');

  constructor(private prisma: PrismaService) {
    // Ensure temp directory exists
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async startPdfGeneration(
    deckId: string,
    quality: 'draft' | 'standard' | 'high',
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

    // Start async generation
    this.generatePdfAsync(job, deck, quality);

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

      const pdfPages: Buffer[] = [];

      for (let i = 0; i < deck.slides.length; i++) {
        const slide = deck.slides[i];
        job.currentSlide = i + 1;
        job.progress = Math.round((i / deck.slides.length) * 100);

        // Create HTML for this slide
        const html = this.generateSlideHtml(slide, width, height);
        await page.setContent(html, { waitUntil: 'networkidle0' });

        // Wait for fonts and images to load
        await page.evaluate(() => document.fonts.ready);
        await new Promise(resolve => setTimeout(resolve, 500));

        // Generate PDF for this page
        const slideBuffer = await page.pdf({
          width: `${width}px`,
          height: `${height}px`,
          printBackground: true,
          pageRanges: '1',
        });

        pdfPages.push(slideBuffer);
      }

      // Combine all pages into single PDF
      const { PDFDocument } = require('pdf-lib');
      const mergedPdf = await PDFDocument.create();

      for (const pdfBuffer of pdfPages) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach((page: any) => mergedPdf.addPage(page));
      }

      const finalPdfBuffer = await mergedPdf.save();

      // Save to file
      const filename = `${deck.title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`;
      const filePath = path.join(this.tempDir, filename);
      fs.writeFileSync(filePath, finalPdfBuffer);

      job.status = 'completed';
      job.progress = 100;
      job.filePath = filePath;
      job.filename = filename;

    } catch (error) {
      console.error('PDF generation error:', error);
      job.status = 'failed';
      job.error = error.message;
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
      canvasData = JSON.parse(slide.canvasData || '{}');
    } catch (e) {
      console.error('Failed to parse canvas data:', e);
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

  async exportSlideAsPng(
    deckId: string,
    slideIndex: number,
    scale: number,
  ): Promise<Buffer> {
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
      await page.evaluate(() => document.fonts.ready);
      await new Promise(resolve => setTimeout(resolve, 500));

      const screenshot = await page.screenshot({
        type: 'png',
        fullPage: false,
      });

      return screenshot as Buffer;
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
      fs.unlinkSync(job.filePath);
    }
    this.jobs.delete(jobId);
  }

  // Clean up old jobs (call periodically)
  cleanupOldJobs() {
    const now = new Date();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    for (const [jobId, job] of this.jobs.entries()) {
      if (now.getTime() - job.createdAt.getTime() > maxAge) {
        this.cleanupJob(jobId);
      }
    }
  }
}
```

---

## Step 3: Register Export Module (Backend)

**Edit**: `backend/src/modules/decks/decks.module.ts`

Add the export controller and service:

```typescript
import { DeckExportController } from './deck-export.controller';
import { DeckExportService } from './deck-export.service';

@Module({
  controllers: [
    DecksController,
    DeckExportController, // Add this
    // ... other controllers
  ],
  providers: [
    DecksService,
    DeckExportService, // Add this
    // ... other providers
  ],
})
export class DecksModule {}
```

---

## Step 4: Create Export API Service (Frontend)

**File**: `frontend/src/features/deck-editor/services/exportApi.ts`

```typescript
import { api } from '@/lib/axios';

export interface ExportJobStatus {
  id: string;
  deckId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  totalSlides: number;
  currentSlide: number;
  error?: string;
}

export type ExportQuality = 'draft' | 'standard' | 'high';

export const startPdfExport = async (
  deckId: string,
  quality: ExportQuality = 'standard',
): Promise<{ jobId: string }> => {
  const response = await api.post(`/decks/${deckId}/export/pdf`, null, {
    params: { quality },
  });
  return response.data;
};

export const getExportStatus = async (
  deckId: string,
  jobId: string,
): Promise<ExportJobStatus> => {
  const response = await api.get(`/decks/${deckId}/export/pdf/status/${jobId}`);
  return response.data;
};

export const downloadPdf = async (
  deckId: string,
  jobId: string,
): Promise<void> => {
  // Create a download link
  const url = `/api/decks/${deckId}/export/pdf/download/${jobId}`;
  const link = document.createElement('a');
  link.href = url;
  link.download = 'presentation.pdf';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportSlideAsPng = async (
  deckId: string,
  slideIndex: number,
  scale: number = 2,
): Promise<Blob> => {
  const response = await api.post(
    `/decks/${deckId}/export/png`,
    null,
    {
      params: { slideIndex, scale },
      responseType: 'blob',
    },
  );
  return response.data;
};
```

---

## Step 5: Create Export Progress Modal

**File**: `frontend/src/features/deck-editor/components/ExportProgressModal.tsx`

```tsx
import React, { useEffect, useState, useRef } from 'react';
import { Modal, Progress, Button, Alert, Typography, Space } from 'antd';
import {
  DownloadOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { ExportJobStatus, getExportStatus, downloadPdf } from '../services/exportApi';

const { Text } = Typography;

interface ExportProgressModalProps {
  open: boolean;
  onClose: () => void;
  deckId: string;
  jobId: string | null;
}

export const ExportProgressModal: React.FC<ExportProgressModalProps> = ({
  open,
  onClose,
  deckId,
  jobId,
}) => {
  const [status, setStatus] = useState<ExportJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Poll for status updates
  useEffect(() => {
    if (!open || !jobId) return;

    const pollStatus = async () => {
      try {
        const result = await getExportStatus(deckId, jobId);
        setStatus(result);

        if (result.status === 'completed' || result.status === 'failed') {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }

          if (result.status === 'failed') {
            setError(result.error || 'Export failed');
          }
        }
      } catch (err) {
        console.error('Failed to get export status:', err);
        setError('Failed to check export status');
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    };

    // Initial poll
    pollStatus();

    // Start polling
    pollingRef.current = setInterval(pollStatus, 1000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [open, jobId, deckId]);

  const handleDownload = () => {
    if (jobId) {
      downloadPdf(deckId, jobId);
    }
  };

  const handleClose = () => {
    setStatus(null);
    setError(null);
    onClose();
  };

  const getStatusIcon = () => {
    if (!status) return <LoadingOutlined />;

    switch (status.status) {
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <LoadingOutlined />;
    }
  };

  const getStatusText = () => {
    if (!status) return 'Starting export...';

    switch (status.status) {
      case 'pending':
        return 'Preparing export...';
      case 'processing':
        return `Rendering slide ${status.currentSlide} of ${status.totalSlides}...`;
      case 'completed':
        return 'Export complete!';
      case 'failed':
        return 'Export failed';
      default:
        return 'Processing...';
    }
  };

  return (
    <Modal
      title="Export to PDF"
      open={open}
      onCancel={handleClose}
      footer={null}
      closable={status?.status === 'completed' || status?.status === 'failed' || !!error}
      maskClosable={false}
    >
      <div className="py-6">
        <Space direction="vertical" size="large" className="w-full">
          {/* Status icon and text */}
          <div className="text-center">
            <div className="text-4xl mb-4">{getStatusIcon()}</div>
            <Text strong>{getStatusText()}</Text>
          </div>

          {/* Progress bar */}
          <Progress
            percent={status?.progress || 0}
            status={
              status?.status === 'failed'
                ? 'exception'
                : status?.status === 'completed'
                ? 'success'
                : 'active'
            }
            showInfo={true}
          />

          {/* Error message */}
          {error && (
            <Alert
              type="error"
              message="Export Error"
              description={error}
              showIcon
            />
          )}

          {/* Action buttons */}
          <div className="flex justify-center gap-4 mt-4">
            {status?.status === 'completed' && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                size="large"
              >
                Download PDF
              </Button>
            )}

            {(status?.status === 'completed' || status?.status === 'failed' || error) && (
              <Button onClick={handleClose}>
                Close
              </Button>
            )}
          </div>
        </Space>
      </div>
    </Modal>
  );
};

export default ExportProgressModal;
```

---

## Step 6: Create Export Button

**File**: `frontend/src/features/deck-editor/components/ExportButton.tsx`

```tsx
import React, { useState, useCallback } from 'react';
import { Button, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';
import {
  ExportOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { startPdfExport, exportSlideAsPng, ExportQuality } from '../services/exportApi';
import { ExportProgressModal } from './ExportProgressModal';

interface ExportButtonProps {
  deckId: string;
  currentSlideIndex: number;
  disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  deckId,
  currentSlideIndex,
  disabled,
}) => {
  const [exporting, setExporting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  const handleExportPdf = useCallback(async (quality: ExportQuality) => {
    try {
      setExporting(true);
      const result = await startPdfExport(deckId, quality);
      setJobId(result.jobId);
      setShowProgress(true);
    } catch (err) {
      console.error('Failed to start export:', err);
      message.error('Failed to start PDF export');
    } finally {
      setExporting(false);
    }
  }, [deckId]);

  const handleExportCurrentSlide = useCallback(async () => {
    try {
      setExporting(true);
      const blob = await exportSlideAsPng(deckId, currentSlideIndex, 2);

      // Download the blob
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `slide-${currentSlideIndex + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      message.success('Slide exported successfully');
    } catch (err) {
      console.error('Failed to export slide:', err);
      message.error('Failed to export slide');
    } finally {
      setExporting(false);
    }
  }, [deckId, currentSlideIndex]);

  const handleCloseProgress = useCallback(() => {
    setShowProgress(false);
    setJobId(null);
  }, []);

  const menuItems: MenuProps['items'] = [
    {
      key: 'pdf-group',
      type: 'group',
      label: 'Export as PDF',
      children: [
        {
          key: 'pdf-draft',
          icon: <FilePdfOutlined />,
          label: 'Draft Quality (Fast)',
          onClick: () => handleExportPdf('draft'),
        },
        {
          key: 'pdf-standard',
          icon: <FilePdfOutlined />,
          label: 'Standard Quality',
          onClick: () => handleExportPdf('standard'),
        },
        {
          key: 'pdf-high',
          icon: <FilePdfOutlined />,
          label: 'High Quality (Slow)',
          onClick: () => handleExportPdf('high'),
        },
      ],
    },
    { type: 'divider' },
    {
      key: 'png',
      icon: <FileImageOutlined />,
      label: 'Export Current Slide as PNG',
      onClick: handleExportCurrentSlide,
    },
  ];

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        trigger={['click']}
        disabled={disabled || exporting}
      >
        <Button icon={<ExportOutlined />} loading={exporting}>
          Export
        </Button>
      </Dropdown>

      <ExportProgressModal
        open={showProgress}
        onClose={handleCloseProgress}
        deckId={deckId}
        jobId={jobId}
      />
    </>
  );
};

export default ExportButton;
```

---

## Step 7: Install pdf-lib (Backend)

Run on host machine (backend runs on host, not Docker):

```bash
cd backend && npm install pdf-lib
```

---

## Step 8: Export from Feature Index

**Edit**: `frontend/src/features/deck-editor/index.ts`

Add exports:

```typescript
export * from './services/exportApi';
export * from './components/ExportProgressModal';
export * from './components/ExportButton';
```

---

## Verification Checklist

After completing all steps:

1. [ ] `npm run build` in frontend completes without errors
2. [ ] Backend builds without errors
3. [ ] Export button appears in toolbar
4. [ ] Export dropdown shows quality options
5. [ ] Clicking PDF export starts the job
6. [ ] Progress modal shows with percentage
7. [ ] Progress updates as slides are rendered
8. [ ] Download button appears when complete
9. [ ] PDF downloads with correct name
10. [ ] "Export Current Slide" downloads PNG
11. [ ] Failed exports show error message
12. [ ] Modal can be closed after completion

---

## Common Issues

1. **Puppeteer not launching**: Ensure Docker has necessary dependencies (chromium, etc.)
2. **Fonts not rendering**: Load fonts in the HTML template or embed them
3. **Images not loading**: Ensure CORS is configured for image URLs
4. **PDF too large**: Reduce scale factor or use draft quality
5. **Job not found**: Job may have expired, implement retry logic
6. **Timeout on large decks**: Increase timeout settings in Puppeteer

---

## Docker Puppeteer Setup (Production Only)

For **production deployment** in Docker, if Puppeteer isn't working, add these to your Dockerfile:

```dockerfile
# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```
