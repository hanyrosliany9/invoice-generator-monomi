-- CreateEnum
CREATE TYPE "AdClickLinkVia" AS ENUM ('AUTO_CREATE', 'KODE', 'HANDLE');

-- AlterTable
ALTER TABLE "ad_clicks" ADD COLUMN     "linkedVia" "AdClickLinkVia";

-- Backfill. Clicks linked before auto-created leads existed were all linked
-- through their Kode (pasted chat / staff), so they are KODE.
UPDATE "ad_clicks" SET "linkedVia" = 'KODE' WHERE "leadId" IS NOT NULL;

-- Auto-created leads (not deployed yet; only local / test rows): the earliest
-- click of such a lead created it; how its later clicks were attached is not
-- recorded, so they are treated as unverified (HANDLE) and never carry events.
UPDATE "ad_clicks" c SET "linkedVia" = 'HANDLE'
FROM "leads" l
WHERE c."leadId" = l."id" AND l."autoCreated" = true;

UPDATE "ad_clicks" c SET "linkedVia" = 'AUTO_CREATE'
FROM (
  SELECT DISTINCT ON (c2."leadId") c2."id"
  FROM "ad_clicks" c2
  JOIN "leads" l2 ON l2."id" = c2."leadId" AND l2."autoCreated" = true
  ORDER BY c2."leadId", c2."createdAt" ASC, c2."id" ASC
) first_click
WHERE c."id" = first_click."id";
