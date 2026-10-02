import { BadRequestException } from "@nestjs/common";
import { DecksService } from "./decks.service";
import { DeckImportService } from "./deck-import.service";
import { CLIENT_PROJECT_MISMATCH_MESSAGE } from "../../../common/utils/client-project-link.util";

/**
 * Write-time client/project consistency for decks (create, update, .pptx
 * import): an explicit clientId must match the linked business project's
 * client, judged on the values after the write.
 */
describe("Deck client/project consistency", () => {
  let storedDeck: any;
  const prisma = {
    client: { findUnique: jest.fn(async ({ where }: any) => ({ id: where.id })) },
    project: {
      findUnique: jest.fn(async ({ where }: any) =>
        ({
          "proj-a": { id: "proj-a", clientId: "client-a" },
          "proj-b": { id: "proj-b", clientId: "client-b" },
        } as any)[where.id] ?? null,
      ),
    },
    mediaProject: { findUnique: jest.fn(async () => ({ id: "mp" })) },
    deck: {
      create: jest.fn(async ({ data }: any) => ({ id: "deck-new", ...data })),
      findUnique: jest.fn(async () => storedDeck),
      update: jest.fn(async ({ where, data }: any) => ({ id: where.id, ...data })),
    },
  };
  let service: DecksService;

  beforeEach(() => {
    jest.clearAllMocks();
    storedDeck = {
      id: "deck-1",
      clientId: "client-a",
      projectId: "proj-a",
      collaborators: [{ userId: "u1", role: "OWNER", status: "ACCEPTED" }],
    };
    service = new DecksService(prisma as any, {} as any);
  });

  it("create rejects a clientId that disagrees with the project's client", async () => {
    await expect(
      service.create("u1", { title: "x", clientId: "client-b", projectId: "proj-a" } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.deck.create).not.toHaveBeenCalled();
  });

  it("create accepts consistent or partial links", async () => {
    await expect(
      service.create("u1", { title: "x", clientId: "client-a", projectId: "proj-a" } as any),
    ).resolves.toHaveProperty("id");
    await expect(service.create("u1", { title: "x", projectId: "proj-b" } as any)).resolves.toHaveProperty("id");
  });

  it("update rejects a clientId-only change that disagrees with the stored project", async () => {
    await expect(service.update("deck-1", "u1", { clientId: "client-b" } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.deck.update).not.toHaveBeenCalled();
  });

  it("update rejects a projectId-only change to another client's project", async () => {
    await expect(service.update("deck-1", "u1", { projectId: "proj-b" } as any)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("update accepts moving both links together, and leaves legacy rows editable", async () => {
    await expect(
      service.update("deck-1", "u1", { clientId: "client-b", projectId: "proj-b" } as any),
    ).resolves.toHaveProperty("id");
    storedDeck = { ...storedDeck, clientId: "client-b", projectId: "proj-a" }; // legacy mislink
    prisma.project.findUnique.mockClear();
    await expect(service.update("deck-1", "u1", { title: "renamed" } as any)).resolves.toHaveProperty("id");
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it(".pptx import rejects a mismatched clientId before parsing the archive", async () => {
    const importer = new DeckImportService(prisma as any, {} as any);
    await expect(
      importer.importPptx(
        "u1",
        { buffer: Buffer.from("not-a-zip"), originalname: "deck.pptx" } as any,
        { clientId: "client-b", projectId: "proj-a" },
      ),
    ).rejects.toThrow(CLIENT_PROJECT_MISMATCH_MESSAGE);
    expect(prisma.deck.create).not.toHaveBeenCalled();
  });
});
