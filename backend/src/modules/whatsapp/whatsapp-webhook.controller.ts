import {
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import type { Request, Response } from "express";
import { Public } from "../../common/decorators/public.decorator";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";
import { loadWhatsAppConfig, webhookReady } from "./whatsapp.config";
import { safeEqual, verifyWebhookSignature } from "./whatsapp.utils";

const CHALLENGE_RE = /^[A-Za-z0-9_.-]{1,256}$/;

/**
 * Meta webhook for the WhatsApp Business Account (public, no login).
 *
 *  GET  — subscription verification (hub.mode / hub.verify_token / hub.challenge).
 *  POST — events signed with X-Hub-Signature-256 = HMAC-SHA256(app secret,
 *         raw body). The body arrives as a Buffer (route-scoped raw parser in
 *         config/body-parser.config.ts, 3mb cap) so the signature is checked
 *         on the exact bytes. Valid deliveries are stored durably, answered
 *         200 immediately and processed asynchronously with retries.
 */
@ApiExcludeController()
@Controller("whatsapp/webhook")
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly webhooks: WhatsAppWebhookService) {}

  @Get()
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  verify(@Req() req: Request, @Res() res: Response) {
    const cfg = loadWhatsAppConfig();
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (!webhookReady(cfg)) {
      res.status(404).type("text/plain").send("Not found");
      return;
    }
    const q = req.query as Record<string, unknown>;
    const mode = q["hub.mode"];
    const token = q["hub.verify_token"];
    const challenge = q["hub.challenge"];
    if (
      mode === "subscribe" &&
      typeof token === "string" &&
      safeEqual(token, cfg.verifyToken) &&
      typeof challenge === "string" &&
      CHALLENGE_RE.test(challenge)
    ) {
      res.status(200).type("text/plain").send(challenge);
      return;
    }
    this.logger.warn("WhatsApp webhook verification rejected");
    res.status(403).type("text/plain").send("Forbidden");
  }

  @Post()
  @Public()
  @HttpCode(200)
  // Meta can burst (history sync); the signature check is the real gate.
  @Throttle({ default: { limit: 1200, ttl: 60000 } })
  async receive(@Req() req: Request, @Res() res: Response) {
    const cfg = loadWhatsAppConfig();
    res.setHeader("Cache-Control", "no-store");
    if (!webhookReady(cfg)) {
      res.status(404).json({ message: "Not found" });
      return;
    }
    const raw = req.body as unknown;
    if (!Buffer.isBuffer(raw) || raw.length === 0) {
      res.status(400).json({ message: "Expected a raw JSON body" });
      return;
    }
    if (
      !verifyWebhookSignature(
        raw,
        req.headers["x-hub-signature-256"],
        cfg.appSecret,
      )
    ) {
      this.logger.warn(
        `WhatsApp webhook: invalid or missing signature (${raw.length} bytes)`,
      );
      res.status(401).json({ message: "Invalid signature" });
      return;
    }
    let payload: any;
    try {
      payload = JSON.parse(raw.toString("utf8"));
    } catch {
      res.status(400).json({ message: "Invalid JSON" });
      return;
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      payload.object !== "whatsapp_business_account"
    ) {
      res.status(200).json({ received: true, ignored: true });
      return;
    }
    try {
      const stored = await this.webhooks.store(raw, payload);
      res.status(200).json({ received: true });
      if (stored.id) this.webhooks.kick(stored.id);
    } catch (error) {
      // Not stored: let Meta retry the delivery.
      this.logger.error(
        `WhatsApp webhook could not be stored: ${(error as Error).message}`,
      );
      res.status(500).json({ message: "Temporary failure" });
    }
  }
}
