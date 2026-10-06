import { Suspense, lazy, useEffect, useState } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { CRM_QUICK_ADD_EVENT } from './quickAddBus';

const QuickAddDialog = lazy(() => import('./QuickAddDialog').then((m) => ({ default: m.QuickAddDialog })));

/**
 * Mounted once inside AppShell: Ctrl/Cmd+Shift+L (or any `openQuickAdd()` call)
 * opens the "Add lead" dialog from every staff page. The dialog chunk loads on
 * first use. Admin-only, like the CRM API.
 */
export function CrmQuickAddHost() {
  const { isAdmin } = usePermissions();
  const admin = isAdmin();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!admin) return undefined;
    const show = () => { setMounted(true); setOpen(true); };
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat || !(e.ctrlKey || e.metaKey) || !e.shiftKey || e.altKey) return;
      if (e.key.toLowerCase() !== 'l') return;
      e.preventDefault();
      show();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(CRM_QUICK_ADD_EVENT, show);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(CRM_QUICK_ADD_EVENT, show);
    };
  }, [admin]);

  if (!admin || !mounted) return null;
  return (
    <Suspense fallback={null}>
      <QuickAddDialog open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
