-- ============================================
-- RATE LIMITING SYSTEM - P1 Q3 2026
-- Comprehensive API Rate Limiting & Throttling
-- ============================================

-- Rate Limit Tiers Configuration
CREATE TABLE rate_limit_tiers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL, -- free, basic, premium, enterprise
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- General API limits
    requests_per_minute INTEGER NOT NULL DEFAULT 60,
    requests_per_hour INTEGER NOT NULL DEFAULT 1000,
    requests_per_day INTEGER NOT NULL DEFAULT 10000,
    
    -- Burst capacity (token bucket)
    burst_capacity INTEGER NOT NULL DEFAULT 10,
    
    -- Specific endpoint limits (JSON config)
    endpoint_limits JSONB NOT NULL DEFAULT '{}',
    
    -- Window strategy: fixed_window, sliding_window, token_bucket
    window_strategy VARCHAR(30) NOT NULL DEFAULT 'sliding_window',
    
    -- Rate limit headers enabled
    headers_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Retry configuration
    retry_after_enabled BOOLEAN NOT NULL DEFAULT true,
    
    -- Metadata
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Limit Usage Tracking (for persistence across restarts)
CREATE TABLE rate_limit_usage (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL, -- API key, IP, or user ID
    identifier_type VARCHAR(50) NOT NULL, -- api_key, ip, user_id, client_id
    tier_id INTEGER REFERENCES rate_limit_tiers(id),
    
    -- Current window tracking
    window_start TIMESTAMP WITH TIME ZONE NOT NULL,
    window_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Usage counts
    requests_count INTEGER NOT NULL DEFAULT 0,
    
    -- Token bucket specific
    tokens_remaining DECIMAL(10,2) DEFAULT NULL,
    last_refill_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(identifier, window_start)
);

-- API Keys with rate limiting
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    
    -- Key details
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL, -- Hashed key value
    key_prefix VARCHAR(20) NOT NULL, -- First few chars for identification
    
    -- Rate limiting
    tier_id INTEGER REFERENCES rate_limit_tiers(id),
    custom_limits JSONB DEFAULT NULL, -- Override tier limits
    
    -- Scoping
    scopes JSONB NOT NULL DEFAULT '["read"]',
    allowed_ips JSONB DEFAULT NULL, -- IP whitelist
    allowed_routes JSONB DEFAULT NULL, -- Route restrictions
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, revoked, expired
    expires_at TIMESTAMP WITH TIME ZONE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage statistics
    total_requests INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Limit Violations Log
CREATE TABLE rate_limit_violations (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    identifier_type VARCHAR(50) NOT NULL,
    tier_id INTEGER REFERENCES rate_limit_tiers(id),
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    
    -- Request details
    route VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    
    -- Violation details
    limit_type VARCHAR(50) NOT NULL, -- per_minute, per_hour, per_day, burst
    limit_value INTEGER NOT NULL,
    requests_made INTEGER NOT NULL,
    
    -- Response
    retry_after INTEGER, -- seconds
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rate Limit Exemptions (whitelisted IPs/keys)
CREATE TABLE rate_limit_exemptions (
    id SERIAL PRIMARY KEY,
    identifier VARCHAR(255) NOT NULL,
    identifier_type VARCHAR(50) NOT NULL, -- ip, api_key, user_id
    
    -- Exemption scope
    reason TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Override limits (NULL means unlimited)
    override_tier_id INTEGER REFERENCES rate_limit_tiers(id),
    
    created_by TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(identifier, identifier_type)
);

-- Insert default tiers
INSERT INTO rate_limit_tiers (
    name, display_name, description,
    requests_per_minute, requests_per_hour, requests_per_day,
    burst_capacity, endpoint_limits, window_strategy
) VALUES 
(
    'free',
    'Free Tier',
    'Basic rate limiting for free users',
    30, 500, 5000,
    5,
    '{"auth": {"requests_per_minute": 10}, "public": {"requests_per_minute": 60}}'::jsonb,
    'sliding_window'
),
(
    'basic',
    'Basic Tier',
    'Standard rate limiting for basic subscribers',
    100, 5000, 50000,
    15,
    '{"auth": {"requests_per_minute": 30}, "public": {"requests_per_minute": 120}}'::jsonb,
    'sliding_window'
),
(
    'premium',
    'Premium Tier',
    'Enhanced rate limiting for premium subscribers',
    300, 20000, 200000,
    50,
    '{"auth": {"requests_per_minute": 100}, "public": {"requests_per_minute": 400}}'::jsonb,
    'token_bucket'
),
(
    'enterprise',
    'Enterprise Tier',
    'High-volume rate limiting for enterprise customers',
    1000, 100000, 1000000,
    200,
    '{"auth": {"requests_per_minute": 300}, "public": {"requests_per_minute": 1200}}'::jsonb,
    'token_bucket'
);

-- Create indexes for performance
CREATE INDEX idx_rate_limit_usage_identifier ON rate_limit_usage(identifier, window_start);
CREATE INDEX idx_rate_limit_usage_window ON rate_limit_usage(window_end);
CREATE INDEX idx_rate_limit_usage_tier ON rate_limit_usage(tier_id);

CREATE INDEX idx_api_keys_client ON api_keys(client_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_status ON api_keys(status);
CREATE INDEX idx_api_keys_tier ON api_keys(tier_id);

CREATE INDEX idx_rate_limit_violations_identifier ON rate_limit_violations(identifier, created_at);
CREATE INDEX idx_rate_limit_violations_created ON rate_limit_violations(created_at);
CREATE INDEX idx_rate_limit_violations_tier ON rate_limit_violations(tier_id);

CREATE INDEX idx_rate_limit_exemptions_identifier ON rate_limit_exemptions(identifier, identifier_type);

-- Add rate_limit_tier to clients table
ALTER TABLE clients ADD COLUMN rate_limit_tier_id INTEGER REFERENCES rate_limit_tiers(id) ON DELETE SET NULL;

-- Update existing clients to basic tier by default
UPDATE clients SET rate_limit_tier_id = (SELECT id FROM rate_limit_tiers WHERE name = 'basic');

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_rate_limit_tiers_updated_at BEFORE UPDATE ON rate_limit_tiers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limit_usage_updated_at BEFORE UPDATE ON rate_limit_usage
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rate_limit_exemptions_updated_at BEFORE UPDATE ON rate_limit_exemptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
