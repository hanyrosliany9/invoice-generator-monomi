import { z } from "zod";
import type { AnyToolDef } from "./tool.types";
import type { ToolDeps } from "./tool-registry";
import { ALL_ROLES } from "../mcp.types";

export function createMeWhoamiTool(_deps: ToolDeps): AnyToolDef {
  return {
    name: "me_whoami",
    description:
      "Returns the currently authenticated Monomi user (id, name, email, role). Use this to confirm the connector is wired up correctly.",
    allowedRoles: ALL_ROLES,
    inputSchema: { _: z.string().optional().describe("unused — pass anything") },
    handler: async (_args, ctx) => {
      return {
        text: `Connected as ${ctx.user.name} <${ctx.user.email}> with role ${ctx.user.role}.`,
        structured: {
          id: ctx.user.id,
          name: ctx.user.name,
          email: ctx.user.email,
          role: ctx.user.role,
        },
      };
    },
  };
}
