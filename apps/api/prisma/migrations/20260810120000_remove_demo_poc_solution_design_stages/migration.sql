-- Remap deals still on removed stages before dropping enum values.
UPDATE "opportunities"
SET stage = 'TECHNICAL_DISCUSSION'
WHERE stage::text IN ('DEMO', 'POC', 'SOLUTION_DESIGN');

UPDATE "opportunity_stage_history"
SET "fromStage" = 'TECHNICAL_DISCUSSION'
WHERE "fromStage"::text IN ('DEMO', 'POC', 'SOLUTION_DESIGN');

UPDATE "opportunity_stage_history"
SET "toStage" = 'TECHNICAL_DISCUSSION'
WHERE "toStage"::text IN ('DEMO', 'POC', 'SOLUTION_DESIGN');

CREATE TYPE "OpportunityStage_new" AS ENUM (
  'REQUIREMENT_GATHERING',
  'SITE_SURVEY',
  'TECHNICAL_DISCUSSION',
  'INTERNAL_REVIEW',
  'QUOTATION_SENT',
  'NEGOTIATION',
  'WON',
  'LOST'
);

ALTER TABLE "opportunities" ALTER COLUMN "stage" DROP DEFAULT;

ALTER TABLE "opportunities"
  ALTER COLUMN "stage" TYPE "OpportunityStage_new"
  USING ("stage"::text::"OpportunityStage_new");

ALTER TABLE "opportunity_stage_history"
  ALTER COLUMN "fromStage" TYPE "OpportunityStage_new"
  USING (
    CASE
      WHEN "fromStage" IS NULL THEN NULL
      ELSE "fromStage"::text::"OpportunityStage_new"
    END
  );

ALTER TABLE "opportunity_stage_history"
  ALTER COLUMN "toStage" TYPE "OpportunityStage_new"
  USING ("toStage"::text::"OpportunityStage_new");

DROP TYPE "OpportunityStage";
ALTER TYPE "OpportunityStage_new" RENAME TO "OpportunityStage";

ALTER TABLE "opportunities"
  ALTER COLUMN "stage" SET DEFAULT 'REQUIREMENT_GATHERING'::"OpportunityStage";
