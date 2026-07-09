-- Org Chart Module Phase 1 — isolated tables with org_ prefix.
-- No existing tables are modified. The only existing-model change is a
-- backrelation field on User in schema.prisma, which adds no DB column.

CREATE TABLE "org_departments" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "description" TEXT,
    "status"      TEXT NOT NULL DEFAULT 'active',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_departments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_locations" (
    "id"          TEXT NOT NULL,
    "name"        TEXT NOT NULL,
    "address"     TEXT,
    "city"        TEXT,
    "state"       TEXT,
    "region"      TEXT,
    "status"      TEXT NOT NULL DEFAULT 'active',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_chart_versions" (
    "id"           TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "description"  TEXT,
    "version_type" TEXT NOT NULL DEFAULT 'current',
    "is_active"    BOOLEAN NOT NULL DEFAULT true,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_chart_versions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_positions" (
    "id"                    TEXT NOT NULL,
    "org_chart_version_id"  TEXT NOT NULL,
    "title"                 TEXT NOT NULL,
    "department_id"         TEXT,
    "location_id"           TEXT,
    "reports_to_position_id" TEXT,
    "status"                TEXT NOT NULL DEFAULT 'open',
    "target_hire_date"      TIMESTAMP(3),
    "notes"                 TEXT,
    "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"            TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_positions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "org_position_assignments" (
    "id"              TEXT NOT NULL,
    "position_id"     TEXT NOT NULL,
    "user_id"         TEXT,
    "assignment_type" TEXT NOT NULL DEFAULT 'primary',
    "start_date"      TIMESTAMP(3),
    "end_date"        TIMESTAMP(3),
    "is_active"       BOOLEAN NOT NULL DEFAULT true,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "org_position_assignments_pkey" PRIMARY KEY ("id")
);

-- Foreign keys

ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_org_chart_version_id_fkey"
    FOREIGN KEY ("org_chart_version_id") REFERENCES "org_chart_versions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_department_id_fkey"
    FOREIGN KEY ("department_id") REFERENCES "org_departments"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_location_id_fkey"
    FOREIGN KEY ("location_id") REFERENCES "org_locations"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "org_positions" ADD CONSTRAINT "org_positions_reports_to_position_id_fkey"
    FOREIGN KEY ("reports_to_position_id") REFERENCES "org_positions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "org_position_assignments" ADD CONSTRAINT "org_position_assignments_position_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "org_positions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "org_position_assignments" ADD CONSTRAINT "org_position_assignments_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
