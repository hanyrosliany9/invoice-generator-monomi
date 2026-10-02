import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PortalContactsService } from "./portal-contacts.service";

describe("PortalContactsService (staff management)", () => {
  let service: PortalContactsService;
  const clients: Record<string, any> = {
    "client-a": { id: "client-a", name: "Alpha", isInternal: false, status: "active" },
    "client-internal": { id: "client-internal", name: "Monomi", isInternal: true, status: "active" },
  };
  let contacts: any[];
  const prisma = {
    client: { findUnique: jest.fn(async ({ where }: any) => clients[where.id] ?? null) },
    clientPortalContact: {
      findMany: jest.fn(async ({ where }: any) => contacts.filter((c) => c.clientId === where.clientId)),
      findFirst: jest.fn(async ({ where }: any) =>
        contacts.find((c) => c.id === where.id && c.clientId === where.clientId) ?? null,
      ),
      create: jest.fn(async ({ data }: any) => {
        if (contacts.some((c) => c.clientId === data.clientId && c.email === data.email)) {
          throw new Prisma.PrismaClientKnownRequestError("dup", { code: "P2002", clientVersion: "5" });
        }
        const row = { id: `ct-${contacts.length + 1}`, isActive: true, tokenVersion: 0, lastLoginAt: null, createdAt: new Date(), ...data };
        contacts.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const row = contacts.find((c) => c.id === where.id);
        for (const [k, v] of Object.entries<any>(data)) {
          row[k] = v && typeof v === "object" && "increment" in v ? row[k] + v.increment : v;
        }
        return row;
      }),
      delete: jest.fn(async ({ where }: any) => {
        contacts = contacts.filter((c) => c.id !== where.id);
      }),
    },
  };
  const notifications = { sendPortalInvite: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    contacts = [
      { id: "ct-1", clientId: "client-a", email: "budi@alpha.co", name: "Budi", isActive: true, tokenVersion: 0 },
    ];
    service = new PortalContactsService(prisma as any, notifications as any);
    jest.spyOn((service as any).logger, "error").mockImplementation(() => undefined);
  });

  it("refuses contacts for an internal client", async () => {
    await expect(
      service.create("client-internal", { email: "x@monomi.id", name: "X" }, "staff-1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.clientPortalContact.create).not.toHaveBeenCalled();
  });

  it("refuses to invite a contact of an internal client", async () => {
    contacts.push({ id: "ct-int", clientId: "client-internal", email: "x@monomi.id", name: "X", isActive: true, tokenVersion: 0 });
    await expect(service.invite("client-internal", "ct-int")).rejects.toBeInstanceOf(BadRequestException);
    expect(notifications.sendPortalInvite).not.toHaveBeenCalled();
  });

  it("stores the email lowercased/trimmed and records the creator", async () => {
    await service.create("client-a", { email: "  NEW@Alpha.CO ", name: " New " }, "staff-1");
    expect(prisma.clientPortalContact.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { clientId: "client-a", email: "new@alpha.co", name: "New", createdById: "staff-1" },
      }),
    );
  });

  it("409s on a duplicate email for the same client", async () => {
    await expect(
      service.create("client-a", { email: "Budi@Alpha.co", name: "Budi 2" }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("404s for an unknown client", async () => {
    await expect(service.list("nope")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("404s when the contact belongs to another client", async () => {
    await expect(service.update("client-internal", "ct-1", { name: "x" })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("deactivation bumps tokenVersion (revokes sessions); reactivation does not reset it", async () => {
    await service.update("client-a", "ct-1", { isActive: false });
    expect(contacts[0]).toMatchObject({ isActive: false, tokenVersion: 1 });
    await service.update("client-a", "ct-1", { isActive: true });
    expect(contacts[0]).toMatchObject({ isActive: true, tokenVersion: 1 });
  });

  it("reports SMTP failure on invite to staff as 503", async () => {
    notifications.sendPortalInvite.mockRejectedValueOnce(new Error("535 BadCredentials"));
    await expect(service.invite("client-a", "ct-1")).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it("sends the invite with the portal URL", async () => {
    notifications.sendPortalInvite.mockResolvedValueOnce(undefined);
    await expect(service.invite("client-a", "ct-1")).resolves.toEqual({ sent: true });
    expect(notifications.sendPortalInvite).toHaveBeenCalledWith(
      "budi@alpha.co",
      expect.objectContaining({ clientName: "Alpha", portalUrl: expect.stringMatching(/^https?:\/\//) }),
      "ct-1",
    );
  });
});
