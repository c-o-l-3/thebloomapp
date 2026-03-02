/*
  Warnings:

  - Made the column `participants` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `traffic_percentage` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `conversions` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `conversion_rate` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clicks` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `click_rate` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `opens` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `open_rate` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `confidence_level` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `is_winner` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `improvement_percentage` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `ab_test_results` required. This step will fail if there are existing NULL values in that column.
  - Made the column `active_journeys` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_journey_runs` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_conversions` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `overall_conversion_rate` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_touchpoints_sent` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_open_rate` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_click_rate` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_bounce_rate` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_time_to_conversion_minutes` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_revenue` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `client_analytics_summary` required. This step will fail if there are existing NULL values in that column.
  - Made the column `event_data` on table `journey_analytics_events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `metadata` on table `journey_analytics_events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `journey_analytics_events` required. This step will fail if there are existing NULL values in that column.
  - Made the column `entered_count` on table `journey_funnel_stages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `completed_count` on table `journey_funnel_stages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `dropped_count` on table `journey_funnel_stages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `conversion_rate` on table `journey_funnel_stages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_time_in_stage_minutes` on table `journey_funnel_stages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `journey_funnel_stages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `journey_funnel_stages` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_contacts_entered` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_contacts_completed` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_contacts_dropped` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `conversions` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `conversion_rate` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `touchpoints_sent` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `touchpoints_delivered` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `touchpoints_opened` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `touchpoints_clicked` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bounce_rate` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unsubscribe_rate` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_time_to_completion_minutes` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_time_to_conversion_minutes` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `total_value` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `avg_value_per_conversion` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `journey_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `analytics_enabled` on table `journeys` required. This step will fail if there are existing NULL values in that column.
  - Made the column `analytics_config` on table `journeys` required. This step will fail if there are existing NULL values in that column.
  - Made the column `sent` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `delivered` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `opened` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `clicked` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `replied` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bounced` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `unsubscribed` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `open_rate` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `click_rate` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `reply_rate` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `bounce_rate` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `drop_offs` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `drop_off_rate` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.
  - Made the column `updated_at` on table `touchpoint_performance_metrics` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ab_test_results" DROP CONSTRAINT "ab_test_results_client_id_fkey";

-- DropForeignKey
ALTER TABLE "ab_test_results" DROP CONSTRAINT "ab_test_results_journey_id_fkey";

-- DropForeignKey
ALTER TABLE "ab_test_results" DROP CONSTRAINT "ab_test_results_touchpoint_id_fkey";

-- DropForeignKey
ALTER TABLE "client_analytics_summary" DROP CONSTRAINT "client_analytics_summary_client_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_analytics_events" DROP CONSTRAINT "journey_analytics_events_client_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_analytics_events" DROP CONSTRAINT "journey_analytics_events_journey_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_analytics_events" DROP CONSTRAINT "journey_analytics_events_touchpoint_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_funnel_stages" DROP CONSTRAINT "journey_funnel_stages_client_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_funnel_stages" DROP CONSTRAINT "journey_funnel_stages_journey_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_funnel_stages" DROP CONSTRAINT "journey_funnel_stages_touchpoint_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_performance_metrics" DROP CONSTRAINT "journey_performance_metrics_client_id_fkey";

-- DropForeignKey
ALTER TABLE "journey_performance_metrics" DROP CONSTRAINT "journey_performance_metrics_journey_id_fkey";

-- DropForeignKey
ALTER TABLE "touchpoint_performance_metrics" DROP CONSTRAINT "touchpoint_performance_metrics_client_id_fkey";

-- DropForeignKey
ALTER TABLE "touchpoint_performance_metrics" DROP CONSTRAINT "touchpoint_performance_metrics_journey_id_fkey";

-- DropForeignKey
ALTER TABLE "touchpoint_performance_metrics" DROP CONSTRAINT "touchpoint_performance_metrics_touchpoint_id_fkey";

-- DropIndex
DROP INDEX "idx_analytics_events_timeseries";

-- DropIndex
DROP INDEX "idx_journey_metrics_timeseries";

-- AlterTable
ALTER TABLE "ab_test_results" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "test_name" SET DATA TYPE TEXT,
ALTER COLUMN "variant_name" SET DATA TYPE TEXT,
ALTER COLUMN "variant_type" SET DATA TYPE TEXT,
ALTER COLUMN "participants" SET NOT NULL,
ALTER COLUMN "traffic_percentage" SET NOT NULL,
ALTER COLUMN "conversions" SET NOT NULL,
ALTER COLUMN "conversion_rate" SET NOT NULL,
ALTER COLUMN "clicks" SET NOT NULL,
ALTER COLUMN "click_rate" SET NOT NULL,
ALTER COLUMN "opens" SET NOT NULL,
ALTER COLUMN "open_rate" SET NOT NULL,
ALTER COLUMN "confidence_level" SET NOT NULL,
ALTER COLUMN "is_winner" SET NOT NULL,
ALTER COLUMN "improvement_percentage" SET NOT NULL,
ALTER COLUMN "start_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "end_date" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "status" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "client_analytics_summary" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "active_journeys" SET NOT NULL,
ALTER COLUMN "total_journey_runs" SET NOT NULL,
ALTER COLUMN "total_conversions" SET NOT NULL,
ALTER COLUMN "overall_conversion_rate" SET NOT NULL,
ALTER COLUMN "total_touchpoints_sent" SET NOT NULL,
ALTER COLUMN "avg_open_rate" SET NOT NULL,
ALTER COLUMN "avg_click_rate" SET NOT NULL,
ALTER COLUMN "avg_bounce_rate" SET NOT NULL,
ALTER COLUMN "avg_time_to_conversion_minutes" SET NOT NULL,
ALTER COLUMN "total_revenue" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "journey_analytics_events" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "event_type" SET DATA TYPE TEXT,
ALTER COLUMN "event_data" SET NOT NULL,
ALTER COLUMN "session_id" SET DATA TYPE TEXT,
ALTER COLUMN "contact_id" SET DATA TYPE TEXT,
ALTER COLUMN "metadata" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "journey_funnel_stages" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "stage_name" SET DATA TYPE TEXT,
ALTER COLUMN "entered_count" SET NOT NULL,
ALTER COLUMN "completed_count" SET NOT NULL,
ALTER COLUMN "dropped_count" SET NOT NULL,
ALTER COLUMN "conversion_rate" SET NOT NULL,
ALTER COLUMN "avg_time_in_stage_minutes" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "journey_performance_metrics" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "total_contacts_entered" SET NOT NULL,
ALTER COLUMN "total_contacts_completed" SET NOT NULL,
ALTER COLUMN "total_contacts_dropped" SET NOT NULL,
ALTER COLUMN "conversions" SET NOT NULL,
ALTER COLUMN "conversion_rate" SET NOT NULL,
ALTER COLUMN "touchpoints_sent" SET NOT NULL,
ALTER COLUMN "touchpoints_delivered" SET NOT NULL,
ALTER COLUMN "touchpoints_opened" SET NOT NULL,
ALTER COLUMN "touchpoints_clicked" SET NOT NULL,
ALTER COLUMN "bounce_rate" SET NOT NULL,
ALTER COLUMN "unsubscribe_rate" SET NOT NULL,
ALTER COLUMN "avg_time_to_completion_minutes" SET NOT NULL,
ALTER COLUMN "avg_time_to_conversion_minutes" SET NOT NULL,
ALTER COLUMN "total_value" SET NOT NULL,
ALTER COLUMN "avg_value_per_conversion" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "journeys" ALTER COLUMN "analytics_enabled" SET NOT NULL,
ALTER COLUMN "analytics_config" SET NOT NULL;

-- AlterTable
ALTER TABLE "touchpoint_performance_metrics" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "sent" SET NOT NULL,
ALTER COLUMN "delivered" SET NOT NULL,
ALTER COLUMN "opened" SET NOT NULL,
ALTER COLUMN "clicked" SET NOT NULL,
ALTER COLUMN "replied" SET NOT NULL,
ALTER COLUMN "bounced" SET NOT NULL,
ALTER COLUMN "unsubscribed" SET NOT NULL,
ALTER COLUMN "open_rate" SET NOT NULL,
ALTER COLUMN "click_rate" SET NOT NULL,
ALTER COLUMN "reply_rate" SET NOT NULL,
ALTER COLUMN "bounce_rate" SET NOT NULL,
ALTER COLUMN "drop_offs" SET NOT NULL,
ALTER COLUMN "drop_off_rate" SET NOT NULL,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "trigger_executions" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_executions" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workflow_triggers_v2" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "webhook_configs" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "webhook_url" TEXT NOT NULL,
    "secret_key" TEXT NOT NULL,
    "subscribed_events" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "max_retries" INTEGER NOT NULL DEFAULT 3,
    "retry_delay_ms" INTEGER NOT NULL DEFAULT 5000,
    "rate_limit_per_minute" INTEGER NOT NULL DEFAULT 100,
    "last_success_at" TIMESTAMP(3),
    "last_failure_at" TIMESTAMP(3),
    "total_deliveries" INTEGER NOT NULL DEFAULT 0,
    "failed_deliveries" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_deliveries" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_id" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "signature_valid" BOOLEAN,
    "signature_checked" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "processing_time_ms" INTEGER,
    "handler_results" JSONB,
    "headers" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_contacts" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "ghl_contact_id" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "name" TEXT,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "custom_fields" JSONB,
    "address" JSONB,
    "source" TEXT,
    "pipeline_id" TEXT,
    "stage_id" TEXT,
    "stage_name" TEXT,
    "opportunity_id" TEXT,
    "opportunity_value" DECIMAL(12,2),
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_event_type" TEXT,
    "sync_status" TEXT NOT NULL DEFAULT 'active',
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "synced_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "synced_appointments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "ghl_appointment_id" TEXT NOT NULL,
    "calendar_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "appointment_type" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "location" TEXT,
    "meeting_link" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_event_type" TEXT,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "synced_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_submissions" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "ghl_submission_id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "form_name" TEXT,
    "submission_data" JSONB NOT NULL,
    "page_url" TEXT,
    "contact_email" TEXT,
    "contact_name" TEXT,
    "contact_phone" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_events" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "email_id" TEXT,
    "message_id" TEXT,
    "template_id" TEXT,
    "template_name" TEXT,
    "event_type" TEXT NOT NULL,
    "event_time" TIMESTAMP(3) NOT NULL,
    "recipient_email" TEXT NOT NULL,
    "clicked_link" TEXT,
    "click_count" INTEGER NOT NULL DEFAULT 0,
    "open_count" INTEGER NOT NULL DEFAULT 0,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "bounce_reason" TEXT,
    "bounce_type" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "opportunity_stage_history" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "ghl_opportunity_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "from_stage_id" TEXT,
    "from_stage_name" TEXT,
    "to_stage_id" TEXT NOT NULL,
    "to_stage_name" TEXT NOT NULL,
    "pipeline_id" TEXT NOT NULL,
    "pipeline_name" TEXT,
    "opportunity_value" DECIMAL(12,2),
    "status" TEXT,
    "changed_at" TIMESTAMP(3) NOT NULL,
    "changed_by" TEXT,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "opportunity_stage_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_configs_client_id_idx" ON "webhook_configs"("client_id");

-- CreateIndex
CREATE INDEX "webhook_configs_status_idx" ON "webhook_configs"("status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_config_id_idx" ON "webhook_deliveries"("config_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_client_id_idx" ON "webhook_deliveries"("client_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_event_type_idx" ON "webhook_deliveries"("event_type");

-- CreateIndex
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries"("status");

-- CreateIndex
CREATE INDEX "webhook_deliveries_event_id_idx" ON "webhook_deliveries"("event_id");

-- CreateIndex
CREATE INDEX "webhook_deliveries_created_at_idx" ON "webhook_deliveries"("created_at");

-- CreateIndex
CREATE INDEX "webhook_deliveries_client_id_event_type_created_at_idx" ON "webhook_deliveries"("client_id", "event_type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "synced_contacts_ghl_contact_id_key" ON "synced_contacts"("ghl_contact_id");

-- CreateIndex
CREATE INDEX "synced_contacts_client_id_idx" ON "synced_contacts"("client_id");

-- CreateIndex
CREATE INDEX "synced_contacts_ghl_contact_id_idx" ON "synced_contacts"("ghl_contact_id");

-- CreateIndex
CREATE INDEX "synced_contacts_email_idx" ON "synced_contacts"("email");

-- CreateIndex
CREATE INDEX "synced_contacts_sync_status_idx" ON "synced_contacts"("sync_status");

-- CreateIndex
CREATE INDEX "synced_contacts_client_id_sync_status_idx" ON "synced_contacts"("client_id", "sync_status");

-- CreateIndex
CREATE INDEX "synced_contacts_last_synced_at_idx" ON "synced_contacts"("last_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "synced_appointments_ghl_appointment_id_key" ON "synced_appointments"("ghl_appointment_id");

-- CreateIndex
CREATE INDEX "synced_appointments_client_id_idx" ON "synced_appointments"("client_id");

-- CreateIndex
CREATE INDEX "synced_appointments_ghl_appointment_id_idx" ON "synced_appointments"("ghl_appointment_id");

-- CreateIndex
CREATE INDEX "synced_appointments_calendar_id_idx" ON "synced_appointments"("calendar_id");

-- CreateIndex
CREATE INDEX "synced_appointments_start_time_idx" ON "synced_appointments"("start_time");

-- CreateIndex
CREATE INDEX "synced_appointments_status_idx" ON "synced_appointments"("status");

-- CreateIndex
CREATE INDEX "synced_appointments_client_id_status_idx" ON "synced_appointments"("client_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "form_submissions_ghl_submission_id_key" ON "form_submissions"("ghl_submission_id");

-- CreateIndex
CREATE INDEX "form_submissions_client_id_idx" ON "form_submissions"("client_id");

-- CreateIndex
CREATE INDEX "form_submissions_ghl_submission_id_idx" ON "form_submissions"("ghl_submission_id");

-- CreateIndex
CREATE INDEX "form_submissions_form_id_idx" ON "form_submissions"("form_id");

-- CreateIndex
CREATE INDEX "form_submissions_submitted_at_idx" ON "form_submissions"("submitted_at");

-- CreateIndex
CREATE INDEX "form_submissions_client_id_form_id_idx" ON "form_submissions"("client_id", "form_id");

-- CreateIndex
CREATE INDEX "email_events_client_id_idx" ON "email_events"("client_id");

-- CreateIndex
CREATE INDEX "email_events_contact_id_idx" ON "email_events"("contact_id");

-- CreateIndex
CREATE INDEX "email_events_event_type_idx" ON "email_events"("event_type");

-- CreateIndex
CREATE INDEX "email_events_event_time_idx" ON "email_events"("event_time");

-- CreateIndex
CREATE INDEX "email_events_recipient_email_idx" ON "email_events"("recipient_email");

-- CreateIndex
CREATE INDEX "email_events_template_id_idx" ON "email_events"("template_id");

-- CreateIndex
CREATE INDEX "email_events_client_id_event_type_event_time_idx" ON "email_events"("client_id", "event_type", "event_time");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_client_id_idx" ON "opportunity_stage_history"("client_id");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_ghl_opportunity_id_idx" ON "opportunity_stage_history"("ghl_opportunity_id");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_to_stage_id_idx" ON "opportunity_stage_history"("to_stage_id");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_changed_at_idx" ON "opportunity_stage_history"("changed_at");

-- CreateIndex
CREATE INDEX "opportunity_stage_history_client_id_pipeline_id_idx" ON "opportunity_stage_history"("client_id", "pipeline_id");

-- CreateIndex
CREATE INDEX "client_portal_sessions_token_idx" ON "client_portal_sessions"("token");

-- CreateIndex
CREATE INDEX "journey_analytics_events_created_at_client_id_event_type_idx" ON "journey_analytics_events"("created_at", "client_id", "event_type");

-- CreateIndex
CREATE INDEX "journey_performance_metrics_date_client_id_idx" ON "journey_performance_metrics"("date", "client_id");

-- AddForeignKey
ALTER TABLE "journey_analytics_events" ADD CONSTRAINT "journey_analytics_events_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_analytics_events" ADD CONSTRAINT "journey_analytics_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_analytics_events" ADD CONSTRAINT "journey_analytics_events_touchpoint_id_fkey" FOREIGN KEY ("touchpoint_id") REFERENCES "touchpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_performance_metrics" ADD CONSTRAINT "journey_performance_metrics_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_performance_metrics" ADD CONSTRAINT "journey_performance_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoint_performance_metrics" ADD CONSTRAINT "touchpoint_performance_metrics_touchpoint_id_fkey" FOREIGN KEY ("touchpoint_id") REFERENCES "touchpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoint_performance_metrics" ADD CONSTRAINT "touchpoint_performance_metrics_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "touchpoint_performance_metrics" ADD CONSTRAINT "touchpoint_performance_metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ab_test_results" ADD CONSTRAINT "ab_test_results_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_funnel_stages" ADD CONSTRAINT "journey_funnel_stages_journey_id_fkey" FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journey_funnel_stages" ADD CONSTRAINT "journey_funnel_stages_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_analytics_summary" ADD CONSTRAINT "client_analytics_summary_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_configs" ADD CONSTRAINT "webhook_configs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "webhook_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_contacts" ADD CONSTRAINT "synced_contacts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_appointments" ADD CONSTRAINT "synced_appointments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "synced_appointments" ADD CONSTRAINT "synced_appointments_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "synced_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_submissions" ADD CONSTRAINT "form_submissions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "synced_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_events" ADD CONSTRAINT "email_events_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "synced_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "opportunity_stage_history" ADD CONSTRAINT "opportunity_stage_history_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "idx_ab_test_client_id" RENAME TO "ab_test_results_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_ab_test_journey_id" RENAME TO "ab_test_results_journey_id_idx";

-- RenameIndex
ALTER INDEX "idx_ab_test_status" RENAME TO "ab_test_results_status_idx";

-- RenameIndex
ALTER INDEX "idx_client_summary_client_id" RENAME TO "client_analytics_summary_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_client_summary_date" RENAME TO "client_analytics_summary_date_idx";

-- RenameIndex
ALTER INDEX "idx_analytics_events_client_id" RENAME TO "journey_analytics_events_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_analytics_events_created_at" RENAME TO "journey_analytics_events_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_analytics_events_event_type" RENAME TO "journey_analytics_events_event_type_idx";

-- RenameIndex
ALTER INDEX "idx_analytics_events_journey_event_created" RENAME TO "journey_analytics_events_journey_id_event_type_created_at_idx";

-- RenameIndex
ALTER INDEX "idx_analytics_events_journey_id" RENAME TO "journey_analytics_events_journey_id_idx";

-- RenameIndex
ALTER INDEX "idx_funnel_stages_date" RENAME TO "journey_funnel_stages_date_idx";

-- RenameIndex
ALTER INDEX "idx_funnel_stages_journey_id" RENAME TO "journey_funnel_stages_journey_id_idx";

-- RenameIndex
ALTER INDEX "idx_journey_metrics_client_id" RENAME TO "journey_performance_metrics_client_id_idx";

-- RenameIndex
ALTER INDEX "idx_journey_metrics_date" RENAME TO "journey_performance_metrics_date_idx";

-- RenameIndex
ALTER INDEX "idx_journey_metrics_journey_date" RENAME TO "journey_performance_metrics_journey_id_date_idx";

-- RenameIndex
ALTER INDEX "idx_journey_metrics_journey_id" RENAME TO "journey_performance_metrics_journey_id_idx";

-- RenameIndex
ALTER INDEX "idx_touchpoint_metrics_date" RENAME TO "touchpoint_performance_metrics_date_idx";

-- RenameIndex
ALTER INDEX "idx_touchpoint_metrics_journey_id" RENAME TO "touchpoint_performance_metrics_journey_id_idx";

-- RenameIndex
ALTER INDEX "idx_touchpoint_metrics_touchpoint_id" RENAME TO "touchpoint_performance_metrics_touchpoint_id_idx";
