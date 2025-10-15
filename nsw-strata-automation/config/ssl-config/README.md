# NSW Strata Automation - SSL/TLS Configuration

Complete HTTPS setup with Let's Encrypt or commercial SSL certificates.

**Created**: 2025-10-15
**Task**: 13.1 - Configure HTTPS with valid SSL certificates

---

## Overview

This directory contains SSL/TLS configuration for securing the NSW Strata Automation system with HTTPS. Supports both:
- **Let's Encrypt** (free, automated SSL certificates)
- **Commercial SSL** (paid certificates from Certificate Authorities)

---

## Quick Start - Let's Encrypt (Recommended)

### 1. Prerequisites

- Domain name pointing to your server (A/AAAA DNS records)
- Ports 80 and 443 open in firewall
- Docker and Docker Compose installed

### 2. Configure Domain

Edit `init-letsencrypt.sh`:

```bash
DOMAIN="your-domain.com"
SUBDOMAINS="grafana.your-domain.com prometheus.your-domain.com"
EMAIL="your-email@example.com"
STAGING=0  # Set to 1 for testing
```

### 3. Run Setup Script

```bash
cd nsw-strata-automation
chmod +x config/ssl-config/init-letsencrypt.sh
./config/ssl-config/init-letsencrypt.sh
```

The script will:
1. Create directory structure
2. Download TLS parameters
3. Generate dummy certificate
4. Start Nginx
5. Request real Let's Encrypt certificate
6. Reload Nginx with new certificate
7. Create Prometheus basic auth

### 4. Verify HTTPS

```bash
# Test HTTPS connection
curl -I https://your-domain.com

# Check certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Test SSL Labs rating (A+ expected)
# Visit: https://www.ssllabs.com/ssltest/analyze.html?d=your-domain.com
```

---

## Commercial SSL Certificates

### 1. Obtain Certificate

Purchase SSL certificate from a Certificate Authority (CA):
- **Recommended CAs**: DigiCert, Sectigo, GlobalSign
- **Certificate Type**: Domain Validated (DV) or Organization Validated (OV)
- **Key Size**: 2048-bit RSA or 256-bit ECDSA

### 2. Generate CSR

```bash
# Generate private key
openssl genrsa -out your-domain.key 2048

# Generate Certificate Signing Request (CSR)
openssl req -new -key your-domain.key -out your-domain.csr \
  -subj "/C=AU/ST=NSW/L=Sydney/O=Your Company/CN=your-domain.com"

# Submit CSR to CA and receive certificate files
```

### 3. Install Certificate

Place certificate files:

```bash
mkdir -p config/ssl-config/commercial/

# Copy files
cp your-domain.crt config/ssl-config/commercial/cert.crt
cp your-domain.key config/ssl-config/commercial/cert.key
cp ca-bundle.crt config/ssl-config/commercial/ca-bundle.crt
```

### 4. Update Nginx Configuration

Edit `nginx-ssl.conf`:

```nginx
# Comment out Let's Encrypt lines
# ssl_certificate /etc/letsencrypt/live/...
# ssl_certificate_key /etc/letsencrypt/live/...

# Uncomment commercial SSL lines
ssl_certificate /etc/nginx/ssl/cert.crt;
ssl_certificate_key /etc/nginx/ssl/cert.key;
ssl_trusted_certificate /etc/nginx/ssl/ca-bundle.crt;
```

### 5. Update Docker Compose

Edit `docker-compose.ssl.yml`:

```yaml
nginx:
  volumes:
    # Remove Let's Encrypt volumes
    # - ./certbot/conf:/etc/letsencrypt:ro

    # Add commercial SSL volume
    - ./config/ssl-config/commercial:/etc/nginx/ssl:ro
```

### 6. Restart Nginx

```bash
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml restart nginx
```

---

## SSL/TLS Configuration Details

### Supported Protocols

- **TLS 1.2** (minimum)
- **TLS 1.3** (preferred)
- **SSL 3.0, TLS 1.0, TLS 1.1** - DISABLED (insecure)

### Cipher Suites

Modern cipher configuration (Mozilla Intermediate):
- ECDHE-ECDSA-AES128-GCM-SHA256
- ECDHE-RSA-AES128-GCM-SHA256
- ECDHE-ECDSA-AES256-GCM-SHA384
- ECDHE-RSA-AES256-GCM-SHA384
- ECDHE-ECDSA-CHACHA20-POLY1305
- ECDHE-RSA-CHACHA20-POLY1305

### Security Features

**HSTS (HTTP Strict Transport Security)**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```
- Forces HTTPS for 2 years
- Applies to all subdomains
- Eligible for HSTS preload list

**OCSP Stapling**
- Improves SSL handshake performance
- Enhances privacy

**Session Configuration**
- Session timeout: 1 day
- Shared session cache: 50MB
- Session tickets: Disabled (forward secrecy)

---

## Security Headers

### Content Security Policy (CSP)

```
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.openai.com https://api.anthropic.com;
```

### Other Headers

- **X-Frame-Options**: DENY (prevents clickjacking)
- **X-Content-Type-Options**: nosniff (prevents MIME sniffing)
- **X-XSS-Protection**: 1; mode=block (XSS protection)
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: Restricts geolocation, microphone, camera

---

## Certificate Renewal

### Let's Encrypt (Automatic)

Certbot container runs renewal check twice daily:
- Certificates renew 30 days before expiry
- Nginx automatically reloads after renewal
- No manual intervention required

Monitor renewal:

```bash
# Check certificate expiry
docker-compose -f docker-compose.ssl.yml run --rm certbot certificates

# Manual renewal (testing)
docker-compose -f docker-compose.ssl.yml run --rm certbot renew --dry-run

# Force renewal
docker-compose -f docker-compose.ssl.yml run --rm certbot renew --force-renewal
```

### Commercial SSL (Manual)

Set calendar reminder 30 days before expiry:

```bash
# Check expiry date
openssl x509 -in config/ssl-config/commercial/cert.crt -noout -enddate

# Renewal process:
# 1. Generate new CSR
# 2. Submit to CA
# 3. Receive new certificate
# 4. Replace old certificate files
# 5. Restart Nginx
```

---

## Rate Limiting

### Webhook Endpoint

```
Rate: 50 requests/second
Burst: 100 requests
```

### General Endpoints

```
Rate: 10 requests/second
Burst: 20 requests
```

### IP Whitelisting

Metrics endpoint restricted to private networks:
- 10.0.0.0/8
- 172.16.0.0/12
- 192.168.0.0/16

---

## Monitoring Certificate Health

### Prometheus Metrics

Add certificate expiry monitoring:

```yaml
# prometheus-config.yml
- job_name: 'ssl-exporter'
  static_configs:
    - targets:
        - 'your-domain.com:443'
  metrics_path: /probe
  params:
    module: [https]
```

### Grafana Dashboard

Monitor:
- Certificate expiry date
- Days until expiry
- Certificate issuer
- TLS version
- Cipher suite

### Alerting

Alert when certificate expires in <30 days:

```yaml
- alert: SSLCertificateExpiringSoon
  expr: ssl_cert_not_after - time() < 2592000
  labels:
    severity: warning
  annotations:
    summary: "SSL certificate expiring soon"
    description: "Certificate for {{ $labels.domain }} expires in {{ $value | humanizeDuration }}"
```

---

## Troubleshooting

### Certificate Not Trusted

**Problem**: Browser shows "Not Secure" or certificate error

**Solutions**:
1. Check certificate chain:
   ```bash
   openssl s_client -connect your-domain.com:443 -showcerts
   ```

2. Verify DNS:
   ```bash
   dig your-domain.com
   nslookup your-domain.com
   ```

3. Check STAGING mode:
   - Staging certificates are NOT trusted by browsers
   - Set STAGING=0 for production

### Port 80/443 Not Accessible

**Problem**: Cannot reach server on HTTPS

**Solutions**:
1. Check firewall:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

2. Check Docker port mapping:
   ```bash
   docker-compose -f docker-compose.ssl.yml ps
   ```

3. Check Nginx logs:
   ```bash
   docker-compose -f docker-compose.ssl.yml logs nginx
   ```

### Let's Encrypt Rate Limits

**Problem**: "too many certificates already issued"

**Solutions**:
- Let's Encrypt limits: 50 certificates per domain per week
- Use STAGING mode for testing (STAGING=1)
- Wait for rate limit reset (weekly)
- Consider commercial SSL for high-churn environments

### OCSP Stapling Failed

**Problem**: OCSP stapling not working

**Solutions**:
1. Check resolver configuration:
   ```nginx
   resolver 8.8.8.8 8.8.4.4 valid=300s;
   ```

2. Test OCSP manually:
   ```bash
   openssl s_client -connect your-domain.com:443 -status
   ```

### Mixed Content Warnings

**Problem**: Browser shows mixed content (HTTP resources on HTTPS page)

**Solutions**:
- Update all resource URLs to HTTPS
- Use protocol-relative URLs: //example.com/resource
- Configure CSP header to block HTTP resources

---

## Production Checklist

Before going live with HTTPS:

- [ ] Domain DNS records configured (A/AAAA)
- [ ] Firewall ports 80 and 443 open
- [ ] STAGING=0 set for production certificates
- [ ] Email configured in init-letsencrypt.sh
- [ ] SSL certificate obtained and verified
- [ ] Nginx configuration tested: `nginx -t`
- [ ] HSTS header configured (2-year max-age)
- [ ] CSP header configured for your application
- [ ] Certificate monitoring configured
- [ ] Renewal alerts configured (30-day warning)
- [ ] SSL Labs test passed (A+ rating): https://www.ssllabs.com/ssltest/
- [ ] Webhook URLs updated in Freshdesk to HTTPS
- [ ] n8n environment variables updated (N8N_PROTOCOL=https)
- [ ] Backup of private keys stored securely
- [ ] Documentation updated with HTTPS URLs

---

## Security Best Practices

1. **Never commit private keys to Git**
   - Add `*.key` to `.gitignore`
   - Store backups in secure vault (1Password, AWS Secrets Manager)

2. **Rotate certificates regularly**
   - Let's Encrypt: Automatic every 60 days
   - Commercial: Annual renewal recommended

3. **Monitor certificate expiry**
   - Set up alerts 30 days before expiry
   - Test renewal process regularly

4. **Use strong ciphers only**
   - Disable TLS 1.0 and 1.1
   - Prefer ECDHE for forward secrecy

5. **Enable HSTS**
   - Start with 6-month max-age
   - Increase to 2 years after testing
   - Submit to HSTS preload list

6. **Implement CSP**
   - Start in report-only mode
   - Gradually tighten policy
   - Monitor violation reports

7. **Regular security audits**
   - Monthly SSL Labs tests
   - Quarterly penetration testing
   - Annual third-party security audit

---

## Support

For SSL/TLS issues:
1. Check Nginx logs: `docker-compose logs nginx`
2. Check Certbot logs: `./certbot/logs/letsencrypt.log`
3. Test SSL configuration: https://www.ssllabs.com/ssltest/
4. Let's Encrypt community: https://community.letsencrypt.org/

---

**Status**: ✅ Task 13.1 Complete
**Next**: Task 13.2 - Webhook signature verification
