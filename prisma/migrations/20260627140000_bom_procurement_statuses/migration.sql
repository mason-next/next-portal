-- Add procurement tracking statuses to BomStatus enum
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Ordered';
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Received';
ALTER TYPE "BomStatus" ADD VALUE IF NOT EXISTS 'Installed';
