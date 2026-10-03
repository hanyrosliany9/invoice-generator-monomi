import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SocialMediaReportService, sanitizeVisualizations } from "../reports/services/social-media-report.service";
import { UniversalCSVParserService } from "../reports/services/csv-parser.service";
import {
  buildInstagramSections,
  GeneratedSection,
  INSTAGRAM_SECTION_KEYS,
  InstagramSectionKey,
  monthBounds,
  wibDay,
} from "./utils/instagram-report-builder";

export interface InstagramBuildOptions {
  /** Keep headline metrics whose data covers < 80% of the month. */
  includePartial?: boolean;
}

export interface AddInstagramSectionsOptions extends InstagramBuildOptions {
  /** Replace this report's existing Instagram sections of the same kind. */
  replace?: boolean;
}

interface ExistingInstagramSection {
  id: string;
  key: InstagramSectionKey | null;
  title: string;
  order: number;
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

/**
 * Report auto-fill from synced Instagram data. Sections are parsed through
 * the same parseGrid path as manual entry and saved through
 * SocialMediaReportService, so the stored shape is identical to manual/CSV
 * sections; only layout.source = "instagram" tells them apart. The layout
 * also records which Instagram account / connection produced the section, so
 * a Meta data-deletion request can find and delete it.
 */
@Injectable()
export class InstagramReportService {
  /** Clock seam for tests. */
  now: () => Date = () => new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly reports: SocialMediaReportService,
    private readonly csvParser: UniversalCSVParserService,
  ) {}

  private async load(reportId: string, opts: InstagramBuildOptions = {}) {
    const report = await this.reports.findOne(reportId);
    const clientId = report.project.client.id;
    const connection = await this.prisma.instagramConnection.findUnique({
      where: { clientId },
      select: {
        id: true,
        igUserId: true,
        igScopedUserId: true,
        username: true,
        status: true,
        lastSyncAt: true,
        profilePictureUrl: true,
        createdAt: true,
      },
    });
    if (!connection) return { report, connection: null, sections: [] as GeneratedSection[] };
    const { first, last } = monthBounds(report.month, report.year);
    // Media timestamps are instants: widen by a day each side, the builder
    // filters on the WIB calendar date.
    const [daily, media] = await Promise.all([
      this.prisma.instagramDailyMetric.findMany({
        where: {
          connectionId: connection.id,
          date: { gte: new Date(`${first}T00:00:00Z`), lte: new Date(`${last}T00:00:00Z`) },
        },
        orderBy: { date: "asc" },
        select: { date: true, followersCount: true, metrics: true },
      }),
      this.prisma.instagramMediaSnapshot.findMany({
        where: {
          connectionId: connection.id,
          timestamp: {
            gte: new Date(Date.parse(`${first}T00:00:00Z`) - 86400000),
            lte: new Date(Date.parse(`${last}T23:59:59Z`) + 86400000),
          },
        },
        select: {
          mediaId: true,
          mediaType: true,
          mediaProductType: true,
          permalink: true,
          caption: true,
          timestamp: true,
          metrics: true,
        },
      }),
    ]);
    const sections = buildInstagramSections({
      month: report.month,
      year: report.year,
      username: connection.username,
      daily,
      media,
      connectedAt: connection.createdAt ?? null,
      today: wibDay(this.now()),
      includePartial: opts.includePartial === true,
    });
    return { report, connection, sections };
  }

  private parse(section: GeneratedSection) {
    if (section.columns.length === 0 || section.rows.length === 0) return null;
    return this.csvParser.parseGrid(section.columns, section.rows as any);
  }

  /** This report's sections generated from Instagram (any account). */
  private async existingSections(reportId: string): Promise<ExistingInstagramSection[]> {
    const rows = await this.prisma.reportSection.findMany({
      where: { reportId },
      select: { id: true, title: true, order: true, layout: true },
      orderBy: { order: "asc" },
    });
    return rows
      .filter((r) => isPlainObject(r.layout) && r.layout.source === "instagram")
      .map((r) => {
        const key = (r.layout as Record<string, unknown>).instagramSection;
        return {
          id: r.id,
          title: r.title,
          order: r.order,
          key: INSTAGRAM_SECTION_KEYS.includes(key as InstagramSectionKey) ? (key as InstagramSectionKey) : null,
        };
      });
  }

  async preview(reportId: string, opts: InstagramBuildOptions = {}) {
    const { report, connection, sections } = await this.load(reportId, opts);
    const existing = await this.existingSections(reportId);
    const base = {
      period: { month: report.month, year: report.year },
      periodMismatch: null,
      includePartial: opts.includePartial === true,
      existing: existing.map(({ id, key, title }) => ({ id, key, title })),
      connection: connection
        ? {
            username: connection.username,
            status: connection.status,
            lastSyncAt: connection.lastSyncAt,
            profilePictureUrl: connection.profilePictureUrl,
            connectedAt: connection.createdAt,
          }
        : null,
    };
    if (!connection) return { ...base, available: false, sections: [] };
    return {
      ...base,
      available: true,
      sections: sections.map((s) => {
        const parsed = this.parse(s);
        return {
          key: s.key,
          title: s.title,
          description: s.description,
          kind: s.kind,
          empty: parsed === null,
          headers: parsed?.headers ?? [],
          columnTypes: parsed?.columnTypes ?? {},
          columnKinds: parsed?.columnKinds ?? {},
          rowCount: parsed?.rowCount ?? 0,
          rows: parsed?.rows.slice(0, 12) ?? [],
          warnings: parsed?.warnings ?? [],
          chartCount: s.visualizations.filter((v) => v.type !== "table").length,
          coverage: s.coverage,
          notes: s.notes,
          hasOmitted: s.coverage.some((c) => c.omitted),
        };
      }),
    };
  }

  /**
   * Add the chosen Instagram sections. Idempotent with `replace`: an existing
   * Instagram section of the same kind in this report is updated in place
   * (same position; duplicates from earlier adds are removed). Without
   * `replace`, existing ones make it a 409 so the UI can ask first.
   */
  async addSections(reportId: string, keys: InstagramSectionKey[], opts: AddInstagramSectionsOptions = {}) {
    const wanted = INSTAGRAM_SECTION_KEYS.filter((k) => keys.includes(k));
    if (wanted.length === 0) throw new BadRequestException("Pilih minimal satu bagian Instagram.");
    const { connection, sections } = await this.load(reportId, opts);
    if (!connection) {
      throw new BadRequestException("Klien laporan ini belum menghubungkan Instagram.");
    }
    const existing = await this.existingSections(reportId);
    const clashing = existing.filter((e) => e.key !== null && wanted.includes(e.key));
    if (clashing.length > 0 && opts.replace !== true) {
      throw new ConflictException({
        message: "Laporan ini sudah memiliki bagian Instagram yang sama. Konfirmasi untuk menggantinya dengan data terbaru.",
        details: { code: "INSTAGRAM_SECTIONS_EXIST", existing: clashing.map(({ id, key, title }) => ({ id, key, title })) },
      });
    }

    const created = [];
    const replaced = [];
    const skipped: string[] = [];
    const generatedAt = this.now().toISOString();
    for (const key of wanted) {
      const s = sections.find((x) => x.key === key);
      const parsed = s ? this.parse(s) : null;
      if (!s || !parsed) {
        skipped.push(key);
        continue;
      }
      const input = {
        title: s.title,
        description: s.description,
        csvFileName: `Instagram @${connection.username}`,
        parsed,
        visualizations: sanitizeVisualizations(s.visualizations),
        source: "instagram" as const,
        layout: {
          instagramKind: s.kind,
          instagramSection: s.key,
          instagramUsername: connection.username,
          // Provenance for data-deletion requests.
          instagramConnectionId: connection.id,
          instagramUserId: connection.igUserId,
          ...(connection.igScopedUserId && { instagramScopedUserId: connection.igScopedUserId }),
          generatedAt,
        },
      };
      const same = clashing.filter((e) => e.key === key);
      if (same.length > 0) {
        replaced.push(await this.reports.replaceGeneratedSection(reportId, same[0].id, input));
        for (const dup of same.slice(1)) await this.reports.removeSection(reportId, dup.id);
      } else {
        created.push(await this.reports.addGeneratedSection(reportId, input));
      }
    }
    if (created.length === 0 && replaced.length === 0) {
      throw new BadRequestException(
        "Belum ada data Instagram untuk bulan laporan ini. Jalankan sinkronisasi atau pilih bulan lain.",
      );
    }
    return { created, replaced, skipped };
  }
}
