import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { AllExceptionsFilter } from "./all-exceptions.filter";

function host(url: string) {
  const res: any = { headers: {} as Record<string, string> };
  res.setHeader = jest.fn((k: string, v: string) => (res.headers[k] = v));
  res.status = jest.fn(() => res);
  res.json = jest.fn((b: unknown) => (res.body = b));
  const req = { url, method: "GET", headers: {} };
  return {
    res,
    host: { switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }) } as unknown as ArgumentsHost,
  };
}

describe("AllExceptionsFilter", () => {
  it("never logs or echoes the OAuth code/state when a callback request errors (e.g. throttled)", () => {
    const filter = new AllExceptionsFilter();
    const logs: string[] = [];
    jest.spyOn((filter as any).logger, "error").mockImplementation((...a: unknown[]) => void logs.push(a.map(String).join(" ")));
    const { res, host: h } = host("/api/v1/instagram/oauth/callback?code=LEAKCHECKCODE123&state=STATEVALUE.1.sig");
    filter.catch(new ThrottlerException(), h);
    expect(res.status).toHaveBeenCalledWith(429);
    const all = logs.join("\n") + JSON.stringify(res.body);
    expect(all).not.toContain("LEAKCHECKCODE123");
    expect(all).not.toContain("STATEVALUE");
    expect(all).toContain("/api/v1/instagram/oauth/callback?code=***&state=***");
  });

  it("maps body-parser client errors (http-errors shape) to their status instead of 500", () => {
    const filter = new AllExceptionsFilter();
    jest.spyOn((filter as any).logger, "error").mockImplementation(() => undefined);
    const tooLarge = Object.assign(new Error("request entity too large"), { status: 413, statusCode: 413, expose: true, type: "entity.too.large" });
    const a = host("/api/v1/instagram/deauthorize");
    filter.catch(tooLarge, a.host);
    expect(a.res.status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    const badJson = Object.assign(new SyntaxError("Unexpected token"), { status: 400, expose: true, type: "entity.parse.failed" });
    const b = host("/api/v1/x");
    filter.catch(badJson, b.host);
    expect(b.res.status).toHaveBeenCalledWith(400);
    // Server-side errors (expose=false) still become 500.
    const internal = Object.assign(new Error("boom"), { status: 500, expose: false });
    const c = host("/api/v1/x");
    filter.catch(internal, c.host);
    expect(c.res.status).toHaveBeenCalledWith(500);
    const d = host("/api/v1/x");
    filter.catch(new HttpException("nope", 403), d.host);
    expect(d.res.status).toHaveBeenCalledWith(403);
  });
});
