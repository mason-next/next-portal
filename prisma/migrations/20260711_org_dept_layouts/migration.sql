-- CreateTable: org_dept_layouts
-- Stores manual x/y/w/h for department group boxes in OrgChart canvas.
CREATE TABLE "org_dept_layouts" (
  "id"         TEXT         NOT NULL,
  "dept_id"    TEXT         NOT NULL,
  "version_id" TEXT         NOT NULL,
  "view_type"  TEXT         NOT NULL DEFAULT 'org_chart',
  "layout_x"   DOUBLE PRECISION NOT NULL,
  "layout_y"   DOUBLE PRECISION NOT NULL,
  "layout_w"   DOUBLE PRECISION NOT NULL,
  "layout_h"   DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "org_dept_layouts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "org_dept_layouts_dept_id_version_id_view_type_key"
  ON "org_dept_layouts"("dept_id", "version_id", "view_type");

ALTER TABLE "org_dept_layouts"
  ADD CONSTRAINT "org_dept_layouts_dept_id_fkey"
  FOREIGN KEY ("dept_id") REFERENCES "org_departments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_dept_layouts"
  ADD CONSTRAINT "org_dept_layouts_version_id_fkey"
  FOREIGN KEY ("version_id") REFERENCES "org_chart_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
