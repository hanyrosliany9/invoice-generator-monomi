import { Injectable, Logger } from "@nestjs/common";
import type { McpContext } from "../mcp.types";

export interface McpPromptArgDef {
  name: string;
  description: string;
  required?: boolean;
}

export interface McpPromptMessage {
  role: "user" | "assistant";
  content: { type: "text"; text: string };
}

export interface McpPromptDef {
  name: string;
  description: string;
  arguments: McpPromptArgDef[];
  build: (args: Record<string, string>, ctx: McpContext) => McpPromptMessage[];
}

@Injectable()
export class McpPromptRegistry {
  private readonly logger = new Logger(McpPromptRegistry.name);
  private readonly prompts: McpPromptDef[] = [
    {
      name: "morning-brief",
      description:
        "Generate today's morning briefing for the current Monomi user: schedule, overdue invoices, AR aging, urgent items. Answers in Bahasa Indonesia.",
      arguments: [
        {
          name: "tone",
          description: "Tone: 'formal' or 'casual' (default: casual)",
          required: false,
        },
      ],
      build: (args, ctx) => {
        const tone = args.tone === "formal" ? "formal" : "santai tapi profesional";
        return [
          {
            role: "user",
            content: {
              type: "text",
              text: `Saya ${ctx.user.name} (peran ${ctx.user.role}) di Monomi.

Tolong susun morning brief saya hari ini. Lakukan langkah berikut secara berurutan:

1. Baca resource monomi://today untuk jadwal & invoice jatuh tempo.
2. Untuk peran ADMIN/SUPER_ADMIN, panggil tool ar_aging_summary untuk gambaran total AR.
3. Jika ada invoice ≥30 hari lewat, panggil client_payment_personality untuk klien terkait, agar saya tahu nada follow-up yang tepat.
4. Rangkum semua dengan format ringkas dalam Bahasa Indonesia (nada ${tone}):
   - **Jadwal hari ini** (waktu + judul)
   - **Yang butuh perhatian** (overdue, materai pending, quotation segera kedaluwarsa)
   - **Rekomendasi tindakan** (3-5 bullet, urut prioritas)

Jangan menyebut tool yang dipanggil; cukup hasilnya. Pakai mata uang Rp.`,
            },
          },
        ];
      },
    },
  ];

  constructor() {
    this.logger.log(
      `Registered ${this.prompts.length} MCP prompts: ${this.prompts.map((p) => p.name).join(", ")}`,
    );
  }

  list(): McpPromptDef[] {
    return this.prompts;
  }

  byName(name: string): McpPromptDef | undefined {
    return this.prompts.find((p) => p.name === name);
  }
}
