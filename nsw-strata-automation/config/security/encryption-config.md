# NSW Strata Automation - Data Encryption Configuration
# Task 13.13: Create data encryption at rest configuration
# Date: 2025-10-15

## Overview

Complete encryption strategy for data at rest and in transit.

---

## Encryption at Rest

### Supabase/PostgreSQL Encryption

Supabase provides encryption at rest by default:
- **AES-256 encryption** for all database storage
- **Encrypted backups** with separate encryption keys
- **Transparent Data Encryption (TDE)** enabled

Verify encryption:
```sql
-- Check PostgreSQL encryption settings
SHOW data_encryption;

-- Verify tablespace encryption
SELECT spcname, spcoptions
FROM pg_tablespace;
```

### Additional Column-Level Encryption

For sensitive fields (PII, API keys):

```sql
-- Install pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive data
CREATE TABLE sensitive_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_email VARCHAR(255),
  api_key_encrypted BYTEA,  -- Encrypted API key
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert with encryption
INSERT INTO sensitive_data (user_email, api_key_encrypted)
VALUES (
  'user@example.com',
  pgp_sym_encrypt('actual-api-key', 'encryption-passphrase')
);

-- Query with decryption
SELECT
  user_email,
  pgp_sym_decrypt(api_key_encrypted, 'encryption-passphrase') AS api_key
FROM sensitive_data;
```

### Application-Level Encryption

For additional security in n8n:

```javascript
// Encrypt sensitive data before storing
const crypto = require('crypto');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;  // 32-byte key
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    authTag: authTag.toString('hex')
  };
}

function decrypt(encryptedData, iv, authTag) {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTag, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

// Usage in n8n Function node
const sensitive = "API_KEY_12345";
const encrypted = encrypt(sensitive);
// Store encrypted.iv, encrypted.encryptedData, encrypted.authTag in database
```

---

## Encryption in Transit

### TLS 1.3 Configuration

All external connections use TLS 1.3 (configured in Task 13.1):
- n8n to Freshdesk: HTTPS
- n8n to Supabase: TLS
- n8n to AI APIs: HTTPS
- Webhooks: HTTPS only

### Internal Service Communication

Encrypt internal Docker network traffic:

```yaml
# docker-compose.yml with encrypted networking
networks:
  n8n-network:
    driver: overlay
    driver_opts:
      encrypted: "true"
```

---

## Key Management

### Environment Variables

Store encryption keys securely:

```bash
# .env.production (NEVER commit to git)
ENCRYPTION_KEY=<64-char-hex-key>  # Generate: openssl rand -hex 32
DATABASE_ENCRYPTION_KEY=<64-char-hex-key>
JWT_SECRET=<64-char-hex-key>

# Supabase connection with SSL
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require
```

### Key Rotation Strategy

```javascript
// Multi-version key support
const ENCRYPTION_KEYS = {
  v1: process.env.ENCRYPTION_KEY_V1,  // Old key
  v2: process.env.ENCRYPTION_KEY_V2,  // Current key
  v3: process.env.ENCRYPTION_KEY_V3   // Future key
};

const CURRENT_KEY_VERSION = 'v2';

function encryptWithVersion(text) {
  const encrypted = encrypt(text, ENCRYPTION_KEYS[CURRENT_KEY_VERSION]);
  return {
    version: CURRENT_KEY_VERSION,
    ...encrypted
  };
}

function decryptWithVersion(data) {
  const key = ENCRYPTION_KEYS[data.version];
  return decrypt(data.encryptedData, data.iv, data.authTag, key);
}

// Re-encrypt with new key
async function rotateEncryption(recordId) {
  const record = await db.query('SELECT * FROM sensitive_data WHERE id = $1', [recordId]);
  const decrypted = decryptWithVersion(record.data);
  const reencrypted = encryptWithVersion(decrypted);
  await db.query('UPDATE sensitive_data SET data = $1, key_version = $2 WHERE id = $3',
    [reencrypted, CURRENT_KEY_VERSION, recordId]);
}
```

### AWS KMS Integration (Optional)

For enterprise deployments:

```javascript
const AWS = require('aws-sdk');
const kms = new AWS.KMS({ region: 'ap-southeast-2' });

async function encryptWithKMS(plaintext) {
  const params = {
    KeyId: 'arn:aws:kms:ap-southeast-2:123456789:key/your-key-id',
    Plaintext: Buffer.from(plaintext)
  };

  const result = await kms.encrypt(params).promise();
  return result.CiphertextBlob.toString('base64');
}

async function decryptWithKMS(ciphertext) {
  const params = {
    CiphertextBlob: Buffer.from(ciphertext, 'base64')
  };

  const result = await kms.decrypt(params).promise();
  return result.Plaintext.toString('utf8');
}
```

---

## Backup Encryption

### Automated Encrypted Backups

```bash
#!/bin/bash
# Encrypted database backup script

BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
ENCRYPTION_KEY="$BACKUP_ENCRYPTION_KEY"

# Dump database
pg_dump -h localhost -U postgres -d n8n > "$BACKUP_FILE"

# Encrypt backup
openssl enc -aes-256-cbc -salt \
  -in "$BACKUP_FILE" \
  -out "${BACKUP_FILE}.enc" \
  -k "$ENCRYPTION_KEY"

# Remove unencrypted backup
rm "$BACKUP_FILE"

# Upload to S3 with server-side encryption
aws s3 cp "${BACKUP_FILE}.enc" \
  s3://nsw-strata-backups/ \
  --server-side-encryption AES256

# Clean up
rm "${BACKUP_FILE}.enc"
```

---

## Compliance Checklist

- [ ] Database encryption at rest enabled (AES-256)
- [ ] TLS 1.3 for all external connections
- [ ] Column-level encryption for sensitive fields
- [ ] Encryption keys stored in environment variables (not code)
- [ ] Key rotation strategy documented and tested
- [ ] Encrypted backups with separate encryption keys
- [ ] Internal Docker network encryption enabled
- [ ] AWS KMS integration (if using AWS)
- [ ] Encryption key access logs monitored
- [ ] Annual encryption audit scheduled

---

**Status**: ✅ Task 13.13 Complete
