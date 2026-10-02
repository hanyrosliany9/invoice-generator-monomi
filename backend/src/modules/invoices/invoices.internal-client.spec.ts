import { BadRequestException } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";

function make() {
  const prisma: any = {
    client: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    invoice: { update: jest.fn() },
  };
  const service = new InvoicesService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  jest
    .spyOn(service, "findOne")
    .mockResolvedValue({ id: "i1", clientId: "c1", projectId: "p1", status: "DRAFT", totalAmount: 1 });
  return { prisma, service };
}

describe("InvoicesService internal client guard", () => {
  it("update rejects moving an invoice onto the internal client", async () => {
    const { prisma, service } = make();
    prisma.client.findUnique.mockResolvedValue({ isInternal: true });
    await expect(
      service.update("i1", { clientId: "monomi" } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it("update rejects moving an invoice onto a project of the internal client", async () => {
    const { prisma, service } = make();
    prisma.project.findUnique.mockResolvedValue({ client: { isInternal: true } });
    await expect(
      service.update("i1", { projectId: "p2" } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.invoice.update).not.toHaveBeenCalled();
  });

  it("update allows an ordinary client change", async () => {
    const { prisma, service } = make();
    prisma.client.findUnique.mockResolvedValue({ isInternal: false });
    prisma.invoice.update.mockResolvedValue({ id: "i1" });
    await service.update("i1", { clientId: "c2" } as any);
    expect(prisma.invoice.update).toHaveBeenCalled();
  });

  it("create rejects a project owned by the internal client", async () => {
    const { prisma, service } = make();
    prisma.client.findUnique.mockResolvedValue({ id: "c1", status: "active", isInternal: false });
    prisma.project.findUnique.mockResolvedValue({ id: "p1", client: { isInternal: true } });
    await expect(
      service.create({ clientId: "c1", projectId: "p1" } as any, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
