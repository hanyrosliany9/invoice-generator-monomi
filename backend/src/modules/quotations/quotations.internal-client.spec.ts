import { BadRequestException } from "@nestjs/common";
import { QuotationsService } from "./quotations.service";

function make() {
  const prisma: any = {
    client: { findUnique: jest.fn() },
    project: { findUnique: jest.fn() },
    quotation: { create: jest.fn(), update: jest.fn() },
  };
  const service = new QuotationsService(
    prisma,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
    {} as any,
  );
  return { prisma, service };
}

describe("QuotationsService internal client guard", () => {
  it("rejects a quotation for a project owned by the internal client", async () => {
    const { prisma, service } = make();
    prisma.project.findUnique.mockResolvedValue({
      id: "p1",
      clientId: "monomi",
      client: { isInternal: true },
    });
    prisma.client.findUnique.mockResolvedValue({ status: "active", isInternal: true });
    await expect(
      service.create({ clientId: "monomi", projectId: "p1" } as any, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.quotation.create).not.toHaveBeenCalled();
  });

  it("rejects a quotation for the internal client even with an ordinary project", async () => {
    const { prisma, service } = make();
    prisma.project.findUnique.mockResolvedValue({
      id: "p1",
      clientId: "monomi",
      client: { isInternal: false },
    });
    prisma.client.findUnique.mockResolvedValue({ status: "active", isInternal: true });
    await expect(
      service.create({ clientId: "monomi", projectId: "p1" } as any, "u1"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
