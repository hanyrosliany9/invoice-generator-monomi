import { MediaShareService, ResolvedMediaShare, toShareComment } from "./media-share.service";

describe("MediaShareService comments on public / portal paths", () => {
  const staffComment = () => ({
    id: "c1",
    content: "[Budi]: bagus",
    author: { id: "staff-1", name: "Admin Monomi", email: "admin@monomi.id" },
    frame: { timestamp: 0 },
    replies: [
      {
        id: "c2",
        content: "ok",
        author: { id: "staff-2", name: "Editor", email: "editor@monomi.id" },
        replies: [],
      },
    ],
  });

  const share: ResolvedMediaShare = {
    projectId: "p1",
    createdBy: "staff-1",
    canComment: true,
    canChangeStatus: false,
    binding: { kind: "public", shareToken: "tok" } as any,
  };

  function make() {
    const commentsService = {
      findByAsset: jest.fn(async () => [staffComment()]),
      create: jest.fn(async () => staffComment()),
      getCommentAssetId: jest.fn(),
    };
    const svc = new MediaShareService(
      {} as any,
      {} as any,
      {} as any,
      commentsService as any,
      {} as any,
      {} as any,
    );
    jest.spyOn(svc as any, "assertAssetInShare").mockResolvedValue(undefined);
    return { svc, commentsService };
  }

  it("toShareComment keeps author id/name and drops email, recursively", () => {
    const out: any = toShareComment(staffComment());
    expect(out.author).toEqual({ id: "staff-1", name: "Admin Monomi" });
    expect(out.replies[0].author).toEqual({ id: "staff-2", name: "Editor" });
    expect(JSON.stringify(out)).not.toContain("@monomi.id");
    expect(out.content).toBe("[Budi]: bagus");
  });

  it("listComments and createComment return no staff email", async () => {
    const { svc } = make();
    const listed = await svc.listComments(share, "a1");
    expect(JSON.stringify(listed)).not.toContain("@monomi.id");
    expect(listed[0].author).toEqual({ id: "staff-1", name: "Admin Monomi" });

    const created = await svc.createComment(share, "a1", { content: "bagus" }, "Budi");
    expect(JSON.stringify(created)).not.toContain("@monomi.id");
  });
});
