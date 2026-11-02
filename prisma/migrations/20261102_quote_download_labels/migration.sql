-- Per-file button labels for quote presentation downloads ({ "<filename>": "<label>" }).
ALTER TABLE "quote_presentations" ADD COLUMN "downloadLabels" JSONB NOT NULL DEFAULT '{}';
