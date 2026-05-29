import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Plus, Pencil, Trash2, Search, X, Tag as TagIcon,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { expenseService } from '@/services/expenses';
import type { ExpenseCategory } from '@/types/expense';
import {
  ExpenseClass, PPNCategory, WithholdingTaxType,
} from '@/types/expense';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — identical to the v2/expenses list so the active item  */
/*  reads as the same section.                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Helpers / label maps                                               */
/* ------------------------------------------------------------------ */

const CLASS_LABEL: Record<string, string> = {
  SELLING:        'Selling',
  GENERAL_ADMIN:  'General & Admin',
  OTHER:          'Other',
};

const PPH_LABEL: Record<string, string> = {
  NONE:    'No Withholding',
  PPH23:   'PPh 23 (2%)',
  PPH4_2:  'PPh 4(2) (10%)',
  PPH15:   'PPh 15',
};

const PPN_LABEL: Record<string, string> = {
  CREDITABLE:     'Creditable',
  NON_CREDITABLE: 'Non-Creditable',
  EXEMPT:         'VAT Exempt',
};

/* ------------------------------------------------------------------ */
/*  Form state — flat shape that maps directly to the API payload      */
/* ------------------------------------------------------------------ */

type FormState = {
  code: string;
  accountCode: string;
  name: string;
  nameId: string;
  description: string;
  descriptionId: string;
  expenseClass: ExpenseClass;
  defaultPPNCategory: PPNCategory;
  withholdingTaxType: WithholdingTaxType;
  withholdingTaxRate: string;  // percent string (e.g. "2.0") — converted on submit
  requiresEFaktur: boolean;
  isBillable: boolean;
  isActive: boolean;
};

const emptyForm: FormState = {
  code: '',
  accountCode: '',
  name: '',
  nameId: '',
  description: '',
  descriptionId: '',
  expenseClass: ExpenseClass.GENERAL_ADMIN,
  defaultPPNCategory: PPNCategory.CREDITABLE,
  withholdingTaxType: WithholdingTaxType.NONE,
  withholdingTaxRate: '',
  requiresEFaktur: false,
  isBillable: false,
  isActive: true,
};

const toPercentString = (decimal?: number) =>
  decimal !== undefined && decimal !== null
    ? String(Math.round(decimal * 10000) / 100)  // 0.02 -> "2", 0.025 -> "2.5"
    : '';

const fromPercentString = (s: string): number => {
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return n / 100;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExpenseCategoriesPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ----- filter state ----- */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 200);
  const [classFilter, setClassFilter] = useState<string>('all');

  /* ----- modal state ----- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  /* ----- data ----- */
  const { data: categories = [], isLoading, error, refetch } = useQuery({
    queryKey: ['expense-categories'],
    queryFn:  expenseService.getExpenseCategories,
  });

  /* ----- mutations ----- */
  const createMutation = useMutation({
    mutationFn: expenseService.createExpenseCategory,
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      closeDialog();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      expenseService.updateExpenseCategory(id, data),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['expense-categories'] });
      closeDialog();
    },
    onError: (err: Error) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseService.deleteExpenseCategory(id),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['expense-categories'] }),
  });

  /* ----- derived: filtered list ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return categories.filter((c) => {
      const matchesSearch =
        !q
        || c.code.toLowerCase().includes(q)
        || c.accountCode.toLowerCase().includes(q)
        || (c.nameId || '').toLowerCase().includes(q)
        || c.name.toLowerCase().includes(q);
      const matchesClass = classFilter === 'all' || c.expenseClass === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [categories, searchText, classFilter]);

  const hasActiveFilters = !!searchText || classFilter !== 'all';
  const resetFilters = () => {
    setSearchInput('');
    setClassFilter('all');
  };

  /* ----- handlers ----- */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (cat: ExpenseCategory) => {
    setEditing(cat);
    setForm({
      code:               cat.code,
      accountCode:        cat.accountCode,
      name:               cat.name,
      nameId:             cat.nameId ?? '',
      description:        cat.description ?? '',
      descriptionId:      cat.descriptionId ?? '',
      expenseClass:       cat.expenseClass,
      defaultPPNCategory: cat.defaultPPNCategory ?? PPNCategory.CREDITABLE,
      withholdingTaxType: cat.withholdingTaxType ?? WithholdingTaxType.NONE,
      withholdingTaxRate: toPercentString(cat.withholdingTaxRate),
      requiresEFaktur:    cat.requiresEFaktur ?? false,
      isBillable:         cat.isBillable ?? false,
      isActive:           cat.isActive ?? true,
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);

    if (!form.code.trim() || !form.accountCode.trim() || !form.name.trim()) {
      setFormError(t(
        'expenseCategories.validation.required',
        'Code, Account Code, and Name are required.',
      ));
      return;
    }

    const payload: Record<string, unknown> = {
      code:               form.code.trim(),
      accountCode:        form.accountCode.trim(),
      name:               form.name.trim(),
      nameId:             form.nameId.trim() || undefined,
      description:        form.description.trim() || undefined,
      descriptionId:      form.descriptionId.trim() || undefined,
      expenseClass:       form.expenseClass,
      defaultPPNCategory: form.defaultPPNCategory,
      withholdingTaxType: form.withholdingTaxType,
      withholdingTaxRate: form.withholdingTaxType === WithholdingTaxType.NONE
        ? 0
        : fromPercentString(form.withholdingTaxRate),
      requiresEFaktur:    form.requiresEFaktur,
      isBillable:         form.isBillable,
      isActive:           form.isActive,
    };

    if (editing) {
      // Code is immutable on edit (matches classic behaviour)
      delete payload.code;
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (cat: ExpenseCategory) => {
    if (confirm(t(
      'expenseCategories.confirmDelete',
      `Delete category "${cat.nameId || cat.name}"? Only categories not used by any expense can be deleted.`,
    ))) {
      deleteMutation.mutate(cat.id);
    }
  };

  /* ----- shell wrapper ----- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<TagIcon className="h-12 w-12" />}
          title={t('expenseCategories.error.title', 'Cannot load categories')}
          description={error instanceof Error ? error.message : t('expenseCategories.error.generic', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('expenseCategories.retry', 'Try Again')}</Button>}
        />
      </Shell>
    );
  }

  /* ----- render ----- */
  return (
    <Shell>
      {/* Breadcrumb back link to Expenses list — this is a settings-style
          sub-page, so its identity threads back to the parent section. */}
      <div className="mb-4">
        <Link
          to="/expenses"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('expenseCategories.backToList', 'Back to Expenses')}
        </Link>
      </div>

      <PageHeader
        title={t('expenseCategories.title', 'Expense Categories')}
        description={t('expenseCategories.subtitle', 'Manage expense categories and Indonesian PSAK account code mappings.')}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('expenseCategories.add', 'Add Category')}
          </Button>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          Single GlassPanel hosting filter strip + the category list.
          We render rows ourselves (not DataTable) because this is a
          settings list with inline edit/delete affordances rather than
          a sortable table of records.
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Filter strip — search + class filter. No pagination needed
            (typically tens of categories, not thousands). */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('expenseCategories.search.placeholder', 'Search by code, account, or name...')}
              className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger
                size="sm"
                className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
              >
                <SelectValue placeholder={t('expenseCategories.filter.class', 'Class')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('expenseCategories.filter.allClasses', 'All Classes')}</SelectItem>
                <SelectItem value="SELLING">{CLASS_LABEL.SELLING}</SelectItem>
                <SelectItem value="GENERAL_ADMIN">{CLASS_LABEL.GENERAL_ADMIN}</SelectItem>
                <SelectItem value="OTHER">{CLASS_LABEL.OTHER}</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-text-tertiary hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
                {t('expenseCategories.filter.reset', 'Reset')}
              </Button>
            )}
          </div>
        </div>

        {/* List body */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            <Skeleton className="h-14 rounded" />
            <Skeleton className="h-14 rounded" />
            <Skeleton className="h-14 rounded" />
            <Skeleton className="h-14 rounded" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<TagIcon />}
            title={
              hasActiveFilters
                ? t('expenseCategories.empty.filteredTitle', 'No categories match')
                : t('expenseCategories.empty.title', 'No categories yet')
            }
            description={
              hasActiveFilters
                ? t('expenseCategories.empty.filteredDesc', 'Try adjusting or clearing your filters.')
                : t('expenseCategories.empty.desc', 'Create your first category to group expenses.')
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t('expenseCategories.empty.resetFilters', 'Reset Filters')}
                </Button>
              ) : (
                <Button onClick={openCreate} size="sm">
                  <Plus className="h-4 w-4" />
                  {t('expenseCategories.add', 'Add Category')}
                </Button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {filtered.map((cat) => (
              <CategoryRow
                key={cat.id}
                category={cat}
                onEdit={() => openEdit(cat)}
                onDelete={() => handleDelete(cat)}
              />
            ))}
          </ul>
        )}
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────────────
          Create / Edit dialog — single form for both modes. Fields are
          grouped: Identity (code + names) → Classification (class +
          account) → Tax defaults (PPN + PPh) → Flags. Each group is
          separated by a hairline so the eye can scan top-to-bottom.
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) closeDialog(); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-bg-base border-border-subtle">
          <DialogHeader>
            <DialogTitle className="text-text-primary font-display">
              {editing
                ? t('expenseCategories.dialog.editTitle', 'Edit Category')
                : t('expenseCategories.dialog.createTitle', 'Add Category')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t('expenseCategories.dialog.desc', 'Categories map to PSAK account codes and Indonesian tax defaults.')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 mt-2">
            {/* Identity */}
            <FormSection title={t('expenseCategories.section.identity', 'Identity')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={t('expenseCategories.field.code', 'Category Code')} required>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="OFFICE_SUPPLIES"
                    disabled={!!editing}
                    className="font-mono bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </FormField>
                <FormField label={t('expenseCategories.field.account', 'PSAK Account Code')} required>
                  <Input
                    value={form.accountCode}
                    onChange={(e) => setForm({ ...form, accountCode: e.target.value })}
                    placeholder="6-2030"
                    className="font-mono bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </FormField>
                <FormField label={t('expenseCategories.field.name', 'Name (English)')} required>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Office Supplies"
                    className="bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </FormField>
                <FormField label={t('expenseCategories.field.nameId', 'Name (Bahasa Indonesia)')}>
                  <Input
                    value={form.nameId}
                    onChange={(e) => setForm({ ...form, nameId: e.target.value })}
                    placeholder="Perlengkapan Kantor"
                    className="bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </FormField>
                <FormField label={t('expenseCategories.field.description', 'Description (English)')}>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Stationery and office materials"
                    className="bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </FormField>
                <FormField label={t('expenseCategories.field.descriptionId', 'Description (Bahasa Indonesia)')}>
                  <Input
                    value={form.descriptionId}
                    onChange={(e) => setForm({ ...form, descriptionId: e.target.value })}
                    placeholder="Alat tulis dan material kantor"
                    className="bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </FormField>
              </div>
            </FormSection>

            <Separator className="bg-border-subtle" />

            {/* Classification */}
            <FormSection title={t('expenseCategories.section.classification', 'Classification')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={t('expenseCategories.field.class', 'Expense Class')}>
                  <Select
                    value={form.expenseClass}
                    onValueChange={(v) => setForm({ ...form, expenseClass: v as ExpenseClass })}
                  >
                    <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SELLING">{CLASS_LABEL.SELLING} (6-1xxx)</SelectItem>
                      <SelectItem value="GENERAL_ADMIN">{CLASS_LABEL.GENERAL_ADMIN} (6-2xxx)</SelectItem>
                      <SelectItem value="OTHER">{CLASS_LABEL.OTHER} (8-xxxx)</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label={t('expenseCategories.field.ppnCategory', 'Default VAT Category')}>
                  <Select
                    value={form.defaultPPNCategory}
                    onValueChange={(v) => setForm({ ...form, defaultPPNCategory: v as PPNCategory })}
                  >
                    <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CREDITABLE">{PPN_LABEL.CREDITABLE}</SelectItem>
                      <SelectItem value="NON_CREDITABLE">{PPN_LABEL.NON_CREDITABLE}</SelectItem>
                      <SelectItem value="EXEMPT">{PPN_LABEL.EXEMPT}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>
              </div>
            </FormSection>

            <Separator className="bg-border-subtle" />

            {/* Withholding tax defaults */}
            <FormSection title={t('expenseCategories.section.withholding', 'Withholding Tax (PPh)')}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label={t('expenseCategories.field.pphType', 'Default PPh Type')}>
                  <Select
                    value={form.withholdingTaxType}
                    onValueChange={(v) => setForm({
                      ...form,
                      withholdingTaxType: v as WithholdingTaxType,
                      // Reset rate when switching off withholding
                      withholdingTaxRate: v === 'NONE' ? '' : form.withholdingTaxRate,
                    })}
                  >
                    <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">{PPH_LABEL.NONE}</SelectItem>
                      <SelectItem value="PPH23">{PPH_LABEL.PPH23}</SelectItem>
                      <SelectItem value="PPH4_2">{PPH_LABEL.PPH4_2}</SelectItem>
                      <SelectItem value="PPH15">{PPH_LABEL.PPH15}</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <FormField label={t('expenseCategories.field.pphRate', 'PPh Rate (%)')}>
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.withholdingTaxRate}
                    onChange={(e) => setForm({ ...form, withholdingTaxRate: e.target.value })}
                    disabled={form.withholdingTaxType === WithholdingTaxType.NONE}
                    placeholder="2.0"
                    className="bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </FormField>
              </div>
            </FormSection>

            <Separator className="bg-border-subtle" />

            {/* Flags — rendered as a vertical stack of label/switch rows
                rather than a grid of toggles, so the affordance reads
                like a settings checklist. */}
            <FormSection title={t('expenseCategories.section.flags', 'Settings')}>
              <div className="space-y-3">
                <FlagRow
                  label={t('expenseCategories.field.requiresEfaktur', 'Requires e-Faktur')}
                  hint={t('expenseCategories.field.requiresEfakturHint', 'Expenses in this category must include an e-Faktur NSFP.')}
                  checked={form.requiresEFaktur}
                  onCheckedChange={(v) => setForm({ ...form, requiresEFaktur: v })}
                />
                <FlagRow
                  label={t('expenseCategories.field.isBillable', 'Billable to Client')}
                  hint={t('expenseCategories.field.isBillableHint', 'Expenses in this category can be passed through to client invoices.')}
                  checked={form.isBillable}
                  onCheckedChange={(v) => setForm({ ...form, isBillable: v })}
                />
                <FlagRow
                  label={t('expenseCategories.field.isActive', 'Active')}
                  hint={t('expenseCategories.field.isActiveHint', 'Inactive categories are retained but hidden when creating new expenses.')}
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
            </FormSection>

            {formError && (
              <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {formError}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" size="sm" onClick={closeDialog}>
                {t('expenseCategories.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editing
                  ? t('expenseCategories.action.update', 'Save Changes')
                  : t('expenseCategories.action.create', 'Create Category')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

/* ================================================================== */
/*  Local sub-components                                               */
/* ================================================================== */

/* CategoryRow — one-row summary of a single category. Rhythm: mono
   account code on the left → narrative (name + class chip) → tax
   defaults eyebrow → action buttons. Inline edit/delete; no kebab,
   since edit & delete are the only operations and they deserve to
   be visible on hover for a settings-style page.                     */
interface CategoryRowProps {
  category: ExpenseCategory;
  onEdit:   () => void;
  onDelete: () => void;
}

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  const { t } = useTranslation();
  const pphRatePct = category.withholdingTaxRate
    ? `${(category.withholdingTaxRate * 100).toFixed(1)}%`
    : null;

  return (
    <li
      className={cn(
        'group flex items-center gap-4 px-5 py-4',
        'hover:bg-bg-sunken/40 transition-colors',
      )}
    >
      {/* Account code stripe — mono, fixed width, reads like a marker */}
      <div className="w-24 shrink-0">
        <div className="font-mono text-xs text-text-primary tracking-tight">
          {category.accountCode}
        </div>
        <div className="font-mono text-[10px] text-text-tertiary mt-0.5 truncate">
          {category.code}
        </div>
      </div>

      {/* Name + class chip — main narrative */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-primary truncate">
            {category.nameId || category.name}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {CLASS_LABEL[category.expenseClass] ?? category.expenseClass}
          </Badge>
          {!category.isActive && (
            <Badge variant="secondary" className="text-[10px]">
              {t('expenseCategories.inactive', 'Inactive')}
            </Badge>
          )}
        </div>
        {category.nameId && category.name !== category.nameId && (
          <div className="text-xs text-text-tertiary truncate mt-0.5">
            {category.name}
          </div>
        )}
      </div>

      {/* Tax defaults — quiet ambient context, hidden on mobile */}
      <div className="hidden md:flex flex-col items-end shrink-0 text-[11px] text-text-tertiary tabular-nums w-32">
        {category.withholdingTaxType && category.withholdingTaxType !== WithholdingTaxType.NONE ? (
          <>
            <span className="text-warning">
              {category.withholdingTaxType}{pphRatePct ? ` · ${pphRatePct}` : ''}
            </span>
            <span>{PPN_LABEL[category.defaultPPNCategory] ?? category.defaultPPNCategory}</span>
          </>
        ) : (
          <span>{PPN_LABEL[category.defaultPPNCategory] ?? category.defaultPPNCategory}</span>
        )}
        {category.requiresEFaktur && (
          <span className="text-[10px] uppercase tracking-[0.12em] mt-0.5">{t('expenseCategories.eFakturRequired', 'e-Faktur required')}</span>
        )}
      </div>

      {/* Actions — visible on hover (mouse), always visible on touch */}
      <div className="flex items-center gap-1 shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onEdit}
          className="text-text-tertiary hover:text-text-primary"
          aria-label={t("expenseCategories.ariaEdit", "Edit category {{name}}", { name: category.nameId || category.name })}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onDelete}
          className="text-text-tertiary hover:text-danger"
          aria-label={t("expenseCategories.ariaDelete", "Delete category {{name}}", { name: category.nameId || category.name })}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </li>
  );
}

/* FormSection — section header inside the dialog form */
function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
        {title}
      </h3>
      {children}
    </section>
  );
}

/* FormField — labelled wrapper for a single input. Keeps label rhythm
   tight and consistent across the grid. */
function FormField({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-text-secondary">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}

/* FlagRow — switch + label + hint, in a single horizontal row that
   reads like a settings preference rather than a form field. */
function FlagRow({
  label, hint, checked, onCheckedChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
      <div className="min-w-0">
        <div className="text-sm text-text-primary">{label}</div>
        {hint && <div className="text-xs text-text-tertiary mt-0.5 leading-relaxed">{hint}</div>}
      </div>
    </label>
  );
}
