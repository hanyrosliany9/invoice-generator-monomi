# Claude Code Optimization Quick Reference
**Invoice Generator Project - Token Cost Reduction Guide**

## 🎯 Goal: Reduce token usage by 77% (150k → 35k tokens/session)

---

## 📋 Session Start Checklist

```bash
# 1. Check context usage
/context

# 2. Disable unused MCP servers
/mcp

# 3. Check if starting new task
/clear    # If completely unrelated to previous work
```

**Expected result:** Save 15-20k tokens by disabling heavy MCP servers

---

## 🚫 Never Access These (Forbidden)

### Directories
```
node_modules/
backend/node_modules/
frontend/node_modules/
.git/
dist/
build/
coverage/
.next/
.cache/
.buildx-cache/
e2e/node_modules/
```

### File Types
```
*.lock          (package-lock.json, yarn.lock)
*.log           (all logs)
*.map           (source maps - HUGE)
*.min.js        (minified files)
*.bundle.js     (bundled files)
*.env.production (secrets)
```

**Why:** These files waste 30k+ tokens per session with zero value

---

## 💡 Efficient File Reading Patterns

### ✅ DO (Good)
```
"Read backend/src/modules/accounting/accounting.service.ts"
"Read backend/prisma/schema.prisma lines 50-100"
"Glob backend/src/**/*.service.ts"
"Grep 'quotation' backend/src/modules/quotation"
```

### ❌ DON'T (Bad)
```
"Read all TypeScript files"
"Show me everything in src/"
"Glob **/*.ts"  (too broad)
"Read package-lock.json"
```

**Impact:** Targeted reads save 20-40k tokens per session

---

## 🔄 Session Management Commands

| Command | When to Use | Token Impact |
|---------|------------|--------------|
| `/compact` | At 70% context usage | Save 50k tokens |
| `/clear` | Switching frontend ↔ backend | 100% reset |
| `/cost` | Every 10-15 messages | Monitor spending |
| `/context` | Session start & debugging | See token breakdown |
| `/mcp` | Session start | Disable heavy servers |

---

## 🎨 Task-Based Context Loading

### Frontend Work Only
**Load:**
- React components in `frontend/src/`
- Ant Design usage
- Vite config (if needed)

**Skip:**
- Backend NestJS modules
- Prisma schema (unless API integration)
- Docker configs (unless deployment)

**Savings:** ~40k tokens

---

### Backend Work Only
**Load:**
- NestJS modules/services
- Prisma schema
- DTOs and controllers

**Skip:**
- React components
- Frontend state management
- Vite/Tailwind configs

**Savings:** ~35k tokens

---

### Docker/DevOps Work
**Load:**
- docker-compose files
- Dockerfile
- nginx configs
- Environment templates

**Skip:**
- Application code
- Frontend assets
- Test files

**Savings:** ~60k tokens

---

## 📊 Context Priority System

### 🔴 High Priority (Always Load)
1. `backend/prisma/schema.prisma` - Single source of truth
2. `backend/src/modules/[feature]/[feature].module.ts` - Architecture
3. Indonesian business logic (quotation, invoice, materai)
4. `docker-compose.dev.yml` - Development environment

### 🟡 Medium Priority (Load When Needed)
1. React components (frontend work only)
2. API controllers/DTOs (specific endpoint work)
3. Test files (debugging tests only)
4. Service layer (business logic changes)

### 🟢 Low Priority (Avoid Unless Critical)
1. `tsconfig.json`, `vite.config.ts` (config files)
2. `package.json` (unless changing dependencies)
3. Migration files (unless debugging DB)
4. Lock files (NEVER LOAD)

---

## 💰 Model Selection Strategy

### Use Sonnet 4.5 ($3/1M input) for:
- ✅ Indonesian business logic implementation
- ✅ Multi-file refactoring (3+ files)
- ✅ Complex Prisma schema changes
- ✅ Architecture decisions
- ✅ Quotation/Invoice/Materai workflows
- ✅ Accounting module development

### Use Haiku 4.5 ($1/1M input) for:
- ✅ File searching (grep/glob operations)
- ✅ Simple DTO generation
- ✅ Basic TypeScript interface updates
- ✅ Single file refactoring
- ✅ Documentation updates
- ✅ Environment variable changes

**Potential Savings:** 67% cost reduction on simple tasks

---

## 🔥 Real-World Token Budget

### Without Optimization
```
Session Start:
├─ MCP servers:        20,000 tokens
├─ Initial context:    10,000 tokens
├─ Wasted reads:       30,000 tokens (node_modules, maps, logs)
├─ Conversation:       90,000 tokens
└─ TOTAL:             150,000 tokens/session
```

### With Optimization
```
Session Start:
├─ MCP servers:         5,000 tokens (disabled unused)
├─ Initial context:     5,000 tokens
├─ Targeted reads:     10,000 tokens (no waste)
├─ Conversation:       15,000 tokens (compacted at 70%)
└─ TOTAL:              35,000 tokens/session
```

**Savings: 115,000 tokens (77% reduction)**

---

## 🎯 Your Current Session - Action Items

### Immediate (Right Now)
1. Run `/context` - see what's loaded
2. Run `/cost` - check current spending
3. Identify current task: Frontend? Backend? Full-stack?

### This Session
- [ ] Disable unused MCP servers
- [ ] Avoid reading node_modules
- [ ] Use targeted file reads only
- [ ] Monitor `/cost` every 10 messages

### At 70% Context
- [ ] Run `/compact` to summarize
- [ ] Continue with fresh context

### Task Switch
- [ ] Use `/clear` for unrelated work
- [ ] Reload only what's needed

---

## 📈 Monthly Savings Estimate

**Your Usage Pattern (20 sessions/month):**

| Metric | Before | After | Savings |
|--------|--------|-------|---------|
| Tokens/session | 150k | 35k | 77% |
| Monthly tokens | 3M | 1.3M | 1.7M |
| Cost (Sonnet) | $9-45 | $4-19 | 56% |
| Cost (Haiku mix) | $6-30 | $2-10 | 67% |

**Annual Savings: $108-$408** (depending on model mix)

---

## 🚀 Pro Tips

### 1. **Use Parallel Tool Calls**
```
✅ GOOD: Read 3 files in parallel (single message)
❌ BAD:  Read 1 file → wait → Read 1 file → wait → Read 1 file
```

### 2. **Request Line Ranges**
```
✅ "Read schema.prisma lines 100-150"
❌ "Read schema.prisma"  (if only need specific models)
```

### 3. **Batch Related Tasks**
```
✅ "Update user DTO, controller, and service for new field"
❌ "Update DTO" → "Update controller" → "Update service"
```

### 4. **Use Task Agent for Exploration**
```
✅ "Use Explore agent to find error handling patterns"
❌ Manual grep/glob across entire codebase
```

### 5. **Start Fresh for New Features**
```
✅ /clear → work on new feature with clean context
❌ Keep old feature context loaded while starting new one
```

---

## 🎓 Learning Resources

### Official Commands
- `/help` - Claude Code documentation
- `/context` - Context window inspector
- `/cost` - Token usage tracker
- `/compact` - Session compaction
- `/clear` - Fresh start
- `/mcp` - MCP server management
- `/config` - Settings configuration

### Files Modified
- ✅ `/home/jeff/projects/monomi/internal/invoice-generator/CLAUDE.md`
- ✅ `/home/jeff/.claude/CLAUDE.md` (global preferences)
- ✅ This file: `CLAUDE-CODE-OPTIMIZATION.md`

---

## 📞 Quick Help

**Problem:** Session getting slow
**Solution:** Run `/compact` now

**Problem:** High token usage
**Solution:** Run `/context` to identify culprit

**Problem:** Need fresh start
**Solution:** Run `/clear` and reload essentials only

**Problem:** Unsure of costs
**Solution:** Run `/cost` to see breakdown

---

**Last Updated:** 2025-10-24
**Token Optimization Version:** 1.0
**Target Reduction:** 77% (150k → 35k tokens/session)
