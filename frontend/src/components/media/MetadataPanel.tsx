import { useTranslation } from 'react-i18next';
import type { MediaAsset, AssetMetadata } from '@/services/media-collab';

const formatBytes = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

interface MetaPanelRowProps {
  label: string;
  value: React.ReactNode;
}

function MetaPanelRow({ label, value }: MetaPanelRowProps) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-border-subtle/50 last:border-0">
      <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary shrink-0">
        {label}
      </span>
      <span className="text-xs text-text-secondary text-right break-all">{value}</span>
    </div>
  );
}

interface MetadataPanelProps {
  asset: MediaAsset;
}

export function MetadataPanel({ asset }: MetadataPanelProps) {
  const { t } = useTranslation();
  const meta: AssetMetadata | undefined = asset.metadata;

  // Collect all rows that have a non-empty value
  const technicalRows: Array<{ label: string; value: string | number }> = [];

  // File-level fields on the asset
  if (asset.width && asset.height) {
    technicalRows.push({
      label: t('mediaReview.meta.dimensions', 'Dimensions'),
      value: `${asset.width} × ${asset.height} px`,
    });
  }
  if (asset.duration != null) {
    technicalRows.push({
      label: t('mediaReview.meta.duration', 'Duration'),
      value: `${asset.duration.toFixed(1)}s`,
    });
  }
  if (asset.fps != null) {
    technicalRows.push({
      label: t('mediaReview.meta.fps', 'Frame rate'),
      value: `${asset.fps} fps`,
    });
  }
  if (asset.codec) {
    technicalRows.push({
      label: t('mediaReview.meta.codec', 'Codec'),
      value: asset.codec,
    });
  }
  if (asset.bitrate != null) {
    technicalRows.push({
      label: t('mediaReview.meta.bitrate', 'Bitrate'),
      value: `${Math.round(asset.bitrate / 1000)} kbps`,
    });
  }

  // EXIF / camera metadata from metadata object
  if (meta?.cameraMake || meta?.cameraModel) {
    technicalRows.push({
      label: t('mediaReview.meta.camera', 'Camera'),
      value: [meta.cameraMake, meta.cameraModel].filter(Boolean).join(' '),
    });
  }
  if (meta?.lens) {
    technicalRows.push({
      label: t('mediaReview.meta.lens', 'Lens'),
      value: meta.lens,
    });
  }
  if (meta?.aperture != null) {
    technicalRows.push({
      label: t('mediaReview.meta.aperture', 'Aperture'),
      value: `f/${meta.aperture}`,
    });
  }
  if (meta?.shutterSpeed) {
    technicalRows.push({
      label: t('mediaReview.meta.shutter', 'Shutter'),
      value: meta.shutterSpeed,
    });
  }
  if (meta?.iso != null) {
    technicalRows.push({
      label: t('mediaReview.meta.iso', 'ISO'),
      value: meta.iso,
    });
  }
  if (meta?.focalLength != null) {
    technicalRows.push({
      label: t('mediaReview.meta.focalLength', 'Focal length'),
      value: `${meta.focalLength} mm`,
    });
  }
  if (meta?.capturedAt) {
    technicalRows.push({
      label: t('mediaReview.meta.capturedAt', 'Captured'),
      value: new Date(meta.capturedAt).toLocaleString('id-ID'),
    });
  }
  if (meta?.gpsLatitude != null && meta?.gpsLongitude != null) {
    technicalRows.push({
      label: t('mediaReview.meta.gps', 'GPS'),
      value: `${meta.gpsLatitude.toFixed(5)}, ${meta.gpsLongitude.toFixed(5)}`,
    });
  }
  if (meta?.copyright) {
    technicalRows.push({
      label: t('mediaReview.meta.copyright', 'Copyright'),
      value: meta.copyright,
    });
  }
  if (meta?.tags && meta.tags.length > 0) {
    technicalRows.push({
      label: t('mediaReview.meta.tags', 'Tags'),
      value: meta.tags.join(', '),
    });
  }
  if (meta?.platforms && meta.platforms.length > 0) {
    technicalRows.push({
      label: t('mediaReview.meta.platforms', 'Platforms'),
      value: meta.platforms.join(', '),
    });
  }

  return (
    <div className="space-y-4">
      {/* Core file info */}
      <div>
        <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
          {t('mediaReview.meta.fileInfo', 'File info')}
        </h4>
        <div>
          <MetaPanelRow label={t('mediaReview.meta.type', 'Type')} value={asset.mediaType} />
          <MetaPanelRow label={t('mediaReview.meta.format', 'Format')} value={asset.mimeType} />
          <MetaPanelRow
            label={t('mediaReview.meta.size', 'Size')}
            value={formatBytes(Number(asset.size) || 0)}
          />
          <MetaPanelRow
            label={t('mediaReview.meta.uploaded', 'Uploaded')}
            value={new Date(asset.uploadedAt).toLocaleString('id-ID')}
          />
          {asset.uploader?.name && (
            <MetaPanelRow label={t('mediaReview.meta.uploader', 'By')} value={asset.uploader.name} />
          )}
        </div>
      </div>

      {/* Technical / EXIF */}
      {technicalRows.length > 0 && (
        <div>
          <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
            {t('mediaReview.meta.technical', 'Technical')}
          </h4>
          <div>
            {technicalRows.map((row) => (
              <MetaPanelRow key={row.label} label={row.label} value={row.value} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
