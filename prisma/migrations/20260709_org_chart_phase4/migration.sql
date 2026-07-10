-- Phase 4: Certifications library, position/user cert tracking, career path links.
-- All tables are org_ prefixed — no existing tables modified.

-- Certification library
CREATE TABLE "org_certifications" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "description"  TEXT,
  "issuing_body" TEXT,
  "status"       TEXT NOT NULL DEFAULT 'active',
  "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_certifications_pkey" PRIMARY KEY ("id")
);

-- Position certification requirements (required / preferred)
CREATE TABLE "org_position_certifications" (
  "id"                TEXT NOT NULL,
  "position_id"       TEXT NOT NULL,
  "certification_id"  TEXT NOT NULL,
  "requirement_level" TEXT NOT NULL DEFAULT 'required',
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_position_certifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_position_certifications_position_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "org_positions"("id") ON DELETE CASCADE,
  CONSTRAINT "org_position_certifications_certification_id_fkey"
    FOREIGN KEY ("certification_id") REFERENCES "org_certifications"("id") ON DELETE CASCADE,
  CONSTRAINT "org_position_certifications_position_id_certification_id_key"
    UNIQUE ("position_id", "certification_id")
);

-- User certification holdings (user_id is a plain scalar — no FK to users per module isolation pattern)
CREATE TABLE "org_user_certifications" (
  "id"               TEXT NOT NULL,
  "user_id"          TEXT NOT NULL,
  "certification_id" TEXT NOT NULL,
  "issued_date"      TIMESTAMP(3),
  "expiry_date"      TIMESTAMP(3),
  "credential_id"    TEXT,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_user_certifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_user_certifications_certification_id_fkey"
    FOREIGN KEY ("certification_id") REFERENCES "org_certifications"("id") ON DELETE CASCADE,
  CONSTRAINT "org_user_certifications_user_id_certification_id_key"
    UNIQUE ("user_id", "certification_id")
);

-- Career path progression links between positions (directed graph)
CREATE TABLE "org_career_paths" (
  "id"                        TEXT NOT NULL,
  "from_position_id"          TEXT NOT NULL,
  "to_position_id"            TEXT NOT NULL,
  "typical_timeline_months"   INTEGER,
  "notes"                     TEXT,
  "created_at"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_career_paths_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_career_paths_from_position_id_fkey"
    FOREIGN KEY ("from_position_id") REFERENCES "org_positions"("id") ON DELETE CASCADE,
  CONSTRAINT "org_career_paths_to_position_id_fkey"
    FOREIGN KEY ("to_position_id") REFERENCES "org_positions"("id") ON DELETE CASCADE,
  CONSTRAINT "org_career_paths_from_position_id_to_position_id_key"
    UNIQUE ("from_position_id", "to_position_id")
);
