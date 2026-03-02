-- Add analytics tables for journey performance tracking
-- Migration: Advanced Journey Analytics (P1 Q2 2026)
-- Target: Supporting 10,000+ active journeys

-- Journey analytics events table for tracking granular interactions
CREATE TABLE IF NOT EXISTS journey_analytics_events (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    touchpoint_id TEXT REFERENCES touchpoints(id) ON DELETE SET NULL,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_data JSONB DEFAULT '{}',
    session_id VARCHAR(255),
    contact_id VARCHAR(255),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'journey_started', 'journey_completed', 'journey_exited',
        'touchpoint_sent', 'touchpoint_delivered', 'touchpoint_opened',
        'touchpoint_clicked', 'touchpoint_replied', 'touchpoint_bounced',
        'touchpoint_unsubscribed', 'form_submitted', 'appointment_booked',
        'conversion', 'drop_off', 'ab_test_variant_shown'
    ))
);

-- Journey performance metrics aggregated table
CREATE TABLE IF NOT EXISTS journey_performance_metrics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Engagement metrics
    total_contacts_entered INTEGER DEFAULT 0,
    total_contacts_completed INTEGER DEFAULT 0,
    total_contacts_dropped INTEGER DEFAULT 0,
    
    -- Conversion metrics
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Touchpoint metrics
    touchpoints_sent INTEGER DEFAULT 0,
    touchpoints_delivered INTEGER DEFAULT 0,
    touchpoints_opened INTEGER DEFAULT 0,
    touchpoints_clicked INTEGER DEFAULT 0,
    
    -- Delivery metrics
    bounce_rate DECIMAL(5,4) DEFAULT 0,
    unsubscribe_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Timing metrics
    avg_time_to_completion_minutes INTEGER DEFAULT 0,
    avg_time_to_conversion_minutes INTEGER DEFAULT 0,
    
    -- Revenue/Value metrics
    total_value DECIMAL(12,2) DEFAULT 0,
    avg_value_per_conversion DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(journey_id, date)
);

-- Touchpoint performance metrics
CREATE TABLE IF NOT EXISTS touchpoint_performance_metrics (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    touchpoint_id TEXT NOT NULL REFERENCES touchpoints(id) ON DELETE CASCADE,
    journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Engagement metrics
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,
    unsubscribed INTEGER DEFAULT 0,
    
    -- Rate metrics
    open_rate DECIMAL(5,4) DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    reply_rate DECIMAL(5,4) DEFAULT 0,
    bounce_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Drop-off tracking
    drop_offs INTEGER DEFAULT 0,
    drop_off_rate DECIMAL(5,4) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(touchpoint_id, date)
);

-- A/B test results table
CREATE TABLE IF NOT EXISTS ab_test_results (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    touchpoint_id TEXT REFERENCES touchpoints(id) ON DELETE SET NULL,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    test_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(255) NOT NULL,
    variant_type VARCHAR(50) NOT NULL, -- 'control', 'treatment_a', 'treatment_b', etc.
    
    -- Traffic split
    participants INTEGER DEFAULT 0,
    traffic_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Metrics
    conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    click_rate DECIMAL(5,4) DEFAULT 0,
    opens INTEGER DEFAULT 0,
    open_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Statistical significance
    confidence_level DECIMAL(5,4) DEFAULT 0,
    is_winner BOOLEAN DEFAULT FALSE,
    improvement_percentage DECIMAL(6,2) DEFAULT 0,
    
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'paused'
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_variant_type CHECK (variant_type IN ('control', 'treatment_a', 'treatment_b', 'treatment_c')),
    CONSTRAINT valid_test_status CHECK (status IN ('running', 'completed', 'paused', 'draft'))
);

-- Journey funnel stages tracking
CREATE TABLE IF NOT EXISTS journey_funnel_stages (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    journey_id TEXT NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    stage_name VARCHAR(255) NOT NULL,
    stage_order INTEGER NOT NULL,
    
    -- Stage metrics
    entered_count INTEGER DEFAULT 0,
    completed_count INTEGER DEFAULT 0,
    dropped_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    avg_time_in_stage_minutes INTEGER DEFAULT 0,
    
    -- Associated touchpoint
    touchpoint_id TEXT REFERENCES touchpoints(id) ON DELETE SET NULL,
    
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(journey_id, stage_name, date)
);

-- Client analytics summary (for dashboard aggregations)
CREATE TABLE IF NOT EXISTS client_analytics_summary (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    client_id TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Journey metrics
    active_journeys INTEGER DEFAULT 0,
    total_journey_runs INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    overall_conversion_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Touchpoint metrics
    total_touchpoints_sent INTEGER DEFAULT 0,
    avg_open_rate DECIMAL(5,4) DEFAULT 0,
    avg_click_rate DECIMAL(5,4) DEFAULT 0,
    avg_bounce_rate DECIMAL(5,4) DEFAULT 0,
    
    -- Performance metrics
    avg_time_to_conversion_minutes INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(client_id, date)
);

-- Create indexes for performance (supporting 10,000+ active journeys)
CREATE INDEX IF NOT EXISTS idx_analytics_events_journey_id ON journey_analytics_events(journey_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_client_id ON journey_analytics_events(client_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON journey_analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON journey_analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_journey_event_created ON journey_analytics_events(journey_id, event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_journey_metrics_journey_id ON journey_performance_metrics(journey_id);
CREATE INDEX IF NOT EXISTS idx_journey_metrics_client_id ON journey_performance_metrics(client_id);
CREATE INDEX IF NOT EXISTS idx_journey_metrics_date ON journey_performance_metrics(date);
CREATE INDEX IF NOT EXISTS idx_journey_metrics_journey_date ON journey_performance_metrics(journey_id, date);

CREATE INDEX IF NOT EXISTS idx_touchpoint_metrics_touchpoint_id ON touchpoint_performance_metrics(touchpoint_id);
CREATE INDEX IF NOT EXISTS idx_touchpoint_metrics_journey_id ON touchpoint_performance_metrics(journey_id);
CREATE INDEX IF NOT EXISTS idx_touchpoint_metrics_date ON touchpoint_performance_metrics(date);

CREATE INDEX IF NOT EXISTS idx_ab_test_journey_id ON ab_test_results(journey_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_client_id ON ab_test_results(client_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_status ON ab_test_results(status);

CREATE INDEX IF NOT EXISTS idx_funnel_stages_journey_id ON journey_funnel_stages(journey_id);
CREATE INDEX IF NOT EXISTS idx_funnel_stages_date ON journey_funnel_stages(date);

CREATE INDEX IF NOT EXISTS idx_client_summary_client_id ON client_analytics_summary(client_id);
CREATE INDEX IF NOT EXISTS idx_client_summary_date ON client_analytics_summary(date);

-- Add performance indexes for time-series queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_timeseries ON journey_analytics_events(created_at DESC, client_id, event_type);
CREATE INDEX IF NOT EXISTS idx_journey_metrics_timeseries ON journey_performance_metrics(date DESC, client_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_journey_performance_metrics_updated_at BEFORE UPDATE ON journey_performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_touchpoint_performance_metrics_updated_at BEFORE UPDATE ON touchpoint_performance_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ab_test_results_updated_at BEFORE UPDATE ON ab_test_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_journey_funnel_stages_updated_at BEFORE UPDATE ON journey_funnel_stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_analytics_summary_updated_at BEFORE UPDATE ON client_analytics_summary
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add analytics metadata to journeys table
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS analytics_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE journeys ADD COLUMN IF NOT EXISTS analytics_config JSONB DEFAULT '{}';
