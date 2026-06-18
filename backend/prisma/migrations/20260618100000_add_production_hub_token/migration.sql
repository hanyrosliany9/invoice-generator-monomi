-- Add production hub guest access token to projects
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "productionHubToken" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "productionHubTokenAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "projects_productionHubToken_key" ON "projects"("productionHubToken");
CREATE INDEX IF NOT EXISTS "projects_productionHubToken_idx" ON "projects"("productionHubToken");
