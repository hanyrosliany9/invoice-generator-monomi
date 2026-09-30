import { Body, Controller, INestApplication, Param, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { registerLargeJsonBodyRoutes } from "./body-parser.config";

/**
 * Boots a real Nest/Express app (same bootstrap order as main.ts: middleware
 * registered before init, then Nest's default body parser) and checks that
 * only the bulk-download routes accept JSON bodies above the default 100kb.
 */
@Controller("media-collab")
class BulkRoutesTestController {
  @Post("bulk-download/jobs")
  createJob(@Body() body: { assetIds: string[] }) {
    return { count: body.assetIds.length };
  }

  @Post("public/:token/async-bulk-download")
  createPublicJob(
    @Param("token") token: string,
    @Body() body: { assetIds: string[] },
  ) {
    return { token, count: body.assetIds.length };
  }

  @Post("comments")
  createComment(@Body() body: any) {
    return { received: body };
  }
}

/** ~28 bytes per cuid in the JSON array, like real asset IDs. */
function assetIds(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `cmi65bkbh${String(i).padStart(16, "0")}`);
}

describe("registerLargeJsonBodyRoutes", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [BulkRoutesTestController],
    }).compile();
    app = moduleRef.createNestApplication();
    registerLargeJsonBodyRoutes(app, "api/v1");
    app.setGlobalPrefix("api/v1");
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const tenThousand = { assetIds: assetIds(10000) };

  it("sanity: a 10,000-asset payload is larger than the 100kb default", () => {
    expect(Buffer.byteLength(JSON.stringify(tenThousand))).toBeGreaterThan(
      250 * 1024,
    );
  });

  it("accepts a 10,000-asset body on the authenticated bulk-download job route", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/media-collab/bulk-download/jobs")
      .send(tenThousand);

    expect(res.status).toBe(201);
    expect(res.body.count).toBe(10000);
  });

  it("accepts a 10,000-asset body on the public bulk-download job route", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/media-collab/public/share-token-123/async-bulk-download")
      .send(tenThousand);

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ token: "share-token-123", count: 10000 });
  });

  it("keeps the default 100kb limit on every other route", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/media-collab/comments")
      .send(tenThousand);

    expect(res.status).toBe(413);
  });

  it("still parses normal JSON bodies on other routes (default parser still registered)", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/media-collab/comments")
      .send({ content: "hello" });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ received: { content: "hello" } });
  });

  it("still rejects bodies above 1mb on the bulk-download routes", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/media-collab/bulk-download/jobs")
      .send({ assetIds: assetIds(40000) });

    expect(res.status).toBe(413);
  });

  it("does not widen the limit for sub-paths of a bulk-download route", async () => {
    const res = await request(app.getHttpServer())
      .post("/api/v1/media-collab/public/a/b/async-bulk-download")
      .send(tenThousand);

    // Not a matched route: default parser applies first and rejects the size.
    expect(res.status).toBe(413);
  });
});
