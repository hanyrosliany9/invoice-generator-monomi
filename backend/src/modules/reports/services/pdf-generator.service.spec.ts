import { ServiceUnavailableException } from "@nestjs/common";
import * as puppeteer from "puppeteer";
import { PDFGeneratorService, RenderSemaphore } from "./pdf-generator.service";

jest.mock("puppeteer", () => ({ launch: jest.fn() }));

type Handler = (req: unknown) => void;

function fakeBrowser() {
  const handlers: Record<string, Handler> = {};
  const page = {
    setDefaultTimeout: jest.fn(),
    setJavaScriptEnabled: jest.fn().mockResolvedValue(undefined),
    setRequestInterception: jest.fn().mockResolvedValue(undefined),
    on: jest.fn((ev: string, h: Handler) => {
      handlers[ev] = h;
    }),
    emulateMediaType: jest.fn().mockResolvedValue(undefined),
    setContent: jest.fn().mockResolvedValue(undefined),
    pdf: jest.fn().mockResolvedValue(new Uint8Array([37, 80, 68, 70])),
  };
  const browser = {
    newPage: jest.fn().mockResolvedValue(page),
    close: jest.fn().mockResolvedValue(undefined),
  };
  return { browser, page, handlers };
}

const fakeRequest = (url: string) => ({
  url: () => url,
  isInterceptResolutionHandled: () => false,
  continue: jest.fn().mockResolvedValue(undefined),
  abort: jest.fn().mockResolvedValue(undefined),
});

describe("PDFGeneratorService.htmlToPdf hardening", () => {
  const svc = new PDFGeneratorService({} as never);
  const render = (html: string) =>
    (svc as unknown as { htmlToPdf(h: string, t: string): Promise<Buffer> }).htmlToPdf(
      html,
      "Laporan",
    );

  it("disables JavaScript and allows only data:/about: requests", async () => {
    const f = fakeBrowser();
    (puppeteer.launch as jest.Mock).mockResolvedValueOnce(f.browser);

    const pdf = await render("<p>x</p>");

    expect(pdf.toString()).toBe("%PDF");
    expect(f.page.setJavaScriptEnabled).toHaveBeenCalledWith(false);
    expect(f.page.setRequestInterception).toHaveBeenCalledWith(true);
    // Both are set before any content is loaded.
    const jsOrder = f.page.setJavaScriptEnabled.mock.invocationCallOrder[0];
    const contentOrder = f.page.setContent.mock.invocationCallOrder[0];
    expect(jsOrder).toBeLessThan(contentOrder);

    const onRequest = f.handlers.request;
    for (const url of ["data:image/png;base64,AAAA", "about:blank"]) {
      const req = fakeRequest(url);
      onRequest(req);
      expect(req.continue).toHaveBeenCalled();
      expect(req.abort).not.toHaveBeenCalled();
    }
    for (const url of [
      "http://169.254.169.254/latest/meta-data/",
      "https://example.com/x.png",
      "file:///etc/passwd",
      "ws://localhost:5000",
    ]) {
      const req = fakeRequest(url);
      onRequest(req);
      expect(req.abort).toHaveBeenCalled();
      expect(req.continue).not.toHaveBeenCalled();
    }
    expect(f.browser.close).toHaveBeenCalled();
  });

  it("closes the browser and frees the slot when rendering fails", async () => {
    const f = fakeBrowser();
    f.page.setContent.mockRejectedValueOnce(new Error("boom"));
    (puppeteer.launch as jest.Mock).mockResolvedValueOnce(f.browser);
    await expect(render("<p>x</p>")).rejects.toThrow("boom");
    expect(f.browser.close).toHaveBeenCalled();
    // A later render still gets a slot.
    const g = fakeBrowser();
    (puppeteer.launch as jest.Mock).mockResolvedValueOnce(g.browser);
    await expect(render("<p>y</p>")).resolves.toBeInstanceOf(Buffer);
  });
});

describe("RenderSemaphore", () => {
  it("runs at most `limit` at once, FIFO, and rejects beyond the queue", async () => {
    const sem = new RenderSemaphore(2, 1);
    const r1 = await sem.acquire();
    const r2 = await sem.acquire();
    expect(sem.inUse).toBe(2);

    let thirdStarted = false;
    const third = sem.acquire().then((r) => {
      thirdStarted = true;
      return r;
    });
    await Promise.resolve();
    expect(thirdStarted).toBe(false);
    expect(sem.queued).toBe(1);

    await expect(sem.acquire()).rejects.toBeInstanceOf(ServiceUnavailableException);

    r1();
    r1(); // double release is a no-op
    const r3 = await third;
    expect(thirdStarted).toBe(true);
    expect(sem.inUse).toBe(2);

    r2();
    r3();
    expect(sem.inUse).toBe(0);
  });
});
