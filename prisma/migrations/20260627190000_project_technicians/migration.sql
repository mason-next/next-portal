-- Project Technicians: multi-select with users and subcontractors

CREATE TABLE "subcontractors" (
    "id"        TEXT         NOT NULL,
    "name"      TEXT         NOT NULL,
    "trade"     TEXT         NOT NULL DEFAULT '',
    "isActive"  BOOLEAN      NOT NULL DEFAULT TRUE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subcontractors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "project_technicians" (
    "id"              TEXT         NOT NULL,
    "projectId"       TEXT         NOT NULL,
    "userId"          TEXT,
    "subcontractorId" TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_technicians_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "project_technicians_projectId_idx" ON "project_technicians"("projectId");

ALTER TABLE "project_technicians"
    ADD CONSTRAINT "project_technicians_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "project_technicians_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "project_technicians_subcontractorId_fkey"
        FOREIGN KEY ("subcontractorId") REFERENCES "subcontractors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing leadTechnicianId values to the new join table
INSERT INTO "project_technicians" ("id", "projectId", "userId", "createdAt")
SELECT gen_random_uuid(), "id", "leadTechnicianId", NOW()
FROM "projects"
WHERE "leadTechnicianId" IS NOT NULL;
