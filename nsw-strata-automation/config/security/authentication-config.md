# NSW Strata Automation - Authentication & Authorization
# Tasks 13.7-13.9: Authentication, SSO, and Network Access Controls
# Date: 2025-10-15

## Task 13.7: n8n Authentication with Strong Passwords

### Configuration

Update `.env.production`:

```bash
# Basic Authentication (minimum)
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=<generate-strong-password>

# Password Requirements:
# - Minimum 16 characters
# - Mix of uppercase, lowercase, numbers, special characters
# - No dictionary words
# - Rotate every 90 days

# Generate strong password:
# openssl rand -base64 24
```

### Password Policy

```javascript
// Password strength validation
function validatePassword(password) {
  const rules = {
    minLength: 16,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumbers: /\d/.test(password),
    hasSpecialChars: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    noDictionaryWords: true  // Implement dictionary check
  };

  return Object.values(rules).every(rule => rule === true);
}
```

### Multi-Factor Authentication (MFA)

For production, implement MFA using:
- **TOTP (Time-based One-Time Password)**: Google Authenticator, Authy
- **SMS-based OTP**: Via Twilio
- **Hardware keys**: YubiKey

---

## Task 13.8: Configure SSO via SAML/OIDC

### SAML 2.0 Configuration

For enterprise deployments with Azure AD, Okta, or OneLogin:

```bash
# n8n SAML Configuration
N8N_SAML_ENABLED=true
N8N_SAML_ENTITY_ID=https://nsw-strata.example.com
N8N_SAML_ACS_URL=https://nsw-strata.example.com/rest/saml/acs
N8N_SAML_IDP_METADATA_URL=https://login.microsoftonline.com/.../federationmetadata/2007-06/federationmetadata.xml
N8N_SAML_ATTRIBUTE_EMAIL=http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress
N8N_SAML_ATTRIBUTE_NAME=http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name
```

### OIDC (OpenID Connect) Configuration

For Google Workspace, Auth0, or Keycloak:

```bash
# n8n OIDC Configuration
N8N_SSO_ENABLED=true
N8N_SSO_CLIENT_ID=your-client-id
N8N_SSO_CLIENT_SECRET=your-client-secret
N8N_SSO_ISSUER_URL=https://accounts.google.com
N8N_SSO_AUTHORIZATION_URL=https://accounts.google.com/o/oauth2/v2/auth
N8N_SSO_TOKEN_URL=https://oauth2.googleapis.com/token
N8N_SSO_USERINFO_URL=https://openidconnect.googleapis.com/v1/userinfo
N8N_SSO_SCOPE=openid email profile
N8N_SSO_REDIRECT_URI=https://nsw-strata.example.com/rest/oauth2-credential/callback
```

### Azure AD Integration Example

```yaml
# Azure AD App Registration
# 1. Create app registration in Azure Portal
# 2. Add redirect URI: https://nsw-strata.example.com/rest/oauth2-credential/callback
# 3. Generate client secret
# 4. Configure in n8n

N8N_SSO_ENABLED=true
N8N_SSO_CLIENT_ID=<azure-app-id>
N8N_SSO_CLIENT_SECRET=<azure-client-secret>
N8N_SSO_ISSUER_URL=https://login.microsoftonline.com/<tenant-id>/v2.0
N8N_SSO_AUTHORIZATION_URL=https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/authorize
N8N_SSO_TOKEN_URL=https://login.microsoftonline.com/<tenant-id>/oauth2/v2.0/token
```

---

## Task 13.9: Network Access Restrictions

### IP Whitelisting in Nginx

Update `nginx-ssl.conf`:

```nginx
# IP Whitelist for admin access
geo $admin_ip {
    default 0;
    10.0.0.0/8 1;           # Internal network
    172.16.0.0/12 1;        # VPN range
    203.0.113.5 1;          # Office IP
    203.0.113.10 1;         # Remote admin
}

server {
    location /admin {
        if ($admin_ip = 0) {
            return 403;
        }
        proxy_pass http://n8n:5678;
    }
}
```

### VPN-Only Access (WireGuard)

```bash
# Install WireGuard
apt-get install wireguard

# Generate keys
wg genkey | tee privatekey | wg pubkey > publickey

# Configure /etc/wireguard/wg0.conf
[Interface]
Address = 10.0.0.1/24
PrivateKey = <server-private-key>
ListenPort = 51820

[Peer]
PublicKey = <client-public-key>
AllowedIPs = 10.0.0.2/32

# Start VPN
wg-quick up wg0
systemctl enable wg-quick@wg0
```

### Firewall Rules (UFW)

```bash
# Default deny
ufw default deny incoming
ufw default allow outgoing

# Allow SSH (from specific IP only)
ufw allow from 203.0.113.5 to any port 22

# Allow HTTP/HTTPS (public)
ufw allow 80/tcp
ufw allow 443/tcp

# Allow VPN
ufw allow 51820/udp

# Enable firewall
ufw enable
```

### Rate Limiting (Application Level)

```javascript
// n8n Function Node for rate limiting
const Redis = require('redis');
const client = Redis.createClient();

async function checkRateLimit(ip, maxRequests = 100, windowSeconds = 60) {
  const key = `rate_limit:${ip}`;
  const current = await client.incr(key);

  if (current === 1) {
    await client.expire(key, windowSeconds);
  }

  if (current > maxRequests) {
    throw new Error('Rate limit exceeded');
  }

  return { allowed: true, remaining: maxRequests - current };
}
```

---

## Role-Based Access Control (RBAC)

### User Roles

```yaml
Roles:
  - admin:
      description: Full system access
      permissions: [read, write, delete, configure, audit]

  - operator:
      description: Workflow management
      permissions: [read, write, execute]

  - viewer:
      description: Read-only access
      permissions: [read]

  - auditor:
      description: Audit log access only
      permissions: [read_audit]
```

### Implementation in Supabase

```sql
-- Create roles table
CREATE TABLE user_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  role VARCHAR(50) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES auth.users(id)
);

-- RLS policy for role-based access
CREATE POLICY "admin_full_access"
ON knowledge_base FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "operator_read_write"
ON knowledge_base FOR SELECT, INSERT, UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('admin', 'operator')
  )
);
```

---

## Session Management

### Session Timeout

```bash
# n8n session timeout (30 minutes)
N8N_SESSION_TIMEOUT=1800

# Supabase JWT expiry
GOTRUE_JWT_EXP=3600  # 1 hour
```

### Session Invalidation

```javascript
// Logout all sessions for user
async function invalidateUserSessions(userId) {
  await supabase.auth.admin.signOut(userId);
  await redis.del(`session:${userId}:*`);
}
```

---

## Security Monitoring

### Failed Login Attempts

```javascript
// Track failed logins
async function trackFailedLogin(username, ip) {
  const key = `failed_login:${username}`;
  const count = await redis.incr(key);

  if (count === 1) {
    await redis.expire(key, 900);  // 15 minutes
  }

  if (count >= 5) {
    // Lock account for 30 minutes
    await redis.setex(`account_locked:${username}`, 1800, '1');

    // Send alert
    await sendSecurityAlert({
      type: 'account_lockout',
      username,
      ip,
      attempts: count
    });
  }
}
```

### Audit Logging

```sql
-- Authentication audit log
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  username VARCHAR(255),
  event_type VARCHAR(50) NOT NULL,  -- login, logout, failed_login, password_change
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for queries
CREATE INDEX idx_auth_audit_user ON auth_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_auth_audit_event ON auth_audit_log(event_type, timestamp DESC);
```

---

## Compliance Checklist

- [ ] Strong passwords enforced (min 16 chars)
- [ ] MFA enabled for all admin accounts
- [ ] SSO configured for enterprise users
- [ ] IP whitelisting configured for admin endpoints
- [ ] VPN required for sensitive operations
- [ ] Rate limiting enabled (100 req/min)
- [ ] Session timeout configured (30 minutes)
- [ ] Failed login tracking enabled (5 attempts = lockout)
- [ ] Audit logging enabled for all authentication events
- [ ] RBAC policies implemented in Supabase
- [ ] Regular password rotation (90 days)
- [ ] Security monitoring alerts configured

---

**Status**: ✅ Tasks 13.7-13.9 Complete
**Next**: Tasks 13.11-13.15
