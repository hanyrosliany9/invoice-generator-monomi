import { Injectable, NotFoundException } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { PrismaService } from "../prisma/prisma.service";
import { CreateShotListDto } from "./dto/create-shot-list.dto";
import { BulkSaveShotsDto } from "./dto/bulk-save-shots.dto";

@Injectable()
export class ShotListsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateShotListDto) {
    return this.prisma.shotList.create({
      data: { ...dto, createdById: userId },
      include: { scenes: { include: { shots: true } } },
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.shotList.findMany({
      where: { projectId },
      include: {
        scenes: {
          orderBy: { order: "asc" },
          include: { shots: { orderBy: { order: "asc" } } },
        },
        _count: { select: { scenes: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const list = await this.prisma.shotList.findUnique({
      where: { id },
      include: {
        project: true,
        createdBy: { select: { id: true, name: true } },
        scenes: {
          orderBy: { order: "asc" },
          include: { shots: { orderBy: { order: "asc" } } },
        },
      },
    });
    if (!list) throw new NotFoundException("Shot list not found");
    return list;
  }

  async update(
    id: string,
    dto: Partial<{ name: string; description: string }>,
  ) {
    const existing = await this.prisma.shotList.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Shot list not found");

    return this.prisma.shotList.update({
      where: { id },
      data: dto,
      include: {
        scenes: {
          orderBy: { order: "asc" },
          include: { shots: { orderBy: { order: "asc" } } },
        },
      },
    });
  }

  async remove(id: string) {
    await this.prisma.shotList.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Atomically replace a shot list's shots (and optionally its name/description).
   * The whole desired set is diffed and applied inside a single transaction, so
   * a mid-way failure can never leave the list half-written. Order is numbered
   * per-scene by array position.
   */
  async bulkSaveShots(id: string, dto: BulkSaveShotsDto) {
    const existing = await this.prisma.shotList.findUnique({
      where: { id },
      include: { scenes: { select: { id: true } } },
    });
    if (!existing) throw new NotFoundException("Shot list not found");

    await this.prisma.$transaction(
      async (tx) => {
        // 1. shot list meta
        if (dto.name !== undefined || dto.description !== undefined) {
          await tx.shotList.update({
            where: { id },
            data: {
              ...(dto.name !== undefined ? { name: dto.name } : {}),
              ...(dto.description !== undefined
                ? { description: dto.description }
                : {}),
            },
          });
        }

        // 2. ensure at least one scene exists to hold shots
        const sceneIds = new Set(existing.scenes.map((s) => s.id));
        let fallbackSceneId = existing.scenes[0]?.id;
        if (!fallbackSceneId) {
          const scene = await tx.shotListScene.create({
            data: {
              shotListId: id,
              name: "Scene 1",
              sceneNumber: "1",
              order: 0,
            },
          });
          fallbackSceneId = scene.id;
          sceneIds.add(scene.id);
        }

        // 3. delete shots no longer present in the desired set
        const currentShots = await tx.shot.findMany({
          where: { scene: { shotListId: id } },
          select: { id: true },
        });
        const incomingIds = new Set(
          dto.shots
            .map((s) => s.id)
            .filter((x): x is string => typeof x === "string" && x.length > 0),
        );
        const toDelete = currentShots
          .map((s) => s.id)
          .filter((sid) => !incomingIds.has(sid));
        if (toDelete.length > 0) {
          await tx.shot.deleteMany({ where: { id: { in: toDelete } } });
        }
        const existingIds = new Set(currentShots.map((s) => s.id));

        // 4. upsert each shot; order is numbered PER SCENE by array position
        const orderByScene: Record<string, number> = {};
        for (const s of dto.shots) {
          const targetSceneId =
            s.sceneId && sceneIds.has(s.sceneId) ? s.sceneId : fallbackSceneId!;
          const order = (orderByScene[targetSceneId] =
            (orderByScene[targetSceneId] ?? -1) + 1);

          const fields = {
            shotNumber: s.shotNumber,
            order,
            shotSize: s.shotSize,
            shotType: s.shotType,
            cameraAngle: s.cameraAngle,
            cameraMovement: s.cameraMovement,
            lens: s.lens,
            frameRate: s.frameRate,
            camera: s.camera,
            description: s.description,
            action: s.action,
            dialogue: s.dialogue,
            notes: s.notes,
            setupNumber: s.setupNumber,
            estimatedTime: s.estimatedTime,
            vfx: s.vfx,
            sfx: s.sfx,
          };

          if (s.id && existingIds.has(s.id)) {
            await tx.shot.update({
              where: { id: s.id },
              data: { ...fields, sceneId: targetSceneId },
            });
          } else {
            await tx.shot.create({
              data: { ...fields, sceneId: targetSceneId },
            });
          }
        }
      },
      { timeout: 20000 },
    );

    return this.findOne(id);
  }

  async generatePdf(id: string): Promise<Buffer> {
    const shotList = await this.findOne(id);
    const html = this.generateHtml(shotList);

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdf = await page.pdf({
        format: "A4",
        landscape: true,
        printBackground: true,
        margin: { top: "20px", bottom: "20px", left: "20px", right: "20px" },
      });

      return Buffer.from(pdf);
    } finally {
      await browser.close();
    }
  }

  private generateHtml(shotList: any): string {
    const scenesHtml = shotList.scenes
      .map(
        (scene: any) => `
      <div class="scene">
        <div class="scene-header">
          <strong>${scene.sceneNumber}</strong> - ${scene.name}
          ${scene.intExt ? `(${scene.intExt})` : ""}
          ${scene.dayNight ? `/ ${scene.dayNight}` : ""}
        </div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Size</th>
              <th>Type</th>
              <th>Camera</th>
              <th>Movement</th>
              <th>Lens</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${scene.shots
              .map(
                (shot: any) => `
              <tr>
                <td>${shot.shotNumber}</td>
                <td>${shot.shotSize || "-"}</td>
                <td>${shot.shotType || "-"}</td>
                <td>${shot.camera || "-"}</td>
                <td>${shot.cameraMovement || "-"}</td>
                <td>${shot.lens || "-"}</td>
                <td>${shot.description || "-"}</td>
                <td>${shot.status}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `,
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
          h1 { font-size: 18px; margin-bottom: 10px; }
          .meta { color: #666; margin-bottom: 20px; font-size: 10px; }
          .scene { margin-bottom: 20px; page-break-inside: avoid; }
          .scene-header { background: #1f2937; color: #fff; padding: 8px 12px; font-size: 12px; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
          th { background: #f5f5f5; font-weight: bold; font-size: 10px; }
          td { font-size: 10px; }
          tr:nth-child(even) { background: #fafafa; }
        </style>
      </head>
      <body>
        <h1>${this.escapeHtml(shotList.name)}</h1>
        <div class="meta">
          Project: ${this.escapeHtml(shotList.project?.name || "N/A")} |
          Created: ${new Date(shotList.createdAt).toLocaleDateString()}
        </div>
        ${scenesHtml}
      </body>
      </html>
    `;
  }

  private escapeHtml(text: string): string {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
}
