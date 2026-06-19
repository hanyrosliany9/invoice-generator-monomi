import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Folder,
  ArrowLeft, Upload, Image as ImageIcon, Film, Play, Trash2,
  MoreHorizontal, Share2, Copy, Link as LinkIcon, MessageCircle,
  CheckCircle2, X, Loader2, Eye, Globe, FolderOpen, ZoomIn, Plus,
  ChevronLeft, ChevronRight, Users, UserPlus, Mail, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useMediaToken } from '@/hooks/useMediaToken';
import { getProxyUrl } from '@/utils/mediaProxy';
import {
  mediaCollabService,
  CollaboratorRole,
  type MediaAsset,
  type MediaCollection,
  type MediaCollaborator,
  type MediaFolder,
} from '@/services/media-collab';
import { StarRating } from '@/components/media/StarRating';
import {
  FilterSortBar,
  DEFAULT_FILTERS,
  type FilterState,
} from '@/components/media/FilterSortBar';
import { BulkActionBar } from '@/components/media/BulkActionBar';
import { ComparisonView } from '@/components/media/ComparisonView';
import { MetadataPanel } from '@/components/media/MetadataPanel';
import { LightboxOverlay } from '@/components/media/LightboxOverlay';
import { FolderSidebar } from '@/components/media/FolderSidebar';
import { FolderBreadcrumb, type BreadcrumbSegment } from '@/components/media/FolderBreadcrumb';
import { MoveToFolderDialog } from '@/components/media/MoveToFolderDialog';
import { NewCollectionDialog } from '@/components/media/NewCollectionDialog';
import { VideoReviewModal } from '@/components/media/VideoReviewModal';

/* ------------------------------------------------------------------ */
/*  Sidebar — same shape as every v2 page.                             */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const initialsOf = (name?: string) =>
  (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const formatBytes = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const assetStatusChip = (s?: string) => {
  switch (s) {
    case 'APPROVED':      return 'bg-success/10 text-success';
    case 'IN_REVIEW':     return 'bg-info/10 text-info';
    case 'NEEDS_CHANGES': return 'bg-warning/10 text-warning';
    case 'ARCHIVED':      return 'bg-bg-sunken text-text-tertiary';
    case 'DRAFT':
    default:              return 'bg-bg-sunken text-text-tertiary';
  }
};

const ASSET_STATUS_LABEL: Record<string, string> = {
  DRAFT:         'Draft',
  IN_REVIEW:     'In Review',
  NEEDS_CHANGES: 'Needs Changes',
  APPROVED:      'Approved',
  ARCHIVED:      'Archived',
};

/* ------------------------------------------------------------------ */
/*  Stable shell wrapper — must live at module level.                  */
/*  Defining this inside the page function creates a new component     */
/*  type on every render, causing React to unmount+remount AppShell    */
/*  (and its <main> scroll container) after every state update.        */
/* ------------------------------------------------------------------ */
interface MediaShellProps { children: React.ReactNode; user: import('@/store/auth').User | null; }
const MediaShell = ({ children, user }: MediaShellProps) => (
  <AppShell
    sidebar={{
      brand: <MonomiBrand />,
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    }}
    topbar={{}}
    disableSmoothScroll
  >
    <PageContainer>{children}</PageContainer>
  </AppShell>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MediaProjectDetailPageV2() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const { mediaToken } = useMediaToken();

  /* ---------- local ui state ---------- */
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [shareExpiry, setShareExpiry] = useState<Date | undefined>(undefined);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  interface UploadItem {
    id: string;
    file: File;
    name: string;
    status: 'queued' | 'uploading' | 'done' | 'error';
    progress: number;
    error?: string;
    conflictResolution?: 'skip' | 'replace' | 'keep-both';
  }
  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  /* ---------- duplicate-upload dialog ---------- */
  type DuplicateEntry = {
    id: string; originalName: string; size: string;
    uploadedAt: string; uploadedBy: string; url: string;
  };
  const [duplicateDialog, setDuplicateDialog] = useState<{
    pendingFiles: File[];
    duplicates: Record<string, DuplicateEntry>;
  } | null>(null);
  const [duplicateResolution, setDuplicateResolution] = useState<'skip' | 'replace' | 'keep-both'>('skip');

  /* ---------- new review-tool state ---------- */
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lightboxAsset, setLightboxAsset] = useState<MediaAsset | null>(null);

  /* ---------- video review state ---------- */
  const [videoReviewAsset, setVideoReviewAsset] = useState<MediaAsset | null>(null);

  /* ---------- delete-asset confirm ---------- */
  const [deleteAssetTarget, setDeleteAssetTarget] = useState<MediaAsset | null>(null);

  /* ---------- comparison state ---------- */
  const [compareOpen, setCompareOpen] = useState(false);

  /* ---------- folder + collection state ---------- */
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderSheetOpen, setFolderSheetOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [newCollectionDialogOpen, setNewCollectionDialogOpen] = useState(false);

  /* ---------- data ---------- */
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ['media-project', projectId],
    queryFn: () => mediaCollabService.getProject(projectId!),
    enabled: !!projectId,
  });

  const {
    data: assets = [],
    isLoading: assetsLoading,
  } = useQuery({
    queryKey: ['media-assets', projectId],
    queryFn: () => mediaCollabService.getAssets(projectId!, {
      sortBy: 'uploadedAt',
      sortOrder: 'desc',
    }),
    enabled: !!projectId,
  });

  const {
    data: collections = [],
    isLoading: collectionsLoading,
  } = useQuery({
    queryKey: ['media-collections', projectId],
    queryFn: () => mediaCollabService.getCollections(projectId!),
    enabled: !!projectId,
  });

  const {
    data: folderTree = [],
    isLoading: foldersLoading,
  } = useQuery<MediaFolder[]>({
    queryKey: ['media-folder-tree', projectId],
    queryFn: () => mediaCollabService.getFolderTree(projectId!),
    enabled: !!projectId,
  });

  const {
    data: assetComments = [],
    refetch: refetchComments,
  } = useQuery({
    queryKey: ['asset-comments', selectedAsset?.id],
    queryFn: () => mediaCollabService.getCommentsByAsset(selectedAsset!.id),
    enabled: !!selectedAsset,
  });

  const {
    data: lightboxComments = [],
    refetch: refetchLightboxComments,
  } = useQuery({
    queryKey: ['asset-comments', lightboxAsset?.id],
    queryFn: () => mediaCollabService.getCommentsByAsset(lightboxAsset!.id),
    enabled: !!lightboxAsset,
  });

  /* ---------- mutations ---------- */
  const invalidateAssets = () => {
    queryClient.invalidateQueries({ queryKey: ['media-assets', projectId] });
    queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
  };

  const invalidateFolders = () => {
    queryClient.invalidateQueries({ queryKey: ['media-folder-tree', projectId] });
  };

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId: string | null }) =>
      mediaCollabService.createFolder({
        name: data.name,
        projectId: projectId!,
        parentId: data.parentId ?? undefined,
      }),
    onSuccess: () => {
      invalidateFolders();
      toast.success(t('mediaFolders.folderCreated', 'Folder created.'));
    },
    onError: () => toast.error(t('mediaFolders.folderCreateFailed', 'Failed to create folder.')),
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      mediaCollabService.updateFolder(id, { name }),
    onSuccess: () => {
      invalidateFolders();
      toast.success(t('mediaFolders.folderRenamed', 'Folder renamed.'));
    },
    onError: () => toast.error(t('mediaFolders.folderRenameFailed', 'Failed to rename folder.')),
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => mediaCollabService.deleteFolder(folderId),
    onSuccess: (result) => {
      invalidateFolders();
      invalidateAssets();
      // If the deleted folder was active, reset to root
      if (activeFolderId === result.deletedFolderId) setActiveFolderId(null);
      toast.success(t('mediaFolders.folderDeleted', 'Folder deleted.'));
    },
    onError: () => toast.error(t('mediaFolders.folderDeleteFailed', 'Failed to delete folder.')),
  });

  const moveAssetsMutation = useMutation({
    mutationFn: (targetFolderId: string | null) =>
      mediaCollabService.moveAssets(projectId!, {
        assetIds: Array.from(selectedIds),
        folderId: targetFolderId ?? undefined,
      }),
    onSuccess: () => {
      invalidateAssets();
      clearSelection();
      toast.success(t('mediaFolders.moveSuccess', 'Assets moved.'));
    },
    onError: () => toast.error(t('mediaFolders.moveFailed', 'Failed to move assets.')),
  });

  const createCollectionMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; type: 'MANUAL' | 'SMART' }) =>
      mediaCollabService.createCollection(projectId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-collections', projectId] });
      toast.success(t('mediaCollections.created', 'Collection created.'));
    },
    onError: () => toast.error(t('mediaCollections.createFailed', 'Failed to create collection.')),
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => mediaCollabService.deleteAsset(assetId),
    onSuccess: () => {
      invalidateAssets();
      toast.success(t('mediaCollab.assetDeleted', 'Aset berhasil dihapus.'));
      setSelectedAsset(null);
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('mediaCollab.assetDeleteFailed', 'Gagal menghapus aset.')),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      mediaCollabService.updateAssetStatus(id, status),
    onSuccess: () => {
      invalidateAssets();
      toast.success(t('mediaCollab.statusUpdated', 'Status aset diperbarui.'));
    },
    onError: () => toast.error(t('mediaCollab.statusUpdateFailed', 'Gagal memperbarui status.')),
  });

  const enableShareMutation = useMutation({
    mutationFn: (expiresAt?: string | null) =>
      mediaCollabService.enablePublicSharing(projectId!, expiresAt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
      toast.success(t('mediaCollab.shareEnabled', 'Tautan publik diaktifkan.'));
    },
    onError: () => toast.error(t('mediaCollab.shareEnableFailed', 'Gagal mengaktifkan tautan publik.')),
  });

  const disableShareMutation = useMutation({
    mutationFn: () => mediaCollabService.disablePublicSharing(projectId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
      toast.success(t('mediaCollab.shareDisabled', 'Tautan publik dinonaktifkan.'));
    },
    onError: () => toast.error(t('mediaCollab.shareDisableFailed', 'Gagal menonaktifkan tautan publik.')),
  });

  /* ---------- collaborators / guest invites ---------- */
  const {
    data: collaborators = [],
    isLoading: collaboratorsLoading,
  } = useQuery({
    queryKey: ['media-collaborators', projectId],
    queryFn: () => mediaCollabService.getProjectCollaborators(projectId!),
    enabled: !!projectId && shareSheetOpen,
  });

  const invalidateCollaborators = () =>
    queryClient.invalidateQueries({ queryKey: ['media-collaborators', projectId] });

  const inviteGuestMutation = useMutation({
    mutationFn: (data: { email: string; name: string; role: 'VIEWER' | 'COMMENTER' | 'EDITOR' }) =>
      mediaCollabService.inviteGuest(projectId!, data),
    onSuccess: () => {
      invalidateCollaborators();
      toast.success(t('mediaCollab.inviteSent', 'Undangan terkirim.'));
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('mediaCollab.inviteFailed', 'Gagal mengirim undangan.')),
  });

  const revokeCollaboratorMutation = useMutation({
    mutationFn: (collaboratorId: string) =>
      mediaCollabService.revokeGuestAccess(projectId!, collaboratorId),
    onSuccess: () => {
      invalidateCollaborators();
      toast.success(t('mediaCollab.accessRevoked', 'Akses dicabut.'));
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || t('mediaCollab.revokeFailed', 'Gagal mencabut akses.')),
  });

  const addCommentMutation = useMutation({
    mutationFn: (text: string) =>
      mediaCollabService.createComment({
        assetId: selectedAsset!.id,
        content: text,
      }),
    onSuccess: () => {
      refetchComments();
      toast.success(t('mediaCollab.commentSent', 'Komentar terkirim.'));
    },
    onError: () => toast.error(t('mediaCollab.commentFailed', 'Gagal mengirim komentar.')),
  });

  const resolveCommentMutation = useMutation({
    mutationFn: (commentId: string) => mediaCollabService.resolveComment(commentId),
    onSuccess: () => refetchComments(),
    onError: () => toast.error(t('mediaCollab.resolveFailed', 'Gagal menyelesaikan komentar.')),
  });

  /* ---------- lightbox comment mutations (scoped to lightboxAsset) ---------- */
  const lightboxAddCommentMutation = useMutation({
    mutationFn: (text: string) =>
      mediaCollabService.createComment({ assetId: lightboxAsset!.id, content: text }),
    onSuccess: () => {
      refetchLightboxComments();
      toast.success(t('mediaCollab.commentSent', 'Komentar terkirim.'));
    },
    onError: () => toast.error(t('mediaCollab.commentFailed', 'Gagal mengirim komentar.')),
  });

  const lightboxResolveCommentMutation = useMutation({
    mutationFn: (commentId: string) => mediaCollabService.resolveComment(commentId),
    onSuccess: () => refetchLightboxComments(),
    onError: () => toast.error(t('mediaCollab.resolveFailed', 'Gagal menyelesaikan komentar.')),
  });

  /* ---------- star rating mutation ---------- */
  const starRatingMutation = useMutation({
    mutationFn: ({ assetId, rating }: { assetId: string; rating: number }) =>
      mediaCollabService.updateStarRating(assetId, rating),
    onSuccess: (updated) => {
      // Optimistically patch the cache so sheet and lightbox both show updated stars immediately
      queryClient.setQueryData<MediaAsset[]>(['media-assets', projectId], (old = []) =>
        old.map((a) => (a.id === updated.id ? updated : a)),
      );
      if (selectedAsset?.id === updated.id) setSelectedAsset(updated);
      if (lightboxAsset?.id === updated.id) setLightboxAsset(updated);
      toast.success(t('mediaReview.ratingUpdated', 'Star rating updated.'));
    },
    onError: () => toast.error(t('mediaReview.ratingFailed', 'Failed to update rating.')),
  });

  /* ---------- bulk mutations ---------- */
  const bulkRateMutation = useMutation({
    mutationFn: ({ ids, rating }: { ids: string[]; rating: number }) =>
      mediaCollabService.bulkUpdateStarRating(ids, rating),
    onSuccess: () => {
      invalidateAssets();
      setSelectedIds(new Set());
      toast.success(t('mediaReview.bulkRateSuccess', 'Ratings updated.'));
    },
    onError: () => toast.error(t('mediaReview.bulkRateFailed', 'Failed to update ratings.')),
  });

  const BULK_DOWNLOAD_LIMIT = 500;

  const bulkDownloadMutation = useMutation({
    mutationFn: (ids: string[]) => {
      const capped = ids.slice(0, BULK_DOWNLOAD_LIMIT);
      if (ids.length > BULK_DOWNLOAD_LIMIT) {
        toast.warning(
          t(
            'mediaCollab.downloadLimitWarning',
            'ZIP is limited to {{limit}} files. Downloading the first {{limit}} of {{total}}.',
            { limit: BULK_DOWNLOAD_LIMIT, total: ids.length },
          ),
        );
      }
      return mediaCollabService.bulkDownloadAssets(capped, `${project?.name ?? 'media'}-selection`);
    },
    onSuccess: () => {
      toast.success(t('mediaReview.bulkDownloadStarted', 'Download started.'));
    },
    onError: () => toast.error(t('mediaReview.bulkDownloadFailed', 'Download failed.')),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => mediaCollabService.bulkDeleteAssets(ids),
    onSuccess: (result) => {
      invalidateAssets();
      setSelectedIds(new Set());
      toast.success(
        t('mediaReview.bulkDeleteSuccess', '{{n}} assets deleted.', { n: result.deleted }),
      );
    },
    onError: () => toast.error(t('mediaReview.bulkDeleteFailed', 'Failed to delete assets.')),
  });

  /* ---------- selection helpers ----------
     `toggleSelect` is defined after `filteredAssets` (further down) because
     shift-range selection needs to read the current filtered list. */
  // Index (within filteredAssets) of the last tile the user toggled — anchor
  // for shift-click range selection, mirroring file-manager behaviour.
  const lastSelectedIndexRef = useRef<number | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    lastSelectedIndexRef.current = null;
  }, []);

  // The shift-click anchor is an index into the filtered list; when the list
  // is re-ordered/re-filtered or the folder changes, that index now points at a
  // different asset, so drop the anchor to avoid selecting the wrong range.
  useEffect(() => {
    lastSelectedIndexRef.current = null;
  }, [filters, activeFolderId]);

  /* ---------- breadcrumb helpers ---------- */
  const breadcrumbSegments = useMemo((): BreadcrumbSegment[] => {
    if (!activeFolderId) return [];

    const findPath = (
      nodes: MediaFolder[],
      targetId: string,
      acc: BreadcrumbSegment[],
    ): BreadcrumbSegment[] | null => {
      for (const n of nodes) {
        const seg: BreadcrumbSegment = { id: n.id, name: n.name };
        if (n.id === targetId) return [...acc, seg];
        if (n.children?.length) {
          const found = findPath(n.children, targetId, [...acc, seg]);
          if (found) return found;
        }
      }
      return null;
    };

    return findPath(folderTree, activeFolderId, []) ?? [];
  }, [activeFolderId, folderTree]);

  // Folders visible inside the current view (root-level or children of active folder).
  const visibleSubfolders = useMemo((): MediaFolder[] => {
    if (activeFolderId === null) return folderTree;
    const findNode = (nodes: MediaFolder[], id: string): MediaFolder | null => {
      for (const n of nodes) {
        if (n.id === id) return n;
        if (n.children?.length) {
          const found = findNode(n.children, id);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(folderTree, activeFolderId)?.children ?? [];
  }, [activeFolderId, folderTree]);

  /* ---------- derived ---------- */
  const filteredAssets = useMemo(() => {
    let result = [...assets];

    // Folder filter — only show assets in the active folder (or all if root)
    if (activeFolderId !== null) {
      result = result.filter((a) => a.folderId === activeFolderId);
    }

    // Media type
    if (filters.mediaType === 'IMAGE') {
      result = result.filter((a) => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE');
    } else if (filters.mediaType === 'VIDEO') {
      result = result.filter((a) => a.mediaType === 'VIDEO');
    }

    // Filename search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((a) => a.originalName.toLowerCase().includes(q));
    }

    // Review status
    if (filters.reviewStatus !== 'all') {
      result = result.filter((a) => a.status === filters.reviewStatus);
    }

    // Min star rating
    if (filters.minStar > 0) {
      result = result.filter((a) => (a.starRating ?? 0) >= filters.minStar);
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (filters.sortBy) {
        case 'originalName':
          cmp = a.originalName.localeCompare(b.originalName);
          break;
        case 'size':
          cmp = (Number(a.size) || 0) - (Number(b.size) || 0);
          break;
        case 'starRating':
          cmp = (a.starRating ?? 0) - (b.starRating ?? 0);
          break;
        case 'uploadedAt':
        default:
          cmp = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
      }
      return filters.sortOrder === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [assets, filters, activeFolderId]);

  const toggleSelect = useCallback(
    (id: string, index: number, shiftKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        const anchor = lastSelectedIndexRef.current;
        if (shiftKey && anchor !== null && anchor !== index) {
          // Select the contiguous range between the anchor and this tile.
          const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
          for (let i = from; i <= to; i += 1) {
            const a = filteredAssets[i];
            if (a) next.add(a.id);
          }
        } else if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      lastSelectedIndexRef.current = index;
    },
    [filteredAssets],
  );

  /* ---------- lightbox navigation (images only — grid tile click opens this) ---------- */
  const imageAssets = useMemo(
    () => filteredAssets.filter((a) => a.mediaType !== 'VIDEO'),
    [filteredAssets],
  );

  const gotoAdjacentLightboxAsset = useCallback(
    (dir: 1 | -1) => {
      if (!lightboxAsset) return;
      const idx = imageAssets.findIndex((a) => a.id === lightboxAsset.id);
      if (idx === -1) return;
      const next = imageAssets[idx + dir];
      if (next) setLightboxAsset(next);
    },
    [lightboxAsset, imageAssets],
  );

  const lightboxAdjacency = useMemo(() => {
    if (!lightboxAsset) return { hasPrev: false, hasNext: false, position: undefined };
    const idx = imageAssets.findIndex((a) => a.id === lightboxAsset.id);
    if (idx === -1) return { hasPrev: false, hasNext: false, position: undefined };
    return {
      hasPrev: idx > 0,
      hasNext: idx < imageAssets.length - 1,
      position: { current: idx + 1, total: imageAssets.length },
    };
  }, [lightboxAsset, imageAssets]);

  /* ---------- asset detail sheet prev/next navigation ----------
     Kept for the detail sheet; lightbox uses gotoAdjacentLightboxAsset above. */
  const gotoAdjacentAsset = useCallback(
    (dir: 1 | -1) => {
      if (!selectedAsset) return;
      const idx = filteredAssets.findIndex((a) => a.id === selectedAsset.id);
      if (idx === -1) return;
      const candidates =
        dir === 1
          ? filteredAssets.slice(idx + 1)
          : filteredAssets.slice(0, idx).reverse();
      const target = candidates.find((a) => a.mediaType !== 'VIDEO');
      if (target) setSelectedAsset(target);
    },
    [selectedAsset, filteredAssets],
  );

  const adjacency = useMemo(() => {
    if (!selectedAsset) return { hasPrev: false, hasNext: false };
    const idx = filteredAssets.findIndex((a) => a.id === selectedAsset.id);
    if (idx === -1) return { hasPrev: false, hasNext: false };
    const hasPrev = filteredAssets.slice(0, idx).some((a) => a.mediaType !== 'VIDEO');
    const hasNext = filteredAssets.slice(idx + 1).some((a) => a.mediaType !== 'VIDEO');
    return { hasPrev, hasNext };
  }, [selectedAsset, filteredAssets]);

  // Keyboard nav for the asset detail sheet (arrows) + star rating shortcuts (0-5).
  useEffect(() => {
    if (!selectedAsset) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); gotoAdjacentAsset(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); gotoAdjacentAsset(1); return; }
      // 0-5 to set star rating (only when lightbox is closed to avoid conflict)
      if (!lightboxAsset) {
        const digit = parseInt(e.key, 10);
        if (!isNaN(digit) && digit >= 0 && digit <= 5) {
          e.preventDefault();
          starRatingMutation.mutate({ assetId: selectedAsset.id, rating: digit });
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedAsset, lightboxAsset, gotoAdjacentAsset, starRatingMutation]);

  // Star rating shortcuts (1-5) when lightbox is open. 0 is reserved by LightboxOverlay for zoom reset.
  useEffect(() => {
    if (!lightboxAsset) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const digit = parseInt(e.key, 10);
      if (!isNaN(digit) && digit >= 1 && digit <= 5) {
        e.preventDefault();
        starRatingMutation.mutate({ assetId: lightboxAsset.id, rating: digit });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxAsset, starRatingMutation]);

  const kpis = useMemo(() => {
    const total = assets.length;
    const images = assets.filter(
      (a) => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE',
    ).length;
    const videos = assets.filter((a) => a.mediaType === 'VIDEO').length;
    const inReview = assets.filter((a) => a.status === 'IN_REVIEW').length;
    return { total, images, videos, inReview };
  }, [assets]);

  /* ---------- upload ---------- */

  // Returns the outcome so batch callers can tally results for a summary toast.
  // Pass silent=true to suppress the per-file success/skip toast (bulk mode).
  // Error toasts are never suppressed — the user needs to know which files failed.
  const uploadSingleItem = async (
    id: string,
    file: File,
    conflictResolution?: 'skip' | 'replace' | 'keep-both',
    opts?: { silent?: boolean },
  ): Promise<'done' | 'skipped' | 'error'> => {
    if (!projectId) return 'error';

    const setItem = (patch: Partial<UploadItem>) =>
      setUploadQueue((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

    // Handle skip client-side — no API call, just dismiss
    if (conflictResolution === 'skip') {
      setItem({ status: 'done', progress: 100 });
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((it) => it.id !== id));
      }, 1500);
      if (!opts?.silent) toast.info(t('mediaCollab.uploadSkipped', '"{{name}}" dilewati.', { name: file.name }));
      return 'skipped';
    }

    setItem({ status: 'uploading', progress: 0 });
    try {
      await mediaCollabService.uploadAsset(
        projectId,
        file,
        undefined,
        activeFolderId,
        conflictResolution,
        (evt) => {
          const pct = evt.total ? Math.round((evt.loaded / evt.total) * 100) : 0;
          setItem({ progress: pct });
        },
      );
      setItem({ status: 'done', progress: 100 });
      // Remove done item after a short delay so the user sees the ✓
      setTimeout(() => {
        setUploadQueue((prev) => prev.filter((it) => it.id !== id));
      }, 1500);
      if (!opts?.silent) toast.success(t('mediaCollab.uploaded', '"{{name}}" diunggah.', { name: file.name }));
      return 'done';
    } catch (err: any) {
      const errMsg = err?.response?.data?.message ?? err?.message ?? 'Upload failed';
      setItem({ status: 'error', error: errMsg, progress: 0 });
      toast.error(t('mediaCollab.uploadFailed', 'Gagal unggah "{{name}}".', { name: file.name }));
      return 'error';
    }
  };

  // Show a single summary toast for a completed batch (Google Drive style).
  const showBatchSummary = (done: number, skipped: number, failed: number) => {
    const parts: string[] = [];
    if (done > 0) parts.push(t('mediaCollab.uploadedCount', '{{n}} file diunggah', { n: done }));
    if (skipped > 0) parts.push(t('mediaCollab.skippedCount', '{{n}} dilewati', { n: skipped }));
    if (failed > 0) parts.push(t('mediaCollab.failedCount', '{{n}} gagal', { n: failed }));
    if (parts.length === 0) return;
    const msg = parts.join(', ');
    if (failed === 0) toast.success(msg);
    else if (done > 0 || skipped > 0) toast.warning(msg);
    // All failed → individual error toasts already shown, no duplicate summary needed
  };

  // Shared helper: stamp queue items and upload sequentially.
  // duplicates — map of filename → existing-asset returned by checkDuplicates
  // resolution — conflict resolution choice from the dialog
  const startUploadBatch = async (
    files: File[],
    duplicates: Record<string, unknown>,
    resolution?: 'skip' | 'replace' | 'keep-both',
  ) => {
    const newItems: UploadItem[] = files.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      file,
      name: file.name,
      status: 'queued' as const,
      progress: 0,
      conflictResolution: duplicates[file.name] ? resolution : undefined,
    }));
    setUploadQueue((prev) => [...prev, ...newItems]);

    // Suppress per-file toasts in bulk mode; one summary at the end instead.
    const isBulk = newItems.length > 1;
    let done = 0, skipped = 0, failed = 0;
    for (const item of newItems) {
      const result = await uploadSingleItem(item.id, item.file, item.conflictResolution, { silent: isBulk });
      if (result === 'done') done++;
      else if (result === 'skipped') skipped++;
      else failed++;
    }
    if (isBulk) showBatchSummary(done, skipped, failed);

    invalidateAssets();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFilesPicked = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    // Reset input immediately so the same file(s) can be picked again later
    if (fileInputRef.current) fileInputRef.current.value = '';

    // Check for duplicates in the current folder before queuing
    if (projectId) {
      try {
        const duplicates = await mediaCollabService.checkDuplicates(
          projectId,
          files.map((f) => f.name),
          activeFolderId, // null = root, "uuid" = specific folder
        );
        if (Object.keys(duplicates).length > 0) {
          // Surface the dialog so the user can choose skip / replace / keep-both
          setDuplicateDialog({ pendingFiles: files, duplicates });
          setDuplicateResolution('skip');
          return;
        }
      } catch {
        // If the check fails (network, auth), proceed with upload anyway
      }
    }

    await startUploadBatch(files, {}, undefined);
  };

  const retryUpload = async (id: string) => {
    const item = uploadQueue.find((it) => it.id === id);
    if (!item) return;
    await uploadSingleItem(id, item.file, item.conflictResolution);
    invalidateAssets();
  };

  const retryAllFailed = async () => {
    const failedIds = uploadQueue
      .filter((it) => it.status === 'error')
      .map((it) => it.id);
    const isBulk = failedIds.length > 1;
    let done = 0, failed = 0;
    for (const id of failedIds) {
      const item = uploadQueue.find((it) => it.id === id);
      if (!item) continue;
      const result = await uploadSingleItem(id, item.file, item.conflictResolution, { silent: isBulk });
      if (result === 'done') done++;
      else if (result === 'error') failed++;
    }
    if (isBulk) showBatchSummary(done, 0, failed);
    invalidateAssets();
  };

  /* ---------- share link ----------
     Public gallery is served from the dedicated share host (share.monomiagency.com)
     at the /shared/:token route — NOT the admin origin. Overridable via
     VITE_SHARE_ORIGIN so dev links resolve against the dev tunnel. The old
     `${origin}/media/public/${token}` had no matching route (dead 404 link). */
  const shareOrigin = import.meta.env.VITE_SHARE_ORIGIN || 'https://share.monomiagency.com';
  const shareUrl = project?.isPublic && project.publicShareToken
    ? `${shareOrigin}/shared/${project.publicShareToken}`
    : null;

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('mediaCollab.linkCopied', 'Tautan disalin ke clipboard.'));
    } catch {
      toast.error(t('mediaCollab.linkCopyFailed', 'Gagal menyalin tautan.'));
    }
  };


  /* ---------- loading ---------- */
  if (projectLoading) {
    return (
      <MediaShell user={user}>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-32 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </MediaShell>
    );
  }

  /* ---------- error ---------- */
  if (projectError || !project) {
    return (
      <MediaShell user={user}>
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title={t('mediaCollab.notFound', 'Proyek tidak ditemukan')}
          description={
            projectError instanceof Error
              ? projectError.message
              : t('mediaCollab.notFoundDesc', 'Proyek ini mungkin sudah dihapus atau Anda tidak memiliki akses.')
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/media-collab')}>
                <ArrowLeft className="h-4 w-4" /> {t('mediaCollab.back', 'Kembali')}
              </Button>
              <Button size="sm" onClick={() => refetchProject()}>{t('common.retry', 'Coba Lagi')}</Button>
            </div>
          }
        />
      </MediaShell>
    );
  }

  /* ---------- render ---------- */
  return (
    <MediaShell user={user}>
      {/* Back link */}
      <div className="mb-4">
        <Link
          to="/media-collab"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('mediaCollab.backToCollab', 'Kembali ke Kolaborasi Media')}
        </Link>
      </div>

      <PageHeader
        title={project.name}
        description={
          project.description
          || t('mediaCollab.defaultDesc', 'Ruang kolaborasi media — unggah, ulas, dan setujui aset bersama tim.')
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShareSheetOpen(true)}
            >
              <Share2 className="h-4 w-4" />
              {t('mediaCollab.share', 'Bagikan')}
            </Button>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {t('mediaCollab.uploadAsset', 'Unggah Aset')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFilesPicked}
            />
          </div>
        }
      />

      {/* On mobile the gallery leads (Drive/iCloud-style); flex `order`
          restores hero → stats → gallery on md+ without duplicating markup. */}
      <div className="flex flex-col">

      {/* Hero — identity + sharing panel. */}
      <GlassPanel surface="glass" padding="lg" className="order-3 md:order-1 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8">
          <div className="min-w-0 space-y-5">
            {/* Creator */}
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 mt-0.5">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-sm font-medium">
                  {initialsOf(project.creator?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('mediaCollab.owner', 'Pemilik')}
                </div>
                <div className="text-base font-medium text-text-primary truncate">
                  {project.creator?.name ?? '—'}
                </div>
                {project.creator?.email && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {project.creator.email}
                  </div>
                )}
              </div>
            </div>

            {/* Client + connected project */}
            {(project.client || project.project) && (
              <div className="pt-1 space-y-3">
                {project.client && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('mediaCollab.client', 'Klien')}
                    </div>
                    <div className="text-sm text-text-primary">
                      {project.client.name}
                    </div>
                  </div>
                )}
                {project.project && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('mediaCollab.linkedProject', 'Proyek Terhubung')}
                    </div>
                    <div className="text-sm text-text-secondary inline-flex items-center gap-1.5">
                      <Folder className="h-3.5 w-3.5 text-text-tertiary" />
                      {project.project.number}
                      {project.project.name && (
                        <span className="text-text-tertiary"> · {project.project.name}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sharing rail */}
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 min-w-0 lg:min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('mediaCollab.publicLink', 'Tautan Publik')}
              </div>
              <div className="flex lg:justify-end items-center gap-2">
                {project.isPublic ? (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-success/10 text-success px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  >
                    {t('mediaCollab.active', 'Aktif')}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-bg-sunken text-text-tertiary px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider"
                  >
                    {t('mediaCollab.inactive', 'Nonaktif')}
                  </Badge>
                )}
              </div>
              {project.publicViewCount !== undefined && project.isPublic && (
                <div className="text-xs text-text-tertiary mt-2">
                  {t('mediaCollab.viewCount', '{{n}} views', { n: project.publicViewCount.toLocaleString('id-ID') })}
                </div>
              )}
            </div>
            <div className="flex lg:justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShareSheetOpen(true)}
              >
                <Globe className="h-4 w-4" />
                {t('mediaCollab.shareSettings', 'Atur Berbagi')}
              </Button>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          KPI band — four supporting numbers. Total + Direview are
          the load-bearing items; Foto / Video are ambient breakdowns.
         ─────────────────────────────────────────────────────────── */}
      <section className="order-2 md:order-2 mb-8 md:mb-12">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label={t('mediaCollab.kpi.totalAssets', 'Total Aset')}
            value={kpis.total}
            sublabel={t('mediaCollab.kpi.totalAssetsSub', 'file dalam proyek')}
          />
          <StatCard
            label={t('mediaCollab.kpi.photos', 'Foto')}
            value={kpis.images}
            sublabel={t('mediaCollab.kpi.photosSub', 'termasuk RAW')}
          />
          <StatCard
            label={t('mediaCollab.kpi.videos', 'Video')}
            value={kpis.videos}
            sublabel={t('mediaCollab.kpi.videosSub', 'klip & rekaman')}
          />
          <StatCard
            label={t('mediaCollab.kpi.inReview', 'Sedang Direview')}
            value={kpis.inReview}
            sublabel={t('mediaCollab.kpi.inReviewSub', 'menunggu persetujuan')}
          />
        </div>
      </section>

      {/* Gallery — leads on mobile (order-1), third on desktop. */}
      <section className="order-1 md:order-3 mb-8 md:mb-10">
        <GlassPanel surface="glass" padding="lg">
          <div className="mb-5">
            <div className="flex items-baseline justify-between gap-4 mb-4">
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('mediaCollab.assetGallery', 'Galeri Aset')}
              </h2>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} variant="outline" className="h-7 text-xs">
                <Upload className="h-3.5 w-3.5" /> {t('mediaCollab.uploadAsset', 'Unggah Aset')}
              </Button>
            </div>

            {/* Filter + sort bar */}
            <FilterSortBar
              filters={filters}
              onChange={(f) => { setFilters(f); }}
              resultCount={filteredAssets.length}
              totalCount={assets.length}
            />
          </div>

          {/* Mobile folder picker — only visible below md breakpoint */}
          {folderTree.length > 0 && (
            <div className="block md:hidden mb-3">
              <button
                type="button"
                onClick={() => setFolderSheetOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md border border-border-subtle bg-bg-sunken/40 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors w-full"
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                <span className="flex-1 text-left truncate">
                  {activeFolderId
                    ? (folderTree.find((f: any) => f.id === activeFolderId)?.name ?? t('mediaFolders.folder', 'Folder'))
                    : t('mediaFolders.allFiles', 'All Files')}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
              </button>

              <Sheet open={folderSheetOpen} onOpenChange={setFolderSheetOpen}>
                <SheetContent side="left" className="p-0 w-[260px] bg-bg-base">
                  <SheetHeader className="px-4 pt-4 pb-2">
                    <SheetTitle className="text-sm">{t('mediaFolders.folders', 'Folders')}</SheetTitle>
                    <SheetDescription className="sr-only">Navigate folders</SheetDescription>
                  </SheetHeader>
                  <div className="px-4 pb-4 overflow-y-auto max-h-[80vh]">
                    <FolderSidebar
                      folders={folderTree}
                      loading={foldersLoading}
                      selectedFolderId={activeFolderId}
                      onSelectFolder={(id) => {
                        setActiveFolderId(id);
                        setFolderSheetOpen(false);
                      }}
                      onCreateFolder={async (parentId, name) => {
                        await createFolderMutation.mutateAsync({ name, parentId });
                      }}
                      onRenameFolder={async (folderId, name) => {
                        await renameFolderMutation.mutateAsync({ id: folderId, name });
                      }}
                      onDeleteFolder={async (folderId) => {
                        await deleteFolderMutation.mutateAsync(folderId);
                      }}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Folder sidebar + main content area */}
          <div className="flex gap-5">
            {/* Folder sidebar — hidden on mobile, shown md+ */}
            <div className="hidden md:block shrink-0">
              <FolderSidebar
                folders={folderTree}
                loading={foldersLoading}
                selectedFolderId={activeFolderId}
                onSelectFolder={(id) => { setActiveFolderId(id); }}
                onCreateFolder={async (parentId, name) => {
                  await createFolderMutation.mutateAsync({ name, parentId });
                }}
                onRenameFolder={async (folderId, name) => {
                  await renameFolderMutation.mutateAsync({ id: folderId, name });
                }}
                onDeleteFolder={async (folderId) => {
                  await deleteFolderMutation.mutateAsync(folderId);
                }}
              />
            </div>

            {/* Right: breadcrumb + grid */}
            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              {breadcrumbSegments.length > 0 && (
                <div className="mb-3">
                  <FolderBreadcrumb
                    segments={breadcrumbSegments}
                    onNavigate={(id) => { setActiveFolderId(id); }}
                  />
                </div>
              )}

              {/* Folder cards — click to navigate into a subfolder */}
              {visibleSubfolders.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-4">
                  {visibleSubfolders.map((folder) => (
                    <button
                      key={folder.id}
                      type="button"
                      onClick={() => setActiveFolderId(folder.id)}
                      className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-md border border-border-subtle bg-bg-sunken/40 hover:bg-bg-raised hover:border-border-default transition-colors aspect-square text-center group"
                    >
                      <FolderOpen className="h-7 w-7 text-text-tertiary group-hover:text-accent transition-colors shrink-0" />
                      <span className="text-[11px] text-text-secondary group-hover:text-text-primary transition-colors truncate w-full px-1">
                        {folder.name}
                      </span>
                      {(folder._count?.assets ?? 0) > 0 && (
                        <span className="text-[10px] text-text-tertiary tabular-nums">
                          {folder._count!.assets}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

          {/* Grid toolbar: Select All + Download All */}
          {!assetsLoading && filteredAssets.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => {
                  if (selectedIds.size === filteredAssets.length) {
                    clearSelection();
                  } else {
                    setSelectedIds(new Set(filteredAssets.map((a) => a.id)));
                  }
                }}
              >
                {selectedIds.size === filteredAssets.length && filteredAssets.length > 0
                  ? t('mediaCollab.deselectAll', 'Deselect All')
                  : t('mediaCollab.selectAll', 'Select All')}
                <span className="ml-1.5 tabular-nums text-text-tertiary">
                  ({filteredAssets.length})
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                disabled={bulkDownloadMutation.isPending}
                onClick={() =>
                  bulkDownloadMutation.mutateAsync(filteredAssets.map((a) => a.id))
                }
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                {t('mediaCollab.downloadAll', 'Download All')}
                <span className="ml-1.5 tabular-nums text-text-tertiary">
                  ({Math.min(filteredAssets.length, BULK_DOWNLOAD_LIMIT)}
                  {filteredAssets.length > BULK_DOWNLOAD_LIMIT && ` / ${filteredAssets.length}`})
                </span>
              </Button>
            </div>
          )}

          {assetsLoading ? (
            <div className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="mb-3 break-inside-avoid rounded-md"
                  style={{ aspectRatio: i % 3 === 0 ? '3/4' : i % 3 === 1 ? '4/3' : '1/1' }}
                />
              ))}
            </div>
          ) : filteredAssets.length === 0 ? (
            <UploadZone onPick={() => fileInputRef.current?.click()} />
          ) : (
            <div
              className="columns-2 sm:columns-3 lg:columns-4 xl:columns-5 gap-3"
              style={{ overflowAnchor: 'none' }}
            >
              {filteredAssets.map((asset, index) => (
                <AssetTile
                  key={asset.id}
                  asset={asset}
                  mediaToken={mediaToken}
                  isSelected={selectedIds.has(asset.id)}
                  onSelect={(shiftKey) => toggleSelect(asset.id, index, shiftKey)}
                  onClick={() => {
                    if (asset.mediaType === 'VIDEO') {
                      setVideoReviewAsset(asset);
                    } else {
                      setLightboxAsset(asset);
                    }
                  }}
                  onStarChange={(rating) =>
                    starRatingMutation.mutate({ assetId: asset.id, rating })
                  }
                />
              ))}
            </div>
          )}
            </div>{/* end flex-1 right column */}
          </div>{/* end flex gap-5 sidebar+grid */}
        </GlassPanel>
      </section>

      {/* Collections — folder-like groupings. */}
      <section className="order-4 md:order-4 mb-10">
        <GlassPanel surface="glass" padding="lg">
          <div className="mb-5 flex items-baseline justify-between gap-4">
            <div>
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('mediaCollab.collections', 'Koleksi')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {collectionsLoading
                  ? t('common.loading', 'Loading…')
                  : t('mediaCollab.collectionCount', '{{count}} collections', { count: collections.length })}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => setNewCollectionDialogOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('mediaCollections.new', 'New Collection')}
            </Button>
          </div>

          {collectionsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : collections.length === 0 ? (
            <EmptyState
              icon={<Folder className="h-12 w-12" />}
              title={t('mediaCollab.noCollections', 'Belum ada koleksi')}
              description={t('mediaCollab.noCollectionsDesc', 'Buat koleksi untuk mengelompokkan aset berdasarkan tema, rilis, atau klien.')}
            />
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {collections.map((c) => (
                <CollectionRow
                  key={c.id}
                  collection={c}
                  onOpen={() => navigate(`/collections/${c.id}`)}
                />
              ))}
            </ul>
          )}
        </GlassPanel>
      </section>

      </div>{/* end flex-col order wrapper */}

      {/* ───────────────────────────────────────────────────────────
          Asset detail sheet — right-side drawer. Preview + status
          actions + comment thread.
         ─────────────────────────────────────────────────────────── */}
      <Sheet
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
      >
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl bg-bg-base border-border-default text-text-primary p-0 overflow-y-auto"
        >
          {selectedAsset && (
            <>
              <SheetHeader className="border-b border-border-subtle p-5">
                {/* Prev/next navigation across the filtered list */}
                <div className="flex items-center gap-1 mb-2">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-text-tertiary hover:text-text-primary"
                    onClick={() => gotoAdjacentAsset(-1)}
                    disabled={!adjacency.hasPrev}
                    aria-label={t('mediaReview.prevAsset', 'Previous asset')}
                    title={t('mediaReview.prevAsset', 'Previous asset')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-text-tertiary hover:text-text-primary"
                    onClick={() => gotoAdjacentAsset(1)}
                    disabled={!adjacency.hasNext}
                    aria-label={t('mediaReview.nextAsset', 'Next asset')}
                    title={t('mediaReview.nextAsset', 'Next asset')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
                <SheetTitle className="text-text-primary text-base font-display font-semibold truncate pr-8">
                  {selectedAsset.originalName}
                </SheetTitle>
                <SheetDescription className="text-text-tertiary text-xs">
                  {t('mediaCollab.uploaded', 'Diunggah')}{' '}
                  <DateDisplay date={selectedAsset.uploadedAt} className="text-text-secondary" />
                  {selectedAsset.uploader?.name && (
                    <> {t('mediaCollab.by', 'oleh')} <span className="text-text-secondary">{selectedAsset.uploader.name}</span></>
                  )}
                </SheetDescription>
              </SheetHeader>

              <div className="p-5 space-y-5">
                {/* Preview */}
                <div className="rounded-md bg-bg-sunken border border-border-subtle overflow-hidden relative group/preview">
                  {selectedAsset.mediaType === 'VIDEO' ? (
                    <button
                      type="button"
                      className="aspect-video flex flex-col items-center justify-center gap-2 text-text-tertiary w-full hover:bg-bg-sunken/80 transition-colors"
                      onClick={() => { setVideoReviewAsset(selectedAsset); setSelectedAsset(null); }}
                    >
                      <div className="rounded-full bg-bg-base/80 p-4 border border-border-subtle">
                        <Play className="h-8 w-8 fill-text-primary text-text-primary" />
                      </div>
                      <span className="text-xs">{t('mediaCollab.openVideoReview', 'Open Video Review')}</span>
                    </button>
                  ) : selectedAsset.thumbnailUrl || selectedAsset.url ? (
                    <>
                      <img
                        src={getProxyUrl(
                          selectedAsset.thumbnailUrl || selectedAsset.url,
                          mediaToken,
                        )}
                        alt={selectedAsset.originalName}
                        className="w-full max-h-[360px] object-contain bg-black"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      {/* Lightbox button — hover reveal */}
                      <button
                        type="button"
                        onClick={() => setLightboxAsset(selectedAsset)}
                        className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/30 transition-colors opacity-0 group-hover/preview:opacity-100"
                        title={t('mediaReview.lightbox.open', 'Open lightbox')}
                      >
                        <div className="rounded-full bg-bg-base/80 p-2.5 border border-border-subtle backdrop-blur-sm">
                          <ZoomIn className="h-4 w-4 text-text-primary" />
                        </div>
                      </button>
                    </>
                  ) : (
                    <div className="aspect-square flex items-center justify-center text-text-tertiary">
                      <ImageIcon className="h-10 w-10 stroke-1" />
                    </div>
                  )}
                </div>

                {/* Star rating in sheet */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-tertiary">
                    {t('mediaReview.yourRating', 'Rating')}
                  </span>
                  <StarRating
                    value={selectedAsset.starRating ?? 0}
                    onChange={(rating) =>
                      starRatingMutation.mutate({ assetId: selectedAsset.id, rating })
                    }
                    size="md"
                  />
                  {(selectedAsset.starRating ?? 0) > 0 && (
                    <span className="text-xs text-text-tertiary">
                      {selectedAsset.starRating}/5
                    </span>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                      assetStatusChip(selectedAsset.status),
                    )}
                  >
                    {t(`mediaCollab.assetStatus.${selectedAsset.status}`, ASSET_STATUS_LABEL[selectedAsset.status] ?? selectedAsset.status)}
                  </Badge>
                </div>

                {/* Full metadata panel */}
                <MetadataPanel asset={selectedAsset} />

                {/* Status actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      statusMutation.mutate({
                        id: selectedAsset.id,
                        status: 'IN_REVIEW',
                      })
                    }
                    disabled={selectedAsset.status === 'IN_REVIEW'}
                  >
                    <Eye className="h-3.5 w-3.5" /> {t('mediaCollab.markReview', 'Tandai Review')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      statusMutation.mutate({
                        id: selectedAsset.id,
                        status: 'APPROVED',
                      })
                    }
                    disabled={selectedAsset.status === 'APPROVED'}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t('mediaCollab.approve', 'Setujui')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-text-tertiary hover:text-text-primary"
                        aria-label={t('mediaCollab.moreActions', 'Tindakan lain')}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedAsset.id,
                            status: 'NEEDS_CHANGES',
                          })
                        }
                      >
                        {t('mediaCollab.requestChanges', 'Minta Revisi')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          statusMutation.mutate({
                            id: selectedAsset.id,
                            status: 'ARCHIVED',
                          })
                        }
                      >
                        {t('mediaCollab.archive', 'Arsipkan')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteAssetTarget(selectedAsset)}
                        className="text-danger focus:text-danger"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t('mediaCollab.delete', 'Hapus')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Comments */}
                <div className="pt-2">
                  <div className="flex items-center gap-2 mb-3 text-text-secondary">
                    <MessageCircle className="h-4 w-4" />
                    <h3 className="text-sm font-medium">
                      {t('mediaCollab.comments', 'Komentar')}
                      <span className="text-text-tertiary font-normal ml-1.5">
                        ({assetComments.length})
                      </span>
                    </h3>
                  </div>

                  <CommentList
                    comments={assetComments}
                    onResolve={(id) => resolveCommentMutation.mutate(id)}
                    resolvePending={resolveCommentMutation.isPending}
                  />

                  <CommentComposer
                    onSubmit={(text) => addCommentMutation.mutate(text)}
                    isPending={addCommentMutation.isPending}
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ───────────────────────────────────────────────────────────
          Share sheet — toggle public sharing + copyable link.
         ─────────────────────────────────────────────────────────── */}
      <Sheet open={shareSheetOpen} onOpenChange={setShareSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-md bg-bg-base border-border-default text-text-primary p-0"
        >
          <SheetHeader className="border-b border-border-subtle p-5">
            <SheetTitle className="text-text-primary text-base font-display font-semibold">
              {t('mediaCollab.shareProject', 'Bagikan Proyek')}
            </SheetTitle>
            <SheetDescription className="text-text-tertiary text-xs">
              {t('mediaCollab.shareDesc', 'Aktifkan tautan publik agar klien bisa melihat dan memberi komentar tanpa login.')}
            </SheetDescription>
          </SheetHeader>

          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between gap-3 p-4 rounded-md bg-bg-sunken border border-border-subtle">
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">
                  {t('mediaCollab.publicLink', 'Tautan Publik')}
                </div>
                <div className="text-xs text-text-tertiary mt-0.5">
                  {project.isPublic
                    ? t('mediaCollab.anyoneWithLink', 'Siapa pun dengan tautan dapat melihat.')
                    : t('mediaCollab.noPublicAccess', 'Tidak ada akses publik.')}
                </div>
              </div>
              {project.isPublic ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disableShareMutation.mutate()}
                  disabled={disableShareMutation.isPending}
                >
                  <X className="h-3.5 w-3.5" /> {t('mediaCollab.disable', 'Nonaktifkan')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => enableShareMutation.mutate(shareExpiry ? shareExpiry.toISOString() : undefined)}
                  disabled={enableShareMutation.isPending}
                >
                  <Globe className="h-3.5 w-3.5" /> {t('mediaCollab.enable', 'Aktifkan')}
                </Button>
              )}
            </div>

            {shareUrl && (
              <div className="space-y-3">
                {/* Permission label */}
                <div className="flex items-center gap-2 p-3 rounded-md bg-bg-sunken border border-border-subtle">
                  <Eye className="h-4 w-4 text-text-tertiary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-text-primary">
                      {project.publicAccessLevel === 'DOWNLOAD'
                        ? t('mediaCollab.accessLevelDownload', 'View + Download')
                        : project.publicAccessLevel === 'COMMENT'
                        ? t('mediaCollab.accessLevelComment', 'View + Comment')
                        : t('mediaCollab.accessLevelViewOnly', 'View-only link')}
                    </div>
                    <div className="text-[11px] text-text-tertiary mt-0.5">
                      {t('mediaCollab.accessLevelNote', 'Anyone with this link can view without signing in.')}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-text-tertiary uppercase tracking-wider block mb-1.5">
                    URL
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 min-w-0">
                      <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
                      <Input
                        readOnly
                        value={shareUrl}
                        className="pl-8 bg-bg-sunken border-border-subtle text-text-secondary text-xs font-mono"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                    </div>
                    <Button size="sm" onClick={copyShareLink}>
                      <Copy className="h-3.5 w-3.5" /> {t('mediaCollab.copy', 'Salin')}
                    </Button>
                  </div>
                </div>

                {project.publicViewCount !== undefined && (
                  <div className="text-xs text-text-tertiary">
                    {t('mediaCollab.viewCountSoFar', '{{n}} views so far', { n: project.publicViewCount.toLocaleString('id-ID') })}
                  </div>
                )}

                {/* Link expiry */}
                <div className="rounded-md border border-border-subtle bg-bg-sunken/60 p-3 space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                    {t('mediaCollab.expiryLabel', 'Link expiry')}
                  </div>
                  {project.publicShareExpiresAt ? (
                    <p className="text-xs text-text-secondary">
                      {t('mediaCollab.expiresOn', 'Expires on')}{' '}
                      <DateDisplay date={project.publicShareExpiresAt} className="text-text-primary" />
                    </p>
                  ) : (
                    <p className="text-xs text-text-tertiary">
                      {t('mediaCollab.noExpiry', 'No expiry — the link stays active until disabled.')}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <MonomiDatePicker
                      value={shareExpiry}
                      onChange={(d) => setShareExpiry(d)}
                      placeholder={t('mediaCollab.setExpiry', 'Set expiry date')}
                      className="bg-bg-base border-border-subtle text-text-primary"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!shareExpiry || enableShareMutation.isPending}
                      onClick={() => enableShareMutation.mutate(shareExpiry ? shareExpiry.toISOString() : null)}
                    >
                      {t('mediaCollab.applyExpiry', 'Apply')}
                    </Button>
                    {project.publicShareExpiresAt && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-text-tertiary hover:text-text-primary"
                        disabled={enableShareMutation.isPending}
                        onClick={() => { setShareExpiry(undefined); enableShareMutation.mutate(null); }}
                      >
                        {t('mediaCollab.clearExpiry', 'Clear')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Collaborators / invite client */}
            <CollaboratorsSection
              collaborators={collaborators}
              loading={collaboratorsLoading}
              onInvite={(data) => inviteGuestMutation.mutateAsync(data)}
              onRevoke={(id) => revokeCollaboratorMutation.mutateAsync(id)}
              inviting={inviteGuestMutation.isPending}
              revokingId={revokeCollaboratorMutation.isPending ? revokeCollaboratorMutation.variables : null}
            />
          </div>
        </SheetContent>
      </Sheet>
      {/* Bulk action floating bar */}
      <BulkActionBar
        selectedCount={selectedIds.size}
        onClearSelection={clearSelection}
        onBulkRate={async (rating) => {
          await bulkRateMutation.mutateAsync({ ids: Array.from(selectedIds), rating });
        }}
        onBulkDownload={async () => {
          await bulkDownloadMutation.mutateAsync(Array.from(selectedIds));
        }}
        onBulkDelete={async () => {
          await bulkDeleteMutation.mutateAsync(Array.from(selectedIds));
        }}
        onMoveToFolder={() => setMoveDialogOpen(true)}
        onCompare={() => setCompareOpen(true)}
        isRating={bulkRateMutation.isPending}
        isDownloading={bulkDownloadMutation.isPending}
        isDeleting={bulkDeleteMutation.isPending}
      />

      {/* Move-to-folder dialog */}
      <MoveToFolderDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        folders={folderTree}
        assetCount={selectedIds.size}
        onMove={async (targetFolderId) => {
          await moveAssetsMutation.mutateAsync(targetFolderId);
        }}
      />

      {/* New collection dialog */}
      <NewCollectionDialog
        open={newCollectionDialogOpen}
        onOpenChange={setNewCollectionDialogOpen}
        onSubmit={async (data) => {
          await createCollectionMutation.mutateAsync(data);
        }}
      />

      {/* Upload queue — fixed bottom-right panel so uploads never cause page scroll */}
      {uploadQueue.length > 0 && (
        <div className="fixed bottom-24 right-4 z-40 w-72 rounded-lg border border-border-subtle bg-bg-raised shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-bg-sunken/60">
            <span className="text-[10px] uppercase tracking-[0.14em] font-medium text-text-tertiary">
              {t('mediaCollab.uploadQueue', 'Upload Queue')}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-text-tertiary tabular-nums">
                {uploadQueue.filter((it) => it.status === 'done').length} / {uploadQueue.length}
              </span>
              {/* Retry All — shown when there are failures and nothing is actively uploading */}
              {uploadQueue.some((it) => it.status === 'error') &&
               !uploadQueue.some((it) => it.status === 'uploading' || it.status === 'queued') && (
                <button
                  type="button"
                  onClick={retryAllFailed}
                  className="text-[10px] font-medium text-danger hover:text-danger/70 transition-colors"
                  title={t('mediaCollab.retryAll', 'Retry all failed uploads')}
                >
                  {t('mediaCollab.retryAll', 'Retry All')}
                </button>
              )}
              {uploadQueue.every((it) => it.status === 'done' || it.status === 'error') && (
                <button
                  type="button"
                  onClick={() => setUploadQueue([])}
                  className="text-text-tertiary hover:text-text-primary transition-colors"
                  title={t('mediaCollab.clearQueue', 'Clear')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto divide-y divide-border-subtle">
            {uploadQueue.map((item, idx) => (
              <div key={item.id} className="flex items-center gap-3 px-3 py-2.5">
                <span className="shrink-0 text-[10px] tabular-nums text-text-tertiary w-5 text-center">
                  {idx + 1}
                </span>
                <div className="shrink-0 w-5 flex items-center justify-center">
                  {item.status === 'queued' && (
                    <div className="h-2 w-2 rounded-full bg-text-tertiary/40" />
                  )}
                  {item.status === 'uploading' && (
                    <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                  )}
                  {item.status === 'done' && (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  )}
                  {item.status === 'error' && (
                    <X className="h-3.5 w-3.5 text-danger" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs truncate text-text-primary" title={item.name}>
                      {item.name}
                    </span>
                    <span className={cn(
                      'text-[10px] shrink-0 tabular-nums',
                      item.status === 'error' ? 'text-danger' :
                      item.status === 'done' ? 'text-success' :
                      item.status === 'uploading' ? 'text-accent' : 'text-text-tertiary',
                    )}>
                      {item.status === 'queued' && t('mediaCollab.statusQueued', 'Waiting')}
                      {item.status === 'uploading' && `${item.progress}%`}
                      {item.status === 'done' && t('mediaCollab.statusDone', 'Done')}
                      {item.status === 'error' && t('mediaCollab.statusError', 'Failed')}
                    </span>
                  </div>
                  {item.status === 'uploading' && (
                    <div className="mt-1 w-full bg-bg-base rounded-full h-1 overflow-hidden">
                      <div
                        className="h-1 bg-accent rounded-full transition-all duration-200"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-danger truncate" title={item.error}>
                        {item.error}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 px-1.5 text-[10px] text-danger hover:bg-danger/10 shrink-0"
                        onClick={() => retryUpload(item.id)}
                      >
                        {t('mediaCollab.retry', 'Retry')}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox — full-screen viewer opened by clicking a tile */}
      {lightboxAsset && (
        <LightboxOverlay
          src={getProxyUrl(
            lightboxAsset.url || lightboxAsset.thumbnailUrl || '',
            mediaToken,
          )}
          alt={lightboxAsset.originalName}
          downloadUrl={getProxyUrl(lightboxAsset.url, mediaToken)}
          onClose={() => setLightboxAsset(null)}
          hasPrev={lightboxAdjacency.hasPrev}
          hasNext={lightboxAdjacency.hasNext}
          onPrev={() => gotoAdjacentLightboxAsset(-1)}
          onNext={() => gotoAdjacentLightboxAsset(1)}
          position={lightboxAdjacency.position}
          infoPanel={(
            <div className="p-4 space-y-5">
              {/* Star rating */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/40 mb-2">
                  {t('mediaReview.yourRating', 'Rating')}
                </p>
                <div className="flex items-center gap-3">
                  <StarRating
                    value={lightboxAsset.starRating ?? 0}
                    onChange={(rating) =>
                      starRatingMutation.mutate({ assetId: lightboxAsset.id, rating })
                    }
                    size="md"
                  />
                  {(lightboxAsset.starRating ?? 0) > 0 && (
                    <span className="text-xs text-white/40 tabular-nums">
                      {lightboxAsset.starRating}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-white/10" />

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-3.5 w-3.5 text-white/40" />
                  <span className="text-[10px] uppercase tracking-wider text-white/40">
                    {t('mediaCollab.comments', 'Komentar')}
                    {lightboxComments.length > 0 && (
                      <span className="ml-1">({lightboxComments.length})</span>
                    )}
                  </span>
                </div>
                <LightboxCommentList
                  comments={lightboxComments}
                  onResolve={(id) => lightboxResolveCommentMutation.mutate(id)}
                  resolvePending={lightboxResolveCommentMutation.isPending}
                />
                <LightboxCommentComposer
                  onSubmit={(text) => lightboxAddCommentMutation.mutate(text)}
                  isPending={lightboxAddCommentMutation.isPending}
                />
              </div>
            </div>
          )}
        />
      )}

      {/* Video review modal */}
      {videoReviewAsset && (
        <VideoReviewModal
          asset={videoReviewAsset}
          mediaToken={mediaToken}
          onClose={() => setVideoReviewAsset(null)}
          onPrev={() => {
            const idx = filteredAssets.findIndex((a) => a.id === videoReviewAsset.id);
            const prev = filteredAssets.slice(0, idx).reverse().find((a) => a.mediaType === 'VIDEO');
            if (prev) setVideoReviewAsset(prev);
          }}
          onNext={() => {
            const idx = filteredAssets.findIndex((a) => a.id === videoReviewAsset.id);
            const next = filteredAssets.slice(idx + 1).find((a) => a.mediaType === 'VIDEO');
            if (next) setVideoReviewAsset(next);
          }}
          onStarChange={(assetId, rating) =>
            starRatingMutation.mutate({ assetId, rating })
          }
        />
      )}

      {/* Comparison overlay */}
      {compareOpen && selectedIds.size >= 2 && selectedIds.size <= 4 && (
        <ComparisonView
          assets={assets.filter((a) => selectedIds.has(a.id))}
          mediaToken={mediaToken}
          onClose={() => setCompareOpen(false)}
        />
      )}

      {/* Delete-asset confirm — styled in place of window.confirm */}
      <Dialog
        open={!!deleteAssetTarget}
        onOpenChange={(open) => !open && setDeleteAssetTarget(null)}
      >
        <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-text-primary font-display">
              {t('mediaCollab.confirmDeleteAssetTitle', 'Hapus aset?')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary text-sm">
              {t('mediaCollab.confirmDeleteAsset', 'Hapus "{{name}}"?', {
                name: deleteAssetTarget?.originalName ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteAssetTarget(null)}>
              {t('common.cancel', 'Batal')}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteAssetTarget) deleteAssetMutation.mutate(deleteAssetTarget.id);
                setDeleteAssetTarget(null);
              }}
              disabled={deleteAssetMutation.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('mediaCollab.delete', 'Hapus')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Duplicate-file resolution dialog ── */}
      {duplicateDialog && (
        <Dialog
          open={!!duplicateDialog}
          onOpenChange={(open) => { if (!open) setDuplicateDialog(null); }}
        >
          <DialogContent className="max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{t('mediaCollab.duplicateTitle', 'Files Already Exist')}</DialogTitle>
              <DialogDescription>
                {t(
                  'mediaCollab.duplicateDesc',
                  '{{n}} file(s) already exist in this folder. Choose how to handle them.',
                  { n: Object.keys(duplicateDialog.duplicates).length },
                )}
              </DialogDescription>
            </DialogHeader>

            {/* Resolution options */}
            <div className="flex flex-col gap-2">
              {(['skip', 'replace', 'keep-both'] as const).map((opt) => {
                const label = opt === 'skip' ? t('mediaCollab.conflictSkip', 'Skip') : opt === 'replace' ? t('mediaCollab.conflictReplace', 'Replace') : t('mediaCollab.conflictKeepBoth', 'Keep Both');
                const desc = opt === 'skip'
                  ? t('mediaCollab.conflictSkipDesc', 'Do not upload files that already exist.')
                  : opt === 'replace'
                  ? t('mediaCollab.conflictReplaceDesc', 'Delete existing file and upload the new one.')
                  : t('mediaCollab.conflictKeepBothDesc', 'Rename the new file with a timestamp suffix.');
                return (
                  <label
                    key={opt}
                    className={cn(
                      'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                      duplicateResolution === opt
                        ? 'border-accent bg-accent/5'
                        : 'border-border-subtle hover:border-border-default',
                    )}
                  >
                    <input
                      type="radio"
                      name="conflictResolution"
                      value={opt}
                      checked={duplicateResolution === opt}
                      onChange={() => setDuplicateResolution(opt)}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <div className="text-sm font-medium text-text-primary">{label}</div>
                      <div className="text-xs text-text-tertiary mt-0.5">{desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* List of conflicting files */}
            <div className="rounded-md border border-border-subtle bg-bg-sunken/40 divide-y divide-border-subtle max-h-[180px] overflow-y-auto">
              {Object.values(duplicateDialog.duplicates).map((dup) => (
                <div key={dup.id} className="px-3 py-2 flex items-center gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-text-primary truncate">{dup.originalName}</div>
                    <div className="text-[11px] text-text-tertiary">
                      {formatBytes(Number(dup.size))} · {t('mediaCollab.uploadedBy', 'by')} {dup.uploadedBy}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Count of non-duplicate files that will always upload */}
            {duplicateDialog.pendingFiles.filter((f) => !duplicateDialog.duplicates[f.name]).length > 0 && (
              <p className="text-xs text-text-tertiary">
                {t(
                  'mediaCollab.newFilesAlwaysUpload',
                  '{{n}} new file(s) will always be uploaded.',
                  { n: duplicateDialog.pendingFiles.filter((f) => !duplicateDialog.duplicates[f.name]).length },
                )}
              </p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDuplicateDialog(null)}>
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button
                onClick={async () => {
                  const { pendingFiles, duplicates } = duplicateDialog;
                  setDuplicateDialog(null);
                  await startUploadBatch(pendingFiles, duplicates, duplicateResolution);
                }}
              >
                {t('mediaCollab.confirmUpload', 'Confirm Upload')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </MediaShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components — kept in-file (no new shared primitives).          */
/* ------------------------------------------------------------------ */

interface AssetTileProps {
  asset: MediaAsset;
  mediaToken: string | null;
  isSelected: boolean;
  onSelect: (shiftKey: boolean) => void;
  onClick: () => void;
  onStarChange: (rating: number) => void;
}

function AssetTile({
  asset,
  mediaToken,
  isSelected,
  onSelect,
  onClick,
  onStarChange,
}: AssetTileProps) {
  const { t } = useTranslation();
  const isVideo = asset.mediaType === 'VIDEO';
  // Grid tiles only ever load the thumbnail — never the full original.
  // Assets without a thumbnailUrl show a placeholder icon instead.
  const src = asset.thumbnailUrl ?? null;
  const proxied = src ? getProxyUrl(src, mediaToken) : null;

  // Derive aspect ratio from metadata so placeholder matches real image before load
  const aspectStyle = asset.width && asset.height
    ? { aspectRatio: `${asset.width} / ${asset.height}` }
    : undefined;

  return (
    <div
      className={cn(
        'group relative rounded-md overflow-hidden break-inside-avoid mb-3',
        'bg-bg-sunken border transition-colors',
        isSelected
          ? 'border-accent ring-2 ring-accent/40'
          : 'border-border-subtle hover:border-border-default',
      )}
    >
      {/* Clickable image / placeholder area */}
      <button
        type="button"
        onClick={onClick}
        className="block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy/40"
        aria-label={asset.originalName}
      >
        {proxied ? (
          <img
            src={proxied}
            alt={asset.originalName}
            loading="lazy"
            style={aspectStyle}
            className="w-full block object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            className="flex items-center justify-center text-text-tertiary"
            style={aspectStyle ?? { aspectRatio: '4/3' }}
          >
            {isVideo ? <Film className="h-8 w-8 stroke-1" /> : <ImageIcon className="h-8 w-8 stroke-1" />}
          </div>
        )}
      </button>

      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
          <div className="rounded-full bg-bg-base/80 backdrop-blur-sm p-2.5 border border-border-subtle">
            <Play className="h-4 w-4 text-text-primary fill-text-primary" />
          </div>
        </div>
      )}

      {/* Selection checkbox — top-right, appears on hover or when selected */}
      <div
        className={cn(
          'absolute top-1.5 right-1.5 transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
      >
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => { e.stopPropagation(); onSelect(e.shiftKey); }}
          className={cn(
            'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
            isSelected
              ? 'bg-accent border-accent text-white'
              : 'bg-bg-base/80 border-border-default backdrop-blur-sm text-transparent',
          )}
          aria-label={isSelected ? t('mediaReview.deselect', 'Deselect') : t('mediaReview.select', 'Select')}
          title={t('mediaReview.shiftClickHint', 'Shift-click to select a range')}
        >
          {isSelected && (
            <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Status pill — top-left */}
      {asset.status && asset.status !== 'DRAFT' && (
        <div className="absolute left-1.5 top-1.5">
          <Badge
            variant="outline"
            className={cn(
              'border-transparent px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider backdrop-blur-sm',
              assetStatusChip(asset.status),
            )}
          >
            {t(`mediaCollab.assetStatus.${asset.status}`, ASSET_STATUS_LABEL[asset.status] ?? asset.status)}
          </Badge>
        </div>
      )}

      {/* Bottom overlay — filename + star rating */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 via-black/30 to-transparent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <div className="text-[10px] text-white/90 font-medium truncate mb-0.5">
          {asset.originalName}
        </div>
        {/* Star rating — stops propagation so it doesn't open the sheet */}
        <div onClick={(e) => e.stopPropagation()}>
          <StarRating
            value={asset.starRating ?? 0}
            onChange={onStarChange}
            size="sm"
          />
        </div>
      </div>
    </div>
  );
}

function UploadZone({ onPick }: { onPick: () => void }) {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        'rounded-md border-2 border-dashed border-border-subtle',
        'bg-bg-sunken/40 px-6 py-16 text-center',
      )}
    >
      <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-bg-raised border border-border-subtle flex items-center justify-center text-text-tertiary">
        <Upload className="h-5 w-5" />
      </div>
      <h3 className="text-base font-display font-semibold text-text-primary">
        {t('mediaCollab.noAssets', 'Belum ada aset')}
      </h3>
      <p className="mt-2 text-sm text-text-secondary max-w-md mx-auto">
        {t('mediaCollab.noAssetsDesc', 'Unggah foto atau video pertama untuk mulai berkolaborasi dengan tim.')}
      </p>
      <Button onClick={onPick} size="sm" className="mt-5">
        <Upload className="h-4 w-4" /> {t('mediaCollab.pickFile', 'Pilih File')}
      </Button>
    </div>
  );
}

function CollectionRow({ collection, onOpen }: { collection: MediaCollection; onOpen: () => void }) {
  const { t } = useTranslation();
  return (
    <li
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={t('mediaCollab.openCollection', 'Open collection "{{name}}"', { name: collection.name })}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-md bg-bg-sunken/40 border border-border-subtle',
        'hover:bg-bg-sunken hover:border-border-default transition-colors cursor-pointer',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy/40',
      )}
    >
      <div className="shrink-0 mt-0.5 h-8 w-8 rounded-md bg-bg-raised border border-border-subtle flex items-center justify-center">
        <Folder className="h-4 w-4 text-text-tertiary group-hover:text-text-secondary transition-colors" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-sm font-medium text-text-primary truncate">
            {collection.name}
          </div>
          {collection.type === 'SMART' && (
            <Badge
              variant="outline"
              className="border-transparent bg-accent-navy-wash text-text-secondary px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider"
            >
              Smart
            </Badge>
          )}
        </div>
        <div className="text-xs text-text-tertiary mt-0.5">
          {t('mediaCollab.collectionAssetCount', '{{count}} assets', { count: collection._count?.assets ?? 0 })}
        </div>
      </div>
    </li>
  );
}

type InviteRole = 'VIEWER' | 'COMMENTER' | 'EDITOR';

function CollaboratorsSection({
  collaborators,
  loading,
  onInvite,
  onRevoke,
  inviting,
  revokingId,
}: {
  collaborators: MediaCollaborator[];
  loading: boolean;
  onInvite: (data: { email: string; name: string; role: InviteRole }) => Promise<unknown>;
  onRevoke: (collaboratorId: string) => Promise<unknown>;
  inviting: boolean;
  revokingId: string | null;
}) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<InviteRole>('VIEWER');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    if (!trimmedEmail) {
      toast.error(t('mediaCollab.inviteEmailRequired', 'Email wajib diisi.'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      toast.error(t('mediaCollab.inviteEmailInvalid', 'Enter a valid email address.'));
      return;
    }
    try {
      await onInvite({
        email: trimmedEmail,
        name: trimmedName || trimmedEmail,
        role,
      });
      setEmail('');
      setName('');
      setRole('VIEWER');
    } catch {
      /* error toast handled by mutation */
    }
  };

  return (
    <div className="space-y-3 border-t border-border-subtle pt-5">
      <div className="flex items-center gap-2 text-text-secondary">
        <Users className="h-4 w-4" />
        <h3 className="text-sm font-medium">
          {t('mediaCollab.collaborators', 'Kolaborator')}
          {!loading && (
            <span className="text-text-tertiary font-normal ml-1.5">
              ({collaborators.length})
            </span>
          )}
        </h3>
      </div>

      {/* Existing collaborators */}
      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 rounded-md" />
          <Skeleton className="h-12 rounded-md" />
        </div>
      ) : collaborators.length === 0 ? (
        <p className="text-xs text-text-tertiary">
          {t('mediaCollab.noCollaborators', 'Belum ada kolaborator. Undang klien atau anggota tim di bawah ini.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {collaborators.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 p-3 rounded-md bg-bg-sunken border border-border-subtle"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-[10px] font-medium">
                  {initialsOf(c.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-text-primary truncate">
                  {c.user?.name || c.user?.email || t('mediaCollab.unknownUser', 'Tidak diketahui')}
                </div>
                {c.user?.email && (
                  <div className="text-[11px] text-text-tertiary truncate">{c.user.email}</div>
                )}
              </div>
              <Badge
                variant="outline"
                className="border-transparent bg-accent-navy-wash text-text-secondary px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider shrink-0"
              >
                {c.role}
              </Badge>
              {c.role !== CollaboratorRole.OWNER && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-danger shrink-0"
                  onClick={() => onRevoke(c.id)}
                  disabled={revokingId === c.id}
                  aria-label={t('mediaCollab.revokeAccess', 'Cabut akses')}
                  title={t('mediaCollab.revokeAccess', 'Cabut akses')}
                >
                  {revokingId === c.id
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : <X className="h-3.5 w-3.5" />}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Invite form */}
      <form
        onSubmit={handleInvite}
        className="space-y-2.5 rounded-md border border-border-subtle bg-bg-sunken/60 p-3"
      >
        <div className="flex items-center gap-2 text-text-secondary">
          <UserPlus className="h-3.5 w-3.5" />
          <span className="text-xs font-medium">
            {t('mediaCollab.inviteClient', 'Undang klien / kolaborator')}
          </span>
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('mediaCollab.inviteEmailPlaceholder', 'email@klien.com')}
            className="pl-8 bg-bg-base border-border-subtle text-text-primary placeholder:text-text-tertiary text-xs"
          />
        </div>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('mediaCollab.inviteNamePlaceholder', 'Nama (opsional)')}
          className="bg-bg-base border-border-subtle text-text-primary placeholder:text-text-tertiary text-xs"
        />
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={(v) => setRole(v as InviteRole)}>
            <SelectTrigger className="bg-bg-base border-border-subtle text-text-primary text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-bg-raised border-border-subtle">
              <SelectItem value="VIEWER">{t('mediaCollab.roleViewer', 'Penonton')}</SelectItem>
              <SelectItem value="COMMENTER">{t('mediaCollab.roleCommenter', 'Pengomentar')}</SelectItem>
              <SelectItem value="EDITOR">{t('mediaCollab.roleEditor', 'Editor')}</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={inviting || !email.trim()}>
            {inviting
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <><UserPlus className="h-3.5 w-3.5" /> {t('mediaCollab.invite', 'Undang')}</>}
          </Button>
        </div>
      </form>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-0.5">
        {label}
      </div>
      <div className="text-sm text-text-secondary">{value}</div>
    </div>
  );
}

interface CommentListProps {
  comments: Array<{
    id: string;
    content: string;
    createdAt: string;
    author: { id: string; name: string; email: string };
    status: 'OPEN' | 'RESOLVED';
  }>;
  onResolve?: (commentId: string) => void;
  resolvePending?: boolean;
}

function CommentList({ comments, onResolve, resolvePending }: CommentListProps) {
  const { t } = useTranslation();
  if (comments.length === 0) {
    return (
      <div className="rounded-md bg-bg-sunken/40 border border-border-subtle px-4 py-6 text-center text-xs text-text-tertiary mb-3">
        {t('mediaCollab.noComments', 'No comments yet.')}
      </div>
    );
  }
  return (
    <ol className="space-y-3 mb-3">
      {comments.map((c) => (
        <li
          key={c.id}
          className="p-3 rounded-md bg-bg-sunken/60 border border-border-subtle"
        >
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-[9px] font-medium">
                  {initialsOf(c.author?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-text-primary truncate">
                {c.author?.name ?? t('mediaCollab.anonymousAuthor', 'Anonymous')}
              </span>
              {c.status === 'RESOLVED' && (
                <Badge
                  variant="outline"
                  className="border-transparent bg-success/10 text-success px-1.5 py-0 text-[9px] font-medium uppercase tracking-wider shrink-0"
                >
                  {t('mediaCollab.resolved', 'Resolved')}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <DateDisplay
                date={c.createdAt}
                className="text-[10px] text-text-tertiary"
              />
              {c.status === 'OPEN' && onResolve && (
                <button
                  type="button"
                  disabled={resolvePending}
                  onClick={() => onResolve(c.id)}
                  className="ml-1 text-[10px] text-text-tertiary hover:text-success transition-colors disabled:opacity-50"
                  title={t('mediaCollab.resolveComment', 'Mark as resolved')}
                >
                  ✓
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line">
            {c.content}
          </p>
        </li>
      ))}
    </ol>
  );
}

function CommentComposer({
  onSubmit,
  isPending,
}: {
  onSubmit: (text: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('mediaCollab.commentPlaceholder', 'Write a comment...')}
        className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary text-xs"
      />
      <Button type="submit" size="sm" disabled={!text.trim() || isPending}>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('mediaCollab.sendComment', 'Send')}
      </Button>
    </form>
  );
}

/* ---------------------------------------------------------------------------
 * Lightbox-specific comment components — dark-themed for use inside the
 * full-screen black overlay panel.
 * --------------------------------------------------------------------------- */

function LightboxCommentList({ comments, onResolve, resolvePending }: CommentListProps) {
  const { t } = useTranslation();
  if (comments.length === 0) {
    return (
      <div className="rounded-md border border-white/10 bg-white/5 px-4 py-5 text-center text-xs text-white/35 mb-3">
        {t('mediaCollab.noComments', 'No comments yet.')}
      </div>
    );
  }
  return (
    <ol className="space-y-2.5 mb-3">
      {comments.map((c) => (
        <li
          key={c.id}
          className="p-3 rounded-md bg-white/5 border border-white/10"
        >
          <div className="flex items-baseline justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar className="h-5 w-5 shrink-0">
                <AvatarFallback className="bg-white/10 text-white/70 text-[9px] font-medium">
                  {initialsOf(c.author?.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-white/80 truncate">
                {c.author?.name ?? t('mediaCollab.anonymousAuthor', 'Anonymous')}
              </span>
              {c.status === 'RESOLVED' && (
                <span className="shrink-0 text-[9px] font-medium uppercase tracking-wider text-emerald-400">
                  ✓ {t('mediaCollab.resolved', 'Resolved')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <DateDisplay date={c.createdAt} className="text-[10px] text-white/30" />
              {c.status === 'OPEN' && onResolve && (
                <button
                  type="button"
                  disabled={resolvePending}
                  onClick={() => onResolve(c.id)}
                  className="ml-1 text-[10px] text-white/30 hover:text-emerald-400 transition-colors disabled:opacity-50"
                  title={t('mediaCollab.resolveComment', 'Mark as resolved')}
                >
                  ✓
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-white/60 leading-relaxed whitespace-pre-line">
            {c.content}
          </p>
        </li>
      ))}
    </ol>
  );
}

function LightboxCommentComposer({
  onSubmit,
  isPending,
}: {
  onSubmit: (text: string) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    onSubmit(value);
    setText('');
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('mediaCollab.commentPlaceholder', 'Write a comment...')}
        className="flex-1 min-w-0 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-colors"
      />
      <button
        type="submit"
        disabled={!text.trim() || isPending}
        className="shrink-0 rounded-md bg-white/10 hover:bg-white/20 disabled:opacity-40 px-3 py-1.5 text-xs text-white font-medium transition-colors"
      >
        {isPending
          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
          : t('mediaCollab.sendComment', 'Send')}
      </button>
    </form>
  );
}
