import { BadRequestException, NotFoundException } from "@nestjs/common";
import {
  assertClientMatchesProject,
  CLIENT_PROJECT_MISMATCH_MESSAGE,
  effectiveLink,
} from "./client-project-link.util";

describe("assertClientMatchesProject", () => {
  const prisma = {
    project: {
      findUnique: jest.fn(async ({ where }: any) =>
        ({ "proj-a": { id: "proj-a", clientId: "client-a" } } as any)[where.id] ?? null,
      ),
    },
  };

  beforeEach(() => jest.clearAllMocks());

  it("accepts a clientId equal to the project's client", async () => {
    await expect(assertClientMatchesProject(prisma, "client-a", "proj-a")).resolves.toBeUndefined();
  });

  it("rejects (400) a clientId that disagrees with the project's client", async () => {
    const err = await assertClientMatchesProject(prisma, "client-b", "proj-a").catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toBe(CLIENT_PROJECT_MISMATCH_MESSAGE);
  });

  it("404s for a missing project when a clientId is also given", async () => {
    await expect(assertClientMatchesProject(prisma, "client-a", "nope")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    [null, "proj-a"],
    [undefined, "proj-a"],
    ["client-b", null],
    ["client-b", undefined],
    [null, null],
  ])("nothing to check for clientId=%p projectId=%p", async (clientId, projectId) => {
    await expect(assertClientMatchesProject(prisma, clientId, projectId)).resolves.toBeUndefined();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });
});

describe("effectiveLink", () => {
  it("undefined keeps the stored value; null or a value replaces it", () => {
    expect(effectiveLink(undefined, "x")).toBe("x");
    expect(effectiveLink(undefined, null)).toBeNull();
    expect(effectiveLink(null, "x")).toBeNull();
    expect(effectiveLink("y", "x")).toBe("y");
  });
});
