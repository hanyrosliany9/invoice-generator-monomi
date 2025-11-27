-- Update existing media URLs from proxy to direct R2 public URLs
-- Run this AFTER setting up R2 public bucket with custom domain

-- Replace '/api/v1/media/proxy/' with 'https://media.monomiagency.com/'
-- This fixes all existing uploaded media to use direct R2 URLs

BEGIN;

-- Update media_assets URLs
UPDATE media_assets
SET
  url = REPLACE(url, '/api/v1/media/proxy/', 'https://media.monomiagency.com/'),
  "thumbnailUrl" = REPLACE("thumbnailUrl", '/api/v1/media/proxy/', 'https://media.monomiagency.com/')
WHERE
  url LIKE '/api/v1/media/proxy/%'
  OR "thumbnailUrl" LIKE '/api/v1/media/proxy/%';

-- Update media_versions URLs (if any)
UPDATE media_versions
SET
  url = REPLACE(url, '/api/v1/media/proxy/', 'https://media.monomiagency.com/'),
  "thumbnailUrl" = REPLACE("thumbnailUrl", '/api/v1/media/proxy/', 'https://media.monomiagency.com/')
WHERE
  url LIKE '/api/v1/media/proxy/%'
  OR "thumbnailUrl" LIKE '/api/v1/media/proxy/%';

-- Verify changes
SELECT
  COUNT(*) as total_assets,
  COUNT(CASE WHEN url LIKE 'https://media.monomiagency.com/%' THEN 1 END) as using_r2_urls,
  COUNT(CASE WHEN url LIKE '/api/v1/media/proxy/%' THEN 1 END) as using_proxy_urls
FROM media_assets;

COMMIT;

-- If something goes wrong, you can rollback:
-- ROLLBACK;
