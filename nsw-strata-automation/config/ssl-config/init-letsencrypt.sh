#!/bin/bash

# NSW Strata Automation - Let's Encrypt SSL Certificate Setup
# Task 13.1: Automated SSL certificate generation
# Date: 2025-10-15

# Exit on error
set -e

# ==================================================
# Configuration
# ==================================================
DOMAIN="nsw-strata.example.com"
SUBDOMAINS="grafana.nsw-strata.example.com prometheus.nsw-strata.example.com"
EMAIL="admin@example.com"  # Required for Let's Encrypt notifications
STAGING=0  # Set to 1 for testing (staging certificates)

# Paths
CERTBOT_PATH="./certbot"
NGINX_CONF="./config/ssl-config/nginx-ssl.conf"

# ==================================================
# Colors for output
# ==================================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==================================================
# Functions
# ==================================================
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# ==================================================
# Pre-flight Checks
# ==================================================
print_info "Starting Let's Encrypt SSL certificate setup..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if email is configured
if [ "$EMAIL" = "admin@example.com" ]; then
    print_error "Please configure your email address in this script before running."
    print_error "Edit EMAIL variable: $0"
    exit 1
fi

# Check if domain is configured
if [ "$DOMAIN" = "nsw-strata.example.com" ]; then
    print_error "Please configure your domain name in this script before running."
    print_error "Edit DOMAIN variable: $0"
    exit 1
fi

# Warn about staging mode
if [ $STAGING -eq 1 ]; then
    print_warn "Running in STAGING mode. Certificates will NOT be trusted by browsers."
    print_warn "Set STAGING=0 for production certificates."
    sleep 3
fi

# ==================================================
# Create Directory Structure
# ==================================================
print_info "Creating directory structure..."
mkdir -p "$CERTBOT_PATH/conf"
mkdir -p "$CERTBOT_PATH/www"
mkdir -p "$CERTBOT_PATH/logs"

# ==================================================
# Download Recommended TLS Parameters
# ==================================================
print_info "Downloading recommended TLS parameters..."
if [ ! -f "$CERTBOT_PATH/conf/options-ssl-nginx.conf" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
        > "$CERTBOT_PATH/conf/options-ssl-nginx.conf"
fi

if [ ! -f "$CERTBOT_PATH/conf/ssl-dhparams.pem" ]; then
    curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem \
        > "$CERTBOT_PATH/conf/ssl-dhparams.pem"
fi

# ==================================================
# Create Dummy Certificate
# ==================================================
print_info "Creating dummy certificate for $DOMAIN..."
mkdir -p "$CERTBOT_PATH/conf/live/$DOMAIN"

docker-compose -f docker-compose.yml -f docker-compose.ssl.yml run --rm --entrypoint "\
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
    -keyout '/etc/letsencrypt/live/$DOMAIN/privkey.pem' \
    -out '/etc/letsencrypt/live/$DOMAIN/fullchain.pem' \
    -subj '/CN=localhost'" certbot

# ==================================================
# Start Nginx
# ==================================================
print_info "Starting Nginx..."
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml up -d nginx

# ==================================================
# Delete Dummy Certificate
# ==================================================
print_info "Deleting dummy certificate..."
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml run --rm --entrypoint "\
  rm -rf /etc/letsencrypt/live/$DOMAIN && \
  rm -rf /etc/letsencrypt/archive/$DOMAIN && \
  rm -rf /etc/letsencrypt/renewal/$DOMAIN.conf" certbot

# ==================================================
# Request Let's Encrypt Certificate
# ==================================================
print_info "Requesting Let's Encrypt certificate for $DOMAIN..."

# Build domain arguments
DOMAIN_ARGS="-d $DOMAIN"
for subdomain in $SUBDOMAINS; do
    DOMAIN_ARGS="$DOMAIN_ARGS -d $subdomain"
done

# Set staging flag if enabled
STAGING_ARG=""
if [ $STAGING -eq 1 ]; then
    STAGING_ARG="--staging"
fi

# Request certificate
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    $DOMAIN_ARGS \
    --email $EMAIL \
    --rsa-key-size 4096 \
    --agree-tos \
    --force-renewal \
    --non-interactive" certbot

if [ $? -eq 0 ]; then
    print_info "Certificate successfully obtained!"
else
    print_error "Failed to obtain certificate. Check logs in $CERTBOT_PATH/logs/"
    exit 1
fi

# ==================================================
# Reload Nginx
# ==================================================
print_info "Reloading Nginx to apply new certificate..."
docker-compose -f docker-compose.yml -f docker-compose.ssl.yml exec nginx nginx -s reload

# ==================================================
# Create Basic Auth for Prometheus
# ==================================================
print_info "Creating basic auth credentials for Prometheus..."
mkdir -p ./config/ssl-config

# Prompt for username and password
read -p "Enter username for Prometheus access: " PROM_USER
read -sp "Enter password: " PROM_PASS
echo ""

# Create htpasswd file
docker run --rm httpd:alpine htpasswd -nb "$PROM_USER" "$PROM_PASS" > ./config/ssl-config/.htpasswd

# ==================================================
# Success Message
# ==================================================
print_info "SSL certificate setup complete!"
echo ""
print_info "Your services are now accessible at:"
echo "  - n8n: https://$DOMAIN"
echo "  - Grafana: https://grafana.$DOMAIN"
echo "  - Prometheus: https://prometheus.$DOMAIN (requires basic auth)"
echo ""
print_info "Certificate will automatically renew via Certbot container."
print_info "Renewal runs twice daily and certificates renew 30 days before expiry."
echo ""
print_warn "Next steps:"
echo "  1. Verify HTTPS is working: curl -I https://$DOMAIN"
echo "  2. Test SSL configuration: https://www.ssllabs.com/ssltest/"
echo "  3. Update n8n webhook URLs in Freshdesk to use HTTPS"
echo "  4. Monitor certificate expiry in Grafana"
echo ""
print_info "Done!"
