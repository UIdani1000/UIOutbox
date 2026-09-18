-- =============================================================================
-- UIOutbox: Supabase / PostgreSQL Database Schema
-- Private Outbound-Sales CRM & Outreach Operating System for UI Dani (UIDani)
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Profiles Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE,
    display_name TEXT NOT NULL DEFAULT 'UI Dani',
    business_name TEXT NOT NULL DEFAULT 'UIDani',
    email TEXT NOT NULL DEFAULT 'big.nssien@gmail.com',
    website TEXT DEFAULT 'https://bignssien.wixstudio.com/uidani',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Case Studies Table
-- Library of case studies, videos, thumbnails, and creative assets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_studies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    niche TEXT,
    offer TEXT,
    portfolio_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Follow-up Sequences & Steps
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS follow_up_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    campaign_id UUID,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_up_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES follow_up_sequences(id) ON DELETE CASCADE,
    step_number INT NOT NULL,
    delay_days INT NOT NULL DEFAULT 0,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Campaigns Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'researching', 'ready', 'active', 'paused', 'completed')),
    niche TEXT,
    offer TEXT,
    target_market TEXT,
    target_company_type TEXT,
    daily_target INT NOT NULL DEFAULT 50,
    language_strategy TEXT NOT NULL DEFAULT 'Adaptive',
    case_study_id UUID REFERENCES case_studies(id) ON DELETE SET NULL,
    follow_up_sequence_id UUID REFERENCES follow_up_sequences(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    launched_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 5. Companies Table
-- Stores company directory with domain-based deduplication
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    company_name TEXT NOT NULL,
    website TEXT,
    domain TEXT NOT NULL,
    industry TEXT,
    country TEXT,
    city TEXT,
    company_size TEXT,
    description TEXT,
    source TEXT DEFAULT 'manual',
    source_reference TEXT,
    qualification_status TEXT DEFAULT 'unqualified',
    contact_status TEXT DEFAULT 'not_contacted',
    first_contacted_at TIMESTAMPTZ,
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_user_domain UNIQUE (user_id, domain)
);

-- -----------------------------------------------------------------------------
-- 6. Contacts Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID,
    first_name TEXT,
    last_name TEXT,
    full_name TEXT NOT NULL,
    job_title TEXT,
    email TEXT,
    email_status TEXT DEFAULT 'unverified' CHECK (email_status IN ('unverified', 'verified', 'bounced', 'catchall')),
    linkedin_url TEXT,
    other_profile_url TEXT,
    is_primary_contact BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 7. Leads Table (Relationship between Company/Contact and Campaign)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'new' CHECK (
        status IN (
            'new', 'researching', 'qualified', 'rejected', 'ready',
            'approved', 'contacted', 'follow_up', 'replied',
            'interested', 'meeting', 'won', 'lost', 'do_not_contact'
        )
    ),
    qualification_score INT DEFAULT 0,
    qualification_reason TEXT,
    research_status TEXT DEFAULT 'pending',
    personalization_status TEXT DEFAULT 'pending',
    outreach_status TEXT DEFAULT 'not_started',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_campaign_company UNIQUE (campaign_id, company_id)
);

-- -----------------------------------------------------------------------------
-- 8. Email Templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    name TEXT NOT NULL,
    subject_template TEXT NOT NULL,
    body_template TEXT NOT NULL,
    purpose TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 9. Email Messages Table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
    case_study_id UUID REFERENCES case_studies(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (
        status IN (
            'draft', 'ai_generated', 'needs_review', 'approved',
            'scheduled', 'sent', 'delivered', 'bounced', 'replied', 'cancelled'
        )
    ),
    provider TEXT DEFAULT 'manual',
    provider_message_id TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10. Activities (Permanent Audit Trail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 11. Lead Research Table (Campaign-Specific Qualitative Research Briefs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lead_research (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    website TEXT,
    domain TEXT NOT NULL,
    industry TEXT,
    country TEXT,
    city TEXT,
    company_overview TEXT,
    products JSONB DEFAULT '[]'::jsonb,
    target_audience TEXT,
    brand_positioning TEXT,
    visual_style TEXT,
    marketing_channels JSONB DEFAULT '[]'::jsonb,
    product_marketing_observations TEXT,
    content_observations TEXT,
    potential_animation_opportunity TEXT,
    personalization_angle TEXT,
    language_signal TEXT,
    research_confidence INT DEFAULT 85,
    research_status TEXT DEFAULT 'completed' CHECK (research_status IN ('not_started', 'queued', 'researching', 'completed', 'failed')),
    raw_research_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_lead_campaign_research UNIQUE (lead_id, campaign_id)
);

-- -----------------------------------------------------------------------------
-- 12. Gmail OAuth Connections (Production OAuth Credential Persistence)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS gmail_oauth_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_email TEXT NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    scopes TEXT[],
    connection_status TEXT NOT NULL DEFAULT 'connected' CHECK (connection_status IN ('connected', 'reauth_required', 'disconnected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_studies ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_research ENABLE ROW LEVEL SECURITY;
ALTER TABLE gmail_oauth_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service and authenticated access to gmail oauth connections" ON gmail_oauth_connections
    FOR ALL USING (true) WITH CHECK (true);

-- Profile policy
CREATE POLICY "Users can access their own profile" ON profiles
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Campaigns policy
CREATE POLICY "Users can access their own campaigns" ON campaigns
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Case studies policy
CREATE POLICY "Users can access their own case studies" ON case_studies
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Companies policy
CREATE POLICY "Users can access their own companies" ON companies
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Contacts policy
CREATE POLICY "Users can access their own contacts" ON contacts
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Leads policy
CREATE POLICY "Users can access their own leads" ON leads
    FOR ALL USING (
        campaign_id IN (
            SELECT id FROM campaigns WHERE auth.uid() = user_id OR user_id IS NULL
        )
    );

-- Sequences & Steps policy
CREATE POLICY "Users can access their follow up sequences" ON follow_up_sequences
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their follow up steps" ON follow_up_steps
    FOR ALL USING (
        sequence_id IN (
            SELECT id FROM follow_up_sequences WHERE auth.uid() = user_id OR user_id IS NULL
        )
    );

-- Email templates & messages policy
CREATE POLICY "Users can access their email templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can access their email messages" ON email_messages
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- Activities policy
CREATE POLICY "Users can access their activities" ON activities
    FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- =============================================================================
-- Initial Seed Data for UI Dani
-- =============================================================================
INSERT INTO profiles (display_name, business_name, email, website)
VALUES (
    'UI Dani',
    'UIDani',
    'big.nssien@gmail.com',
    'https://bignssien.wixstudio.com/uidani'
) ON CONFLICT DO NOTHING;

-- Default 4-step sequence
WITH new_seq AS (
    INSERT INTO follow_up_sequences (name, status)
    VALUES ('Standard 4-Step Designer Sequence', 'active')
    RETURNING id
)
INSERT INTO follow_up_steps (sequence_id, step_number, delay_days, subject_template, body_template, active)
SELECT id, 0, 0, 'Quick question regarding {{company_name}} product design', 'Hi {{first_name}},\n\nI noticed {{company_name}}''s latest product interface. We recently crafted a product ad video and interface animation for a similar brand that significantly boosted conversion.\n\nWould you be open to seeing a 45-second creative teardown?', TRUE FROM new_seq
UNION ALL
SELECT id, 1, 3, 'Re: Quick question regarding {{company_name}} product design', 'Hi {{first_name}},\n\nFollowing up on my previous note. Here is the direct link to the case study video: {{case_study_url}}\n\nLet me know if you would like me to prepare a bespoke concept for {{company_name}}.', TRUE FROM new_seq
UNION ALL
SELECT id, 2, 7, 'Design concept ideas for {{company_name}}', 'Hi {{first_name}},\n\nI put together 2 quick animation ideas tailored for {{company_name}}''s upcoming release.\n\nWorth a 5-minute sync this week?', TRUE FROM new_seq
UNION ALL
SELECT id, 3, 14, 'Final note / UI Dani', 'Hi {{first_name}},\n\nAssuming you are all set on the creative/product design front right now. I will keep an eye on {{company_name}}''s growth and reconnect down the road!\n\nBest,\nUI Dani', TRUE FROM new_seq;
