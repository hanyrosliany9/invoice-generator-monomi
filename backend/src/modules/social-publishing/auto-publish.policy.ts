import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ContentPlatform, SocialPublishStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { MetaAccountsService } from "./meta-accounts.service";
import { MSG } from "./publish-errors";
import { normaliseTargets, PlanItem, validateForTargets } from "./publish-plan";
import { isAdminRole } from "./social-publishing.service";

/**
 * Rules the content calendar applies when an item's auto-publish settings or
 * content change. Kept here so the calendar module has no Meta knowledge.
 *
 *  - enabling auto-publish: admin only, internal client only (phase 1), at
 *    least one of Instagram / Facebook, Meta configured, media valid for
 *    every target (clear messages before anything reaches Meta);
 *  - an item with auto-publish on can only be edited by an admin (a
 *    non-admin must not be able to change what goes out on the official
 *    accounts after an admin approved it);
 *  - no edits while a platform is mid-publish;
 *  - after a relevant edit, unpublished per-platform state is dropped so the
 *    next run starts from the new caption/media (an "outcome uncertain" row
 *    is kept so nothing is re-posted automatically).
 */
@Injectable()
export class AutoPublishPolicy {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: MetaAccountsService,
  ) {}

  async validateEnable(params: {
    userRole: UserRole | undefined;
    clientId: string | null | undefined;
    targets: unknown;
    item: PlanItem;
  }): Promise<ContentPlatform[]> {
    if (!isAdminRole(params.userRole)) {
      throw new ForbiddenException(
        "Hanya admin yang dapat mengaktifkan publikasi otomatis. / Only admins can enable auto-publishing.",
      );
    }
    if (!params.clientId) throw new ForbiddenException(MSG.notInternal);
    const client = await this.prisma.client.findUnique({
      where: { id: params.clientId },
      select: { isInternal: true },
    });
    if (!client?.isInternal) throw new ForbiddenException(MSG.notInternal);

    const norm = normaliseTargets(params.targets ?? []);
    if (norm.error) throw new BadRequestException(norm.error);
    if (norm.targets.length === 0) {
      throw new BadRequestException(
        "Pilih minimal satu platform (Instagram / Facebook) untuk publikasi otomatis. / Choose at least one platform (Instagram / Facebook) for auto-publishing.",
      );
    }
    const s = this.accounts.state;
    if (s.status === "not_configured")
      throw new BadRequestException(MSG.notConfigured);
    if (s.status === "invalid")
      throw new BadRequestException(MSG.configInvalid(s.reason));

    const errors = validateForTargets(params.item, norm.targets);
    if (errors.length) throw new BadRequestException(errors);
    return norm.targets;
  }

  /** Throws when the caller may not modify this item now. */
  async assertModifiable(
    item: { id: string; autoPublish?: boolean | null },
    userRole: UserRole | undefined,
  ): Promise<void> {
    if (item.autoPublish && !isAdminRole(userRole)) {
      throw new ForbiddenException(
        "Konten ini dijadwalkan terbit otomatis; hanya admin yang dapat mengubahnya. / This content is set to auto-publish; only admins can change it.",
      );
    }
    const busy = await this.prisma.socialPublication.count({
      where: {
        contentId: item.id,
        status: SocialPublishStatus.PUBLISHING,
        lockedUntil: { gt: new Date() },
      },
    });
    if (busy > 0) {
      throw new ConflictException(
        "Konten sedang dipublikasikan ke media sosial; coba lagi sebentar. / This content is being published right now; try again shortly.",
      );
    }
  }

  /** Drop unpublished per-platform state after a relevant edit. */
  async resetUnpublished(contentId: string): Promise<void> {
    await this.prisma.socialPublication.deleteMany({
      where: {
        contentId,
        OR: [
          { status: SocialPublishStatus.PENDING },
          { status: SocialPublishStatus.FAILED, requestedAt: null },
        ],
      },
    });
  }
}
