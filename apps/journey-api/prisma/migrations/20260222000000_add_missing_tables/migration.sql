-- Migration: add_missing_tables
-- Created: 2026-02-22
-- Description: Add missing tables for templates, journey_versions, workflows, approvals, users, client_users, sync_history, and migration_logs

-- CreateTable: templates
CREATE TABLE "templates" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ghl_template_id" TEXT UNIQUE,
    "content" JSONB NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "last_synced" TIMESTAMP(3),
    "sync_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable: journey_versions
CREATE TABLE "journey_versions" (
    "id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by" TEXT,
    "change_log" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable: workflows
CREATE TABLE "workflows" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workflow_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "trigger" JSONB NOT NULL,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "notes" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable: approvals
CREATE TABLE "approvals" (
    "id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "version_id" TEXT,
    "status" TEXT NOT NULL,
    "comments" TEXT,
    "requested_by" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: client_users
CREATE TABLE "client_users" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'editor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: sync_history
CREATE TABLE "sync_history" (
    "id" TEXT NOT NULL,
    "client_id" TEXT,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "items_synced" INTEGER,
    "errors" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable: migration_logs
CREATE TABLE "migration_logs" (
    "id" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migration_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: templates
CREATE INDEX "templates_client_id_idx" ON "templates"("client_id");
CREATE INDEX "templates_ghl_template_id_idx" ON "templates"("ghl_template_id");
CREATE INDEX "templates_type_idx" ON "templates"("type");

-- CreateIndex: journey_versions
CREATE UNIQUE INDEX "journey_versions_journey_id_version_key" ON "journey_versions"("journey_id", "version");
CREATE INDEX "journey_versions_journey_id_idx" ON "journey_versions"("journey_id");
CREATE INDEX "journey_versions_journey_id_version_idx" ON "journey_versions"("journey_id", "version");

-- CreateIndex: workflows
CREATE INDEX "workflows_client_id_idx" ON "workflows"("client_id");

-- CreateIndex: approvals
CREATE INDEX "approvals_journey_id_idx" ON "approvals"("journey_id");
CREATE INDEX "approvals_status_idx" ON "approvals"("status");

-- CreateIndex: users
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex: client_users
CREATE UNIQUE INDEX "client_users_client_id_user_id_key" ON "client_users"("client_id", "user_id");

-- CreateIndex: sync_history
CREATE INDEX "sync_history_client_id_idx" ON "sync_history"("client_id");

-- AddForeignKey: templates
ALTER TABLE "templates" ADD CONSTRAINT "templates_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: journey_versions
ALTER TABLE "journey_versions" ADD CONSTRAINT "journey_versions_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: workflows
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: approvals
ALTER TABLE "approvals" ADD CONSTRAINT "approvals_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: client_users
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "client_users" ADD CONSTRAINT "client_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: sync_history
ALTER TABLE "sync_history" ADD CONSTRAINT "sync_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
