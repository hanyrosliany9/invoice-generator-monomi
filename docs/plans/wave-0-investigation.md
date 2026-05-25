# Wave 0 UI/UX Rework Pre-Flight Investigation

## Task A1: React 19 Library Compatibility Audit

### React Version
- **Current:** React ^19.0.0 ✓

### Library Compatibility Status

| Library | React Support | Status |
|---------|---------------|--------|
| @tanstack/react-table | >=16.8 | ✓ React 19 supported |
| react-hook-form | ^16.8.0 \|\| ^17 \|\| ^18 \|\| ^19 | ✓ React 19 supported |
| react-day-picker | >=16.8.0 | ✓ React 19 supported |
| sonner | ^18.0.0 \|\| ^19.0.0 \|\| ^19.0.0-rc | ✓ React 19 supported |
| @radix-ui/react-dialog | ^16.8 \|\| ^17.0 \|\| ^18.0 \|\| ^19.0 \|\| ^19.0.0-rc | ✓ React 19 supported |

### Conclusion
All libraries have explicit React 19 support. No `--legacy-peer-deps` needed.

---

## Task A2: PDF Rendering Source

### Method
**Puppeteer Server-Side HTML-to-PDF (Server-side rendering, no frontend dependency)**

### Details
- **Primary Service:** `backend/src/modules/pdf/pdf.service.ts`
- **Rendering Type:** Pure server-side (Puppeteer browser automation)
- **HTML Generation:** Template strings generated in TypeScript (no React server-render)
- **Frontend Code Dependency:** NONE - PDFs are completely decoupled from React components

### Key Implementation Details
- Templates are HTML string generators: `generateInvoiceHTML()`, `generateQuotationHTML()`, etc.
- Uses Puppeteer to launch headless browser + render HTML + export PDF
- Two modes: "continuous" (digital) with dynamic height, "paginated" (print) with A4 format
- All formatting (fonts, styling) inline in HTML `<style>` tag
- Indonesian fonts loaded from Google Fonts API
- Logo embedded as base64 to avoid external file dependencies
- No CSS files imported - all styles self-contained

### Risk to UI Redesign
**Risk Level: NONE**

**Verdict:** PDF rendering is completely independent of frontend design changes. Can redesign React UI without affecting PDF generation. No print-style dependencies on frontend CSS exist.

### Migration Path
When migrating to new design system, PDF templates can be updated independently using the same Puppeteer approach. No coordination needed between frontend redesign and PDF updates.

---

## Task A3: Current AntD Usage Scope

### Scope Summary
- **Files importing AntD:** 296 files
- **Distinct AntD Components Used:** 52 components

### Components List (52 total)
Alert, App, Avatar, Badge, Breadcrumb, Button, Card, Checkbox, Col, Collapse, ColorPicker, ConfigProvider, DatePicker, Descriptions, Divider, Drawer, Dropdown, Empty, Flex, FloatButton, Form, FormItemProps, Image, Input, InputNumber, Layout, List, Menu, message, Modal, Popconfirm, Popover, Progress, Radio, Result, Row, Segmented, Select, Skeleton, Slider, Space, Spin, Statistic, Steps, Switch, Table, Tabs, Tag, theme, Timeline, TimePicker, Tooltip, Tree, Typography, Upload

### Complex Usage Patterns Identified
1. **Table Component:** Heavy usage in data-driven pages (invoices, quotations, projects)
   - Example files: `SceneScheduleTable.tsx`, `CrewCallTable.tsx`, `CastCallTable.tsx`
   - Features: Sorting, filtering, pagination, inline editing in some cases
   
2. **Form Component:** Used across all CRUD operations
   - Example files: `ProjectTypeManagement.tsx`, `AddCrewModal.tsx`, `AddCastModal.tsx`
   - Features: Validation, async submission, nested forms in modals
   
3. **DatePicker:** Payment milestone/scheduling features
   - Used in milestone configuration and call sheet scheduling
   - Multiple date range selectors in some views

4. **Modal/Drawer:** Dialogs for CRUD operations throughout app
   - Nested within Tables for row actions
   - Form validation tied to modal submission

5. **Layout:** Global page structure
   - Sidebar navigation, main content area, responsive grid

6. **Hooks & Theme:** `useAntdApp()`, `useTheme()` for message/notification system

### Migration Risk Assessment
**High-impact components to replace first:**
- Table (52 uses across complex pages)
- Form (widespread in CRUD workflows)
- Modal/Drawer (blocking modals in workflows)

**Medium-impact:**
- DatePicker (scheduling features)
- Layout (requires global rework)

**Lower-impact:**
- Basic UI (Button, Input, Select, etc. - easy shadcn drop-in replacements)
- Icons (can be replaced with Lucide)

### Recommended Migration Order
1. Establish base component library (Button, Input, Card, Badge replacements)
2. Migrate Modal/Drawer dialogs (unblocks form redesigns)
3. Migrate Form component (enables all CRUD pages)
4. Migrate Table (most complex, impacts data-heavy pages)
5. Migrate DatePicker/TimePicker (scheduling pages)
6. Migrate remaining components (Layout, Menu, etc.)
