# NSW Strata Automation - Security Incident Response Procedures
# Task 13.15: Create security incident response procedures
# Date: 2025-10-15

## Overview

Comprehensive procedures for identifying, responding to, and recovering from security incidents.

---

## Incident Classification

### Severity Levels

**P0 - Critical** (Respond immediately)
- Data breach with PII exposure
- Complete system compromise
- Ransomware attack
- Unauthorized root/admin access
- Service outage affecting all users

**P1 - High** (Respond within 1 hour)
- Unauthorized access to sensitive data
- DDoS attack affecting availability
- Malware detection
- Privilege escalation
- Multiple failed security controls

**P2 - Medium** (Respond within 4 hours)
- Suspicious activity detected
- Single system compromise
- Failed intrusion attempt
- Unusual API usage patterns
- Security misconfiguration

**P3 - Low** (Respond within 24 hours)
- Policy violations
- Low-risk vulnerability discoveries
- Spam or phishing attempts
- Minor security events

---

## Phase 1: Detection & Initial Response

### Detection Methods

1. **Automated Monitoring**
   - Prometheus alerts (error rates, unusual traffic)
   - Supabase row-level security violations
   - Failed authentication attempts (>5 in 15 minutes)
   - Unusual API usage patterns
   - System resource anomalies

2. **Manual Detection**
   - User reports of suspicious activity
   - Audit log reviews
   - Security tool scans
   - Third-party notifications

### Immediate Actions (Within 15 minutes)

```bash
#!/bin/bash
# Emergency response script

# 1. Isolate affected systems
docker-compose stop n8n  # Stop affected service

# 2. Preserve evidence
docker-compose logs n8n > /var/log/incident-$(date +%Y%m%d-%H%M%S).log
pg_dump -h localhost -U postgres n8n > /var/backups/incident-db-$(date +%Y%m%d-%H%M%S).sql

# 3. Alert team
curl -X POST https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚨 SECURITY INCIDENT DETECTED - Level P0"}'

# 4. Enable incident mode
echo "INCIDENT_MODE=true" >> .env
docker-compose -f docker-compose.yml -f docker-compose.incident.yml up -d
```

---

## Phase 2: Investigation & Containment

### Investigation Checklist

- [ ] Identify affected systems and data
- [ ] Determine attack vector and timeline
- [ ] Assess scope of compromise
- [ ] Identify attackers (IPs, user accounts)
- [ ] Review audit logs and access logs
- [ ] Check for persistence mechanisms
- [ ] Document all findings

### Evidence Collection

```bash
# System logs
docker-compose logs --since 24h > logs/docker-$(date +%Y%m%d).log

# Database audit logs
psql -h localhost -U postgres -d n8n -c "
  SELECT * FROM knowledge_base_audit
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  ORDER BY timestamp DESC;
" > evidence/db-audit-$(date +%Y%m%d).csv

# Authentication logs
psql -h localhost -U postgres -d n8n -c "
  SELECT * FROM auth_audit_log
  WHERE timestamp > NOW() - INTERVAL '24 hours'
  AND (success = false OR event_type = 'failed_login')
  ORDER BY timestamp DESC;
" > evidence/auth-audit-$(date +%Y%m%d).csv

# Network traffic logs
tcpdump -i eth0 -w evidence/network-$(date +%Y%m%d).pcap
```

### Containment Actions

**Level P0/P1**
1. Isolate affected systems from network
2. Revoke compromised credentials
3. Block attacker IP addresses
4. Disable affected user accounts
5. Reset all API keys
6. Enable enhanced logging

**Level P2/P3**
1. Monitor suspicious activity
2. Apply security patches
3. Update firewall rules
4. Increase logging verbosity

---

## Phase 3: Eradication & Recovery

### Eradication Steps

```bash
# 1. Remove malware/backdoors
find /var/www -name "*.php" -mtime -1 -ls  # Recent suspicious files
docker system prune -af  # Clean all containers and images

# 2. Patch vulnerabilities
apt-get update && apt-get upgrade -y
npm audit fix --force

# 3. Reset credentials
./scripts/rotate-all-credentials.sh

# 4. Rebuild from clean backups
docker-compose down
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d --build

# 5. Restore data from pre-incident backup
pg_restore -h localhost -U postgres -d n8n /var/backups/clean-backup.sql
```

### Recovery Verification

- [ ] All systems operational
- [ ] No unauthorized access detected
- [ ] All vulnerabilities patched
- [ ] Monitoring systems operational
- [ ] Backups verified
- [ ] Security controls tested

---

## Phase 4: Post-Incident Analysis

### Incident Report Template

```markdown
# Security Incident Report

**Incident ID**: INC-2025-001
**Severity**: P1 - High
**Date Detected**: 2025-10-15 14:30 UTC
**Date Resolved**: 2025-10-15 18:45 UTC

## Executive Summary
Brief description of incident, impact, and resolution.

## Timeline
- 14:30 UTC: Unusual API activity detected by Prometheus
- 14:35 UTC: Investigation initiated
- 14:45 UTC: Unauthorized access confirmed
- 15:00 UTC: Affected systems isolated
- 15:30 UTC: Credentials rotated
- 16:00 UTC: Vulnerability patched
- 17:00 UTC: Systems restored
- 18:45 UTC: Incident closed

## Technical Details
- Attack vector: SQL injection in custom webhook handler
- Affected systems: n8n workflow engine, PostgreSQL database
- Data accessed: 150 ticket records (non-PII)
- Attacker IP: 203.0.113.42
- Persistence: None detected

## Impact Assessment
- **Users affected**: 0 (no PII exposed)
- **Downtime**: 2 hours 15 minutes
- **Data loss**: None
- **Financial impact**: $0
- **Reputational impact**: Low (contained before public awareness)

## Root Cause
Insufficient input validation in custom webhook handler (webhook-signature-verification.js:142) allowed SQL injection attack.

## Remediation Actions Taken
1. Patched SQL injection vulnerability
2. Added input sanitization
3. Rotated all database credentials
4. Blocked attacker IP
5. Enhanced monitoring for similar attacks

## Lessons Learned
- Input validation must be applied consistently across all endpoints
- Automated security testing should cover custom code
- Faster detection possible with stricter SQL query monitoring

## Recommendations
1. Implement automated code security scanning (Snyk, SonarQube)
2. Add rate limiting to all webhook endpoints
3. Enable database query logging for anomaly detection
4. Conduct security training for development team
5. Schedule quarterly penetration testing

**Report Author**: Security Team
**Date**: 2025-10-16
```

---

## Communication Procedures

### Internal Notification

**Immediate (P0/P1)**
- Slack: #security-incidents channel
- Email: security-team@example.com
- Phone: On-call security engineer

**Delayed (P2/P3)**
- Email summary within 4 hours
- Slack notification

### External Notification

**Regulatory Reporting** (Australian Privacy Act)
- Notify Office of the Australian Information Commissioner (OAIC)
- Timeline: Within 72 hours if data breach involves PII
- Method: https://www.oaic.gov.au/privacy/notifiable-data-breaches/

**Customer Notification**
- Required if PII exposed
- Timeline: "As soon as practicable"
- Method: Email + website notice
- Template: See `templates/data-breach-notification.html`

**Media Relations**
- Consult legal before any public statements
- Designate single spokesperson
- Prepare FAQ for customer support

---

## Contact List

### Internal Team

| Role | Name | Contact | Backup |
|------|------|---------|---------|
| Security Lead | TBD | +61 4XX XXX XXX | TBD |
| System Admin | TBD | +61 4XX XXX XXX | TBD |
| Database Admin | TBD | +61 4XX XXX XXX | TBD |
| Legal Counsel | TBD | legal@example.com | TBD |
| PR/Comms | TBD | pr@example.com | TBD |

### External Contacts

| Organization | Purpose | Contact |
|--------------|---------|---------|
| OAIC | Privacy breach reporting | 1300 363 992 |
| ACSC | Cyber security incidents | https://cyber.gov.au/ |
| Supabase Support | Database security | support@supabase.io |
| n8n Support | Platform security | security@n8n.io |
| Forensics Firm | Incident investigation | TBD |

---

## Incident Response Drills

### Quarterly Drill Schedule

**Q1**: Unauthorized access simulation
**Q2**: Data breach response
**Q3**: DDoS attack mitigation
**Q4**: Ransomware response

### Drill Procedure

1. Schedule with team (1 hour)
2. Present scenario
3. Team responds following procedures
4. Time response actions
5. Debrief and document improvements

---

## Appendices

### A. Quick Reference Commands

```bash
# View failed login attempts
docker-compose exec postgres psql -U postgres -d n8n -c "SELECT * FROM auth_audit_log WHERE success = false ORDER BY timestamp DESC LIMIT 50;"

# Block IP address
sudo ufw insert 1 deny from 203.0.113.42 to any

# Rotate API credentials
./scripts/rotate-credentials.sh --service=freshdesk --notify=security@example.com

# Enable debug logging
docker-compose exec n8n n8n config set logs.level debug
docker-compose restart n8n

# Check for rootkits
sudo rkhunter --check
sudo chkrootkit
```

### B. Escalation Matrix

| Time Elapsed | Action | Escalate To |
|--------------|--------|-------------|
| 0-15 min | Initial response | On-call engineer |
| 15-30 min | If unresolved | Security lead |
| 30-60 min | If critical | CTO/CISO |
| 1-2 hours | If data breach | CEO + Legal |
| 2+ hours | If widespread | Board of Directors |

---

## Document Control

- **Version**: 1.0
- **Last Updated**: 2025-10-15
- **Next Review**: 2026-01-15 (quarterly)
- **Owner**: Security Team
- **Approval**: CISO

---

**Status**: ✅ Task 13.15 Complete
**All Security Tasks (13.1-13.15) Complete**
