import {
  All,
  Body,
  Controller,
  Get,
  Logger,
  Next,
  Post,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { NextFunction, Request, Response, RequestHandler } from "express";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { MonomiOAuthProvider } from "./monomi-oauth.provider";
import { AuthService } from "../../auth/auth.service";
import { renderConsentPage } from "./consent.html";

@Controller()
export class McpOAuthController {
  private readonly logger = new Logger(McpOAuthController.name);
  private readonly handler: RequestHandler;

  constructor(
    private readonly provider: MonomiOAuthProvider,
    private readonly auth: AuthService,
  ) {
    const baseUrl = new URL(
      process.env.MCP_PUBLIC_URL ?? process.env.PUBLIC_URL ?? "http://localhost:5000",
    );
    this.handler = mcpAuthRouter({
      provider: this.provider,
      issuerUrl: baseUrl,
      baseUrl,
      resourceServerUrl: new URL("/mcp", baseUrl),
      scopesSupported: ["mcp"],
      resourceName: "Monomi Agency Platform",
    });
  }

  // mcpAuthRouter handles:
  //   GET  /.well-known/oauth-authorization-server
  //   GET  /.well-known/oauth-protected-resource
  //   POST /register      (Dynamic Client Registration)
  //   GET  /authorize     (OAuth 2.1 authorization endpoint)
  //   POST /token         (Token endpoint, also handles refresh)
  //   POST /revoke        (Token revocation)
  // We delegate everything that isn't our consent page to the SDK router.

  @Get(".well-known/oauth-authorization-server")
  metadata(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.handler(req, res, next);
  }

  @Get(".well-known/oauth-protected-resource")
  resourceMetadata(@Req() req: Request, @Res() res: Response) {
    // The SDK only registers the path-suffixed variant
    // (/.well-known/oauth-protected-resource/mcp). Some MCP clients
    // (claude.ai included) also probe the unsuffixed root path; serve the
    // same metadata there so they don't get a 404 during discovery.
    const baseUrl =
      process.env.MCP_PUBLIC_URL ?? process.env.PUBLIC_URL ?? "http://localhost:5000";
    const norm = baseUrl.replace(/\/$/, "");
    res.json({
      resource: `${norm}/mcp`,
      authorization_servers: [`${norm}/`],
      scopes_supported: ["mcp"],
      resource_name: "Monomi Agency Platform",
    });
  }

  @Get(".well-known/oauth-protected-resource/mcp")
  resourceMetadataMcp(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.handler(req, res, next);
  }

  // The SDK's mcpAuthRouter publishes endpoints at root-level paths
  // (/register, /authorize, /token, /revoke). We mirror those paths
  // so the metadata document it emits stays consistent.

  @Post("register")
  register(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.handler(req, res, next);
  }

  @Get("authorize")
  authorize(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.handler(req, res, next);
  }

  @Post("token")
  token(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.handler(req, res, next);
  }

  @Post("revoke")
  revoke(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
    this.handler(req, res, next);
  }

  // The consent page is custom — mcpAuthRouter doesn't render UI; it expects
  // the AS to handle authentication itself. We render a simple login form,
  // validate credentials against the existing AuthService, then call
  // finalizeAuthorization to mint the code and redirect to the MCP client.

  // Helmet's default CSP blocks inline event handlers and inline <script>.
  // The consent page needs both (double-submit guard + postMessage to opener).
  // We override the CSP for /consent specifically, allowing inline JS only here.
  private setConsentCsp(res: Response): void {
    res.setHeader(
      "Content-Security-Policy",
      // form-action MUST include claude.ai because the consent form POSTs
      // here, then we 302-redirect to https://claude.ai/api/mcp/auth_callback
      // (or any other OAuth client's registered redirect_uri). The browser
      // enforces form-action across the entire redirect chain — if the
      // final navigation target isn't allowed, it blocks the request and
      // the user is stuck on the consent page (we saw this exact bug).
      // 'self' allowed for the initial POST + same-host redirects.
      // We allow https: for the redirect_uri (every legitimate OAuth client
      // uses HTTPS) — narrower than '*' but covers all real clients.
      "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; script-src-attr 'unsafe-inline'; form-action 'self' https:; frame-ancestors 'self'; base-uri 'self'; object-src 'none'",
    );
  }

  @Get("consent")
  consentPage(
    @Query("request_id") requestId: string,
    @Query("client_name") clientName: string,
    @Res() res: Response,
  ) {
    this.setConsentCsp(res);
    if (!requestId) {
      // Someone (often the user manually) hit /consent without going through
      // /authorize first. Explain instead of returning a cryptic 400.
      res.status(400).type("text/html").send(`<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>Halaman ini tidak diakses langsung</title>
<style>body{font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:32px;max-width:520px;line-height:1.55}
h1{margin:0 0 12px;font-size:18px}code{background:#0f172a;padding:2px 6px;border-radius:4px;color:#a5b4fc}</style>
</head><body><div class="card">
<h1>Halaman persetujuan tidak bisa diakses langsung</h1>
<p>Halaman <code>/consent</code> hanya bisa dibuka sebagai bagian dari alur login Claude.ai (Add custom connector).</p>
<p>Untuk menghubungkan Claude ke Monomi, buka <strong>Claude.ai → Settings → Connectors → Add custom connector</strong> dan tempelkan URL MCP server (<code>…/mcp</code>) di sana. Anda akan otomatis diarahkan ke halaman ini dengan parameter yang dibutuhkan.</p>
</div></body></html>`);
      return;
    }
    res.type("text/html").send(
      renderConsentPage({
        requestId,
        clientName: clientName || "Aplikasi",
      }),
    );
  }

  @Post("consent")
  async consentSubmit(
    @Body() body: { request_id?: string; email?: string; password?: string },
    @Res() res: Response,
  ) {
    this.setConsentCsp(res);
    const requestId = body.request_id;
    const email = body.email;
    const password = body.password;

    if (!requestId || !email || !password) {
      res.status(400).type("text/html").send(
        renderConsentPage({
          requestId: requestId ?? "",
          clientName: "Aplikasi",
          errorMessage: "Email, password, dan request_id wajib diisi.",
        }),
      );
      return;
    }

    const user = await this.auth.validateUser(email, password);
    if (!user) {
      res.status(401).type("text/html").send(
        renderConsentPage({
          requestId,
          clientName: "Aplikasi",
          errorMessage: "Email atau password salah.",
        }),
      );
      return;
    }
    if (!user.isActive) {
      res.status(403).type("text/html").send(
        renderConsentPage({
          requestId,
          clientName: "Aplikasi",
          errorMessage: "Akun Anda telah dinonaktifkan.",
        }),
      );
      return;
    }

    try {
      const { redirectUrl } = await this.provider.finalizeAuthorization(
        requestId,
        user.id,
      );
      this.logger.log(`MCP consent granted user=${user.email} requestId=${requestId.slice(0, 8)}…`);
      res.redirect(302, redirectUrl);
    } catch (err) {
      const message = (err as Error).message;
      // A common case: the user double-submitted the form. The first POST
      // already minted the code and redirected; this second POST has nothing
      // to do. Show a friendly "you can close this tab" page instead of an
      // alarming "expired" error.
      this.logger.warn(
        `Consent finalize failed user=${user.email} requestId=${requestId.slice(0, 8)}… reason=${message}`,
      );
      res.status(200).type("text/html").send(this.renderAlreadyDonePage());
    }
  }

  private renderAlreadyDonePage(): string {
    return `<!DOCTYPE html>
<html lang="id"><head><meta charset="utf-8"><title>Anda sudah terhubung</title>
<style>:root{color-scheme:light dark}body{font-family:-apple-system,system-ui,sans-serif;background:#0f172a;color:#e2e8f0;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:32px;max-width:460px;text-align:center;line-height:1.55}
.ok{font-size:48px;line-height:1;margin-bottom:8px}h1{font-size:18px;margin:0 0 12px}p{color:#94a3b8;margin:8px 0}small{color:#64748b;display:block;margin-top:16px;font-size:11px}</style>
</head><body><div class="card">
<div class="ok">✓</div>
<h1>Anda mungkin sudah terhubung</h1>
<p>Permintaan otorisasi ini sudah diproses sebelumnya. Tab ini bisa Anda tutup dan kembali ke Claude.</p>
<p>Jika di Claude masih belum tersambung, klik <strong>Connect</strong> sekali lagi pada konektor Monomi untuk memulai alur baru.</p>
<small>Jangan klik Setujui dua kali — cukup tunggu setelah klik pertama.</small>
</div></body></html>`;
  }
}
