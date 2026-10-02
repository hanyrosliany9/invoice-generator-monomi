import { BadRequestException } from "@nestjs/common";
import { JournalService } from "./journal.service";

describe("JournalService.createSale internal client", () => {
  it("rejects an inline clientName matching the internal client (case-insensitive)", async () => {
    const prisma: any = {
      client: {
        findFirst: jest.fn(async ({ where }: any) =>
          where.isInternal ? { id: "m1", isInternal: true } : null,
        ),
        create: jest.fn(),
      },
    };
    const service = new JournalService(prisma, {} as any);
    await expect(
      service.createSale(
        { clientName: " monomi ", lineItems: [{}], paymentMethod: "CASH" } as any,
        "u1",
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.client.create).not.toHaveBeenCalled();
  });
});
