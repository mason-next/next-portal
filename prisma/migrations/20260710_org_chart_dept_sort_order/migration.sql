-- Add sort_order column to org_departments for admin-controlled department ordering
ALTER TABLE "org_departments" ADD COLUMN "sort_order" INTEGER;
