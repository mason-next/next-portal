-- Bio description on users: nullable, no default, no effect on existing behavior
ALTER TABLE "users"
  ADD COLUMN "bio_description" TEXT;

-- Sibling sort order on org_positions: nullable integer, null = use createdAt order
ALTER TABLE "org_positions"
  ADD COLUMN "sort_order" INTEGER;
