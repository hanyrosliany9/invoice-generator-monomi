import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface PdfPreviewModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Called once on open; should return a PDF Blob for previewing. */
  fetchPreview: () => Promise<Blob>;
  /** Called when the user clicks Download; may differ from fetchPreview. */
  fetchDownload: () => Promise<Blob>;
  downloadFilename: string;
}

export function PdfPreviewModal({
  open,
  onClose,
  title,
  fetchPreview,
  fetchDownload,
  downloadFilename,
}: PdfPreviewModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load PDF whenever the modal opens.
  useEffect(() => {
    if (!open) return;

    let revoked = false;
    let objectUrl: string | null = null;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await fetchPreview();
        objectUrl = URL.createObjectURL(blob);
        if (!revoked) setPdfUrl(objectUrl);
      } catch (err) {
        if (!revoked) {
          const msg =
            err instanceof Error
              ? err.message
              : t('pdfPreview.loadError', 'Failed to load PDF preview');
          setError(msg);
        }
      } finally {
        if (!revoked) setLoading(false);
      }
    };

    load();

    // Revoke the object URL when the modal closes or the effect re-runs.
    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPdfUrl(null);
      setError(null);
      setLoading(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const blob = await fetchDownload();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = downloadFilename.endsWith('.pdf')
        ? downloadFilename
        : `${downloadFilename}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('pdfPreview.downloadSuccess', 'PDF downloaded successfully'));
    } catch {
      toast.error(t('pdfPreview.downloadError', 'Failed to download PDF'));
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex flex-col gap-0 p-0 max-w-[90vw] w-full"
        style={{ maxWidth: '1200px', height: '90vh' }}
      >
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between gap-4 px-5 py-4 border-b border-border-subtle shrink-0">
          <DialogTitle className="text-sm font-medium text-text-primary truncate">
            {title}
          </DialogTitle>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading || loading}
            >
              <Download className="h-4 w-4" />
              {t('pdfPreview.download', 'Download')}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary"
              aria-label={t('common.close', 'Close')}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* PDF area */}
        <div className="flex-1 min-h-0 relative bg-bg-sunken">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8">
              <Skeleton className="h-full w-full max-w-2xl rounded" />
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="text-center space-y-2 max-w-md">
                <p className="text-sm font-medium text-danger">
                  {t('pdfPreview.loadFailed', 'Failed to load PDF')}
                </p>
                <p className="text-xs text-text-tertiary">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    // Re-trigger by toggling — parent controls open state.
                    // Best-effort: just tell user to retry via Download.
                  }}
                >
                  {t('pdfPreview.downloadInstead', 'Download instead')}
                </Button>
              </div>
            </div>
          )}

          {pdfUrl && !error && (
            <iframe
              src={pdfUrl}
              title={title}
              className="w-full h-full border-0"
            />
          )}

          {!pdfUrl && !loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-sm text-text-tertiary">
                {t('pdfPreview.empty', 'No PDF loaded')}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PdfPreviewModal;
