/**
 * MoveToFolderDialog — pick a destination folder for selected assets.
 *
 * Shows a flat list of all project folders (plus "Root / No Folder").
 * On confirm, calls onMove(targetFolderId).
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Folder, Loader2, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { MediaFolder } from '@/services/media-collab';

interface MoveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folders: MediaFolder[];
  assetCount: number;
  onMove: (targetFolderId: string | null) => Promise<void>;
}

/** Flatten nested folders so the dialog shows a simple indented list. */
function flattenFolders(
  folders: MediaFolder[],
  depth = 0,
): Array<{ folder: MediaFolder; depth: number }> {
  const result: Array<{ folder: MediaFolder; depth: number }> = [];
  for (const f of folders) {
    result.push({ folder: f, depth });
    if (f.children?.length) {
      result.push(...flattenFolders(f.children, depth + 1));
    }
  }
  return result;
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  folders,
  assetCount,
  onMove,
}: MoveToFolderDialogProps) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string | null | undefined>(undefined);
  const [pending, setPending] = useState(false);

  const flat = flattenFolders(folders);

  const handleConfirm = async () => {
    if (selectedId === undefined) return; // nothing chosen yet
    setPending(true);
    try {
      await onMove(selectedId);
      onOpenChange(false);
      setSelectedId(undefined);
    } finally {
      setPending(false);
    }
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) setSelectedId(undefined);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-text-primary">
            {t('mediaFolders.moveTitle', 'Move {{n}} asset(s) to…', { n: assetCount })}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-sm">
            {t('mediaFolders.moveDesc', 'Select a destination folder.')}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-border-subtle bg-bg-sunken/40 divide-y divide-border-subtle">
          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs transition-colors',
              selectedId === null
                ? 'bg-accent/10 text-text-primary'
                : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary',
            )}
          >
            <Folder className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
            <span className="font-medium">{t('mediaFolders.rootFolder', 'Root (no folder)')}</span>
          </button>

          {flat.map(({ folder, depth }) => (
            <button
              key={folder.id}
              type="button"
              onClick={() => setSelectedId(folder.id)}
              style={{ paddingLeft: `${12 + depth * 16}px` }}
              className={cn(
                'w-full flex items-center gap-2 pr-3 py-2.5 text-left text-xs transition-colors',
                selectedId === folder.id
                  ? 'bg-accent/10 text-text-primary'
                  : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary',
              )}
            >
              {depth > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-text-tertiary" />}
              <Folder className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              <span className="truncate">{folder.name}</span>
            </button>
          ))}

          {flat.length === 0 && (
            <div className="px-3 py-4 text-xs text-text-tertiary text-center">
              {t('mediaFolders.noFolders', 'No folders yet.')}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={pending}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={selectedId === undefined || pending}
          >
            {pending
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : t('mediaFolders.moveConfirm', 'Move Here')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
