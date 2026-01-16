import { Request } from "express";

/**
 * Authenticated Request Interface
 *
 * Extends Express Request with user information from JWT
 */
export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}
