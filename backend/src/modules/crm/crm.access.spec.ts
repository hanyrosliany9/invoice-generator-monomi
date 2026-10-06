import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolesGuard } from "../auth/guards/roles.guard";
import { CrmController } from "./crm.controller";

describe("CRM access control", () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  const ctx = (role: string, handler: (...a: any[]) => any): ExecutionContext =>
    ({
      getHandler: () => handler,
      getClass: () => CrmController,
      switchToHttp: () => ({ getRequest: () => ({ user: { id: "u1", role } }) }),
    }) as unknown as ExecutionContext;

  it("restricts the whole controller to SUPER_ADMIN and ADMIN", () => {
    expect(reflector.get("roles", CrmController)).toEqual(["SUPER_ADMIN", "ADMIN"]);
  });

  it.each(["listLeads", "createLead", "getStats", "badges", "convert", "updateStage", "addSpend"])(
    "%s: admins pass, videographers are rejected",
    (method) => {
      const handler = (CrmController.prototype as any)[method];
      expect(handler).toBeDefined();
      expect(guard.canActivate(ctx("ADMIN", handler))).toBe(true);
      expect(guard.canActivate(ctx("SUPER_ADMIN", handler))).toBe(true);
      expect(() => guard.canActivate(ctx("VIDEOGRAPHER", handler))).toThrow(ForbiddenException);
    },
  );

  it("has the JWT guard applied (no anonymous access)", () => {
    const guards = Reflect.getMetadata("__guards__", CrmController) as unknown[];
    expect(guards.map((g: any) => g.name)).toEqual(expect.arrayContaining(["JwtAuthGuard", "RolesGuard"]));
  });
});
