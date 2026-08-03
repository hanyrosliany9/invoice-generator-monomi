-- The Quotation→PaymentMilestone relation is declared `onDelete: Cascade` in
-- schema.prisma, but the FK constraint was missing from the database — so
-- deleting a quotation left orphaned payment_milestones, which then crashed
-- the (required) relation include in milestone analytics. Clean any orphans
-- and add the constraint so this can never recur.
DELETE FROM "payment_milestones" pm
  WHERE NOT EXISTS (SELECT 1 FROM "quotations" q WHERE q.id = pm."quotationId");

-- Guarded: on a database built from this repo's baseline migration, this FK
-- was already created there (baseline predates this migration's discovery of
-- the "missing" constraint on a drifted dev DB) — replaying from scratch
-- would otherwise fail with "constraint already exists". The DO block makes
-- this idempotent regardless of starting state.
DO $$ BEGIN
  ALTER TABLE "payment_milestones"
    ADD CONSTRAINT "payment_milestones_quotationId_fkey"
    FOREIGN KEY ("quotationId") REFERENCES "quotations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
