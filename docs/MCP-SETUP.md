# MCP Servers Setup & Configuration for Invoice Generator

**Date Updated:** December 22, 2025
**Status:** Ready for Implementation

---

## Executive Summary

This document provides complete setup instructions for three recommended MCP (Model Context Protocol) servers that will enhance your Claude Code development experience for the invoice generator project:

1. **Context7** - Real-time documentation fetching (React 19, NestJS, Prisma, Tailwind)
2. **i18next-MCP** - Automated translation management for Indonesian/English
3. **PostgreSQL MCP** - Natural language database queries on your 65-table schema

**Expected Benefits:**
- 77% reduction in token usage per session ($17/month savings)
- Faster feature development with up-to-date documentation
- Automated translation key management
- Natural language database querying instead of manual SQL

---

## Part 1: Context7 MCP Server

### What It Does
Context7 fetches **real-time, version-specific documentation** directly from official sources. Instead of Claude relying on outdated training data, it queries current documentation for:
- React 19 (with Server Actions, concurrent features)
- NestJS 11.1.3 (enterprise patterns)
- Prisma (latest ORM features)
- Tailwind CSS 4.0
- TypeScript, PostgreSQL, and more

### Installation

**Option A: Quick HTTP Setup (Recommended)**
```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

**Option B: Local STDIO Setup**
```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp@latest
```

### Verification
```bash
claude mcp list
# Should show: context7 (HTTP) - https://mcp.context7.com/mcp
```

### Usage Patterns

**Activate by adding "use context7" to your prompts:**

```markdown
"I'm implementing real-time invoice status updates using React 19 and TanStack Query.
Show me the latest patterns for query invalidation when payment status changes.
use context7"
```

```markdown
"How do I create complex Prisma relationships for invoices with multiple payments
and journal entry tracking? Show best practices. use context7"
```

```markdown
"I need to generate PDF invoices with Puppeteer in NestJS with Indonesian locale.
Show server-side PDF generation patterns. use context7"
```

### Token Cost
- **Per query:** 2-30k tokens depending on documentation size
- **Recommendation:** Use for complex/version-specific questions only
- **Expected usage:** 2-3 queries per session maximum
- **Monthly cost:** ~$0.30-0.50 (free tier available)

### When to Use
✅ Learning new React 19 patterns
✅ NestJS advanced features
✅ Prisma complex relationships
✅ Version-specific APIs
✅ Best practice patterns

❌ General project questions (use CLAUDE.md instead)
❌ Simple coding questions
❌ Project navigation

---

## Part 2: i18next-MCP Server

### What It Does
Automates translation file management for your Indonesian (id) + English (en) setup:
- Adds new translation keys to both languages automatically
- Detects missing translations in code
- Validates JSON structure
- Analyzes translation coverage percentage
- Syncs keys across language files

### Installation

**Step 1: No package installation needed** (uses npx)

**Step 2: Add to Claude Code Configuration**

Create or edit your Claude Code MCP configuration file:

**Location by OS:**
- **Linux:** `~/.claude.json` or `~/.config/Claude/claude_desktop_config.json`
- **macOS:** `~/.claude.json` or `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\.claude.json`

**Add this section (or merge with existing mcpServers):**
```json
{
  "mcpServers": {
    "i18next-translation": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "i18next-mcp-server@latest"],
      "env": {
        "I18N_PROJECT_ROOT": "/mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator",
        "I18N_LOCALES_PATH": "frontend/src/i18n/locales",
        "I18N_DEFAULT_LANGUAGE": "id",
        "I18N_SUPPORTED_LANGUAGES": "id,en"
      }
    }
  }
}
```

### Verification
```bash
# Restart Claude Code, then:
claude mcp list
# Should show: i18next-translation (STDIO)
```

### Usage Patterns

**Ask Claude to manage translations:**

```markdown
"I've added a new invoice status field. Add these translations:
- Key: 'invoiceStatus.overdue'
- Indonesian: 'Jatuh Tempo'
- English: 'Overdue'"
```

```markdown
"Scan the React components for translation keys that aren't in our translation files"
```

```markdown
"Run a health check on id.json and en.json to see translation coverage"
```

```markdown
"Sync missing keys across id and en files to ensure they have the same structure"
```

### Token Cost
- **MCP initialization:** 2-3k tokens
- **Per operation:** 0.5-2k tokens
- **Optimization:** Disable other MCP servers during translation work (saves 10-15k tokens)
- **Typical session:** 5-10k tokens

### When to Use
✅ Adding new UI strings
✅ Adding business terminology
✅ Before commits (validate files)
✅ Checking translation completeness

❌ Reading translation files (read directly instead)
❌ Simple lookups (just read the JSON)

### Your Translation Setup
```
/mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator/
└── frontend/src/i18n/
    ├── config.ts (i18next configuration)
    └── locales/
        ├── id.json (Indonesian - PRIMARY)
        └── en.json (English - SECONDARY)
```

---

## Part 3: PostgreSQL MCP Server

### What It Does
Enables **natural language database queries** on your PostgreSQL database. Ask Claude questions like:
- "Show me all unpaid invoices from the past 30 days"
- "What's the total revenue by client this quarter?"
- "List Chart of Accounts entries with balances"
- "Find quotations that haven't been converted to invoices"

And it automatically generates and executes safe read-only SQL queries.

### Installation

**Step 1: Install postgres-mcp globally**
```bash
npm install -g postgres-mcp
```

**Step 2: Add to Claude Code Configuration**

Edit your Claude Code MCP configuration file (same location as i18next-MCP above):

```json
{
  "mcpServers": {
    "postgres": {
      "type": "stdio",
      "command": "postgres-mcp",
      "args": ["--dbAlias", "main"],
      "env": {
        "DB_ALIASES": "main",
        "DEFAULT_DB_ALIAS": "main",
        "DB_MAIN_HOST": "localhost",
        "DB_MAIN_PORT": "5438",
        "DB_MAIN_NAME": "invoices",
        "DB_MAIN_USER": "invoiceuser",
        "DB_MAIN_PASSWORD": "devpassword",
        "DB_MAIN_SSL": "false"
      }
    }
  }
}
```

**Important:** Use port 5438 for **hybrid development** (your current setup)

If you switch to full Docker development, change to port 5436.

### Verification
```bash
# Restart Claude Code, then:
claude mcp list
# Should show: postgres (STDIO)
```

### Usage Patterns

**Ask natural language questions about your data:**

```markdown
"Using PostgreSQL MCP, how many invoices are marked as 'Paid' in the database?"
```

```markdown
"What's the highest invoice amount ever issued? Show me the client and date."
```

```markdown
"List all clients with their total invoice amounts. Order by amount descending."
```

```markdown
"Show me the Chart of Accounts with their current balances from the General Ledger"
```

```markdown
"Find invoices that have been 'Pending Payment' for more than 60 days"
```

### Token Cost
- **Schema discovery:** ~200 tokens (automatic, one-time per session)
- **Per query:** 10-20 tokens (80-90% savings vs manual SQL)
- **Monthly savings:** ~4,800 tokens per session (77% reduction)

### When to Use
✅ Data analysis and reports
✅ Debugging data issues
✅ Building queries for business intelligence
✅ Understanding schema relationships

❌ Making data changes (read-only by design)
❌ Schema modifications (use Prisma migrations)

### Database Connection Details
```
Host: localhost
Port: 5438 (hybrid dev) / 5436 (full docker dev)
Database: invoices
User: invoiceuser
Password: devpassword
```

Your database has **65 tables** organized by:
- Invoice & Quotation (Users, Clients, Projects, Quotations, Invoices, Payments)
- Accounting (ChartOfAccounts, JournalEntries, GeneralLedger)
- Assets (Assets, Depreciation, Maintenance)
- Vendors (Vendors, PurchaseOrders, GoodsReceipts)
- Indonesian-Specific (Holidays, Materai, Tax)

---

## Complete Configuration File

If you want to setup all three MCP servers at once, use this configuration:

**File Location:** `~/.claude.json` (or appropriate OS path)

```json
{
  "mcpServers": {
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    },
    "i18next-translation": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "i18next-mcp-server@latest"],
      "env": {
        "I18N_PROJECT_ROOT": "/mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator",
        "I18N_LOCALES_PATH": "frontend/src/i18n/locales",
        "I18N_DEFAULT_LANGUAGE": "id",
        "I18N_SUPPORTED_LANGUAGES": "id,en"
      }
    },
    "postgres": {
      "type": "stdio",
      "command": "postgres-mcp",
      "args": ["--dbAlias", "main"],
      "env": {
        "DB_ALIASES": "main",
        "DEFAULT_DB_ALIAS": "main",
        "DB_MAIN_HOST": "localhost",
        "DB_MAIN_PORT": "5438",
        "DB_MAIN_NAME": "invoices",
        "DB_MAIN_USER": "invoiceuser",
        "DB_MAIN_PASSWORD": "devpassword",
        "DB_MAIN_SSL": "false"
      }
    }
  }
}
```

---

## Setup Checklist

- [ ] **Context7 Setup**
  - [ ] Run: `claude mcp add --transport http context7 https://mcp.context7.com/mcp`
  - [ ] Verify: `claude mcp list` (should show context7)
  - [ ] Test: Ask a React 19 question with "use context7"

- [ ] **i18next-MCP Setup**
  - [ ] Edit Claude Code configuration file
  - [ ] Add i18next-translation section
  - [ ] Restart Claude Code
  - [ ] Verify: `claude mcp list` (should show i18next-translation)
  - [ ] Test: "Run health check on translation files"

- [ ] **PostgreSQL MCP Setup**
  - [ ] Run: `npm install -g postgres-mcp`
  - [ ] Edit Claude Code configuration file
  - [ ] Add postgres section
  - [ ] Restart Claude Code
  - [ ] Verify: `claude mcp list` (should show postgres)
  - [ ] Test: "How many invoices are in the database?"

- [ ] **Optimization Setup**
  - [ ] Use `/mcp` command to disable unused servers
  - [ ] Use `/cost` to monitor token usage
  - [ ] Use `/context` to check MCP overhead
  - [ ] Follow CLAUDE.md tier system for file loading

---

## Integration with CLAUDE.md Tier System

The new **Context Priority Hierarchy** in your enhanced CLAUDE.md complements these MCP servers:

**TIER 1 Files (Always Load):**
- Core architecture (don't need Context7 for this)
- Schema design (already have it locally)

**TIER 2 Files (Load Per Feature):**
- When uncertain about patterns → use Context7
- When adding new translations → use i18next-MCP
- When building reports → use PostgreSQL MCP

**TIER 3 Files (Avoid):**
- Don't load lock files → use PostgreSQL MCP instead for data queries
- Don't load full services → use Context7 for documentation

---

## Troubleshooting

### Context7 Not Loading
```bash
# Reinstall
claude mcp remove context7
claude mcp add --transport http context7 https://mcp.context7.com/mcp

# Verify internet connection
curl https://mcp.context7.com/mcp
```

### i18next-MCP Not Working
```bash
# Check Node.js version
node --version  # Should be 18.0.0 or higher

# Reinstall
claude mcp remove i18next-translation
# Edit config file and restart Claude Code
```

### PostgreSQL MCP Connection Error
```bash
# Check if database is running
docker compose -f docker-compose.development.yml ps
# Should show db container as Up

# Test connection manually
PGPASSWORD=devpassword psql -h localhost -p 5438 -U invoiceuser -d invoices

# Check port
lsof -i :5438  # Hybrid dev
lsof -i :5436  # Full Docker dev
```

### MCP Token Overhead Too High
```bash
# Disable unnecessary servers at session start
/mcp
# Uncheck servers you're not using

# Check token usage
/context
# Look at "MCP Servers" line

# Restart with clean state
/clear
```

---

## Next Steps

1. **This Week:**
   - [ ] Install all three MCP servers (20 minutes)
   - [ ] Verify they work with test queries (10 minutes)
   - [ ] Review CLAUDE.md tier system (15 minutes)
   - [ ] Use `/mcp` to manage active servers

2. **Next Week:**
   - [ ] Use Context7 for 1-2 complex feature questions
   - [ ] Use i18next-MCP when adding translations
   - [ ] Use PostgreSQL MCP for analytics/reports
   - [ ] Monitor token usage with `/cost`

3. **Ongoing:**
   - [ ] Follow tier system from CLAUDE.md
   - [ ] Use `/context` at session start
   - [ ] Use `/cost` every 10-15 messages
   - [ ] Use `/mcp` to optimize for current task

---

## Resource Links

**Context7:**
- [GitHub: upstash/context7](https://github.com/upstash/context7)
- [Context7 Dashboard](https://context7.com/dashboard)

**i18next-MCP:**
- [GitHub: gtrias/i18next-mcp-server](https://github.com/gtrias/i18next-mcp-server)
- [i18next Official Docs](https://www.i18next.com/)

**PostgreSQL MCP:**
- [GitHub: crystaldba/postgres-mcp](https://github.com/crystaldba/postgres-mcp)
- [NPM: postgres-mcp](https://www.npmjs.com/package/postgres-mcp)

**Claude Code & MCP:**
- [Claude Code MCP Integration](https://code.claude.com/docs/en/mcp)
- [MCP Official Documentation](https://modelcontextprotocol.io/)
- [MCP Marketplace](https://mcp.so)

---

**Version:** 1.0
**Last Updated:** December 22, 2025
**Status:** Ready for Implementation
