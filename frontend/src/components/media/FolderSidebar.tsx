/**
 * FolderSidebar — left-rail folder tree for MediaProjectDetailPage.
 *
 * Renders the project's folder tree fetched via getFolderTree(projectId).
 * Clicking a folder calls onSelectFolder; folder actions (create, rename,
 * delete) are wired through callbacks so the parent page owns the mutations
 * and can invalidate queries centrally.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  MoreHorizontal,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { MediaFolder } from '@/services/media-collab';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface FolderSidebarProps {
  /** Flat tree returned by getFolderTree — already nested via children[]. */
  folders: MediaFolder[];
  loading?: boolean;
  /** null = "All Files" (root). */
  selectedFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  onCreateFolder: (parentId: string | null, name: string) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  FolderNode — recursive row                                          */
/* ------------------------------------------------------------------ */

interface FolderNodeProps {
  folder: MediaFolder;
  depth: number;
  selectedFolderId: string | null;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onSelectFolder: (id: string) => void;
  onCreateFolder: (parentId: string | null, name: string) => Promise<void>;
  onRenameFolder: (folderId: string, name: string) => Promise<void>;
  onDeleteFolder: (folderId: string) => Promise<void>;
}

function FolderNode({
  folder,
  depth,
  selectedFolderId,
  expandedIds,
  onToggleExpand,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderNodeProps) {
  const { t } = useTranslation();
  const hasChildren = (folder.children?.length ?? 0) > 0;
  const isExpanded = expandedIds.has(folder.id);
  const isSelected = selectedFolderId === folder.id;

  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [renamePending, setRenamePending] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [createValue, setCreateValue] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePending, setDeletePending] = useState(false);

  const assetCount = folder._count?.assets ?? 0;
  const childCount = folder._count?.children ?? folder.children?.length ?? 0;

  const handleRename = async () => {
    const name = renameValue.trim();
    if (!name) return;
    setRenamePending(true);
    try {
      await onRenameFolder(folder.id, name);
      setRenameDialogOpen(false);
    } finally {
      setRenamePending(false);
    }
  };

  const handleCreate = async () => {
    const name = createValue.trim();
    if (!name) return;
    setCreatePending(true);
    try {
      await onCreateFolder(folder.id, name);
      setCreateValue('');
      setCreateDialogOpen(false);
      // Expand so the new child is visible
      if (!isExpanded) onToggleExpand(folder.id);
    } finally {
      setCreatePending(false);
    }
  };

  const handleDelete = async () => {
    setDeletePending(true);
    try {
      await onDeleteFolder(folder.id);
      setDeleteDialogOpen(false);
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <>
      <div style={{ paddingLeft: `${depth * 12}px` }}>
        <div
          className={cn(
            'group flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer select-none transition-colors',
            isSelected
              ? 'bg-accent/10 text-text-primary'
              : 'hover:bg-bg-raised text-text-secondary hover:text-text-primary',
          )}
        >
          {/* Expand toggle */}
          <button
            type="button"
            className={cn(
              'h-4 w-4 shrink-0 flex items-center justify-center text-text-tertiary transition-transform',
              hasChildren ? 'opacity-100' : 'opacity-0 pointer-events-none',
              isExpanded && 'rotate-90',
            )}
            onClick={(e) => { e.stopPropagation(); onToggleExpand(folder.id); }}
            aria-label={isExpanded
              ? t('mediaFolders.collapse', 'Collapse')
              : t('mediaFolders.expand', 'Expand')}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Folder icon + name — clicking selects */}
          <button
            type="button"
            className="flex items-center gap-1.5 flex-1 min-w-0 text-left"
            onClick={() => onSelectFolder(folder.id)}
          >
            {isSelected || isExpanded
              ? <FolderOpen className="h-3.5 w-3.5 shrink-0 text-accent" />
              : <Folder className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />}
            <span className="text-xs truncate flex-1">{folder.name}</span>
            {(assetCount > 0 || childCount > 0) && (
              <span className="text-[10px] text-text-tertiary tabular-nums shrink-0">
                {assetCount + childCount}
              </span>
            )}
          </button>

          {/* Context menu — appears on hover */}
          <div className="opacity-0 group-hover:opacity-100 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-bg-raised transition-colors"
                  aria-label={t('mediaFolders.folderActions', 'Folder actions')}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setCreateValue('');
                    setCreateDialogOpen(true);
                  }}
                >
                  <FolderPlus className="h-3.5 w-3.5 mr-2" />
                  {t('mediaFolders.newSubfolder', 'New Subfolder')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameValue(folder.name);
                    setRenameDialogOpen(true);
                  }}
                >
                  {t('mediaFolders.rename', 'Rename')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-danger focus:text-danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteDialogOpen(true);
                  }}
                >
                  {t('mediaFolders.delete', 'Delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Children — rendered when expanded */}
        {isExpanded && hasChildren && (
          <div>
            {folder.children!.map((child) => (
              <FolderNode
                key={child.id}
                folder={child}
                depth={depth + 1}
                selectedFolderId={selectedFolderId}
                expandedIds={expandedIds}
                onToggleExpand={onToggleExpand}
                onSelectFolder={onSelectFolder}
                onCreateFolder={onCreateFolder}
                onRenameFolder={onRenameFolder}
                onDeleteFolder={onDeleteFolder}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Rename dialog ── */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-text-primary">
              {t('mediaFolders.renameTitle', 'Rename Folder')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary text-sm">
              {t('mediaFolders.renameDesc', 'Enter a new name for "{{name}}".', { name: folder.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="rename-folder" className="text-text-secondary text-xs">
                {t('mediaFolders.folderName', 'Folder Name')}
              </Label>
              <Input
                id="rename-folder"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(); }}
                className="bg-bg-sunken border-border-subtle text-text-primary"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRenameDialogOpen(false)}
                disabled={renamePending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleRename}
                disabled={!renameValue.trim() || renamePending}
              >
                {renamePending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : t('mediaFolders.save', 'Save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Create subfolder dialog ── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-text-primary">
              {t('mediaFolders.newSubfolderTitle', 'New Subfolder')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary text-sm">
              {t('mediaFolders.newSubfolderDesc', 'Create a subfolder inside "{{name}}".', { name: folder.name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="create-subfolder" className="text-text-secondary text-xs">
                {t('mediaFolders.folderName', 'Folder Name')}
              </Label>
              <Input
                id="create-subfolder"
                value={createValue}
                onChange={(e) => setCreateValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                className="bg-bg-sunken border-border-subtle text-text-primary"
                placeholder={t('mediaFolders.folderNamePlaceholder', 'e.g. Selects, Finals…')}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                disabled={createPending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={!createValue.trim() || createPending}
              >
                {createPending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : t('mediaFolders.create', 'Create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirm dialog ── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-text-primary">
              {t('mediaFolders.deleteTitle', 'Delete Folder')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary text-sm">
              {t(
                'mediaFolders.deleteDesc',
                'Delete "{{name}}" and all its subfolders and assets? This cannot be undone.',
                { name: folder.name },
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletePending}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              className="bg-danger hover:bg-danger/90 text-white"
              onClick={handleDelete}
              disabled={deletePending}
            >
              {deletePending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : t('mediaFolders.confirmDelete', 'Delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  FolderSidebar — root component                                      */
/* ------------------------------------------------------------------ */

export function FolderSidebar({
  folders,
  loading,
  selectedFolderId,
  onSelectFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: FolderSidebarProps) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [rootCreateOpen, setRootCreateOpen] = useState(false);
  const [rootCreateValue, setRootCreateValue] = useState('');
  const [rootCreatePending, setRootCreatePending] = useState(false);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRootCreate = async () => {
    const name = rootCreateValue.trim();
    if (!name) return;
    setRootCreatePending(true);
    try {
      await onCreateFolder(null, name);
      setRootCreateValue('');
      setRootCreateOpen(false);
    } finally {
      setRootCreatePending(false);
    }
  };

  return (
    <aside className="w-52 shrink-0 flex flex-col gap-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-1 px-2">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
          {t('mediaFolders.folders', 'Folders')}
        </span>
        <button
          type="button"
          onClick={() => { setRootCreateValue(''); setRootCreateOpen(true); }}
          className="h-5 w-5 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-bg-raised transition-colors"
          title={t('mediaFolders.newFolder', 'New Folder')}
        >
          <FolderPlus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* "All Files" root entry */}
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer select-none transition-colors text-xs',
          selectedFolderId === null
            ? 'bg-accent/10 text-text-primary font-medium'
            : 'hover:bg-bg-raised text-text-secondary hover:text-text-primary',
        )}
        onClick={() => onSelectFolder(null)}
      >
        <Folder className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
        <span>{t('mediaFolders.allFiles', 'All Files')}</span>
      </div>

      {/* Tree */}
      {loading ? (
        <div className="flex items-center justify-center py-6 text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : folders.length === 0 ? (
        <div className="px-2 py-3 text-[11px] text-text-tertiary">
          {t('mediaFolders.noFolders', 'No folders yet.')}
        </div>
      ) : (
        <div className="space-y-0.5">
          {folders.map((folder) => (
            <FolderNode
              key={folder.id}
              folder={folder}
              depth={0}
              selectedFolderId={selectedFolderId}
              expandedIds={expandedIds}
              onToggleExpand={toggleExpand}
              onSelectFolder={onSelectFolder}
              onCreateFolder={onCreateFolder}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
            />
          ))}
        </div>
      )}

      {/* Root-level "New Folder" dialog */}
      <Dialog open={rootCreateOpen} onOpenChange={setRootCreateOpen}>
        <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-text-primary">
              {t('mediaFolders.newFolderTitle', 'New Folder')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary text-sm">
              {t('mediaFolders.newFolderDesc', 'Create a top-level folder in this project.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="root-create-folder" className="text-text-secondary text-xs">
                {t('mediaFolders.folderName', 'Folder Name')}
              </Label>
              <Input
                id="root-create-folder"
                value={rootCreateValue}
                onChange={(e) => setRootCreateValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRootCreate(); }}
                className="bg-bg-sunken border-border-subtle text-text-primary"
                placeholder={t('mediaFolders.folderNamePlaceholder', 'e.g. Selects, Finals…')}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRootCreateOpen(false)}
                disabled={rootCreatePending}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                size="sm"
                onClick={handleRootCreate}
                disabled={!rootCreateValue.trim() || rootCreatePending}
              >
                {rootCreatePending
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : t('mediaFolders.create', 'Create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
