-- Remove campaign relations from content_calendar_items
ALTER TABLE "content_calendar_items" DROP COLUMN IF EXISTS "campaignId";

-- Drop campaign tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS "campaign_monthly_reports" CASCADE;
DROP TABLE IF EXISTS "campaign_daily_metrics" CASCADE;
DROP TABLE IF EXISTS "campaign_data_imports" CASCADE;
DROP TABLE IF EXISTS "campaigns" CASCADE;
DROP TABLE IF EXISTS "platform_credentials" CASCADE;
DROP TABLE IF EXISTS "ad_platforms" CASCADE;

-- Drop campaign enums
DROP TYPE IF EXISTS "CampaignStatus";
DROP TYPE IF EXISTS "ImportStatus";
