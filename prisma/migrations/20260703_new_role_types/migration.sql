-- Add new RoleType enum values (current business roles)
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'Sales';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'Engineering';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'ProjectManagement';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'Management';
ALTER TYPE "RoleType" ADD VALUE IF NOT EXISTS 'Installation';
-- Finance, Customer, Subcontractor already exist in the enum

-- Migrate existing users from legacy role values to new ones
UPDATE "User" SET "roleType" = 'Sales'::"RoleType"              WHERE "roleType" = 'Salesperson'::"RoleType";
UPDATE "User" SET "roleType" = 'Engineering'::"RoleType"        WHERE "roleType" = 'Engineer'::"RoleType";
UPDATE "User" SET "roleType" = 'ProjectManagement'::"RoleType"  WHERE "roleType" = 'ProjectManager'::"RoleType";
UPDATE "User" SET "roleType" = 'Management'::"RoleType"         WHERE "roleType" IN ('Executive'::"RoleType", 'Operations'::"RoleType", 'HR'::"RoleType", 'Other'::"RoleType");
UPDATE "User" SET "roleType" = 'Installation'::"RoleType"       WHERE "roleType" IN ('Technician'::"RoleType", 'FieldTechnician'::"RoleType");
UPDATE "User" SET "roleType" = 'Subcontractor'::"RoleType"      WHERE "roleType" = 'Vendor'::"RoleType";
