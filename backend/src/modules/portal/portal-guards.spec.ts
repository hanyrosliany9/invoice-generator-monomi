import { Controller, Get, INestApplication, UseGuards } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import request from "supertest";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { JwtStrategy } from "../auth/strategies/jwt.strategy";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PortalAuthService } from "./portal-auth.service";
import { PortalSessionGuard } from "./guards/portal-session.guard";
import {
  PORTAL_COOKIE_NAME,
  PORTAL_JWT_AUDIENCE,
  PORTAL_JWT_ISSUER,
} from "./portal.config";

/**
 * The two session types must never be interchangeable:
 *  - a portal session JWT must not pass the staff JwtAuthGuard/JwtStrategy
 *    (Bearer header or accessToken cookie);
 *  - a staff access JWT must not pass the PortalSessionGuard (cookie), and
 *    the portal guard never reads the Authorization header at all.
 */

const STAFF_SECRET = "staff-secret-for-guard-tests-0123456789";
const PORTAL_SECRET = "portal-secret-for-guard-tests-0123456789-xyz";

@Controller("t")
class ProbeController {
  @Get("staff")
  @UseGuards(JwtAuthGuard)
  staff() {
    return { ok: "staff" };
  }

  @Get("portal")
  @UseGuards(PortalSessionGuard)
  portal() {
    return { ok: "portal" };
  }
}

describe("Staff vs portal session isolation", () => {
  const OLD_ENV = process.env;
  let app: INestApplication;
  const jwt = new JwtService({});
  let staffToken: string;
  let portalToken: string;

  const contact = {
    id: "ct-a",
    clientId: "client-a",
    name: "Budi",
    email: "budi@alpha.co",
    tokenVersion: 0,
    client: { id: "client-a", name: "Alpha", instagramHandle: null, instagramAvatarUrl: null, tiktokHandle: null },
  };

  beforeAll(async () => {
    process.env = { ...OLD_ENV, NODE_ENV: "test", JWT_SECRET: STAFF_SECRET, PORTAL_JWT_SECRET: PORTAL_SECRET };

    const prisma = {
      user: {
        findUnique: jest.fn(async () => ({ id: "user-1", email: "admin@monomi.id", role: "ADMIN", isActive: true })),
      },
      clientPortalContact: {
        findMany: jest.fn(async ({ where }: any) => (where.email === contact.email ? [contact] : [])),
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [PassportModule],
      controllers: [ProbeController],
      providers: [
        JwtStrategy,
        PortalAuthService,
        PortalSessionGuard,
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { get: (k: string) => (k === "JWT_SECRET" ? STAFF_SECRET : undefined) } },
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.use(cookieParser());
    await app.init();

    staffToken = jwt.sign(
      { email: "admin@monomi.id", sub: "user-1", role: "ADMIN" },
      { secret: STAFF_SECRET, expiresIn: "15m" },
    );
    portalToken = jwt.sign(
      { sub: contact.email, ver: { [contact.id]: 0 } },
      { secret: PORTAL_SECRET, audience: PORTAL_JWT_AUDIENCE, issuer: PORTAL_JWT_ISSUER, expiresIn: "1h" },
    );
  });

  afterAll(async () => {
    await app?.close();
    process.env = OLD_ENV;
  });

  describe("staff guard", () => {
    it("accepts a staff token (sanity)", async () => {
      await request(app.getHttpServer())
        .get("/t/staff")
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(200);
    });

    it("rejects a portal token as Bearer", async () => {
      await request(app.getHttpServer())
        .get("/t/staff")
        .set("Authorization", `Bearer ${portalToken}`)
        .expect(401);
    });

    it("rejects a portal token in the accessToken cookie", async () => {
      await request(app.getHttpServer())
        .get("/t/staff")
        .set("Cookie", `accessToken=${portalToken}`)
        .expect(401);
    });

    it("ignores the portal_session cookie", async () => {
      await request(app.getHttpServer())
        .get("/t/staff")
        .set("Cookie", `${PORTAL_COOKIE_NAME}=${portalToken}`)
        .expect(401);
    });
  });

  describe("portal guard", () => {
    it("accepts a portal session cookie (sanity)", async () => {
      await request(app.getHttpServer())
        .get("/t/portal")
        .set("Cookie", `${PORTAL_COOKIE_NAME}=${portalToken}`)
        .expect(200);
    });

    it("rejects a staff token in the portal_session cookie", async () => {
      await request(app.getHttpServer())
        .get("/t/portal")
        .set("Cookie", `${PORTAL_COOKIE_NAME}=${staffToken}`)
        .expect(401);
    });

    it("rejects a staff accessToken cookie / Bearer header", async () => {
      await request(app.getHttpServer())
        .get("/t/portal")
        .set("Cookie", `accessToken=${staffToken}`)
        .set("Authorization", `Bearer ${staffToken}`)
        .expect(401);
    });

    it("does not read a portal token from the Authorization header", async () => {
      await request(app.getHttpServer())
        .get("/t/portal")
        .set("Authorization", `Bearer ${portalToken}`)
        .expect(401);
    });
  });
});
