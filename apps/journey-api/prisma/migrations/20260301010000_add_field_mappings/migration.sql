-- Create field_mappings table for Custom Field Mapping UI (P1 Q2 2026)
CREATE TABLE IF NOT EXISTS "field_mappings" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "source_field" TEXT NOT NULL,
    "source_field_type" TEXT NOT NULL,
    "target_field" TEXT NOT NULL,
    "target_field_type" TEXT NOT NULL,
    "target_system" TEXT NOT NULL DEFAULT 'gohighlevel',
    "transformation_rule" TEXT,
    "validation_rule" TEXT,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "example_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_mappings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for client + source_field + target_system
CREATE UNIQUE INDEX IF NOT EXISTS "field_mappings_client_id_source_field_target_system_key" 
    ON "field_mappings"("client_id", "source_field", "target_system");

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS "field_mappings_client_id_idx" ON "field_mappings"("client_id");
CREATE INDEX IF NOT EXISTS "field_mappings_target_system_idx" ON "field_mappings"("target_system");
CREATE INDEX IF NOT EXISTS "field_mappings_is_active_idx" ON "field_mappings"("is_active");

-- Add foreign key constraint
ALTER TABLE "field_mappings" 
    ADD CONSTRAINT "field_mappings_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
