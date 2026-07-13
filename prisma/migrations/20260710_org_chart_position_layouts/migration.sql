-- Persistent layout coordinates for org chart positions (manual drag-to-reposition)
CREATE TABLE "org_position_layouts" (
  "id"          TEXT NOT NULL,
  "position_id" TEXT NOT NULL,
  "version_id"  TEXT NOT NULL,
  "view_type"   TEXT NOT NULL DEFAULT 'org_chart',
  "layout_x"    DOUBLE PRECISION NOT NULL,
  "layout_y"    DOUBLE PRECISION NOT NULL,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_position_layouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_position_layouts_position_id_version_id_view_type_key"
  ON "org_position_layouts"("position_id", "version_id", "view_type");

ALTER TABLE "org_position_layouts"
  ADD CONSTRAINT "org_position_layouts_position_id_fkey"
  FOREIGN KEY ("position_id") REFERENCES "org_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_position_layouts"
  ADD CONSTRAINT "org_position_layouts_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "org_chart_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
