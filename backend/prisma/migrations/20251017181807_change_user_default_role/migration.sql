-- AlterTable: Change default role for new users from USER to STAFF
-- This aligns with the new RBAC system where STAFF is the standard user role
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'STAFF';
