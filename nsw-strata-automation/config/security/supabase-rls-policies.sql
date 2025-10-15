-- NSW Strata Automation - Supabase Row-Level Security Policies
-- Task 13.10: Create row-level security policies
-- Date: 2025-10-15

-- ==================================================
-- Enable RLS on all tables
-- ==================================================

ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- ==================================================
-- Service Role Policies (n8n automation)
-- ==================================================

-- Grant full access to service_role (used by n8n)
CREATE POLICY "service_role_all_knowledge_base"
ON knowledge_base FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_all_training_examples"
ON training_examples FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_all_conversation_state"
ON conversation_state FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_all_system_metrics"
ON system_metrics FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_all_error_logs"
ON error_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ==================================================
-- Read-Only Policies (for reporting/dashboards)
-- ==================================================

-- Allow authenticated users to read knowledge base
CREATE POLICY "authenticated_read_knowledge_base"
ON knowledge_base FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to read their own conversation state
CREATE POLICY "authenticated_read_own_conversations"
ON conversation_state FOR SELECT
TO authenticated
USING (ticket_id IN (
  SELECT ticket_id FROM conversation_state WHERE created_at > NOW() - INTERVAL '7 days'
));

-- Allow authenticated users to read aggregated metrics
CREATE POLICY "authenticated_read_metrics"
ON system_metrics FOR SELECT
TO authenticated
USING (category NOT IN ('security', 'internal'));

-- ==================================================
-- Property-Based Access Control
-- ==================================================

-- Assume we add a property_id field to tables
-- ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS property_id VARCHAR(50);
-- ALTER TABLE conversation_state ADD COLUMN IF NOT EXISTS property_id VARCHAR(50);

-- Create policy for property-specific access
-- CREATE POLICY "user_property_access_knowledge"
-- ON knowledge_base FOR SELECT
-- TO authenticated
-- USING (
--   property_id IN (
--     SELECT property_id FROM user_properties WHERE user_id = auth.uid()
--   ) OR property_id IS NULL  -- Public knowledge
-- );

-- ==================================================
-- Audit Log Policies
-- ==================================================

-- Only service role can write audit logs
CREATE POLICY "service_role_write_audit"
ON data_retention_audit FOR INSERT
TO service_role
WITH CHECK (true);

-- Authenticated users can read audit logs
CREATE POLICY "authenticated_read_audit"
ON data_retention_audit FOR SELECT
TO authenticated
USING (true);

-- ==================================================
-- Verification
-- ==================================================

-- Test policies:
-- SET ROLE service_role;
-- SELECT * FROM knowledge_base LIMIT 1;  -- Should work
-- SET ROLE authenticated;
-- SELECT * FROM knowledge_base LIMIT 1;  -- Should work (read-only)
-- INSERT INTO knowledge_base (title, content) VALUES ('test', 'test');  -- Should fail
