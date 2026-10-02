import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { getErrorMessage } from "../../common/utils/error-handling.util";
import { assertNotInternalClient } from "../clients/client-scope";
import { CreatePortalContactDto, UpdatePortalContactDto } from "./dto/portal.dto";
import { getPortalUrl, normalizePortalEmail } from "./portal.config";
import { maskEmail } from "./portal-auth.service";

const CONTACT_SELECT = {
  id: true,
  email: true,
  name: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

/** Staff-side management of a client's portal contacts (ADMIN/SUPER_ADMIN). */
@Injectable()
export class PortalContactsService {
  private readonly logger = new Logger(PortalContactsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getClient(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, isInternal: true, status: true },
    });
    if (!client) throw new NotFoundException("Klien tidak ditemukan");
    return client;
  }

  private async getContact(clientId: string, contactId: string) {
    const contact = await this.prisma.clientPortalContact.findFirst({
      where: { id: contactId, clientId },
    });
    if (!contact) throw new NotFoundException("Kontak portal tidak ditemukan");
    return contact;
  }

  async list(clientId: string) {
    await this.getClient(clientId);
    return this.prisma.clientPortalContact.findMany({
      where: { clientId },
      select: CONTACT_SELECT,
      orderBy: { createdAt: "asc" },
    });
  }

  async create(clientId: string, dto: CreatePortalContactDto, staffUserId?: string) {
    const client = await this.getClient(clientId);
    assertNotInternalClient(client, "akses portal klien");

    const email = normalizePortalEmail(dto.email);
    const name = dto.name.trim();
    if (!email) throw new BadRequestException("Email wajib diisi");
    if (!name) throw new BadRequestException("Nama wajib diisi");

    try {
      return await this.prisma.clientPortalContact.create({
        data: { clientId, email, name, createdById: staffUserId ?? null },
        select: CONTACT_SELECT,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Email ini sudah terdaftar sebagai kontak portal untuk klien ini",
        );
      }
      throw error;
    }
  }

  async update(clientId: string, contactId: string, dto: UpdatePortalContactDto) {
    const contact = await this.getContact(clientId, contactId);
    const data: Prisma.ClientPortalContactUpdateInput = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new BadRequestException("Nama wajib diisi");
      data.name = name;
    }
    if (dto.isActive !== undefined && dto.isActive !== contact.isActive) {
      data.isActive = dto.isActive;
      if (!dto.isActive) {
        // Revoke every existing session of this contact immediately.
        data.tokenVersion = { increment: 1 };
      }
    }
    return this.prisma.clientPortalContact.update({
      where: { id: contact.id },
      data,
      select: CONTACT_SELECT,
    });
  }

  async remove(clientId: string, contactId: string) {
    const contact = await this.getContact(clientId, contactId);
    await this.prisma.clientPortalContact.delete({ where: { id: contact.id } });
    return { deleted: true, id: contact.id };
  }

  /**
   * Email the contact an invitation with the portal URL. Unlike the public
   * request-code endpoint, delivery failures ARE reported to staff (503).
   */
  async invite(clientId: string, contactId: string) {
    const client = await this.getClient(clientId);
    assertNotInternalClient(client, "akses portal klien");
    const contact = await this.getContact(clientId, contactId);
    if (!contact.isActive) {
      throw new BadRequestException(
        "Kontak portal tidak aktif. Aktifkan kontak sebelum mengirim undangan.",
      );
    }
    if (client.status !== "active") {
      throw new BadRequestException(
        "Klien tidak aktif. Aktifkan klien sebelum mengirim undangan portal.",
      );
    }

    try {
      await this.notifications.sendPortalInvite(
        contact.email,
        {
          name: contact.name,
          email: contact.email,
          clientName: client.name,
          portalUrl: getPortalUrl(),
        },
        contact.id,
      );
    } catch (error) {
      this.logger.error(
        `Portal invite to ${maskEmail(contact.email)} FAILED (check SMTP configuration): ${getErrorMessage(error)}`,
      );
      throw new ServiceUnavailableException(
        "Email undangan gagal dikirim. Periksa konfigurasi SMTP server lalu coba lagi.",
      );
    }
    return { sent: true };
  }
}
