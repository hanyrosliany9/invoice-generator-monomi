import { useState } from 'react';
import {
  Inbox, FileText, Users, Folder, CreditCard, Settings,
  Plus, MoreHorizontal,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
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

export default function StyleGuidePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <>
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
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
              <div className="flex gap-2 flex-wrap">
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
