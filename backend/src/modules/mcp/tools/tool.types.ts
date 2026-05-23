import type { ZodRawShape, ZodTypeAny } from "zod";
import type { McpContext, RoleSet } from "../mcp.types";

export interface McpToolDef<TInputShape extends ZodRawShape = ZodRawShape> {
  /** snake_case tool name surfaced to the model */
  name: string;
  /** One-line description; goes into the LLM's tool list */
  description: string;
  /** Roles allowed to see + call this tool */
  allowedRoles: RoleSet;
  /** Input schema as a zod raw shape (passed straight to McpServer.registerTool) */
  inputSchema: TInputShape;
  /** Optional output schema for structured content */
  outputSchema?: ZodRawShape;
  /** Tool handler. Throw to return an error to the model. */
  handler: (
    args: Record<string, unknown>,
    ctx: McpContext,
  ) => Promise<ToolHandlerResult>;
}

export interface ToolHandlerResult {
  /** Text content shown to the model. Keep it dense and short. */
  text: string;
  /** Optional structured payload — keeps Claude's reasoning grounded in real data. */
  structured?: Record<string, unknown>;
}

export type AnyToolDef = McpToolDef<ZodRawShape>;

export type ResolvedSchema<T extends ZodRawShape> = {
  [K in keyof T]: T[K] extends ZodTypeAny ? T[K]["_output"] : never;
};
