/** Tiny event bus: any page can open the global quick-add dialog (mounted once in AppShell). */
export const CRM_QUICK_ADD_EVENT = 'crm:quick-add';

export function openQuickAdd(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CRM_QUICK_ADD_EVENT));
}
