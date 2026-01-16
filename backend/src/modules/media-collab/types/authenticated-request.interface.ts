import { Request } from "express";

/**
 * Authenticated Request Interface
 *
 * Extends Express Request with JWT user payload.
 * Use this instead of `req: any` in controllers.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role?: string;
    name?: string;
  };
}
