-- Migration: Replace UserRole enum with AccountType (permissions) + RoleType (grouping).
-- This migration is additive-first: new columns are added with safe defaults, data is
-- migrated, then the old column and enum are dropped — all in one atomic transaction.

-- Step 1: Create new enums
CREATE TYPE "AccountType" AS ENUM ('Administrator', 'Member', 'Viewer');
CREATE TYPE "RoleType" AS ENUM ('Engineer', 'Salesperson', 'ProjectManager', 'Technician', 'Operations', 'Finance', 'Executive', 'Other');

-- Step 2: Add new columns with safe defaults (no existing row is left NULL)
ALTER TABLE "users" ADD COLUMN "accountType" "AccountType" NOT NULL DEFAULT 'Member';
ALTER TABLE "users" ADD COLUMN "roleType" "RoleType" NOT NULL DEFAULT 'Other';

-- Step 3: Migrate existing data
UPDATE "users" SET
  "accountType" = CASE
    WHEN role = 'Administrator' THEN 'Administrator'::"AccountType"
    ELSE 'Member'::"AccountType"
  END,
  "roleType" = CASE
    WHEN role = 'Project Manager'     THEN 'ProjectManager'::"RoleType"
    WHEN role = 'Engineering Manager' THEN 'Engineer'::"RoleType"
    WHEN role = 'Procurement Manager' THEN 'Operations'::"RoleType"
    WHEN role = 'Salesperson'         THEN 'Salesperson'::"RoleType"
    ELSE 'Other'::"RoleType"
  END;

-- Step 4: Drop old column and enum
ALTER TABLE "users" DROP COLUMN "role";
DROP TYPE "UserRole" CASCADE;
