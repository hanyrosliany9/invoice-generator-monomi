import { Injectable, NotFoundException } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { PDFGeneratorService } from "../reports/services/pdf-generator.service";
import { PortalScopeService } from "./portal-scope.service";

/**
 * Read-only social media reports for the client portal. Only COMPLETED/SENT
 * reports of projects belonging to the client are visible.
 */
@Injectable()
export class PortalReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scope: PortalScopeService,
    private readonly pdfGenerator: PDFGeneratorService,
  ) {}

  async list(clientId: string) {
    const reports = await this.prisma.socialMediaReport.findMany({
      where: this.scope.reportsWhere(clientId),
      select: {
        id: true,
        title: true,
        description: true,
        month: true,
        year: true,
        status: true,
        projectId: true,
        createdAt: true,
        updatedAt: true,
        project: { select: { number: true, description: true } },
        _count: { select: { sections: true } },
        sections: {
          select: { title: true },
          orderBy: { order: "asc" },
          take: 3,
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
    return reports.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      month: r.month,
      year: r.year,
      status: r.status,
      hasPdf: r._count.sections > 0,
      projectId: r.projectId,
      projectName: r.project.description,
      projectNumber: r.project.number,
      sectionCount: r._count.sections,
      sectionTitles: r.sections.map((s) => s.title),
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));
  }

  /**
   * Same structure as the staff report detail (GET /reports/:id) minus
   * internal fields: emailedTo/emailedAt/createdBy/updatedBy/pdfUrl on the
   * report, csvFilePath on sections, and only id/name of the client.
   */
  async detail(clientId: string, reportId: string) {
    await this.scope.reportInScope(clientId, reportId);
    const report = await this.prisma.socialMediaReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        projectId: true,
        title: true,
        description: true,
        month: true,
        year: true,
        status: true,
        pdfGeneratedAt: true,
        pdfVersion: true,
        createdAt: true,
        updatedAt: true,
        project: {
          select: {
            id: true,
            number: true,
            description: true,
            clientId: true,
            client: { select: { id: true, name: true } },
          },
        },
        sections: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            reportId: true,
            order: true,
            title: true,
            description: true,
            csvFileName: true,
            importedAt: true,
            columnTypes: true,
            rawData: true,
            rowCount: true,
            visualizations: true,
            layout: true,
            layoutVersion: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
    if (!report) throw new NotFoundException("Report not found");
    return { ...report, hasPdf: report.sections.length > 0 };
  }

  /**
   * Send the report PDF as an attachment. It is always rendered on demand by
   * the same generator staff use (nothing is stored), so the client always
   * gets the current data.
   */
  async sendPdf(clientId: string, reportId: string, res: Response): Promise<void> {
    await this.scope.reportInScope(clientId, reportId);
    const report = await this.prisma.socialMediaReport.findUnique({
      where: { id: reportId },
      select: {
        id: true,
        title: true,
        month: true,
        year: true,
        _count: { select: { sections: true } },
      },
    });
    if (!report) throw new NotFoundException("Report not found");
    if (report._count.sections === 0) {
      throw new NotFoundException("PDF not available for this report");
    }

    const safeTitle =
      `${report.title}-${report.year}-${String(report.month).padStart(2, "0")}`
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 120) || `report-${report.id}`;

    const buffer = await this.pdfGenerator.generateFullReportPDFFromData(report.id);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", `attachment; filename="${safeTitle}.pdf"`);
    res.setHeader("Cache-Control", "private, no-store");
    res.send(buffer);
  }
}
