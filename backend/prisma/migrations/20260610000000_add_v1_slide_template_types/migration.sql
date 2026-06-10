-- Add the v1 slide template types that the deck editor's template picker
-- offers (restored in the v2 UI) but the SlideTemplate enum never gained.
-- Without these, POST /deck-slides 400s on template validation.
ALTER TYPE "SlideTemplate" ADD VALUE IF NOT EXISTS 'STORYBOARD';
ALTER TYPE "SlideTemplate" ADD VALUE IF NOT EXISTS 'LOCATION';
ALTER TYPE "SlideTemplate" ADD VALUE IF NOT EXISTS 'SCRIPT_BREAKDOWN';
ALTER TYPE "SlideTemplate" ADD VALUE IF NOT EXISTS 'CALL_SHEET';
ALTER TYPE "SlideTemplate" ADD VALUE IF NOT EXISTS 'GRID_4';
ALTER TYPE "SlideTemplate" ADD VALUE IF NOT EXISTS 'GRID_6';
ALTER TYPE "SlideTemplate" ADD VALUE IF NOT EXISTS 'TIMELINE';
