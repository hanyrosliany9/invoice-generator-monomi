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
} from "@nestjs/common";
import { Response } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { DeckExportService } from "../services/deck-export.service";

@ApiTags("Deck Export")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("decks/:id/export")
export class DeckExportController {
  constructor(private readonly exportService: DeckExportService) {}

  @Post("pdf")
  @ApiOperation({ summary: "Generate PDF from deck" })
  @ApiQuery({
    name: "quality",
    enum: ["draft", "standard", "high"],
    required: false,
  })
  @ApiResponse({ status: 200, description: "Returns job ID for tracking" })
  async generatePdf(
    @Param("id") deckId: string,
    @Query("quality") quality: "draft" | "standard" | "high" = "standard",
  ) {
    const jobId = await this.exportService.startPdfGeneration(deckId, quality);
    return { jobId, message: "PDF generation started" };
  }

  @Get("pdf/status/:jobId")
  @ApiOperation({ summary: "Check PDF generation status" })
  @ApiResponse({ status: 200, description: "Job status and progress" })
  async getPdfStatus(@Param("jobId") jobId: string) {
    return this.exportService.getJobStatus(jobId);
  }

  @Get("pdf/download/:jobId")
  @ApiOperation({ summary: "Download generated PDF" })
  @ApiResponse({ status: 200, description: "PDF file" })
  downloadPdf(@Param("jobId") jobId: string, @Res() res: Response) {
    const result = this.exportService.getJobResult(jobId);

    if (!result || !result.filePath) {
      throw new BadRequestException("PDF not ready or job not found");
    }

    (res as any).download(result.filePath, result.filename, (err: any) => {
      if (err) {
        console.error("Download error:", err);
      }
      // Clean up file after download
      this.exportService.cleanupJob(jobId);
    });
  }

  @Post("png")
  @ApiOperation({ summary: "Export single slide as PNG" })
  @ApiQuery({ name: "slideIndex", required: true })
  @ApiQuery({ name: "scale", required: false })
  @ApiResponse({ status: 200, description: "PNG image" })
  async exportSlidePng(
    @Param("id") deckId: string,
    @Query("slideIndex") slideIndex: string,
    @Query("scale") scale: string = "2",
    @Res() res: Response,
  ) {
    const slideIdx = parseInt(slideIndex, 10);
    const scaleNum = parseFloat(scale);

    if (isNaN(slideIdx)) {
      throw new BadRequestException("Invalid slideIndex");
    }

    const buffer = await this.exportService.exportSlideAsPng(
      deckId,
      slideIdx,
      scaleNum,
    );

    res.set({
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="slide-${slideIdx + 1}.png"`,
    });

    res.send(buffer);
  }
}
