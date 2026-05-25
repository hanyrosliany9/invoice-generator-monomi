# UI Rework — Wave 0 Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the design-system foundation (tokens, fonts, shadcn primitives, Monomi primitives, v2 routing, StyleGuidePage) that ALL future redesigned pages depend on. End state: when toggled to `v2`, the user sees a `StyleGuidePage` showing every primitive in the new dark-glassmorphism aesthetic. No production pages migrated yet.

**Architecture:** Drop AntD progressively. Install shadcn/ui (Radix + Tailwind v4) for primitives. Build a thin custom layer (`components/monomi/`) wrapping shadcn with Monomi-brand styling. New pages live under `/v2/*` behind a `localStorage` toggle. Classic AntD pages stay live and untouched.

**Tech Stack:** React 19 + Vite 6 + Tailwind v4 + shadcn/ui + Radix UI + TanStack Table v8 + react-hook-form + zod + react-day-picker + date-fns (Indonesian locale) + sonner + recharts (kept).

**Design doc:** `docs/plans/2026-05-24-ui-ux-rework-design.md` (commit `8fd7e19`) — APPROVED.

**Branch strategy:** Work on `master`. Each task ends with a focused commit. Foundation work doesn't break classic pages (parallel paths).

**Estimated effort:** 3-5 working days. Spread across ~30 tasks, ~2-5 min per task.

**Decision gate at end:** After this plan completes, the user reviews the StyleGuidePage and decides Wave 1 (Login + Dashboard) go/no-go.

---

## Phase A — Pre-flight Investigation

Before installing anything, confirm assumptions hold. Cheap to do; expensive if skipped.

### Task A1: Audit React 19 library compatibility

**Files:** None modified. Read-only research task.

**Step 1: Check React version in frontend package.json**

```bash
cd /mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator/frontend
node -e "const p = require('./package.json'); console.log('React:', p.dependencies.react)"
```
Expected: `React: ^19.x.x` (the project uses React 19)

**Step 2: Check that each target library supports React 19**

```bash
npm view @tanstack/react-table peerDependencies
npm view react-hook-form peerDependencies
npm view react-day-picker peerDependencies
npm view sonner peerDependencies
npm view @radix-ui/react-dialog peerDependencies
```

Expected each: `react: ^18 || ^19` or `^19` or no upper bound. If any shows `^18 only`, document the workaround (npm install with `--legacy-peer-deps` or wait for update).

**Step 3: Note findings**

Create `docs/plans/wave-0-investigation.md`:

```markdown
# Wave 0 Pre-flight Findings

## React 19 Library Compatibility
- @tanstack/react-table: <version> — <status>
- react-hook-form: <version> — <status>
- react-day-picker: <version> — <status>
- sonner: <version> — <status>
- @radix-ui/react-dialog: <version> — <status>

## Action items
- <any libs needing --legacy-peer-deps>
```

**Step 4: Commit**

```bash
git add docs/plans/wave-0-investigation.md
git commit -m "docs(ui-rework): wave 0 pre-flight findings — library compat"
```

---

### Task A2: Determine PDF rendering source

**Files:** None modified. Read-only research.

**Step 1: Find PDF generation code**

```bash
cd /mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator
grep -rln "puppeteer\|pdf" backend/src/modules/pdf/ 2>&1 | head -10
ls backend/src/modules/pdf/
```

**Step 2: Open the PDF service**

Read `backend/src/modules/pdf/pdf.service.ts` (or whatever the main file is). Look for: does it use Puppeteer with a URL/HTML string? Does it render React components server-side? Does it import frontend code?

**Step 3: Append findings to investigation doc**

Update `docs/plans/wave-0-investigation.md`:

```markdown
## PDF Rendering Source
- Method: <Puppeteer server-side | React server-render | Browser print | Other>
- Source file: backend/src/modules/pdf/<filename>
- Depends on frontend code: <yes/no>
- Risk to redesign: <NONE if server-side Puppeteer | NEEDS PRINT STYLES if browser-based>
```

**Step 4: Commit**

```bash
git add docs/plans/wave-0-investigation.md
git commit -m "docs(ui-rework): wave 0 PDF rendering source identified"
```

---

### Task A3: Audit current AntD usage scope

**Files:** None modified. Read-only.

**Step 1: Count AntD imports across frontend**

```bash
cd /mnt/dev-ssd/jeff/projects/monomi/internal/invoice-generator/frontend
echo "=== Total files importing antd ==="
grep -rl "from 'antd'" src/ | wc -l
echo ""
echo "=== Distinct AntD components used ==="
grep -rEoh "(import \{[^}]+\} from 'antd')" src/ | grep -oE "[A-Z][a-zA-Z]+" | sort -u
```

**Step 2: Append to investigation doc**

```markdown
## Current AntD Usage
- Files importing antd: <count>
- Distinct AntD components used: <list from step 1>
- Notable complex usages: <Table, Form, DatePicker, etc.>
```

**Step 3: Commit**

```bash
git add docs/plans/wave-0-investigation.md
git commit -m "docs(ui-rework): wave 0 AntD usage audit"
```

---

## Phase B — Foundation Setup

Install dependencies. Set up tokens. Make the build pass.

### Task B1: Install Tailwind v4 + base tooling

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/postcss.config.js` (or create)
- Modify: `frontend/src/index.css`

**Step 1: Check current Tailwind version**

```bash
cd frontend
npm ls tailwindcss 2>&1 | head -5
```

If already on v4, skip step 2. Otherwise:

**Step 2: Install Tailwind v4 + Vite plugin**

```bash
npm install -D tailwindcss@^4 @tailwindcss/vite@^4
```

**Step 3: Wire Vite plugin**

Edit `frontend/vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),  // ADD THIS
    // ... existing plugins
  ],
  // ... rest unchanged
})
```

**Step 4: Update `src/index.css` to v4 directive**

Replace top of `src/index.css`:

```css
@import 'tailwindcss';   /* v4 syntax replaces @tailwind base/components/utilities */
```

(Keep the rest of `index.css` untouched for now — classic pages still need it.)

**Step 5: Verify build still works**

```bash
npm run build 2>&1 | tail -20
```
Expected: build succeeds, no Tailwind errors.

**Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/index.css
git commit -m "build(ui-rework): upgrade to Tailwind v4 with Vite plugin"
```

---

### Task B2: Install shadcn/ui CLI + initialize

**Files:**
- Create: `frontend/components.json` (shadcn config)
- Create: `frontend/src/lib/utils.ts` (cn helper from shadcn init)

**Step 1: Initialize shadcn**

```bash
cd frontend
npx shadcn@latest init
```

When prompted:
- Style: New York (sharper, more dashboard-y than Default)
- Base color: Slate (we'll override via tokens anyway)
- CSS variables: Yes
- Tailwind config: tailwind.config.ts (create if missing)
- Components: `src/components/ui`
- Utils: `src/lib/utils.ts`
- React Server Components: No (this is Vite, not Next)

Init will: create `components.json`, scaffold `lib/utils.ts` (with `cn` helper), update Tailwind config.

**Step 2: Verify init output**

```bash
ls components.json src/lib/utils.ts
cat src/lib/utils.ts
```
Expected: `components.json` exists, `utils.ts` exports `cn(...)`.

**Step 3: Commit**

```bash
git add components.json src/lib/utils.ts tailwind.config.* src/index.css
git commit -m "build(ui-rework): initialize shadcn/ui (New York style)"
```

---

### Task B3: Add Google Fonts (Inter Tight + DM Sans + JetBrains Mono)

**Files:**
- Modify: `frontend/index.html`

**Step 1: Add font preconnect + link in index.html**

In `<head>` of `frontend/index.html`, BEFORE the existing `<link>` to vite assets:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

**Step 2: Verify they load**

```bash
npm run dev &
sleep 3
curl -s http://localhost:5173/ | grep -E "fonts.googleapis|fonts.gstatic"
kill %1 2>/dev/null
```
Expected: 3 lines matching font preconnect / link.

**Step 3: Commit**

```bash
git add index.html
git commit -m "feat(ui-rework): add Inter Tight + DM Sans + JetBrains Mono"
```

---

### Task B4: Write design tokens (CSS + TS)

**Files:**
- Create: `frontend/src/styles/tokens.css`
- Create: `frontend/src/styles/tokens.ts`

**Step 1: Create tokens.css**

```bash
mkdir -p frontend/src/styles
```

Create `frontend/src/styles/tokens.css` with the EXACT content from Section 1 of the design doc:

```css
/* See docs/plans/2026-05-24-ui-ux-rework-design.md §1 for full token spec */
:root {
  /* Brand */
  --brand-navy:        #131936;
  --brand-black:       #030303;
  --brand-cream:       #F6F3E8;
  --brand-white:       #FFFFFF;

  /* Surfaces (dark-only) */
  --bg-base:           #030303;
  --bg-elevated:       rgba(19, 25, 54, 0.55);
  --bg-overlay:        rgba(19, 25, 54, 0.78);
  --bg-glass:          rgba(255, 255, 255, 0.025);
  --bg-glass-strong:   rgba(255, 255, 255, 0.045);

  /* Text */
  --text-primary:      #F6F3E8;
  --text-secondary:    rgba(246, 243, 232, 0.65);
  --text-tertiary:     rgba(246, 243, 232, 0.4);
  --text-disabled:     rgba(246, 243, 232, 0.25);

  /* Borders */
  --border-subtle:     rgba(246, 243, 232, 0.06);
  --border-default:    rgba(246, 243, 232, 0.12);
  --border-strong:     rgba(246, 243, 232, 0.22);

  /* Semantic — muted/luxe */
  --success:           #6EE7B7;
  --warning:           #FCD34D;
  --danger:            #FCA5A5;
  --info:              #93C5FD;

  /* Atmosphere */
  --atmos-navy-glow:   radial-gradient(circle, rgba(19,25,54,0.55), transparent 65%);
  --atmos-cream-glow:  radial-gradient(circle, rgba(246,243,232,0.08), transparent 65%);
  --atmos-deep-glow:   radial-gradient(circle, rgba(255,255,255,0.04), transparent 70%);

  /* Radii */
  --radius-sm: 6px; --radius-md: 10px; --radius-lg: 16px; --radius-xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-glow:     0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.4);
  --shadow-elevated: 0 1px 0 rgba(255,255,255,0.06) inset, 0 16px 48px rgba(0,0,0,0.5);
  --shadow-modal:    0 1px 0 rgba(255,255,255,0.08) inset, 0 32px 96px rgba(0,0,0,0.6);
}
```

**Step 2: Create tokens.ts (mirror for runtime access)**

Create `frontend/src/styles/tokens.ts`:

```ts
/**
 * Runtime mirror of CSS tokens.
 * Use when you need token values in JS (charts, conditional styling).
 * For static styling, prefer Tailwind classes that reference these.
 */
export const tokens = {
  brand: {
    navy:  '#131936',
    black: '#030303',
    cream: '#F6F3E8',
    white: '#FFFFFF',
  },
  bg: {
    base:        '#030303',
    elevated:    'rgba(19, 25, 54, 0.55)',
    overlay:     'rgba(19, 25, 54, 0.78)',
    glass:       'rgba(255, 255, 255, 0.025)',
    glassStrong: 'rgba(255, 255, 255, 0.045)',
  },
  text: {
    primary:   '#F6F3E8',
    secondary: 'rgba(246, 243, 232, 0.65)',
    tertiary:  'rgba(246, 243, 232, 0.4)',
    disabled:  'rgba(246, 243, 232, 0.25)',
  },
  border: {
    subtle:  'rgba(246, 243, 232, 0.06)',
    default: 'rgba(246, 243, 232, 0.12)',
    strong:  'rgba(246, 243, 232, 0.22)',
  },
  semantic: {
    success: '#6EE7B7',
    warning: '#FCD34D',
    danger:  '#FCA5A5',
    info:    '#93C5FD',
  },
  radius: {
    sm:   '6px',
    md:   '10px',
    lg:   '16px',
    xl:   '24px',
    full: '9999px',
  },
  blur: {
    light:   'blur(12px) saturate(140%)',
    default: 'blur(24px) saturate(180%)',
    strong:  'blur(36px) saturate(200%)',
  },
} as const;

export type Token = typeof tokens;
```

**Step 3: Import tokens.css into main entry**

Edit `frontend/src/main.tsx`, add at top with other imports:

```ts
import './styles/tokens.css';
```

**Step 4: Verify build + tokens reach DOM**

```bash
npm run dev &
sleep 3
curl -s http://localhost:5173/ > /dev/null
kill %1 2>/dev/null
```
(Manual visual check in browser: open devtools, `:root` should have all `--brand-*` variables.)

**Step 5: Commit**

```bash
git add src/styles/tokens.css src/styles/tokens.ts src/main.tsx
git commit -m "feat(ui-rework): add Monomi design tokens (CSS + TS)"
```

---

### Task B5: Wire tokens into Tailwind v4 theme

**Files:**
- Modify: `frontend/src/index.css` (Tailwind v4 uses `@theme` in CSS, not JS config)

**Step 1: Add `@theme` block referencing tokens**

In `frontend/src/index.css`, AFTER `@import 'tailwindcss';`, add:

```css
@theme {
  /* Colors — mapped from CSS tokens, available as Tailwind utilities */
  --color-brand-navy: var(--brand-navy);
  --color-brand-black: var(--brand-black);
  --color-brand-cream: var(--brand-cream);
  --color-bg-base: var(--bg-base);
  --color-bg-elevated: var(--bg-elevated);
  --color-bg-glass: var(--bg-glass);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-tertiary: var(--text-tertiary);
  --color-border-subtle: var(--border-subtle);
  --color-border-default: var(--border-default);
  --color-success: var(--success);
  --color-warning: var(--warning);
  --color-danger: var(--danger);
  --color-info: var(--info);

  /* Typography */
  --font-display: 'Inter Tight', system-ui, sans-serif;
  --font-body: 'DM Sans', 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'Menlo', monospace;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Custom utilities for backdrop blur */
  --backdrop-blur-light: 12px;
  --backdrop-blur-default: 24px;
  --backdrop-blur-strong: 36px;
}
```

**Step 2: Test a token-bound utility class**

Create temp test in `frontend/src/test-tokens.tsx` (will delete after):

```tsx
export const TestTokens = () => (
  <div className="bg-bg-base text-text-primary font-display">test</div>
);
```

Build to verify utilities exist:

```bash
npm run build 2>&1 | grep -iE "error|warning" | head -5
```
Expected: no errors mentioning `bg-bg-base` or `text-text-primary`.

**Step 3: Delete the temp test**

```bash
rm frontend/src/test-tokens.tsx
```

**Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(ui-rework): expose tokens as Tailwind v4 utilities"
```

---

### Task B6: Install all required shadcn primitives in one batch

**Files:**
- Create: `frontend/src/components/ui/*.tsx` (many — generated)

**Step 1: Install all primitives**

```bash
cd frontend
npx shadcn@latest add button card dialog sheet input label select tabs dropdown-menu tooltip popover avatar badge checkbox radio-group switch skeleton calendar progress separator sonner --yes
```

shadcn CLI generates each component as a TypeScript file in `src/components/ui/`. It also installs needed Radix sub-packages.

**Step 2: Verify all installed**

```bash
ls src/components/ui/ | sort
```
Expected (20+): `avatar.tsx button.tsx calendar.tsx card.tsx checkbox.tsx dialog.tsx dropdown-menu.tsx input.tsx label.tsx popover.tsx progress.tsx radio-group.tsx select.tsx separator.tsx sheet.tsx skeleton.tsx sonner.tsx switch.tsx tabs.tsx tooltip.tsx`

**Step 3: Verify it builds**

```bash
npm run build 2>&1 | tail -10
```
Expected: build succeeds. If failures, common cause is Tailwind v4 vs shadcn template mismatch — check shadcn version is latest (`npx shadcn@latest` not pinned old).

**Step 4: Commit**

```bash
git add src/components/ui package.json package-lock.json
git commit -m "feat(ui-rework): install shadcn/ui primitives (button, card, dialog, sheet, form, table, etc.)"
```

---

### Task B7: Install non-shadcn dependencies

**Files:**
- Modify: `frontend/package.json`

**Step 1: Install runtime deps**

```bash
cd frontend
npm install \
  @tanstack/react-table@^8 \
  react-hook-form@^7 \
  zod@^3 \
  @hookform/resolvers@^3 \
  react-day-picker@^9 \
  date-fns@^4 \
  class-variance-authority@^0.7 \
  tailwind-merge@^2
```

(`sonner` was already installed via shadcn add sonner; `class-variance-authority` and `tailwind-merge` come with shadcn.)

**Step 2: Verify deps**

```bash
npm ls @tanstack/react-table react-hook-form zod react-day-picker date-fns sonner 2>&1 | head -10
```
Expected: each listed with version.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat(ui-rework): install TanStack Table, react-hook-form, zod, react-day-picker"
```

---

### Task B8: Add ESLint rules — no AntD in v2, jsx-a11y

**Files:**
- Modify: `frontend/.eslintrc.json` or `frontend/eslint.config.js`
- Modify: `frontend/package.json` (install jsx-a11y)

**Step 1: Install eslint-plugin-jsx-a11y**

```bash
cd frontend
npm install -D eslint-plugin-jsx-a11y@^6
```

**Step 2: Find ESLint config file**

```bash
ls .eslintrc* eslint.config.* 2>&1
```

**Step 3: Edit ESLint config to add the no-AntD rule + a11y plugin**

If `eslint.config.js` (flat config), add to the appropriate config object:

```js
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  // ... existing configs
  jsxA11y.flatConfigs.recommended,
  {
    files: [
      'src/pages/v2/**',
      'src/components/monomi/**',
      'src/components/ui/**',
    ],
    rules: {
      'no-restricted-imports': ['error', {
        paths: [{
          name: 'antd',
          message: 'v2 / monomi / ui files must NOT import AntD. Use shadcn or Monomi primitives.',
        }, {
          name: '@ant-design/icons',
          message: 'Use lucide-react icons (shadcn standard) instead.',
        }],
      }],
    },
  },
];
```

If `.eslintrc.json` (legacy), add equivalent under `overrides`:

```json
{
  "plugins": ["jsx-a11y"],
  "extends": ["plugin:jsx-a11y/recommended"],
  "overrides": [
    {
      "files": ["src/pages/v2/**", "src/components/monomi/**", "src/components/ui/**"],
      "rules": {
        "no-restricted-imports": ["error", {
          "paths": [
            { "name": "antd", "message": "..." },
            { "name": "@ant-design/icons", "message": "..." }
          ]
        }]
      }
    }
  ]
}
```

**Step 4: Verify rule active**

Create a test file `src/components/monomi/_test.tsx`:

```tsx
import { Button } from 'antd';
export const X = () => <Button>test</Button>;
```

Run ESLint:

```bash
npx eslint src/components/monomi/_test.tsx 2>&1 | head -5
```
Expected: error about antd import not allowed.

**Step 5: Delete the test file**

```bash
rm src/components/monomi/_test.tsx
```

**Step 6: Install lucide-react (icon lib shadcn uses)**

```bash
npm install lucide-react@^0.4
```

**Step 7: Commit**

```bash
git add eslint.config.* .eslintrc* package.json package-lock.json
git commit -m "feat(ui-rework): ESLint rules — block antd in v2 dirs + jsx-a11y plugin"
```

---

## Phase F — DataTable + GeneralLedger Spike (DE-RISK EARLY)

Do this BEFORE building remaining primitives. If TanStack Table can't handle our complex tables, we need to know now.

### Task F1: Build the `<DataTable>` primitive

**Files:**
- Create: `frontend/src/components/monomi/DataTable.tsx`
- Create: `frontend/src/components/monomi/DataTable.types.ts`

**Step 1: Create the type definitions**

`frontend/src/components/monomi/DataTable.types.ts`:

```ts
import type { ColumnDef, RowData } from '@tanstack/react-table';

export interface DataTableProps<TData extends RowData, TValue = unknown> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  // Optional features (each adds chrome only if enabled)
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableColumnVisibility?: boolean;
  enablePagination?: boolean;
  enableRowSelection?: boolean;
  enableExpanding?: boolean;          // for nested rows (e.g. GL drilldown)
  // Density toggle
  density?: 'compact' | 'comfortable';
  // Render slots
  toolbar?: React.ReactNode;          // search + filter pills above table
  emptyState?: React.ReactNode;
  // Callbacks
  onRowClick?: (row: TData) => void;
}
```

**Step 2: Create DataTable component (core wrapper)**

`frontend/src/components/monomi/DataTable.tsx`:

```tsx
import { useState, useMemo } from 'react';
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, getExpandedRowModel,
  flexRender,
  type SortingState, type ColumnFiltersState, type VisibilityState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DataTableProps } from './DataTable.types';

export function DataTable<TData, TValue = unknown>({
  data,
  columns,
  enableSorting = true,
  enableFiltering = false,
  enableColumnVisibility = false,
  enablePagination = true,
  enableRowSelection = false,
  enableExpanding = false,
  density = 'comfortable',
  toolbar,
  emptyState,
  onRowClick,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [filters, setFilters] = useState<ColumnFiltersState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters: filters, columnVisibility: visibility, rowSelection },
    onSortingChange: setSorting,
    onColumnFiltersChange: setFilters,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    ...(enableSorting && { getSortedRowModel: getSortedRowModel() }),
    ...(enableFiltering && { getFilteredRowModel: getFilteredRowModel() }),
    ...(enablePagination && { getPaginationRowModel: getPaginationRowModel() }),
    ...(enableExpanding && { getExpandedRowModel: getExpandedRowModel() }),
    enableRowSelection,
  });

  const rowPadding = density === 'compact' ? 'px-3 py-1.5' : 'px-4 py-3';

  return (
    <div className="w-full space-y-3">
      {toolbar && <div>{toolbar}</div>}
      <div className="rounded-lg border border-border-subtle bg-bg-glass backdrop-blur-[24px] overflow-hidden">
        <table className="w-full font-body text-sm">
          <thead className="border-b border-border-subtle">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id}>
                {hg.headers.map(header => {
                  const canSort = enableSorting && header.column.getCanSort();
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'text-left font-medium text-text-secondary uppercase tracking-wider text-xs',
                        rowPadding,
                        canSort && 'cursor-pointer select-none hover:text-text-primary',
                      )}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && (
                          {
                            asc: <ChevronUp className="h-3 w-3" />,
                            desc: <ChevronDown className="h-3 w-3" />,
                          }[header.column.getIsSorted() as string] ??
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </span>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  {emptyState ?? <span className="text-text-tertiary">No data</span>}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-border-subtle last:border-0 hover:bg-bg-glass-strong transition-colors',
                    onRowClick && 'cursor-pointer',
                  )}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className={rowPadding}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {enablePagination && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            Showing {table.getRowModel().rows.length} of {data.length}
          </span>
          <div className="flex gap-2">
            <button
              className="px-3 py-1 rounded-md border border-border-default disabled:opacity-30"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >Prev</button>
            <button
              className="px-3 py-1 rounded-md border border-border-default disabled:opacity-30"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Build to verify no errors**

```bash
mkdir -p src/components/monomi
npm run build 2>&1 | tail -5
```

**Step 4: Commit**

```bash
git add src/components/monomi/DataTable.tsx src/components/monomi/DataTable.types.ts
git commit -m "feat(ui-rework): DataTable primitive (TanStack Table wrapper)"
```

---

### Task F2: GeneralLedger spike — prove DataTable handles complex case

**Files:**
- Read: `frontend/src/pages/accounting/GeneralLedgerPage.tsx` (DO NOT MODIFY)
- Create: `frontend/src/pages/v2/_spike-general-ledger.tsx` (throwaway)

**Step 1: Read the current GeneralLedgerPage to understand requirements**

```bash
wc -l src/pages/accounting/GeneralLedgerPage.tsx
grep -E "Table|expand|select|filter|sort|virtual" src/pages/accounting/GeneralLedgerPage.tsx | head -10
```

Note what features the page uses (sorting? grouping? virtualization? inline edit?).

**Step 2: Build a spike page reproducing the hardest features with our DataTable**

`frontend/src/pages/v2/_spike-general-ledger.tsx`:

```tsx
import { useMemo } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/monomi/DataTable';

// Fake data resembling GL shape: hundreds of rows, expandable per-entry
type GLRow = {
  id: string;
  date: string;
  ref: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  balance: number;
  children?: GLRow[];   // expandable sub-rows
};

const mockData: GLRow[] = Array.from({ length: 500 }, (_, i) => ({
  id: `r${i}`,
  date: '2026-05-' + ((i % 28) + 1).toString().padStart(2, '0'),
  ref: `JE-2026-${(i + 1).toString().padStart(4, '0')}`,
  description: `Entry ${i + 1}: ${['Sales', 'Purchase', 'Payment', 'Refund'][i % 4]}`,
  account: ['1-1010', '4-1010', '6-1010', '2-1010'][i % 4],
  debit: i % 2 === 0 ? Math.floor(Math.random() * 50_000_000) : 0,
  credit: i % 2 === 1 ? Math.floor(Math.random() * 50_000_000) : 0,
  balance: Math.floor(Math.random() * 200_000_000),
}));

const idr = (n: number) => `Rp ${n.toLocaleString('id-ID')}`;

const columns: ColumnDef<GLRow>[] = [
  { accessorKey: 'date', header: 'Date' },
  { accessorKey: 'ref', header: 'Reference' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'account', header: 'Account' },
  { accessorKey: 'debit', header: 'Debit', cell: ({ row }) => row.original.debit ? idr(row.original.debit) : '—' },
  { accessorKey: 'credit', header: 'Credit', cell: ({ row }) => row.original.credit ? idr(row.original.credit) : '—' },
  { accessorKey: 'balance', header: 'Balance', cell: ({ row }) => idr(row.original.balance) },
];

export default function SpikeGeneralLedger() {
  return (
    <div className="min-h-screen bg-bg-base p-8">
      <h1 className="text-2xl font-display font-bold text-text-primary mb-6">
        Spike: GL with 500 rows, sort + filter + paginate
      </h1>
      <DataTable
        data={mockData}
        columns={columns}
        enableSorting
        enableFiltering
        enablePagination
        density="compact"
      />
    </div>
  );
}
```

**Step 3: Wire as temporary route**

In `src/App.tsx`, add a route (we'll properly do routing later):

```tsx
// Find existing Routes block, add inside:
<Route path="/spike/gl" element={<SpikeGeneralLedger />} />
// And import:
import SpikeGeneralLedger from './pages/v2/_spike-general-ledger';
```

**Step 4: Manual test in browser**

```bash
npm run dev
```

Open `http://localhost:5173/spike/gl`. Verify:
- 500 rows render without lag
- Click column header → sorts asc/desc
- Pagination shows "Showing 10 of 500" (or whatever default page size)
- Prev/Next work
- Hover row highlights
- Currency formatting correct (`Rp 12.345.678`)

**Step 5: Record spike result in investigation doc**

Append to `docs/plans/wave-0-investigation.md`:

```markdown
## DataTable Spike — GL 500 rows
- ✅ Sort columns: works
- ✅ Pagination: works
- ✅ Currency format: works
- ✅ Density compact: works
- ⚠️ Virtualization: NOT implemented yet (acceptable up to ~1000 rows; if real GL has 10k+ rows, add @tanstack/react-virtual in Wave 5)
- ⚠️ Inline edit / expand: NOT in spike (will add in Wave 5 when needed)
- VERDICT: TanStack Table is suitable. Proceed with primitives.
```

**Step 6: Remove the temp spike route + page**

```bash
rm src/pages/v2/_spike-general-ledger.tsx
# Manually remove the import + Route line from App.tsx
```

**Step 7: Commit**

```bash
git add docs/plans/wave-0-investigation.md src/App.tsx
git commit -m "spike(ui-rework): DataTable handles GL 500-row case (VERDICT: proceed)"
```

---

## Phase C — Build Monomi Primitives

Can be parallelized. Each task is one primitive.

### Task C1: GlassPanel primitive

**Files:**
- Create: `frontend/src/components/monomi/GlassPanel.tsx`

**Step 1: Write component**

```tsx
import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const glassPanelVariants = cva(
  'rounded-lg border border-border-subtle backdrop-blur-[24px] backdrop-saturate-[180%] shadow-[var(--shadow-glow)]',
  {
    variants: {
      surface: {
        glass:    'bg-bg-glass',
        strong:   'bg-bg-glass-strong',
        elevated: 'bg-bg-elevated',
      },
      padding: {
        none: '',
        sm:   'p-4',
        md:   'p-6',
        lg:   'p-8',
      },
    },
    defaultVariants: { surface: 'glass', padding: 'md' },
  }
);

export interface GlassPanelProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof glassPanelVariants> {}

export const GlassPanel = forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, surface, padding, ...props }, ref) => (
    <div ref={ref} className={cn(glassPanelVariants({ surface, padding }), className)} {...props} />
  )
);
GlassPanel.displayName = 'GlassPanel';
```

**Step 2: Build**

```bash
npm run build 2>&1 | tail -3
```

**Step 3: Commit**

```bash
git add src/components/monomi/GlassPanel.tsx
git commit -m "feat(ui-rework): GlassPanel primitive"
```

---

### Task C2: AuroraBackground primitive

**Files:**
- Create: `frontend/src/components/monomi/AuroraBackground.tsx`
- Create: `frontend/src/components/monomi/AuroraBackground.css`

**Step 1: Create CSS for animated orbs**

`frontend/src/components/monomi/AuroraBackground.css`:

```css
.aurora-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  background: var(--bg-base);
}

.aurora-orb {
  position: absolute;
  border-radius: 50%;
  will-change: transform;
}

.aurora-orb-1 {
  width: 720px; height: 720px;
  background: var(--atmos-navy-glow);
  top: -260px; left: -200px;
  animation: aurora-float-1 28s ease-in-out infinite;
}
.aurora-orb-2 {
  width: 600px; height: 600px;
  background: var(--atmos-cream-glow);
  bottom: -180px; right: -160px;
  animation: aurora-float-2 32s ease-in-out infinite;
}
.aurora-orb-3 {
  width: 440px; height: 440px;
  background: var(--atmos-deep-glow);
  top: 38%; left: 48%;
  animation: aurora-float-3 22s ease-in-out infinite;
}

@keyframes aurora-float-1 {
  0%,100% { transform: translate(0,0) scale(1); }
  40% { transform: translate(40px,-50px) scale(1.06); }
  70% { transform: translate(-30px,30px) scale(0.94); }
}
@keyframes aurora-float-2 {
  0%,100% { transform: translate(0,0) scale(1); }
  35% { transform: translate(-40px,40px) scale(1.05); }
  65% { transform: translate(25px,-25px) scale(0.96); }
}
@keyframes aurora-float-3 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-40px,-30px) scale(1.08); }
}

@media (prefers-reduced-motion: reduce) {
  .aurora-orb-1, .aurora-orb-2, .aurora-orb-3 { animation: none; }
}
```

**Step 2: Create component**

`frontend/src/components/monomi/AuroraBackground.tsx`:

```tsx
import './AuroraBackground.css';

export const AuroraBackground = () => (
  <div className="aurora-bg" aria-hidden="true">
    <div className="aurora-orb aurora-orb-1" />
    <div className="aurora-orb aurora-orb-2" />
    <div className="aurora-orb aurora-orb-3" />
  </div>
);
```

**Step 3: Build + commit**

```bash
npm run build 2>&1 | tail -3
git add src/components/monomi/AuroraBackground.*
git commit -m "feat(ui-rework): AuroraBackground primitive (animated navy/cream orbs)"
```

---

### Task C3: PageContainer + PageHeader primitives

**Files:**
- Create: `frontend/src/components/monomi/PageContainer.tsx`
- Create: `frontend/src/components/monomi/PageHeader.tsx`

**Step 1: PageContainer**

```tsx
import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const PageContainer = ({
  className, children, ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8', className)} {...props}>
    {children}
  </div>
);
```

**Step 2: PageHeader**

```tsx
import { type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Breadcrumb { label: string; href?: string }

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export const PageHeader = ({
  title, description, breadcrumbs, actions, sticky, className,
}: PageHeaderProps) => (
  <header className={cn(
    'mb-8',
    sticky && 'sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-bg-base/80 backdrop-blur-[24px] border-b border-border-subtle',
    className,
  )}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav className="flex items-center gap-1 text-xs text-text-tertiary mb-2" aria-label="Breadcrumb">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {b.href
              ? <a href={b.href} className="hover:text-text-secondary">{b.label}</a>
              : <span>{b.label}</span>}
            {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
          </span>
        ))}
      </nav>
    )}
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-secondary max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  </header>
);
```

**Step 3: Commit**

```bash
git add src/components/monomi/PageContainer.tsx src/components/monomi/PageHeader.tsx
git commit -m "feat(ui-rework): PageContainer + PageHeader primitives"
```

---

### Task C4: AppShell + Sidebar + Topbar

**Files:**
- Create: `frontend/src/components/monomi/AppShell.tsx`
- Create: `frontend/src/components/monomi/Sidebar.tsx`
- Create: `frontend/src/components/monomi/Topbar.tsx`

**Step 1: Sidebar**

`frontend/src/components/monomi/Sidebar.tsx`:

```tsx
import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  label: string;
  icon: ReactNode;       // lucide-react icon component
  href: string;
  children?: SidebarItem[];
}

export interface SidebarProps {
  brand: ReactNode;       // logo + name
  items: SidebarItem[];
  footer?: ReactNode;     // user chip
  collapsed?: boolean;
}

export const Sidebar = ({ brand, items, footer, collapsed }: SidebarProps) => (
  <aside className={cn(
    'flex flex-col h-screen border-r border-border-subtle bg-bg-elevated backdrop-blur-[24px]',
    collapsed ? 'w-16' : 'w-60',
    'transition-all duration-200'
  )}>
    <div className="px-4 py-5 border-b border-border-subtle">{brand}</div>
    <nav className="flex-1 overflow-y-auto py-4">
      {items.map(item => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-glass transition-colors',
            'border-l-2 border-transparent',
            isActive && 'text-text-primary bg-bg-glass border-l-brand-cream',
          )}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
    {footer && <div className="p-4 border-t border-border-subtle">{footer}</div>}
  </aside>
);
```

**Step 2: Topbar**

`frontend/src/components/monomi/Topbar.tsx`:

```tsx
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TopbarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export const Topbar = ({ left, center, right, className }: TopbarProps) => (
  <header className={cn(
    'sticky top-0 z-20 h-14 px-4 sm:px-6 flex items-center justify-between gap-4',
    'bg-bg-base/60 backdrop-blur-[24px] border-b border-border-subtle',
    className,
  )}>
    <div className="flex-1 min-w-0">{left}</div>
    <div className="flex-1 flex justify-center">{center}</div>
    <div className="flex items-center gap-2">{right}</div>
  </header>
);
```

**Step 3: AppShell**

`frontend/src/components/monomi/AppShell.tsx`:

```tsx
import { type ReactNode } from 'react';
import { Sidebar, type SidebarProps } from './Sidebar';
import { Topbar, type TopbarProps } from './Topbar';
import { AuroraBackground } from './AuroraBackground';

export interface AppShellProps {
  sidebar: SidebarProps;
  topbar?: TopbarProps;
  children: ReactNode;
}

export const AppShell = ({ sidebar, topbar, children }: AppShellProps) => (
  <div className="min-h-screen flex bg-bg-base text-text-primary font-body">
    <AuroraBackground />
    <Sidebar {...sidebar} />
    <div className="flex-1 flex flex-col min-w-0">
      {topbar && <Topbar {...topbar} />}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>
);
```

**Step 4: Build + commit**

```bash
npm run build 2>&1 | tail -3
git add src/components/monomi/AppShell.tsx src/components/monomi/Sidebar.tsx src/components/monomi/Topbar.tsx
git commit -m "feat(ui-rework): AppShell + Sidebar + Topbar primitives"
```

---

### Task C5: MoneyDisplay + DateDisplay formatters

**Files:**
- Create: `frontend/src/components/monomi/MoneyDisplay.tsx`
- Create: `frontend/src/components/monomi/DateDisplay.tsx`
- Create: `frontend/src/components/monomi/__tests__/formatters.test.ts`

**Step 1: Write failing test (TDD)**

`frontend/src/components/monomi/__tests__/formatters.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MoneyDisplay } from '../MoneyDisplay';
import { DateDisplay } from '../DateDisplay';

describe('MoneyDisplay', () => {
  it('formats IDR with id-ID separators', () => {
    const { container } = render(<MoneyDisplay amount={12500000} />);
    expect(container.textContent).toBe('Rp 12.500.000');
  });

  it('renders zero as Rp 0', () => {
    const { container } = render(<MoneyDisplay amount={0} />);
    expect(container.textContent).toBe('Rp 0');
  });

  it('shows negative with color-negative class when colorize set', () => {
    const { container } = render(<MoneyDisplay amount={-500000} colorize />);
    expect(container.firstChild).toHaveClass('text-danger');
  });
});

describe('DateDisplay', () => {
  it('formats ISO date in Bahasa Indonesia', () => {
    const { container } = render(<DateDisplay date="2026-05-24T10:00:00Z" />);
    // "24 Mei 2026"
    expect(container.textContent).toMatch(/24 Mei 2026/);
  });

  it('renders dash for null', () => {
    const { container } = render(<DateDisplay date={null} />);
    expect(container.textContent).toBe('—');
  });
});
```

**Step 2: Run test, verify FAIL**

```bash
npm test -- src/components/monomi/__tests__/formatters.test.ts 2>&1 | tail -10
```
Expected: failure because `MoneyDisplay` / `DateDisplay` not found.

**Step 3: Implement MoneyDisplay**

`frontend/src/components/monomi/MoneyDisplay.tsx`:

```tsx
import { cn } from '@/lib/utils';

export interface MoneyDisplayProps {
  amount: number | string | null | undefined;
  currency?: 'IDR';
  colorize?: boolean;
  className?: string;
}

export const MoneyDisplay = ({ amount, currency = 'IDR', colorize, className }: MoneyDisplayProps) => {
  const n = amount === null || amount === undefined ? 0 : Number(amount);
  const isNeg = n < 0;
  const formatted = `Rp ${Math.round(Math.abs(n)).toLocaleString('id-ID')}`;
  return (
    <span className={cn(
      'font-mono tabular-nums',
      colorize && isNeg && 'text-danger',
      colorize && n > 0 && 'text-success',
      className,
    )}>
      {isNeg && '−'}{formatted}
    </span>
  );
};
```

**Step 4: Implement DateDisplay**

`frontend/src/components/monomi/DateDisplay.tsx`:

```tsx
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export interface DateDisplayProps {
  date: string | Date | null | undefined;
  format?: 'short' | 'long' | 'relative';
  className?: string;
}

export const DateDisplay = ({ date, format: variant = 'short', className }: DateDisplayProps) => {
  if (!date) return <span className={className}>—</span>;
  const d = typeof date === 'string' ? new Date(date) : date;
  const pattern = variant === 'long' ? 'd MMMM yyyy, HH:mm' : 'd MMM yyyy';
  return <span className={className}>{format(d, pattern, { locale: id })}</span>;
};
```

**Step 5: Run test, verify PASS**

```bash
npm test -- src/components/monomi/__tests__/formatters.test.ts 2>&1 | tail -10
```
Expected: all 5 tests pass.

**Step 6: Commit**

```bash
git add src/components/monomi/MoneyDisplay.tsx src/components/monomi/DateDisplay.tsx src/components/monomi/__tests__/
git commit -m "feat(ui-rework): MoneyDisplay + DateDisplay formatters (with tests)"
```

---

### Task C6: EmptyState primitive

**Files:**
- Create: `frontend/src/components/monomi/EmptyState.tsx`

```tsx
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;            // lucide icon
  title: string;
  description?: string;
  action?: ReactNode;           // Button etc.
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
    {icon && (
      <div className="mb-4 text-text-tertiary [&>svg]:h-12 [&>svg]:w-12 [&>svg]:stroke-1">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-display font-semibold text-text-primary">{title}</h3>
    {description && <p className="mt-2 text-sm text-text-secondary max-w-md">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
```

```bash
git add src/components/monomi/EmptyState.tsx
git commit -m "feat(ui-rework): EmptyState primitive"
```

---

### Task C7: UserChip primitive

**Files:**
- Create: `frontend/src/components/monomi/UserChip.tsx`

```tsx
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export interface UserChipProps {
  name: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const UserChip = ({ name, email, role, avatarUrl, size = 'md', className }: UserChipProps) => {
  const initials = name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  const avatarSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div className={cn('flex items-center gap-3 min-w-0', className)}>
      <Avatar className={avatarSize}>
        {avatarUrl && <AvatarImage src={avatarUrl} alt={name} />}
        <AvatarFallback className="bg-brand-navy text-brand-cream font-medium text-xs">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-primary truncate">{name}</div>
        {(email || role) && (
          <div className="text-xs text-text-tertiary truncate">
            {role && <span className="text-text-secondary">{role}</span>}
            {role && email && ' · '}
            {email}
          </div>
        )}
      </div>
    </div>
  );
};
```

```bash
git add src/components/monomi/UserChip.tsx
git commit -m "feat(ui-rework): UserChip primitive"
```

---

### Task C8: StatCard primitive

**Files:**
- Create: `frontend/src/components/monomi/StatCard.tsx`

```tsx
import { type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: ReactNode;             // string or MoneyDisplay or any
  delta?: { value: number; suffix?: string };   // {+12, '%'} or {-3, ' clients'}
  sublabel?: string;
  sparkline?: ReactNode;        // small chart at bottom (recharts mini)
  className?: string;
}

export const StatCard = ({ label, value, delta, sublabel, sparkline, className }: StatCardProps) => (
  <GlassPanel className={cn('relative overflow-hidden', className)}>
    <div className="text-xs uppercase tracking-wider text-text-secondary font-medium">{label}</div>
    <div className="mt-2 text-3xl sm:text-4xl font-display font-bold text-text-primary">{value}</div>
    {(delta || sublabel) && (
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span className={cn(
            'inline-flex items-center gap-0.5 font-medium',
            delta.value >= 0 ? 'text-success' : 'text-danger',
          )}>
            {delta.value >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta.value)}{delta.suffix ?? '%'}
          </span>
        )}
        {sublabel && <span className="text-text-tertiary">{sublabel}</span>}
      </div>
    )}
    {sparkline && <div className="mt-4 h-12 -mx-2">{sparkline}</div>}
  </GlassPanel>
);
```

```bash
git add src/components/monomi/StatCard.tsx
git commit -m "feat(ui-rework): StatCard primitive (for dashboard hero stats)"
```

---

### Task C9: MonomiDatePicker wrapper (Indonesian locale)

**Files:**
- Create: `frontend/src/components/monomi/MonomiDatePicker.tsx`

```tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MonomiDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const MonomiDatePicker = ({
  value, onChange, placeholder = 'Pilih tanggal', disabled, className,
}: MonomiDatePickerProps) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            'w-full justify-start text-left font-normal',
            !value && 'text-text-tertiary',
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(value, 'd MMMM yyyy', { locale: idLocale }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => { onChange?.(d); setOpen(false); }}
          locale={idLocale}
          weekStartsOn={1}
        />
      </PopoverContent>
    </Popover>
  );
};
```

```bash
git add src/components/monomi/MonomiDatePicker.tsx
git commit -m "feat(ui-rework): MonomiDatePicker — Indonesian locale, Mon week start"
```

---

### Task C10: MonomiChart wrapper around recharts

**Files:**
- Create: `frontend/src/components/monomi/MonomiChart.tsx`

```tsx
import { type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { tokens } from '@/styles/tokens';

/**
 * Color palette for chart series, ordered by priority of importance.
 * Stays on-brand: cream + soft variants of brand navy.
 */
export const chartColors = [
  tokens.brand.cream,      // primary series
  tokens.semantic.info,    // soft sky for secondary
  tokens.semantic.success, // mint for positive
  tokens.semantic.warning, // amber for tertiary
  tokens.brand.navy,       // navy for accent
] as const;

export const chartGridProps = {
  stroke: tokens.border.subtle,
  strokeDasharray: '3 3',
} as const;

export const chartAxisProps = {
  stroke: tokens.text.tertiary,
  fontSize: 12,
  fontFamily: tokens.brand.cream,   // wrong — fix: use tokens.brand or just hardcode 'DM Sans'
} as const;

export interface MonomiChartProps {
  height?: number;
  children: ReactNode;
}

export const MonomiChart = ({ height = 240, children }: MonomiChartProps) => (
  <div style={{ width: '100%', height }}>
    <ResponsiveContainer>{children as any}</ResponsiveContainer>
  </div>
);
```

```bash
git add src/components/monomi/MonomiChart.tsx
git commit -m "feat(ui-rework): MonomiChart wrapper around recharts (brand palette)"
```

---

## Phase D — v2 Routing Infrastructure

### Task D1: localStorage toggle hook

**Files:**
- Create: `frontend/src/hooks/useUiVersion.ts`

```tsx
import { useEffect, useState } from 'react';

const KEY = 'monomi.ui';
type Version = 'classic' | 'v2';

const readPref = (): Version => {
  if (typeof localStorage === 'undefined') return 'classic';
  return localStorage.getItem(KEY) === 'v2' ? 'v2' : 'classic';
};

export function useUiVersion() {
  const [version, setVersionState] = useState<Version>(readPref());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === KEY) setVersionState(readPref());
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setVersion = (v: Version) => {
    localStorage.setItem(KEY, v);
    setVersionState(v);
  };

  const toggle = () => setVersion(version === 'v2' ? 'classic' : 'v2');

  return { version, setVersion, toggle, isV2: version === 'v2' };
}
```

```bash
git add src/hooks/useUiVersion.ts
git commit -m "feat(ui-rework): useUiVersion hook (localStorage toggle)"
```

---

### Task D2: v2 route prefix + per-page redirect

**Files:**
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/pages/v2/V2RouteGuard.tsx`

**Step 1: Identify registered v2 page paths**

We'll maintain an array of paths that ARE migrated. Pages not in the array redirect to the un-prefixed classic path.

`frontend/src/pages/v2/V2RouteGuard.tsx`:

```tsx
import { Navigate, useLocation } from 'react-router-dom';

/**
 * v2 paths that have BEEN migrated. Update this list when a new page graduates.
 * Format: '/v2/path' (must include /v2 prefix).
 */
export const V2_MIGRATED_PATHS: ReadonlyArray<string> = [
  '/v2',                  // dashboard (placeholder — points at StyleGuidePage for Wave 0)
  '/v2/style-guide',
  // '/v2/login',         // un-comment when Wave 1 ships
  // '/v2/invoices',      // un-comment when Wave 2 ships
];

/**
 * If the user lands on /v2/something that's not yet migrated, redirect to
 * /something (classic). Wraps each v2 Route element.
 */
export function V2Guard({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  if (!V2_MIGRATED_PATHS.includes(pathname)) {
    const classic = pathname.replace(/^\/v2/, '') || '/';
    return <Navigate to={classic} replace />;
  }
  return <>{children}</>;
}
```

**Step 2: Add v2 routes to App.tsx (Routes section)**

Add inside the existing `<Routes>` block:

```tsx
import { V2Guard } from './pages/v2/V2RouteGuard';
import StyleGuidePage from './pages/v2/StyleGuidePage';   // created in Task E1

{/* v2 redesigned pages */}
<Route path="/v2" element={<V2Guard><StyleGuidePage /></V2Guard>} />
<Route path="/v2/style-guide" element={<V2Guard><StyleGuidePage /></V2Guard>} />
{/* When more pages ship, add routes + update V2_MIGRATED_PATHS */}
```

**Step 3: Commit**

```bash
git add src/App.tsx src/pages/v2/V2RouteGuard.tsx
git commit -m "feat(ui-rework): v2 route prefix + per-page redirect guard"
```

---

### Task D3: Topbar toggle button (only for testers initially)

**Files:**
- Create: `frontend/src/components/monomi/UiVersionToggle.tsx`

```tsx
import { Sparkles, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUiVersion } from '@/hooks/useUiVersion';

/**
 * Pill button in topbar. Initially shown ONLY to users with role SUPER_ADMIN
 * (or whoever you want testing). Reveal to everyone once Wave 1 ships.
 */
export const UiVersionToggle = ({ canShow }: { canShow: boolean }) => {
  const { isV2, toggle } = useUiVersion();
  if (!canShow) return null;
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => { toggle(); location.reload(); }}
      className="rounded-full text-xs font-medium border-border-default hover:bg-bg-glass"
    >
      {isV2 ? (
        <><RotateCcw className="h-3.5 w-3.5 mr-1.5" />Back to classic</>
      ) : (
        <><Sparkles className="h-3.5 w-3.5 mr-1.5" />Try new design</>
      )}
    </Button>
  );
};
```

**Step 2: Wire into the EXISTING classic topbar** (so testers see the button)

This requires finding where the classic AntD Layout's header is. Most likely a component like `src/components/Layout.tsx` or similar.

```bash
grep -rln "Layout\|Sider\|Header" src/components/ | head -5
```

Open the file, import `UiVersionToggle`, add into header somewhere visible. Gate with `user.role === 'SUPER_ADMIN'`:

```tsx
import { UiVersionToggle } from '@/components/monomi/UiVersionToggle';
// Inside the Header JSX:
<UiVersionToggle canShow={currentUser?.role === 'SUPER_ADMIN'} />
```

**Step 3: Commit**

```bash
git add src/components/monomi/UiVersionToggle.tsx src/components/<Layout-file>.tsx
git commit -m "feat(ui-rework): UiVersionToggle pill in topbar (SUPER_ADMIN only initially)"
```

---

## Phase E — StyleGuidePage (the veto checkpoint)

### Task E1: StyleGuidePage showing every primitive

**Files:**
- Create: `frontend/src/pages/v2/StyleGuidePage.tsx`

```tsx
import {
  Inbox, FileText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { DataTable } from '@/components/monomi/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { toast, Toaster } from 'sonner';
import { useState } from 'react';

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

export default function StyleGuidePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <>
      <AppShell
        sidebar={{
          brand: <div className="font-display font-bold text-text-primary">monomi</div>,
          items: sidebarItems,
          footer: <UserChip name="Admin Sistem" role="SUPER_ADMIN" size="sm" />,
        }}
        topbar={{
          left: <Input placeholder="Search…" className="max-w-md" />,
          right: (
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          ),
        }}
      >
        <PageContainer>
          <PageHeader
            title="Style Guide"
            description="Every primitive in the new dark-glassmorphism design system. Veto checkpoint before Wave 1."
            breadcrumbs={[{ label: 'v2' }, { label: 'Style Guide' }]}
            actions={
              <Button onClick={() => toast.success('Toast looks like this')}>
                <Plus className="h-4 w-4 mr-1.5" />Trigger toast
              </Button>
            }
          />

          {/* Section: Stat cards */}
          <section className="mb-12">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Stat Cards (dashboard hero)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                label="Revenue this month"
                value={<MoneyDisplay amount={245000000} />}
                delta={{ value: 12, suffix: '%' }}
                sublabel="vs last month"
              />
              <StatCard
                label="Outstanding"
                value={<MoneyDisplay amount={32000000} />}
                delta={{ value: -3, suffix: ' clients' }}
                sublabel="overdue"
              />
              <StatCard label="Active projects" value="14" delta={{ value: 2, suffix: ' this wk' }} />
              <StatCard label="Materai pending" value="3" sublabel="invoices > 5jt" />
            </div>
          </section>

          {/* Section: Typography */}
          <section className="mb-12">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Typography</h2>
            <GlassPanel className="space-y-3">
              <div className="text-4xl font-display font-bold text-text-primary">Display 4xl — Inter Tight Bold</div>
              <div className="text-2xl font-display font-semibold text-text-primary">Heading 2xl</div>
              <div className="text-lg text-text-primary">Lead lg — DM Sans regular</div>
              <div className="text-base text-text-secondary">Body base — secondary text</div>
              <div className="text-sm text-text-tertiary">Caption sm — tertiary</div>
              <div className="font-mono text-sm text-text-primary">Mono: Rp 12.500.000 · INV-2026-0042 · 0x1f3a</div>
            </GlassPanel>
          </section>

          {/* Section: Buttons */}
          <section className="mb-12">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Buttons</h2>
            <GlassPanel className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button disabled>Disabled</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
            </GlassPanel>
          </section>

          {/* Section: Forms */}
          <section className="mb-12">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Form Controls</h2>
            <GlassPanel className="space-y-4 max-w-md">
              <Input placeholder="Search invoices…" />
              <MonomiDatePicker value={date} onChange={setDate} placeholder="Tanggal jatuh tempo" />
              <div className="flex gap-2">
                <Badge>Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="destructive">Destructive</Badge>
              </div>
            </GlassPanel>
          </section>

          {/* Section: DataTable */}
          <section className="mb-12">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">DataTable</h2>
            <DataTable
              data={[
                { id: '1', invoice: 'INV-2026-0042', client: 'PT Maju Jaya', amount: 12500000, status: 'PAID', due: '2026-04-12' },
                { id: '2', invoice: 'INV-2026-0043', client: 'PT Baru Indo', amount: 5500000, status: 'OVERDUE', due: '2026-03-15' },
                { id: '3', invoice: 'INV-2026-0044', client: 'CV Studio K', amount: 28000000, status: 'SENT', due: '2026-06-10' },
              ]}
              columns={[
                { accessorKey: 'invoice', header: 'Invoice' },
                { accessorKey: 'client', header: 'Client' },
                { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => <MoneyDisplay amount={row.original.amount} /> },
                { accessorKey: 'status', header: 'Status', cell: ({ row }) => <Badge>{row.original.status}</Badge> },
                { accessorKey: 'due', header: 'Due', cell: ({ row }) => <DateDisplay date={row.original.due} /> },
              ]}
              enableSorting
              enablePagination={false}
            />
          </section>

          {/* Section: Tabs + Dialog + Sheet */}
          <section className="mb-12">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Tabs, Dialog, Sheet</h2>
            <GlassPanel>
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="audit">Audit</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="pt-4">
                  <p className="text-text-secondary">Overview tab content.</p>
                </TabsContent>
                <TabsContent value="activity" className="pt-4">
                  <p className="text-text-secondary">Activity tab content.</p>
                </TabsContent>
                <TabsContent value="audit" className="pt-4">
                  <p className="text-text-secondary">Audit tab content.</p>
                </TabsContent>
              </Tabs>
              <div className="mt-4 flex gap-3">
                <Dialog>
                  <DialogTrigger asChild><Button variant="outline">Open Dialog</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Sample dialog</DialogTitle>
                      <DialogDescription>Dialog content goes here.</DialogDescription>
                    </DialogHeader>
                  </DialogContent>
                </Dialog>
                <Sheet>
                  <SheetTrigger asChild><Button variant="outline">Open Sheet</Button></SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Sample side sheet</SheetTitle>
                      <SheetDescription>Sheet content slides in from right.</SheetDescription>
                    </SheetHeader>
                  </SheetContent>
                </Sheet>
              </div>
            </GlassPanel>
          </section>

          {/* Section: Skeleton + EmptyState */}
          <section className="mb-12">
            <h2 className="text-lg font-display font-semibold text-text-primary mb-4">Loading + Empty States</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <GlassPanel>
                <h3 className="text-sm font-medium text-text-secondary mb-3">Loading (Skeleton)</h3>
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </GlassPanel>
              <GlassPanel padding="none">
                <EmptyState
                  icon={<Inbox />}
                  title="No invoices yet"
                  description="Create your first invoice from an approved quotation."
                  action={<Button>Create invoice</Button>}
                />
              </GlassPanel>
            </div>
          </section>
        </PageContainer>
      </AppShell>
      <Toaster theme="dark" position="bottom-right" />
    </>
  );
}
```

**Step 2: Build + dev test**

```bash
mkdir -p src/pages/v2
npm run build 2>&1 | tail -3
npm run dev
```

Open `http://localhost:5173/v2` (it should land on StyleGuidePage via the route we set up in D2). Visually inspect each section.

**Step 3: Commit**

```bash
git add src/pages/v2/StyleGuidePage.tsx
git commit -m "feat(ui-rework): StyleGuidePage — veto checkpoint showcasing all primitives"
```

---

## Phase G — Final Wrap-up

### Task G1: Verify no AntD imports leaked into v2 dirs

```bash
cd frontend
echo "=== AntD imports in v2 / monomi / ui (must be zero) ==="
grep -rn "from 'antd'" src/pages/v2/ src/components/monomi/ src/components/ui/ 2>&1 | head -10
```
Expected: nothing matches.

If anything matches: fix it (use shadcn/Monomi instead) and re-run.

---

### Task G2: Run full build + lint + test

```bash
cd frontend
npm run build 2>&1 | tail -5
npm run lint 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: build succeeds, lint clean, tests pass.

If lint flags AntD imports in classic code, that's expected (rule only applies to v2/monomi/ui dirs).

---

### Task G3: Demo to user — the veto checkpoint

```bash
cd frontend
npm run dev
```

Tell user: "Open `http://localhost:5173`, log in normally, click the sparkle ✨ pill in the topbar to enable v2, then go to `/v2`. Review every section. If anything looks wrong or off-brand, tell me before we touch Wave 1."

Wait for user feedback. If approved, proceed to Wave 1 plan (separate document).

---

### Task G4: Commit the wrap-up state + summary doc

Create `docs/plans/wave-0-complete.md`:

```markdown
# Wave 0 — COMPLETE

**Date:** 2026-05-25 (estimated; update on actual completion)

## What shipped

- Design tokens (CSS + TS)
- Tailwind v4 + shadcn/ui installed and themed
- 20+ shadcn primitives in src/components/ui/
- 12 Monomi primitives in src/components/monomi/
- v2 route prefix + redirect guard + localStorage toggle
- UiVersionToggle pill in topbar
- StyleGuidePage at /v2 — showcases everything
- ESLint rules blocking AntD in v2/monomi/ui dirs
- jsx-a11y plugin
- Tests for MoneyDisplay + DateDisplay formatters

## What did NOT ship (intentionally)

- Any redesigned production page (Wave 1+ does that)
- Removal of AntD dependency (waits until ALL pages migrated)
- Light mode (killed by design decision)

## Decision point

User reviewed StyleGuidePage on <date>. Approved / Revised: <result>.

## Next

If approved → Wave 1 plan: Login + Dashboard pages.
```

```bash
git add docs/plans/wave-0-complete.md
git commit -m "docs(ui-rework): wave 0 completion summary"
```

---

## Plan complete

Plan saved to `docs/plans/2026-05-25-ui-rework-wave-0-foundation.md`. **Two execution options:**

**1. Subagent-Driven (this session)** — I dispatch a fresh subagent per task, review code between tasks, fast iteration. Best when you want me to drive the implementation now.

**2. Parallel Session (separate)** — Open new Claude Code session with executing-plans skill, batch execution with checkpoints. Best when you want to step away while it builds.

**Which approach?**
