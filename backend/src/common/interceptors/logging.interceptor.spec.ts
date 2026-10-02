import { of } from "rxjs";
import { LoggingInterceptor, redactSensitive, redactUrl } from "./logging.interceptor";

describe("LoggingInterceptor redaction", () => {
  it("redacts OTP codes, passwords and tokens in request bodies", () => {
    const out = redactSensitive({
      email: "budi@alpha.co",
      code: "123456",
      otp: "654321",
      password: "hunter2",
      currentPassword: "a",
      new_password: "b",
      token: "t",
      access_token: "at",
      refresh_token: "rt",
      refreshToken: "rt2",
      clientSecret: "s",
      name: "Budi",
    }) as Record<string, unknown>;
    expect(out.email).toBe("budi@alpha.co");
    expect(out.name).toBe("Budi");
    for (const k of [
      "code",
      "otp",
      "password",
      "currentPassword",
      "new_password",
      "token",
      "access_token",
      "refresh_token",
      "refreshToken",
      "clientSecret",
    ]) {
      expect(out[k]).toBe("***");
    }
  });

  it("redacts at any depth and inside arrays, keeping falsy values masked too", () => {
    const out: any = redactSensitive({
      user: { credentials: { password: "" } },
      items: [{ code: 0, label: "x" }],
    });
    expect(out.user.credentials.password).toBe("***");
    expect(out.items[0]).toEqual({ code: "***", label: "x" });
  });

  it("masks credential-like query parameters in URLs", () => {
    expect(redactUrl("/api/v1/x?token=abc&page=2&refresh_token=r&code=1")).toBe(
      "/api/v1/x?token=***&page=2&refresh_token=***&code=***",
    );
    expect(redactUrl("/api/v1/x")).toBe("/api/v1/x");
  });

  it("never writes a verify-code body's code to the debug log", () => {
    const interceptor = new LoggingInterceptor();
    const logger = (interceptor as any).logger;
    const debug = jest.spyOn(logger, "debug").mockImplementation(() => undefined);
    jest.spyOn(logger, "log").mockImplementation(() => undefined);
    const req = {
      method: "POST",
      url: "/api/v1/portal/auth/verify-code",
      headers: {},
      body: { email: "budi@alpha.co", code: "123456" },
      connection: { remoteAddress: "127.0.0.1" },
    };
    const ctx: any = {
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => ({ statusCode: 200 }) }),
    };
    interceptor.intercept(ctx, { handle: () => of({}) }).subscribe();
    const logged = debug.mock.calls.map((c) => String(c[0])).join("\n");
    expect(logged).toContain("budi@alpha.co");
    expect(logged).not.toContain("123456");
  });
});
