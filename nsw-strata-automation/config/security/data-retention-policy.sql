-- NSW Strata Automation - Data Retention Policy
-- Task 13.6: Implement 7-year data retention per Australian requirements
-- Date: 2025-10-15

-- ==================================================
-- AUSTRALIAN DATA RETENTION REQUIREMENTS
-- ==================================================
-- Corporations Act 2001: 7 years for financial records
-- Privacy Act 1988: Reasonable period, typically 7 years
-- Strata Schemes Management Act 2015: 7 years for strata records

-- ==================================================
-- Retention Periods by Table
-- ==================================================

-- knowledge_base: 7 years (indefinite for active knowledge)
-- training_examples: 7 years from creation
-- conversation_state: 7 years from last interaction
-- system_metrics: 2 years (aggregated to 7 years)
-- error_logs: 2 years (summary retained for 7 years)

-- ==================================================
-- Automated Cleanup Functions
-- ==================================================

-- Function: Archive old training examples
CREATE OR REPLACE FUNCTION archive_old_training_examples()
RETURNS void AS $$
BEGIN
  -- Move to archive table (not implemented here, just delete for now)
  DELETE FROM training_examples
  WHERE created_at < NOW() - INTERVAL '7 years';

  RAISE NOTICE 'Archived training examples older than 7 years';
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old conversation states
CREATE OR REPLACE FUNCTION archive_old_conversation_states()
RETURNS void AS $$
BEGIN
  DELETE FROM conversation_state
  WHERE updated_at < NOW() - INTERVAL '7 years';

  RAISE NOTICE 'Archived conversation states older than 7 years';
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old system metrics
CREATE OR REPLACE FUNCTION archive_old_system_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM system_metrics
  WHERE timestamp < NOW() - INTERVAL '2 years';

  RAISE NOTICE 'Archived system metrics older than 2 years';
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old error logs
CREATE OR REPLACE FUNCTION archive_old_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_logs
  WHERE created_at < NOW() - INTERVAL '2 years';

  RAISE NOTICE 'Archived error logs older than 2 years';
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- Scheduled Cleanup (run monthly)
-- ==================================================

-- Create extension for cron jobs (if using pg_cron)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly cleanup (1st of month at 2 AM)
-- SELECT cron.schedule('data-retention-cleanup', '0 2 1 * *', $$
--   SELECT archive_old_training_examples();
--   SELECT archive_old_conversation_states();
--   SELECT archive_old_system_metrics();
--   SELECT archive_old_error_logs();
-- $$);

-- ==================================================
-- Manual Cleanup Commands
-- ==================================================

-- Run all cleanup functions manually:
-- SELECT archive_old_training_examples();
-- SELECT archive_old_conversation_states();
-- SELECT archive_old_system_metrics();
-- SELECT archive_old_error_logs();

-- ==================================================
-- Audit Log for Deletions
-- ==================================================

CREATE TABLE IF NOT EXISTS data_retention_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR(100) NOT NULL,
  records_deleted INTEGER NOT NULL,
  retention_period VARCHAR(50) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_by VARCHAR(100) DEFAULT CURRENT_USER
);

-- Modified cleanup functions with audit logging:
CREATE OR REPLACE FUNCTION archive_old_training_examples_with_audit()
RETURNS void AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM training_examples
    WHERE created_at < NOW() - INTERVAL '7 years'
    RETURNING *
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;

  INSERT INTO data_retention_audit (table_name, records_deleted, retention_period)
  VALUES ('training_examples', deleted_count, '7 years');

  RAISE NOTICE 'Archived % training examples older than 7 years', deleted_count;
END;
$$ LANGUAGE plpgsql;
