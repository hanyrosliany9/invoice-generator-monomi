import {
  LayoutDashboard,
  Folder,
  CalendarDays,
  ReceiptText,
  FileText,
  Users,
  Building2,
  Megaphone,
  CalendarRange,
  Image as ImageIcon,
  Presentation,
  Download,
  ClapperboardIcon,
  ListChecks,
  BookOpen,
  Wallet,
  CreditCard,
  Book,
  Receipt,
  TrendingDown,
  TrendingUp,
  Scale,
  PieChart,
  ArrowRightLeft,
  Boxes,
  Trophy,
  BarChart3,
  UserCog,
  Settings,
  Layers,
} from 'lucide-react';
import type { SidebarSection } from '@/components/monomi/Sidebar';

const i = (Icon: typeof Settings) => <Icon className="h-4 w-4" />;

/**
 * Canonical v2 sidebar — single source of truth.
 *
 * IMPORTANT: `label` here is an i18n KEY, not display text. The Sidebar
 * component runs each label through `t()` at render time, so switching
 * language via the LanguageSwitcher live-updates every nav entry.
 *
 * To add an item: pick a key under `nav.*` / section labels under
 * `sectionLabels.*` in src/i18n/locales/{en,id}.json. The English fallback
 * for missing keys is the key string itself, which makes broken i18n
 * obvious in dev.
 */
/**
 * requiresAdmin: true  → hidden for VIDEOGRAPHER, visible to ADMIN/SUPER_ADMIN.
 * No flag (or false)   → visible to all authenticated roles.
 *
 * Filtering is applied inside <Sidebar> via usePermissions().isAdmin().
 * isAdmin() returns true for ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'].
 */
export const v2SidebarSections: SidebarSection[] = [
  {
    label: 'sectionLabels.workspace',
    items: [
      // Dashboard is visible to all roles
      { label: 'nav.dashboard', icon: i(LayoutDashboard), href: '/' },
      // Admin-only business items
      { label: 'nav.projects', icon: i(Folder), href: '/projects', requiresAdmin: true },
      { label: 'nav.calendar', icon: i(CalendarDays), href: '/calendar', requiresAdmin: true },
      { label: 'nav.quotations', icon: i(ReceiptText), href: '/quotations', requiresAdmin: true },
      { label: 'nav.invoices', icon: i(FileText), href: '/invoices', requiresAdmin: true },
      { label: 'nav.clients', icon: i(Users), href: '/clients', requiresAdmin: true },
      { label: 'nav.vendors', icon: i(Building2), href: '/vendors', requiresAdmin: true },
    ],
  },
  {
    // Marketing / media section — visible to all roles
    label: 'sectionLabels.marketing',
    items: [
      { label: 'nav.socialMediaReports', icon: i(Megaphone), href: '/reports/social-media', requiresAdmin: true },
      { label: 'nav.contentCalendar', icon: i(CalendarRange), href: '/calendar/content' },
      { label: 'nav.mediaCollaboration', icon: i(ImageIcon), href: '/media-collab' },
      { label: 'nav.presentationDecks', icon: i(Presentation), href: '/decks' },
      { label: 'nav.mediaDownloader', icon: i(Download), href: '/media-downloader' },
    ],
  },
  {
    // Production — visible to all roles (call sheets / shot lists are VIDEOGRAPHER work)
    label: 'sectionLabels.production',
    items: [
      { label: 'nav.shotLists', icon: i(ClapperboardIcon), href: '/shot-lists' },
      { label: 'nav.callSheets', icon: i(ListChecks), href: '/call-sheets' },
    ],
  },
  {
    // Full accounting section — admin only
    label: 'sectionLabels.accounting',
    requiresAdmin: true,
    items: [
      { label: 'nav.chartOfAccounts', icon: i(BookOpen), href: '/accounting/chart-of-accounts' },
      { label: 'nav.cashBankBalance', icon: i(Wallet), href: '/accounting/cash-bank-balance' },
      { label: 'nav.expenses', icon: i(CreditCard), href: '/expenses' },
      { label: 'nav.salaries', icon: i(Users), href: '/salaries' },
      { label: 'nav.journalEntries', icon: i(Book), href: '/accounting/journal-entries' },
      { label: 'nav.accountsReceivable', icon: i(Receipt), href: '/accounting/accounts-receivable' },
      { label: 'nav.accountsPayable', icon: i(TrendingDown), href: '/accounting/accounts-payable' },
      { label: 'nav.generalLedger', icon: i(Book), href: '/accounting/general-ledger' },
      { label: 'nav.cashFlow', icon: i(ArrowRightLeft), href: '/accounting/cash-flow' },
      { label: 'nav.incomeStatement', icon: i(TrendingUp), href: '/accounting/income-statement' },
      { label: 'nav.trialBalance', icon: i(Scale), href: '/accounting/trial-balance' },
      { label: 'nav.balanceSheet', icon: i(PieChart), href: '/accounting/balance-sheet' },
      { label: 'nav.assets', icon: i(Boxes), href: '/assets' },
    ],
  },
  {
    label: 'sectionLabels.other',
    items: [
      { label: 'nav.reports', icon: i(BarChart3), href: '/reports', requiresAdmin: true },
      // Milestones — visible to all roles
      { label: 'nav.milestones', icon: i(Trophy), href: '/milestones' },
      { label: 'nav.users', icon: i(UserCog), href: '/users', requiresAdmin: true },
      { label: 'nav.settings', icon: i(Settings), href: '/settings', requiresAdmin: true },
      { label: 'nav.projectTypes', icon: i(Layers), href: '/settings/project-types', requiresAdmin: true },
    ],
  },
];
