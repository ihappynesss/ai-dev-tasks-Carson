-- NSW Strata Automation - Audit Logging
-- Task 13.11: Implement audit logging for all knowledge base modifications
-- Task 13.12: Configure n8n audit logs for workflow changes
-- Date: 2025-10-15

-- ==================================================
-- Knowledge Base Audit Table (Task 13.11)
-- ==================================================

CREATE TABLE IF NOT EXISTS knowledge_base_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  knowledge_id UUID REFERENCES knowledge_base(id) ON DELETE SET NULL,
  operation VARCHAR(20) NOT NULL,  -- INSERT, UPDATE, DELETE
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  user_id UUID REFERENCES auth.users(id),
  user_email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_kb_audit_knowledge_id ON knowledge_base_audit(knowledge_id, timestamp DESC);
CREATE INDEX idx_kb_audit_operation ON knowledge_base_audit(operation, timestamp DESC);
CREATE INDEX idx_kb_audit_user ON knowledge_base_audit(user_id, timestamp DESC);

-- ==================================================
-- Audit Trigger Functions
-- ==================================================

-- Function: Audit knowledge base INSERT
CREATE OR REPLACE FUNCTION audit_knowledge_base_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO knowledge_base_audit (
    knowledge_id,
    operation,
    new_data,
    user_email
  ) VALUES (
    NEW.id,
    'INSERT',
    row_to_json(NEW)::jsonb,
    CURRENT_USER
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Audit knowledge base UPDATE
CREATE OR REPLACE FUNCTION audit_knowledge_base_update()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[] := '{}';
BEGIN
  -- Detect changed fields
  IF OLD.title != NEW.title THEN
    changed_fields := array_append(changed_fields, 'title');
  END IF;
  IF OLD.content != NEW.content THEN
    changed_fields := array_append(changed_fields, 'content');
  END IF;
  IF OLD.metadata != NEW.metadata THEN
    changed_fields := array_append(changed_fields, 'metadata');
  END IF;

  INSERT INTO knowledge_base_audit (
    knowledge_id,
    operation,
    old_data,
    new_data,
    changed_fields,
    user_email
  ) VALUES (
    NEW.id,
    'UPDATE',
    row_to_json(OLD)::jsonb,
    row_to_json(NEW)::jsonb,
    changed_fields,
    CURRENT_USER
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Audit knowledge base DELETE
CREATE OR REPLACE FUNCTION audit_knowledge_base_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO knowledge_base_audit (
    knowledge_id,
    operation,
    old_data,
    user_email
  ) VALUES (
    OLD.id,
    'DELETE',
    row_to_json(OLD)::jsonb,
    CURRENT_USER
  );
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- Create Audit Triggers
-- ==================================================

CREATE TRIGGER knowledge_base_insert_audit
  AFTER INSERT ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION audit_knowledge_base_insert();

CREATE TRIGGER knowledge_base_update_audit
  AFTER UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION audit_knowledge_base_update();

CREATE TRIGGER knowledge_base_delete_audit
  AFTER DELETE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION audit_knowledge_base_delete();

-- ==================================================
-- n8n Workflow Audit Table (Task 13.12)
-- ==================================================

CREATE TABLE IF NOT EXISTS workflow_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workflow_id VARCHAR(100),
  workflow_name VARCHAR(200),
  operation VARCHAR(20) NOT NULL,  -- CREATE, UPDATE, DELETE, ACTIVATE, DEACTIVATE, EXECUTE
  old_data JSONB,
  new_data JSONB,
  changed_nodes TEXT[],
  user_id UUID,
  user_email VARCHAR(255),
  execution_id VARCHAR(100),
  success BOOLEAN,
  error_message TEXT,
  ip_address INET,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_workflow_audit_workflow_id ON workflow_audit(workflow_id, timestamp DESC);
CREATE INDEX idx_workflow_audit_operation ON workflow_audit(operation, timestamp DESC);
CREATE INDEX idx_workflow_audit_user ON workflow_audit(user_email, timestamp DESC);

-- ==================================================
-- Audit Query Functions
-- ==================================================

-- Get audit history for specific knowledge entry
CREATE OR REPLACE FUNCTION get_knowledge_audit_history(p_knowledge_id UUID)
RETURNS TABLE (
  operation VARCHAR,
  changed_fields TEXT[],
  changed_by VARCHAR,
  changed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ka.operation,
    ka.changed_fields,
    ka.user_email,
    ka.timestamp
  FROM knowledge_base_audit ka
  WHERE ka.knowledge_id = p_knowledge_id
  ORDER BY ka.timestamp DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get recent changes by user
CREATE OR REPLACE FUNCTION get_user_audit_history(p_user_email VARCHAR, p_limit INT DEFAULT 100)
RETURNS TABLE (
  table_name VARCHAR,
  operation VARCHAR,
  record_id UUID,
  changed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  (
    SELECT
      'knowledge_base'::VARCHAR,
      ka.operation,
      ka.knowledge_id,
      ka.timestamp
    FROM knowledge_base_audit ka
    WHERE ka.user_email = p_user_email
  )
  UNION ALL
  (
    SELECT
      'workflow'::VARCHAR,
      wa.operation,
      wa.id,
      wa.timestamp
    FROM workflow_audit wa
    WHERE wa.user_email = p_user_email
  )
  ORDER BY changed_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================================================
-- Audit Retention Policy
-- ==================================================

-- Archive audit logs older than 7 years
CREATE OR REPLACE FUNCTION archive_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM knowledge_base_audit
  WHERE timestamp < NOW() - INTERVAL '7 years';

  DELETE FROM workflow_audit
  WHERE timestamp < NOW() - INTERVAL '7 years';

  RAISE NOTICE 'Archived audit logs older than 7 years';
END;
$$ LANGUAGE plpgsql;

-- ==================================================
-- Audit Log Monitoring
-- ==================================================

-- Create view for suspicious activities
CREATE OR REPLACE VIEW suspicious_audit_activities AS
SELECT
  'knowledge_base' AS table_name,
  user_email,
  COUNT(*) AS operation_count,
  operation,
  DATE_TRUNC('hour', timestamp) AS hour
FROM knowledge_base_audit
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_email, operation, DATE_TRUNC('hour', timestamp)
HAVING COUNT(*) > 50  -- More than 50 operations per hour
UNION ALL
SELECT
  'workflow' AS table_name,
  user_email,
  COUNT(*) AS operation_count,
  operation,
  DATE_TRUNC('hour', timestamp) AS hour
FROM workflow_audit
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY user_email, operation, DATE_TRUNC('hour', timestamp)
HAVING COUNT(*) > 20;  -- More than 20 workflow operations per hour

-- ==================================================
-- Example Queries
-- ==================================================

-- Get all changes to specific knowledge entry
-- SELECT * FROM get_knowledge_audit_history('uuid-here');

-- Get recent changes by user
-- SELECT * FROM get_user_audit_history('user@example.com', 50);

-- View suspicious activities
-- SELECT * FROM suspicious_audit_activities;

-- Get deleted knowledge entries (for recovery)
-- SELECT old_data
-- FROM knowledge_base_audit
-- WHERE operation = 'DELETE'
-- AND timestamp > NOW() - INTERVAL '30 days'
-- ORDER BY timestamp DESC;
