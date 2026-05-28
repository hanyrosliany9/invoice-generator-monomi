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
export const v2SidebarSections: SidebarSection[] = [
  {
    label: 'sectionLabels.workspace',
    items: [
      { label: 'nav.dashboard', icon: i(LayoutDashboard), href: '/v2' },
      { label: 'nav.projects', icon: i(Folder), href: '/v2/projects' },
      { label: 'nav.calendar', icon: i(CalendarDays), href: '/v2/calendar' },
      { label: 'nav.quotations', icon: i(ReceiptText), href: '/v2/quotations' },
      { label: 'nav.invoices', icon: i(FileText), href: '/v2/invoices' },
      { label: 'nav.clients', icon: i(Users), href: '/v2/clients' },
      { label: 'nav.vendors', icon: i(Building2), href: '/v2/vendors' },
    ],
  },
  {
    label: 'sectionLabels.marketing',
    items: [
      { label: 'nav.socialMediaReports', icon: i(Megaphone), href: '/v2/reports/social-media' },
      { label: 'nav.contentCalendar', icon: i(CalendarRange), href: '/v2/calendar/content' },
      { label: 'nav.mediaCollaboration', icon: i(ImageIcon), href: '/v2/media-collab' },
      { label: 'nav.presentationDecks', icon: i(Presentation), href: '/v2/decks' },
      { label: 'nav.mediaDownloader', icon: i(Download), href: '/v2/media-downloader' },
    ],
  },
  {
    label: 'sectionLabels.production',
    items: [
      { label: 'nav.shotLists', icon: i(ClapperboardIcon), href: '/v2/shot-lists' },
      { label: 'nav.callSheets', icon: i(ListChecks), href: '/v2/call-sheets' },
    ],
  },
  {
    label: 'sectionLabels.accounting',
    items: [
      { label: 'nav.chartOfAccounts', icon: i(BookOpen), href: '/v2/accounting/chart-of-accounts' },
      { label: 'nav.cashBankBalance', icon: i(Wallet), href: '/v2/accounting/cash-bank-balance' },
      { label: 'nav.expenses', icon: i(CreditCard), href: '/v2/expenses' },
      { label: 'nav.journalEntries', icon: i(Book), href: '/v2/accounting/journal-entries' },
      { label: 'nav.accountsReceivable', icon: i(Receipt), href: '/v2/accounting/accounts-receivable' },
      { label: 'nav.accountsPayable', icon: i(TrendingDown), href: '/v2/accounting/accounts-payable' },
      { label: 'nav.generalLedger', icon: i(Book), href: '/v2/accounting/general-ledger' },
      { label: 'nav.cashFlow', icon: i(ArrowRightLeft), href: '/v2/accounting/cash-flow' },
      { label: 'nav.incomeStatement', icon: i(TrendingUp), href: '/v2/accounting/income-statement' },
      { label: 'nav.trialBalance', icon: i(Scale), href: '/v2/accounting/trial-balance' },
      { label: 'nav.balanceSheet', icon: i(PieChart), href: '/v2/accounting/balance-sheet' },
      { label: 'nav.assets', icon: i(Boxes), href: '/v2/assets' },
    ],
  },
  {
    label: 'sectionLabels.other',
    items: [
      { label: 'nav.reports', icon: i(BarChart3), href: '/v2/reports' },
      { label: 'nav.milestones', icon: i(Trophy), href: '/v2/milestones' },
      { label: 'nav.users', icon: i(UserCog), href: '/v2/users' },
      { label: 'nav.settings', icon: i(Settings), href: '/v2/settings' },
    ],
  },
];
