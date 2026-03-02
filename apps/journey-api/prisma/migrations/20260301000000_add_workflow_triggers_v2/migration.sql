-- Workflow Triggers V2 Migration
-- P1 Q2 2026 - Conditional Logic, Time-based Delays, Multi-trigger Support

-- Create WorkflowTriggerV2 table
CREATE TABLE "workflow_triggers_v2" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "workflow_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "config" JSONB NOT NULL DEFAULT '{}',
    "conditions" JSONB DEFAULT '[]',
    "condition_logic" TEXT NOT NULL DEFAULT 'and',
    "time_delay" INTEGER,
    "time_delay_type" TEXT,
    "schedule_window" JSONB,
    "max_executions" INTEGER,
    "execution_cooldown" INTEGER,
    "dedup_window" INTEGER NOT NULL DEFAULT 1440,
    "dedup_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_triggers_v2_pkey" PRIMARY KEY ("id")
);

-- Create WorkflowExecution table
CREATE TABLE "workflow_executions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "workflow_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "trigger_id" TEXT,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "context" JSONB,
    "results" JSONB,
    "error" TEXT,
    "actions_total" INTEGER NOT NULL DEFAULT 0,
    "actions_completed" INTEGER NOT NULL DEFAULT 0,
    "actions_failed" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

-- Create TriggerExecution table
CREATE TABLE "trigger_executions" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "trigger_id" TEXT NOT NULL,
    "workflow_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "matched_conditions" JSONB,
    "execution_id" TEXT,
    "dedup_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trigger_executions_pkey" PRIMARY KEY ("id")
);

-- Add indexes for WorkflowTriggerV2
CREATE INDEX "workflow_triggers_v2_workflow_id_idx" ON "workflow_triggers_v2"("workflow_id");
CREATE INDEX "workflow_triggers_v2_client_id_idx" ON "workflow_triggers_v2"("client_id");
CREATE INDEX "workflow_triggers_v2_type_idx" ON "workflow_triggers_v2"("type");
CREATE INDEX "workflow_triggers_v2_status_idx" ON "workflow_triggers_v2"("status");
CREATE INDEX "workflow_triggers_v2_client_id_type_status_idx" ON "workflow_triggers_v2"("client_id", "type", "status");

-- Add indexes for WorkflowExecution
CREATE INDEX "workflow_executions_workflow_id_idx" ON "workflow_executions"("workflow_id");
CREATE INDEX "workflow_executions_client_id_idx" ON "workflow_executions"("client_id");
CREATE INDEX "workflow_executions_contact_id_idx" ON "workflow_executions"("contact_id");
CREATE INDEX "workflow_executions_status_idx" ON "workflow_executions"("status");
CREATE INDEX "workflow_executions_started_at_idx" ON "workflow_executions"("started_at");
CREATE INDEX "workflow_executions_client_id_status_idx" ON "workflow_executions"("client_id", "status");

-- Add indexes for TriggerExecution
CREATE INDEX "trigger_executions_trigger_id_idx" ON "trigger_executions"("trigger_id");
CREATE INDEX "trigger_executions_client_id_idx" ON "trigger_executions"("client_id");
CREATE INDEX "trigger_executions_contact_id_idx" ON "trigger_executions"("contact_id");
CREATE INDEX "trigger_executions_event_type_idx" ON "trigger_executions"("event_type");
CREATE INDEX "trigger_executions_status_idx" ON "trigger_executions"("status");
CREATE INDEX "trigger_executions_created_at_idx" ON "trigger_executions"("created_at");
CREATE INDEX "trigger_executions_dedup_hash_idx" ON "trigger_executions"("dedup_hash");

-- Add foreign key constraints
ALTER TABLE "workflow_triggers_v2" 
    ADD CONSTRAINT "workflow_triggers_v2_workflow_id_fkey" 
    FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_triggers_v2" 
    ADD CONSTRAINT "workflow_triggers_v2_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_executions" 
    ADD CONSTRAINT "workflow_executions_workflow_id_fkey" 
    FOREIGN KEY ("workflow_id") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_executions" 
    ADD CONSTRAINT "workflow_executions_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "trigger_executions" 
    ADD CONSTRAINT "trigger_executions_trigger_id_fkey" 
    FOREIGN KEY ("trigger_id") REFERENCES "workflow_triggers_v2"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add trigger for updated_at on workflow_triggers_v2
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_workflow_triggers_v2_updated_at
    BEFORE UPDATE ON "workflow_triggers_v2"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workflow_executions_updated_at
    BEFORE UPDATE ON "workflow_executions"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();