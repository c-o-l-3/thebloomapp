-- ============================================
-- Journey A/B Testing Framework Migration
-- P1 Q3 2026 - Comprehensive A/B Testing
-- ============================================

-- Main A/B Test Configuration Table
CREATE TABLE "journey_ab_tests" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "hypothesis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft', -- draft, running, paused, completed, cancelled
    "test_type" TEXT NOT NULL DEFAULT 'journey', -- journey, touchpoint, subject_line, content
    "target_metric" TEXT NOT NULL DEFAULT 'conversion', -- conversion, click_rate, open_rate, reply_rate
    "min_confidence_level" DECIMAL(5,4) NOT NULL DEFAULT 0.95, -- 95% confidence
    "min_sample_size" INTEGER NOT NULL DEFAULT 100, -- Minimum participants per variant
    "auto_winner_selection" BOOLEAN NOT NULL DEFAULT false,
    "traffic_allocation" JSON NOT NULL DEFAULT '{}', -- Custom traffic allocation rules
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "scheduled_start" TIMESTAMP(3),
    "winner_variant_id" TEXT,
    "winner_selected_at" TIMESTAMP(3),
    "winner_selection_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_ab_tests_pkey" PRIMARY KEY ("id")
);

-- A/B Test Variants Table
CREATE TABLE "journey_ab_test_variants" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "journey_id" TEXT NOT NULL,
    "name" TEXT NOT NULL, -- e.g., "Control", "Variant A", "Variant B"
    "description" TEXT,
    "traffic_percentage" DECIMAL(5,2) NOT NULL DEFAULT 50.00, -- 0-100%
    "journey_snapshot" JSON NOT NULL, -- Full journey configuration snapshot
    "touchpoint_changes" JSON, -- Specific changes from control (for partial tests)
    "is_control" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'active', -- active, disabled, winner, loser
    "participants_count" INTEGER NOT NULL DEFAULT 0,
    "conversions_count" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "confidence_level" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "improvement_percentage" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journey_ab_test_variants_pkey" PRIMARY KEY ("id")
);

-- A/B Test Participants Tracking
CREATE TABLE "ab_test_participants" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "contact_id" TEXT NOT NULL, -- GHL contact ID
    "session_id" TEXT,
    "journey_id" TEXT NOT NULL,
    "entry_touchpoint_id" TEXT, -- Which touchpoint they entered through
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "converted_at" TIMESTAMP(3),
    "conversion_value" DECIMAL(12,2),
    "conversion_event" TEXT,
    "dropped_off_at" TIMESTAMP(3),
    "drop_off_touchpoint_id" TEXT,
    "time_in_journey_minutes" INTEGER,
    "device_type" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "metadata" JSON NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_test_participants_pkey" PRIMARY KEY ("id")
);

-- A/B Test Events/Conversions Tracking
CREATE TABLE "ab_test_events" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL, -- conversion, email_opened, email_clicked, touchpoint_completed, etc.
    "event_data" JSON NOT NULL DEFAULT '{}',
    "touchpoint_id" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_test_events_pkey" PRIMARY KEY ("id")
);

-- A/B Test Daily Statistics (for time-series analysis)
CREATE TABLE "ab_test_daily_stats" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "variant_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "participants_new" INTEGER NOT NULL DEFAULT 0,
    "participants_total" INTEGER NOT NULL DEFAULT 0,
    "conversions_new" INTEGER NOT NULL DEFAULT 0,
    "conversions_total" INTEGER NOT NULL DEFAULT 0,
    "conversion_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "email_opens" INTEGER NOT NULL DEFAULT 0,
    "email_clicks" INTEGER NOT NULL DEFAULT 0,
    "open_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "click_rate" DECIMAL(5,4) NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ab_test_daily_stats_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
CREATE UNIQUE INDEX "journey_ab_tests_client_id_name_key" ON "journey_ab_tests"("client_id", "name");
CREATE UNIQUE INDEX "ab_test_participants_test_id_contact_id_key" ON "ab_test_participants"("test_id", "contact_id");
CREATE UNIQUE INDEX "ab_test_daily_stats_test_id_variant_id_date_key" ON "ab_test_daily_stats"("test_id", "variant_id", "date");

-- Create indexes for performance
CREATE INDEX "journey_ab_tests_client_id_idx" ON "journey_ab_tests"("client_id");
CREATE INDEX "journey_ab_tests_journey_id_idx" ON "journey_ab_tests"("journey_id");
CREATE INDEX "journey_ab_tests_status_idx" ON "journey_ab_tests"("status");
CREATE INDEX "journey_ab_tests_start_date_idx" ON "journey_ab_tests"("start_date");

CREATE INDEX "journey_ab_test_variants_test_id_idx" ON "journey_ab_test_variants"("test_id");
CREATE INDEX "journey_ab_test_variants_client_id_idx" ON "journey_ab_test_variants"("client_id");
CREATE INDEX "journey_ab_test_variants_status_idx" ON "journey_ab_test_variants"("status");

CREATE INDEX "ab_test_participants_test_id_idx" ON "ab_test_participants"("test_id");
CREATE INDEX "ab_test_participants_variant_id_idx" ON "ab_test_participants"("variant_id");
CREATE INDEX "ab_test_participants_client_id_idx" ON "ab_test_participants"("client_id");
CREATE INDEX "ab_test_participants_contact_id_idx" ON "ab_test_participants"("contact_id");
CREATE INDEX "ab_test_participants_converted_at_idx" ON "ab_test_participants"("converted_at");

CREATE INDEX "ab_test_events_test_id_idx" ON "ab_test_events"("test_id");
CREATE INDEX "ab_test_events_variant_id_idx" ON "ab_test_events"("variant_id");
CREATE INDEX "ab_test_events_participant_id_idx" ON "ab_test_events"("participant_id");
CREATE INDEX "ab_test_events_event_type_idx" ON "ab_test_events"("event_type");
CREATE INDEX "ab_test_events_timestamp_idx" ON "ab_test_events"("timestamp");

CREATE INDEX "ab_test_daily_stats_test_id_idx" ON "ab_test_daily_stats"("test_id");
CREATE INDEX "ab_test_daily_stats_variant_id_idx" ON "ab_test_daily_stats"("variant_id");
CREATE INDEX "ab_test_daily_stats_date_idx" ON "ab_test_daily_stats"("date");

-- Add foreign key constraints
ALTER TABLE "journey_ab_tests" ADD CONSTRAINT "journey_ab_tests_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journey_ab_tests" ADD CONSTRAINT "journey_ab_tests_journey_id_fkey" 
    FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journey_ab_test_variants" ADD CONSTRAINT "journey_ab_test_variants_test_id_fkey" 
    FOREIGN KEY ("test_id") REFERENCES "journey_ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journey_ab_test_variants" ADD CONSTRAINT "journey_ab_test_variants_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "journey_ab_test_variants" ADD CONSTRAINT "journey_ab_test_variants_journey_id_fkey" 
    FOREIGN KEY ("journey_id") REFERENCES "journeys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_participants" ADD CONSTRAINT "ab_test_participants_test_id_fkey" 
    FOREIGN KEY ("test_id") REFERENCES "journey_ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_participants" ADD CONSTRAINT "ab_test_participants_variant_id_fkey" 
    FOREIGN KEY ("variant_id") REFERENCES "journey_ab_test_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_participants" ADD CONSTRAINT "ab_test_participants_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_events" ADD CONSTRAINT "ab_test_events_test_id_fkey" 
    FOREIGN KEY ("test_id") REFERENCES "journey_ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_events" ADD CONSTRAINT "ab_test_events_variant_id_fkey" 
    FOREIGN KEY ("variant_id") REFERENCES "journey_ab_test_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_events" ADD CONSTRAINT "ab_test_events_participant_id_fkey" 
    FOREIGN KEY ("participant_id") REFERENCES "ab_test_participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_events" ADD CONSTRAINT "ab_test_events_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_daily_stats" ADD CONSTRAINT "ab_test_daily_stats_test_id_fkey" 
    FOREIGN KEY ("test_id") REFERENCES "journey_ab_tests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_daily_stats" ADD CONSTRAINT "ab_test_daily_stats_variant_id_fkey" 
    FOREIGN KEY ("variant_id") REFERENCES "journey_ab_test_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ab_test_daily_stats" ADD CONSTRAINT "ab_test_daily_stats_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
