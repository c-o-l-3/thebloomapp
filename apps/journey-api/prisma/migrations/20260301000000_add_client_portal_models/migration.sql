-- Client Self-Service Portal Models Migration
-- P2 Q2 2026

-- Change Requests table
CREATE TABLE "change_requests" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "journey_id" TEXT,
    "touchpoint_id" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proposed_content" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "requested_by" TEXT NOT NULL,
    "requested_by_email" TEXT NOT NULL,
    "reviewed_by" TEXT,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "implemented_at" TIMESTAMP(3),
    "implementation_notes" TEXT,
    "comments" JSONB NOT NULL DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- Brand Voice Settings table
CREATE TABLE "brand_voice_settings" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "personality_traits" JSONB NOT NULL DEFAULT '[]',
    "voice_guidelines" TEXT,
    "writing_style" TEXT,
    "preferred_phrases" JSONB NOT NULL DEFAULT '[]',
    "avoided_phrases" JSONB NOT NULL DEFAULT '[]',
    "target_audience" TEXT,
    "audience_tone_notes" TEXT,
    "good_examples" JSONB NOT NULL DEFAULT '[]',
    "bad_examples" JSONB NOT NULL DEFAULT '[]',
    "last_analyzed_at" TIMESTAMP(3),
    "analysis_version" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "brand_voice_settings_pkey" PRIMARY KEY ("id")
);

-- Client Assets table
CREATE TABLE "client_assets" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "thumbnail_url" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "tags" JSONB NOT NULL DEFAULT '[]',
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "uploaded_by" TEXT NOT NULL,
    "uploaded_by_email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_assets_pkey" PRIMARY KEY ("id")
);

-- Client Portal Users table
CREATE TABLE "client_portal_users" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "password_hash" TEXT,
    "reset_token" TEXT,
    "reset_token_expiry" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMP(3),
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_portal_users_pkey" PRIMARY KEY ("id")
);

-- Client Portal Sessions table
CREATE TABLE "client_portal_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_active_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_portal_sessions_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "change_requests_client_id_idx" ON "change_requests"("client_id");
CREATE INDEX "change_requests_status_idx" ON "change_requests"("status");
CREATE INDEX "change_requests_journey_id_idx" ON "change_requests"("journey_id");
CREATE INDEX "change_requests_client_id_status_idx" ON "change_requests"("client_id", "status");
CREATE INDEX "change_requests_created_at_idx" ON "change_requests"("created_at");

CREATE UNIQUE INDEX "brand_voice_settings_client_id_key" ON "brand_voice_settings"("client_id");
CREATE INDEX "brand_voice_settings_client_id_idx" ON "brand_voice_settings"("client_id");

CREATE INDEX "client_assets_client_id_idx" ON "client_assets"("client_id");
CREATE INDEX "client_assets_type_idx" ON "client_assets"("type");
CREATE INDEX "client_assets_category_idx" ON "client_assets"("category");
CREATE INDEX "client_assets_status_idx" ON "client_assets"("status");
CREATE INDEX "client_assets_client_id_category_idx" ON "client_assets"("client_id", "category");

CREATE UNIQUE INDEX "client_portal_users_client_id_email_key" ON "client_portal_users"("client_id", "email");
CREATE INDEX "client_portal_users_client_id_idx" ON "client_portal_users"("client_id");
CREATE INDEX "client_portal_users_email_idx" ON "client_portal_users"("email");
CREATE INDEX "client_portal_users_status_idx" ON "client_portal_users"("status");

CREATE INDEX "client_portal_sessions_user_id_idx" ON "client_portal_sessions"("user_id");
CREATE UNIQUE INDEX "client_portal_sessions_token_key" ON "client_portal_sessions"("token");
CREATE INDEX "client_portal_sessions_expires_at_idx" ON "client_portal_sessions"("expires_at");

-- Add foreign keys
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "brand_voice_settings" ADD CONSTRAINT "brand_voice_settings_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_assets" ADD CONSTRAINT "client_assets_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_portal_users" ADD CONSTRAINT "client_portal_users_client_id_fkey" 
    FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;