import { lastValueFrom, of } from "rxjs";
import { ExecutionContext } from "@nestjs/common";
import { ResponseInterceptor } from "./response.interceptor";

/**
 * Contract the frontend services rely on (see frontend accountingEnvelope.test.ts):
 *  - plain entities / arrays are wrapped as { data, message, status, timestamp }
 *  - bodies carrying a `pagination` key are passed through as { data, pagination }
 */
const run = async (body: unknown, url = "/api/v1/accounting/cash-transactions") => {
  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => ({ statusCode: 200 }),
    }),
  } as unknown as ExecutionContext;
  return lastValueFrom(
    new ResponseInterceptor().intercept(ctx, { handle: () => of(body) }),
  );
};

describe("ResponseInterceptor envelope", () => {
  it("passes paginated bodies through unwrapped", async () => {
    const body = { data: [{ id: "1" }], pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } };
    expect(await run(body)).toBe(body);
  });

  it("wraps arrays and entities under data", async () => {
    const arr: any = await run([{ id: "1" }]);
    expect(arr.data).toEqual([{ id: "1" }]);
    const one: any = await run({ id: "1" });
    expect(one.data).toEqual({ id: "1" });
  });
});
