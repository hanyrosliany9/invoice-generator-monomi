-- Simplify user roles from 8 roles to 3 roles
-- Migration mapping:
--   ADMIN (legacy alias for SUPER_ADMIN) → SUPER_ADMIN
--   FINANCE_MANAGER, PROJECT_MANAGER, ACCOUNTANT → ADMIN
--   STAFF, VIEWER, USER → VIDEOGRAPHER

BEGIN;

-- Step 1: Drop default constraint, change column to text for data migration
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE text;

-- Step 2: Migrate data to new role names
UPDATE "users" SET role = 'SUPER_ADMIN' WHERE role = 'ADMIN';
UPDATE "users" SET role = 'ADMIN' WHERE role IN ('FINANCE_MANAGER', 'PROJECT_MANAGER', 'ACCOUNTANT');
UPDATE "users" SET role = 'VIDEOGRAPHER' WHERE role IN ('STAFF', 'VIEWER', 'USER');

-- Step 3: Create new enum type
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'VIDEOGRAPHER');

-- Step 4: Cast column to new enum
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole_new" USING "role"::"UserRole_new";

-- Step 5: Replace old enum with new one
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "UserRole_old";

-- Step 6: Restore default
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'VIDEOGRAPHER';

COMMIT;
