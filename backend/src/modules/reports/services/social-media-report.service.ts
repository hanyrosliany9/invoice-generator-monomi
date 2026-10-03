import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { ReportStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import {
  ParsedCSVData,
  UniversalCSVParserService,
} from "./csv-parser.service";
import { CreateReportDto } from "../dto/create-report.dto";
import { AddSectionDto, UpdateSectionDto } from "../dto/add-section.dto";
import { UpdateVisualizationsDto } from "../dto/update-visualizations.dto";
import { UpdateReportDto } from "../dto/update-report.dto";
import { ManualSectionDto } from "../dto/manual-section.dto";
import { NotificationsService } from "../../notifications/notifications.service";
import { getPortalUrl } from "../../portal/portal.config";
import { assertNotInternalClient } from "../../clients/client-scope";
import { getErrorMessage } from "../../../common/utils/error-handling.util";
import { nextPeriod, retitleForPeriod } from "../utils/report-duplicate";
import { periodLabel } from "../utils/report-pdf-html";
import {
  ChartImpact,
  findPeriodMismatch,
  PeriodMismatch,
  vizTitle,
} from "../utils/report-period";

const REPORT_STATUSES: ReportStatus[] = ["DRAFT", "COMPLETED", "SENT"];

/** Where a section's data came from (layout.source). "instagram" = auto-filled from synced insights. */
export type SectionSource = "file" | "manual" | "metrics" | "instagram";

const VIZ_TYPES = ["line", "bar", "pie", "area", "table", "metric_card"];
const VIZ_AGGS = ["sum", "avg", "average", "count", "min", "max", "latest"];
const MAX_VIZ = 40;
export const MAX_MANUAL_ROWS = 400;
export const MAX_MANUAL_COLUMNS = 30;

const stripNull = (str: string | null | undefined): string | null =>
  str ? str.replace(/\u0000/g, "") : null;

const normName = (s: string): string => s.toLowerCase().replace(/[\s_\-.]+/g, "");

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Keep only known chart settings so arbitrary JSON never reaches the section. */
export function sanitizeVisualizations(input: unknown): any[] {
  if (!Array.isArray(input)) {
    throw new BadRequestException("Daftar grafik tidak valid.");
  }
  if (input.length > MAX_VIZ) {
    throw new BadRequestException(`Maksimum ${MAX_VIZ} grafik per bagian.`);
  }
  const str = (v: unknown, max = 200): string | undefined =>
    typeof v === "string" ? v.replace(/\u0000/g, "").slice(0, max) : undefined;
  return input.map((raw, i) => {
    if (!isPlainObject(raw) || !VIZ_TYPES.includes(raw.type as string)) {
      throw new BadRequestException(`Grafik ke-${i + 1}: jenis grafik tidak valid.`);
    }
    const out: Record<string, unknown> = {
      type: raw.type,
      title: str(raw.title) ?? "",
    };
    for (const k of ["xAxis", "groupBy", "metric", "nameKey", "valueKey", "color"]) {
      const v = str(raw[k]);
      if (v !== undefined && v !== "") out[k] = v;
    }
    if (Array.isArray(raw.yAxis)) {
      out.yAxis = raw.yAxis.filter((y): y is string => typeof y === "string").slice(0, 8);
    } else if (typeof raw.yAxis === "string" && raw.yAxis !== "") {
      out.yAxis = [raw.yAxis];
    }
    if (typeof raw.aggregation === "string" && VIZ_AGGS.includes(raw.aggregation)) {
      out.aggregation = raw.aggregation;
    }
    if (Array.isArray(raw.colors)) {
      out.colors = raw.colors.filter((c): c is string => typeof c === "string").slice(0, 12);
    }
    if (typeof raw.precision === "number" && Number.isFinite(raw.precision)) {
      out.precision = Math.min(6, Math.max(0, Math.trunc(raw.precision)));
    }
    return out;
  });
}

/** Map an existing chart's columns onto the new headers (case/space-insensitive). */
export function remapVisualizations(
  existing: any[],
  headers: string[],
): { kept: any[]; dropped: string[] } {
  const byNorm = new Map(headers.map((h) => [normName(h), h]));
  const map = (c: unknown): string | null =>
    typeof c === "string" ? (byNorm.get(normName(c)) ?? null) : null;
  const kept: any[] = [];
  const dropped: string[] = [];
  for (const v of existing) {
    if (v?.type === "table") {
      kept.push(v);
      continue;
    }
    const next: any = { ...v };
    let ok = true;
    for (const k of ["xAxis", "valueKey", "nameKey", "metric", "groupBy"]) {
      if (typeof v?.[k] === "string" && v[k] !== "") {
        const m = map(v[k]);
        if (m === null) ok = false;
        else next[k] = m;
      }
    }
    if (Array.isArray(v?.yAxis)) {
      const ys = v.yAxis.map(map);
      if (ys.some((y: string | null) => y === null)) ok = false;
      else next.yAxis = ys;
    }
    if (ok) kept.push(next);
    else dropped.push(String(v?.title ?? v?.type ?? "grafik"));
  }
  return { kept, dropped };
}

@Injectable()
export class SocialMediaReportService {
  private readonly logger = new Logger(SocialMediaReportService.name);

  constructor(
    private prisma: PrismaService,
    private csvParser: UniversalCSVParserService,
    private notifications: NotificationsService,
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
        `Laporan untuk proyek ini pada ${periodLabel(dto.month, dto.year)} sudah ada. Pilih bulan/tahun lain, atau buka laporan yang sudah ada.`,
      );
    }

    return this.prisma.socialMediaReport.create({
      data: {
        projectId: dto.projectId,
        title: dto.title.trim(),
        description: dto.description?.trim() || undefined,
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
        project: { include: { client: { select: { id: true, name: true } } } },
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
   * Read a file and show how it would be imported (nothing is saved), so the
   * person can see the detected columns and the first rows before adding it.
   */
  async previewFile(
    file: Express.Multer.File,
    target?: { reportId?: string; sectionId?: string },
  ) {
    if (!file) {
      throw new BadRequestException("Pilih file CSV atau Excel terlebih dahulu.");
    }
    const parsed = await this.csvParser.parseFile(file.buffer, file.originalname);

    // When the file is meant for a given report/section, say up front whether
    // its dates fit the report's month and what a replacement would do to the
    // section's charts, so the person confirms BEFORE anything is saved.
    let period: { month: number; year: number } | null = null;
    let periodMismatch: PeriodMismatch | null = null;
    let chartImpact: ChartImpact | null = null;
    if (target?.reportId) {
      const report = await this.findOne(target.reportId);
      period = { month: report.month, year: report.year };
      periodMismatch = findPeriodMismatch(parsed, report.month, report.year);
      if (target.sectionId) {
        const section = await this.findSection(target.reportId, target.sectionId);
        chartImpact = this.planReplacement(section.visualizations, parsed, "file").impact;
      }
    }
    return {
      fileName: file.originalname,
      headers: parsed.headers,
      columnTypes: parsed.columnTypes,
      columnKinds: parsed.columnKinds,
      rowCount: parsed.rowCount,
      rows: parsed.rows.slice(0, 12),
      warnings: parsed.warnings,
      period,
      periodMismatch,
      chartImpact,
    };
  }

  /** Fields of a section that come from parsed data. */
  private dataFields(
    parsed: ParsedCSVData,
    source: SectionSource,
    previousLayout?: unknown,
  ) {
    return {
      columnTypes: parsed.columnTypes as any,
      rawData: parsed.rows as any,
      rowCount: parsed.rowCount,
      // JSON storage does not keep key order; remember the file's column order.
      layout: {
        ...(isPlainObject(previousLayout) ? previousLayout : {}),
        columnOrder: parsed.headers,
        source,
      } as any,
    };
  }

  private async nextOrder(reportId: string): Promise<number> {
    const last = await this.prisma.reportSection.findFirst({
      where: { reportId },
      orderBy: { order: "desc" },
    });
    return (last?.order || 0) + 1;
  }

  /**
   * Add a section to a report
   */
  async addSection(
    reportId: string,
    file: Express.Multer.File,
    dto: AddSectionDto,
  ) {
    // 0. Guard: file is required
    if (!file) {
      throw new BadRequestException("Pilih file CSV atau Excel terlebih dahulu.");
    }

    // 0b. Guard: report must exist (throws NotFoundException for bad reportId)
    await this.findOne(reportId);

    // 1. Parse CSV / Excel
    const parsedData = await this.csvParser.parseFile(
      file.buffer,
      file.originalname,
    );

    // 2. Generate suggested visualizations
    const suggestions = this.csvParser.suggestVisualizations(
      parsedData.rows,
      parsedData.columnTypes,
      parsedData.headers,
    );

    // 3. Create section (strip null bytes that PostgreSQL can't handle)
    const section = await this.prisma.reportSection.create({
      data: {
        reportId,
        order: await this.nextOrder(reportId),
        title: stripNull(dto.title)?.trim() || "Bagian tanpa judul",
        description: stripNull(dto.description),
        csvFileName: stripNull(file.originalname) || "data.csv",
        csvFilePath: null, // TODO: Upload to R2 storage
        ...this.dataFields(parsedData, "file"),
        visualizations: suggestions as any,
      },
    });
    return { ...section, warnings: parsedData.warnings };
  }

  /**
   * Add a section from the manual grid ("table") or the headline-numbers form
   * ("metrics"): same stored shape as a CSV upload.
   */
  async addManualSection(reportId: string, dto: ManualSectionDto) {
    await this.findOne(reportId);
    const title = stripNull(dto.title)?.trim();
    if (!title) {
      throw new BadRequestException("Judul bagian wajib diisi.");
    }
    const kind = dto.kind === "metrics" ? "metrics" : "manual";
    const parsed = this.parseManual(dto);
    const visualizations =
      kind === "metrics"
        ? this.csvParser.metricVisualizations(parsed.headers, parsed.columnTypes, parsed.rows)
        : this.csvParser.suggestVisualizations(parsed.rows, parsed.columnTypes, parsed.headers);
    const section = await this.prisma.reportSection.create({
      data: {
        reportId,
        order: await this.nextOrder(reportId),
        title,
        description: stripNull(dto.description),
        csvFileName: kind === "metrics" ? "Ringkasan angka" : "Input manual",
        csvFilePath: null,
        ...this.dataFields(parsed, kind),
        visualizations: visualizations as any,
      },
    });
    return { ...section, warnings: parsed.warnings };
  }

  private parseManual(dto: ManualSectionDto): ParsedCSVData {
    if (dto.columns.length === 0) {
      throw new BadRequestException("Tambahkan minimal satu kolom.");
    }
    if (dto.columns.length > MAX_MANUAL_COLUMNS) {
      throw new BadRequestException(`Maksimum ${MAX_MANUAL_COLUMNS} kolom.`);
    }
    if (dto.rows.length > MAX_MANUAL_ROWS) {
      throw new BadRequestException(
        `Maksimum ${MAX_MANUAL_ROWS} baris untuk input manual. Gunakan unggah file untuk data lebih besar.`,
      );
    }
    if (!dto.rows.every((r) => Array.isArray(r))) {
      throw new BadRequestException("Format baris tidak valid.");
    }
    if (
      dto.kind === "metrics" &&
      dto.columns.some((c) => !["number", "percent", "currency"].includes(c.type))
    ) {
      throw new BadRequestException(
        "Ringkasan angka hanya berisi angka, persen, atau rupiah.",
      );
    }
    return this.csvParser.parseGrid(dto.columns as any, dto.rows as any);
  }

  /**
   * Add a section generated by an integration (Instagram auto-fill). The data
   * arrives already parsed through UniversalCSVParserService.parseGrid, so the
   * stored shape is exactly that of a manual/CSV section.
   */
  async addGeneratedSection(
    reportId: string,
    input: {
      title: string;
      description?: string | null;
      csvFileName: string;
      parsed: ParsedCSVData;
      visualizations: unknown;
      source: Extract<SectionSource, "instagram">;
      layout?: Record<string, unknown>;
    },
  ) {
    await this.findOne(reportId);
    const section = await this.prisma.reportSection.create({
      data: {
        reportId,
        order: await this.nextOrder(reportId),
        title: stripNull(input.title)?.trim().slice(0, 200) || "Bagian tanpa judul",
        description: stripNull(input.description ?? null)?.slice(0, 2000) ?? null,
        csvFileName: stripNull(input.csvFileName)?.slice(0, 200) || input.source,
        csvFilePath: null,
        ...this.dataFields(input.parsed, input.source, input.layout),
        visualizations: sanitizeVisualizations(input.visualizations) as any,
      },
    });
    return { ...section, warnings: input.parsed.warnings };
  }

  /**
   * Replace a generated section's content in place (same id and position),
   * e.g. re-importing Instagram data for the same report. Only sections that
   * were generated from the same source may be replaced.
   */
  async replaceGeneratedSection(
    reportId: string,
    sectionId: string,
    input: {
      title: string;
      description?: string | null;
      csvFileName: string;
      parsed: ParsedCSVData;
      visualizations: unknown;
      source: Extract<SectionSource, "instagram">;
      layout?: Record<string, unknown>;
    },
  ) {
    const existing = await this.findSection(reportId, sectionId);
    const prev = isPlainObject(existing.layout) ? (existing.layout as Record<string, unknown>) : {};
    if (prev.source !== input.source) {
      throw new BadRequestException("Bagian ini tidak dibuat dari sumber yang sama dan tidak dapat diganti.");
    }
    const section = await this.prisma.reportSection.update({
      where: { id: sectionId },
      data: {
        title: stripNull(input.title)?.trim().slice(0, 200) || "Bagian tanpa judul",
        description: stripNull(input.description ?? null)?.slice(0, 2000) ?? null,
        csvFileName: stripNull(input.csvFileName)?.slice(0, 200) || input.source,
        importedAt: new Date(),
        // Fresh layout: a stale column order / grid from the old data must not survive.
        ...this.dataFields(input.parsed, input.source, input.layout),
        visualizations: sanitizeVisualizations(input.visualizations) as any,
      },
    });
    return { ...section, warnings: input.parsed.warnings };
  }

  /** Rename a section / change its description. */
  async updateSection(reportId: string, sectionId: string, dto: UpdateSectionDto) {
    await this.findSection(reportId, sectionId);
    const title = dto.title !== undefined ? stripNull(dto.title)?.trim() : undefined;
    if (title !== undefined && title === "") {
      throw new BadRequestException("Judul bagian tidak boleh kosong.");
    }
    return this.prisma.reportSection.update({
      where: { id: sectionId },
      data: {
        ...(title !== undefined && { title }),
        ...(dto.description !== undefined && {
          description: stripNull(dto.description)?.trim() || null,
        }),
      },
    });
  }

  /**
   * Update visualizations for a section
   */
  async updateVisualizations(
    reportId: string,
    sectionId: string,
    dto: UpdateVisualizationsDto,
  ) {
    const section = await this.prisma.reportSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.reportId !== reportId) {
      throw new NotFoundException(
        `Section ${sectionId} not found in report ${reportId}`,
      );
    }
    return this.prisma.reportSection.update({
      where: { id: sectionId },
      data: {
        visualizations: sanitizeVisualizations(dto.visualizations),
      },
    });
  }

  /**
   * Update layout for a section (for visual report builder)
   */
  async updateLayout(reportId: string, sectionId: string, layout: any) {
    const section = await this.prisma.reportSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.reportId !== reportId) {
      throw new NotFoundException(
        `Section ${sectionId} not found in report ${reportId}`,
      );
    }
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
  async removeSection(reportId: string, sectionId: string) {
    const section = await this.prisma.reportSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.reportId !== reportId) {
      throw new NotFoundException(
        `Section ${sectionId} not found in report ${reportId}`,
      );
    }
    return this.prisma.reportSection.delete({
      where: { id: sectionId },
    });
  }

  /**
   * Reorder sections
   */
  async reorderSections(reportId: string, sectionIds: string[]) {
    // Verify all sectionIds belong to this report (Fix 2: IDOR)
    const sections = await this.prisma.reportSection.findMany({
      where: { id: { in: sectionIds }, reportId },
      select: { id: true },
    });
    if (sections.length !== sectionIds.length) {
      throw new BadRequestException(
        "One or more section IDs do not belong to this report",
      );
    }

    // Fix 3: wrap per-section order updates in a transaction
    await this.prisma.$transaction(
      sectionIds.map((id, index) =>
        this.prisma.reportSection.update({
          where: { id },
          data: { order: index + 1 },
        }),
      ),
    );

    return this.findOne(reportId);
  }

  /**
   * Update report status. DRAFT hides the report from the client portal
   * (only COMPLETED/SENT are visible there), so "back to draft" is the way to
   * unpublish a report.
   */
  async updateStatus(id: string, status: ReportStatus) {
    if (!REPORT_STATUSES.includes(status)) {
      throw new BadRequestException("Status laporan tidak valid");
    }
    await this.findOne(id);
    return this.prisma.socialMediaReport.update({
      where: { id },
      data: { status },
    });
  }

  /**
   * Edit title / description / period. Month+year must stay unique per
   * project. Changes to a COMPLETED/SENT report are visible to the client
   * immediately (the portal reads the same row).
   */
  async updateReport(id: string, dto: UpdateReportDto) {
    const report = await this.findOne(id);
    const title = dto.title !== undefined ? dto.title.trim() : undefined;
    if (title !== undefined && title === "") {
      throw new BadRequestException("Judul laporan tidak boleh kosong");
    }
    const month = dto.month ?? report.month;
    const year = dto.year ?? report.year;
    if (month !== report.month || year !== report.year) {
      const clash = await this.prisma.socialMediaReport.findUnique({
        where: {
          projectId_year_month: { projectId: report.projectId, year, month },
        },
      });
      if (clash && clash.id !== id) {
        throw new ConflictException(
          `Laporan untuk proyek ini pada ${month}/${year} sudah ada. Pilih bulan/tahun lain.`,
        );
      }
    }
    return this.prisma.socialMediaReport.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(dto.description !== undefined && {
          description: dto.description.trim() === "" ? null : dto.description,
        }),
        month,
        year,
      },
      include: { project: { include: { client: true } }, sections: true },
    });
  }

  /**
   * Replace the data of an existing section (keeping its title, description
   * and chart configuration where the columns still exist). Used after "copy
   * to next month" to fill the empty sections with the new month's data.
   */
  async replaceSectionData(
    reportId: string,
    sectionId: string,
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException("Pilih file CSV atau Excel terlebih dahulu.");
    }
    const section = await this.findSection(reportId, sectionId);
    const parsed = await this.csvParser.parseFile(file.buffer, file.originalname);
    return this.saveReplacement(section, parsed, "file", {
      csvFileName: stripNull(file.originalname) || "data.csv",
    });
  }

  /** Replace a section's data from the grid editor (also edits a wrong cell). */
  async replaceManualData(
    reportId: string,
    sectionId: string,
    dto: ManualSectionDto,
  ) {
    const section = await this.findSection(reportId, sectionId);
    const layout = isPlainObject(section.layout) ? section.layout : {};
    const kind =
      dto.kind === "metrics" || (dto.kind === undefined && layout.source === "metrics")
        ? "metrics"
        : "manual";
    const parsed = this.parseManual({ ...dto, kind: kind === "metrics" ? "metrics" : "table" });
    const title = dto.title !== undefined ? stripNull(dto.title)?.trim() : undefined;
    if (title !== undefined && title === "") {
      throw new BadRequestException("Judul bagian tidak boleh kosong.");
    }
    // An edited file import keeps showing its file name.
    const keepFile = layout.source === "file" && section.csvFileName !== "";
    return this.saveReplacement(section, parsed, layout.source === "file" ? "file" : kind, {
      csvFileName: keepFile
        ? section.csvFileName
        : kind === "metrics"
          ? "Ringkasan angka"
          : "Input manual",
      title,
      description: dto.description !== undefined ? stripNull(dto.description) : undefined,
    });
  }

  private async findSection(reportId: string, sectionId: string) {
    const section = await this.prisma.reportSection.findUnique({
      where: { id: sectionId },
    });
    if (!section || section.reportId !== reportId) {
      throw new NotFoundException(
        `Section ${sectionId} not found in report ${reportId}`,
      );
    }
    return section;
  }

  private async saveReplacement(
    section: { id: string; layout: unknown; visualizations: unknown },
    parsed: ParsedCSVData,
    source: "file" | "manual" | "metrics",
    meta: { csvFileName: string; title?: string | null; description?: string | null },
  ) {
    // Removed charts are reported as structured data (chartImpact) so the UI
    // can say it in the viewer's language; `warnings` keeps parser notes only.
    const warnings = [...parsed.warnings];
    const plan = this.planReplacement(section.visualizations, parsed, source);
    const visualizations = plan.visualizations;
    const updated = await this.prisma.reportSection.update({
      where: { id: section.id },
      data: {
        csvFileName: meta.csvFileName,
        ...(meta.title !== undefined && meta.title !== null && { title: meta.title }),
        ...(meta.description !== undefined && { description: meta.description }),
        ...this.dataFields(parsed, source, section.layout),
        visualizations: visualizations as any,
        importedAt: new Date(),
      },
    });
    return { ...updated, warnings, chartImpact: plan.impact };
  }

  /**
   * What replacing a section's data does to its charts: charts whose columns
   * still exist are kept (columns matched ignoring case/spacing); otherwise
   * the charts are suggested afresh. Shared by the replacement itself and by
   * parse-preview, so the confirmation lists exactly what will be removed.
   */
  private planReplacement(
    existingRaw: unknown,
    parsed: ParsedCSVData,
    source: "file" | "manual" | "metrics",
  ): { visualizations: any[]; impact: ChartImpact } {
    const existing = Array.isArray(existingRaw) ? (existingRaw as any[]) : [];
    const oldCharts = existing.filter((v) => v?.type !== "table");
    if (source === "metrics") {
      const titles = new Map(existing.map((v) => [String(v?.valueKey), v?.title]));
      const visualizations = this.csvParser
        .metricVisualizations(parsed.headers, parsed.columnTypes, parsed.rows)
        .map((v) => ({ ...v, title: titles.get(v.valueKey as string) ?? v.title }));
      return {
        visualizations,
        impact: {
          before: oldCharts.length,
          kept: visualizations.map(vizTitle),
          removed: [],
          regenerated: false,
          created: 0,
        },
      };
    }
    const { kept, dropped } = remapVisualizations(existing, parsed.headers);
    const charts = kept.filter((v) => v.type !== "table");
    if (existing.length > 0 && charts.length > 0 && dropped.length <= charts.length) {
      return {
        visualizations: kept,
        impact: {
          before: oldCharts.length,
          kept: charts.map(vizTitle),
          removed: dropped,
          regenerated: false,
          created: 0,
        },
      };
    }
    const visualizations = this.csvParser.suggestVisualizations(
      parsed.rows,
      parsed.columnTypes,
      parsed.headers,
    );
    return {
      visualizations,
      impact: {
        before: oldCharts.length,
        kept: [],
        removed: oldCharts.map(vizTitle),
        regenerated: true,
        created: visualizations.filter((v: any) => v?.type !== "table").length,
      },
    };
  }

  /**
   * "Copy from last month": a new DRAFT report for the same project in the
   * next free period (or the requested one) with the same title pattern,
   * description and section structure (titles, descriptions, chart configs)
   * but NO data, ready for new CSV uploads.
   */
  async duplicateReport(id: string, target?: { month?: number; year?: number }) {
    const source = await this.findOne(id);
    const explicit = target?.month !== undefined && target?.year !== undefined;
    let period = explicit
      ? { month: target.month as number, year: target.year as number }
      : nextPeriod({ month: source.month, year: source.year });
    const exists = async (p: { month: number; year: number }) =>
      !!(await this.prisma.socialMediaReport.findUnique({
        where: {
          projectId_year_month: {
            projectId: source.projectId,
            year: p.year,
            month: p.month,
          },
        },
        select: { id: true },
      }));
    if (!explicit) {
      // Auto mode: skip periods that already have a report.
      for (let i = 0; i < 24 && (await exists(period)); i++) {
        period = nextPeriod(period);
      }
    }
    if (await exists(period)) {
      throw new ConflictException(
        `Laporan untuk proyek ini pada ${period.month}/${period.year} sudah ada.`,
      );
    }
    const from = { month: source.month, year: source.year };
    return this.prisma.socialMediaReport.create({
      data: {
        projectId: source.projectId,
        title: retitleForPeriod(source.title, from, period),
        description: source.description
          ? retitleForPeriod(source.description, from, period)
          : null,
        month: period.month,
        year: period.year,
        status: "DRAFT",
        sections: {
          create: source.sections.map((sec, i) => ({
            order: i + 1,
            title: sec.title,
            description: sec.description,
            csvFileName: "",
            csvFilePath: null,
            columnTypes: {},
            rawData: [],
            rowCount: 0,
            visualizations: (sec.visualizations ?? []) as any,
          })),
        },
      },
      include: { project: { include: { client: true } }, sections: true },
    });
  }

  /** Active portal contacts that "send to client" would notify. */
  async getSendRecipients(id: string) {
    const report = await this.findOne(id);
    const client = report.project.client;
    const contacts = client.isInternal
      ? []
      : await this.prisma.clientPortalContact.findMany({
          where: { clientId: client.id, isActive: true },
          select: { id: true, name: true, email: true },
          orderBy: { name: "asc" },
        });
    return {
      client: { id: client.id, name: client.name, isInternal: client.isInternal },
      contacts,
      reportUrl: this.reportUrl(client.id, id),
      lastEmailedAt: report.emailedAt,
      lastEmailedTo: report.emailedTo,
    };
  }

  private reportUrl(clientId: string, reportId: string): string {
    return `${getPortalUrl()}/c/${clientId}/reports/${reportId}`;
  }

  /**
   * "Kirim ke klien": email every active portal contact of the report's client
   * a link to the report in the portal, then mark it SENT with emailedAt /
   * emailedTo. If NO email could be delivered (e.g. SMTP misconfigured) the
   * status is left untouched and a 503 with per-recipient reasons is thrown.
   */
  async sendToClient(id: string) {
    const report = await this.findOne(id);
    const client = report.project.client;
    assertNotInternalClient(client, "mengirim laporan ke klien");
    if (client.status !== "active") {
      throw new BadRequestException(
        "Klien tidak aktif. Aktifkan klien sebelum mengirim laporan.",
      );
    }
    if (!report.sections.some((s) => s.rowCount > 0)) {
      throw new BadRequestException(
        "Laporan belum memiliki data. Unggah data minimal satu bagian sebelum mengirim.",
      );
    }
    const contacts = await this.prisma.clientPortalContact.findMany({
      where: { clientId: client.id, isActive: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    if (contacts.length === 0) {
      throw new BadRequestException({
        message:
          "Klien ini belum memiliki kontak portal aktif. Tambahkan kontak portal di halaman klien terlebih dahulu.",
        details: { code: "NO_PORTAL_CONTACTS", clientId: client.id },
      });
    }

    const period = periodLabel(report.month, report.year);
    const link = this.reportUrl(client.id, id);
    const results: { email: string; name: string; ok: boolean; error?: string }[] = [];
    for (const c of contacts) {
      try {
        await this.notifications.sendReportReady(
          c.email,
          {
            name: c.name,
            email: c.email,
            clientName: client.name,
            reportTitle: report.title,
            period,
            reportUrl: link,
          },
          id,
        );
        results.push({ email: c.email, name: c.name, ok: true });
      } catch (error) {
        this.logger.error(
          `Report ${id} email to a portal contact FAILED (check SMTP configuration): ${getErrorMessage(error)}`,
        );
        results.push({
          email: c.email,
          name: c.name,
          ok: false,
          error: getErrorMessage(error).slice(0, 200),
        });
      }
    }

    const delivered = results.filter((r) => r.ok).map((r) => r.email);
    if (delivered.length === 0) {
      throw new ServiceUnavailableException({
        message:
          "Email gagal dikirim ke semua penerima. Periksa konfigurasi SMTP server lalu coba lagi. Status laporan tidak diubah.",
        details: { code: "EMAIL_FAILED", results },
      });
    }
    const updated = await this.prisma.socialMediaReport.update({
      where: { id },
      data: { status: "SENT", emailedAt: new Date(), emailedTo: delivered },
    });
    return {
      report: updated,
      sent: delivered.length,
      failed: results.length - delivered.length,
      results,
      reportUrl: link,
    };
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
