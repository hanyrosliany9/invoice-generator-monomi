import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { UniversalCSVParserService } from "./csv-parser.service";
import { CreateReportDto } from "../dto/create-report.dto";
import { AddSectionDto } from "../dto/add-section.dto";
import { UpdateVisualizationsDto } from "../dto/update-visualizations.dto";

@Injectable()
export class SocialMediaReportService {
  constructor(
    private prisma: PrismaService,
    private csvParser: UniversalCSVParserService,
  ) {}

  /**
   * Create a new report
   */
  async createReport(dto: CreateReportDto) {
    // Check if report already exists for this project/month/year
    const existing = await this.prisma.socialMediaReport.findUnique({
      where: {
        projectId_year_month: {
          projectId: dto.projectId,
          year: dto.year,
          month: dto.month,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `A report already exists for this project in ${dto.month}/${dto.year}. Please choose a different month/year or delete the existing report.`,
      );
    }

    return this.prisma.socialMediaReport.create({
      data: {
        projectId: dto.projectId,
        title: dto.title,
        description: dto.description,
        month: dto.month,
        year: dto.year,
        status: "DRAFT",
      },
      include: {
        project: true,
        sections: true,
      },
    });
  }

  /**
   * Get all reports with filters
   */
  async findAll(filters?: {
    projectId?: string;
    year?: number;
    month?: number;
    status?: string;
  }) {
    return this.prisma.socialMediaReport.findMany({
      where: {
        ...(filters?.projectId && { projectId: filters.projectId }),
        ...(filters?.year && { year: filters.year }),
        ...(filters?.month && { month: filters.month }),
        ...(filters?.status && { status: filters.status as any }),
      },
      include: {
        project: true,
        sections: {
          orderBy: { order: "asc" },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  /**
   * Get single report by ID
   */
  async findOne(id: string) {
    const report = await this.prisma.socialMediaReport.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            client: true,
          },
        },
        sections: {
          orderBy: { order: "asc" },
        },
      },
    });

    if (!report) {
      throw new NotFoundException(`Report with ID ${id} not found`);
    }

    return report;
  }

  /**
   * Add a section to a report
   */
  async addSection(
    reportId: string,
    file: Express.Multer.File,
    dto: AddSectionDto,
  ) {
    // 1. Parse CSV
    const parsedData = await this.csvParser.parseFile(
      file.buffer,
      file.originalname,
    );

    // 2. Generate suggested visualizations
    const suggestions = this.csvParser.suggestVisualizations(
      parsedData.rows,
      parsedData.columnTypes,
    );

    // 3. Get next order number
    const lastSection = await this.prisma.reportSection.findFirst({
      where: { reportId },
      orderBy: { order: "desc" },
    });
    const nextOrder = (lastSection?.order || 0) + 1;

    // 4. Create section (sanitize strings to remove null bytes that PostgreSQL can't handle)
    const sanitizeString = (str: string | null | undefined): string | null => {
      if (!str) return null;
      return str.replace(/\u0000/g, ""); // Remove null bytes
    };

    return this.prisma.reportSection.create({
      data: {
        reportId,
        order: nextOrder,
        title: sanitizeString(dto.title) || "Untitled Section",
        description: sanitizeString(dto.description),
        csvFileName: sanitizeString(file.originalname) || "data.csv",
        csvFilePath: null, // TODO: Upload to R2 storage
        columnTypes: parsedData.columnTypes as any,
        rawData: parsedData.rows as any,
        rowCount: parsedData.rowCount,
        visualizations: suggestions as any,
      },
    });
  }

  /**
   * Update visualizations for a section
   */
  async updateVisualizations(sectionId: string, dto: UpdateVisualizationsDto) {
    return this.prisma.reportSection.update({
      where: { id: sectionId },
      data: {
        visualizations: dto.visualizations as any,
      },
    });
  }

  /**
   * Update layout for a section (for visual report builder)
   */
  async updateLayout(sectionId: string, layout: any) {
    return this.prisma.reportSection.update({
      where: { id: sectionId },
      data: {
        layout: layout as any,
        layoutVersion: layout.layoutVersion || 1,
      },
    });
  }

  /**
   * Remove a section
   */
  async removeSection(sectionId: string) {
    return this.prisma.reportSection.delete({
      where: { id: sectionId },
    });
  }

  /**
   * Reorder sections
   */
  async reorderSections(reportId: string, sectionIds: string[]) {
    // Update order for each section
    const updates = sectionIds.map((id, index) =>
      this.prisma.reportSection.update({
        where: { id },
        data: { order: index + 1 },
      }),
    );

    await Promise.all(updates);

    return this.findOne(reportId);
  }

  /**
   * Update report status
   */
  async updateStatus(id: string, status: "DRAFT" | "COMPLETED" | "SENT") {
    return this.prisma.socialMediaReport.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Update PDF metadata
   */
  async updatePDFMetadata(id: string) {
    return this.prisma.socialMediaReport.update({
      where: { id },
      data: {
        pdfGeneratedAt: new Date(),
        pdfVersion: { increment: 1 },
      },
    });
  }

  /**
   * Delete report
   */
  async deleteReport(id: string) {
    return this.prisma.socialMediaReport.delete({
      where: { id },
    });
  }
}
