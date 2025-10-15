/**
 * NSW Strata Automation - Webhook Signature Verification
 * Task 13.2: HMAC-SHA256 signature verification for webhooks
 * Date: 2025-10-15
 *
 * This module provides secure webhook verification for:
 * - Freshdesk webhooks
 * - Custom webhooks
 * - Third-party integrations
 *
 * Security: Prevents unauthorized webhook calls and replay attacks
 */

const crypto = require('crypto');

// ==================================================
// CONFIGURATION
// ==================================================

// Webhook secrets (should be stored in n8n credentials or environment variables)
const WEBHOOK_SECRETS = {
  freshdesk: process.env.FRESHDESK_WEBHOOK_SECRET || 'your-freshdesk-secret-here',
  custom: process.env.CUSTOM_WEBHOOK_SECRET || 'your-custom-secret-here'
};

// Signature header names
const SIGNATURE_HEADERS = {
  freshdesk: 'x-freshdesk-signature',
  custom: 'x-webhook-signature',
  github: 'x-hub-signature-256',
  stripe: 'stripe-signature'
};

// ==================================================
// CORE VERIFICATION FUNCTIONS
// ==================================================

/**
 * Verify HMAC-SHA256 signature
 * @param {string} payload - Raw request body (JSON string)
 * @param {string} signature - Signature from header
 * @param {string} secret - Shared secret key
 * @returns {boolean} - True if signature is valid
 */
function verifyHMACSHA256(payload, signature, secret) {
  if (!payload || !signature || !secret) {
    console.error('[SECURITY] Missing required parameters for signature verification');
    return false;
  }

  try {
    // Compute expected signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');

    // Timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      console.error('[SECURITY] Signature length mismatch');
      return false;
    }

    // Use crypto.timingSafeEqual for constant-time comparison
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

    if (!isValid) {
      console.error('[SECURITY] Signature verification failed');
      console.error('[SECURITY] Expected:', expectedSignature);
      console.error('[SECURITY] Received:', signature);
    }

    return isValid;

  } catch (error) {
    console.error('[SECURITY] Error during signature verification:', error.message);
    return false;
  }
}

/**
 * Verify Freshdesk webhook signature
 * @param {object} request - n8n request object (headers and body)
 * @returns {object} - { valid: boolean, error: string }
 */
function verifyFreshdeskWebhook(request) {
  const signature = request.headers[SIGNATURE_HEADERS.freshdesk];
  const payload = JSON.stringify(request.body);
  const secret = WEBHOOK_SECRETS.freshdesk;

  if (!signature) {
    return {
      valid: false,
      error: 'Missing signature header: ' + SIGNATURE_HEADERS.freshdesk
    };
  }

  const isValid = verifyHMACSHA256(payload, signature, secret);

  return {
    valid: isValid,
    error: isValid ? null : 'Invalid signature'
  };
}

/**
 * Verify custom webhook signature
 * @param {object} request - n8n request object
 * @returns {object} - { valid: boolean, error: string }
 */
function verifyCustomWebhook(request) {
  const signature = request.headers[SIGNATURE_HEADERS.custom];
  const payload = JSON.stringify(request.body);
  const secret = WEBHOOK_SECRETS.custom;

  if (!signature) {
    return {
      valid: false,
      error: 'Missing signature header: ' + SIGNATURE_HEADERS.custom
    };
  }

  const isValid = verifyHMACSHA256(payload, signature, secret);

  return {
    valid: isValid,
    error: isValid ? null : 'Invalid signature'
  };
}

/**
 * Verify timestamp to prevent replay attacks
 * @param {number} timestamp - Unix timestamp from webhook
 * @param {number} toleranceSeconds - Maximum age of request (default: 300s / 5 minutes)
 * @returns {object} - { valid: boolean, error: string }
 */
function verifyTimestamp(timestamp, toleranceSeconds = 300) {
  if (!timestamp) {
    return {
      valid: false,
      error: 'Missing timestamp'
    };
  }

  const now = Math.floor(Date.now() / 1000);
  const age = now - timestamp;

  if (age > toleranceSeconds) {
    return {
      valid: false,
      error: `Request too old: ${age} seconds (max: ${toleranceSeconds})`
    };
  }

  if (age < -toleranceSeconds) {
    return {
      valid: false,
      error: 'Request timestamp is in the future'
    };
  }

  return {
    valid: true,
    error: null
  };
}

/**
 * Generate signature for outgoing webhooks
 * @param {object} payload - Data to sign
 * @param {string} secret - Shared secret
 * @returns {string} - HMAC-SHA256 signature
 */
function generateSignature(payload, secret) {
  const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString, 'utf8');
  return hmac.digest('hex');
}

// ==================================================
// COMPLETE WEBHOOK VERIFICATION (with replay protection)
// ==================================================

/**
 * Complete webhook verification with signature and timestamp validation
 * @param {object} request - n8n request object
 * @param {string} webhookType - Type of webhook ('freshdesk', 'custom', etc.)
 * @returns {object} - { valid: boolean, error: string, details: object }
 */
function verifyWebhookComplete(request, webhookType = 'freshdesk') {
  // Step 1: Verify signature
  let signatureResult;

  switch (webhookType) {
    case 'freshdesk':
      signatureResult = verifyFreshdeskWebhook(request);
      break;
    case 'custom':
      signatureResult = verifyCustomWebhook(request);
      break;
    default:
      return {
        valid: false,
        error: 'Unknown webhook type: ' + webhookType,
        details: {}
      };
  }

  if (!signatureResult.valid) {
    return {
      valid: false,
      error: 'Signature verification failed: ' + signatureResult.error,
      details: {
        signatureValid: false,
        timestampValid: null
      }
    };
  }

  // Step 2: Verify timestamp (if provided)
  const timestamp = request.headers['x-webhook-timestamp'] || request.body.timestamp;
  let timestampResult = { valid: true, error: null };

  if (timestamp) {
    timestampResult = verifyTimestamp(parseInt(timestamp));

    if (!timestampResult.valid) {
      return {
        valid: false,
        error: 'Timestamp verification failed: ' + timestampResult.error,
        details: {
          signatureValid: true,
          timestampValid: false,
          timestampError: timestampResult.error
        }
      };
    }
  }

  // Both checks passed
  return {
    valid: true,
    error: null,
    details: {
      signatureValid: true,
      timestampValid: timestamp ? true : null,
      webhookType: webhookType
    }
  };
}

// ==================================================
// n8n INTEGRATION HELPER
// ==================================================

/**
 * n8n Function Node implementation
 * Usage: Copy this into a Function node in n8n
 */
function n8nWebhookVerification() {
  // Get request data from n8n
  const request = {
    headers: $request.headers,
    body: $request.body
  };

  // Verify webhook
  const webhookType = 'freshdesk'; // or 'custom'
  const result = verifyWebhookComplete(request, webhookType);

  // Return result
  if (!result.valid) {
    // Log security event
    console.error('[SECURITY] Webhook verification failed:', {
      error: result.error,
      ip: $request.headers['x-real-ip'] || $request.headers['x-forwarded-for'],
      timestamp: new Date().toISOString()
    });

    // Respond with 401 Unauthorized
    return {
      status: 401,
      body: {
        error: 'Unauthorized',
        message: 'Webhook signature verification failed'
      }
    };
  }

  // Webhook is valid, continue processing
  return {
    status: 200,
    body: {
      success: true,
      data: $request.body
    }
  };
}

// ==================================================
// EXPORTS
// ==================================================

module.exports = {
  verifyHMACSHA256,
  verifyFreshdeskWebhook,
  verifyCustomWebhook,
  verifyTimestamp,
  generateSignature,
  verifyWebhookComplete,
  n8nWebhookVerification,
  SIGNATURE_HEADERS,
  WEBHOOK_SECRETS
};

// ==================================================
// EXAMPLE USAGE
// ==================================================

/**
 * Example 1: Verify Freshdesk webhook in n8n Function node
 *
 * const crypto = require('crypto');
 * const secret = 'your-freshdesk-secret';
 * const signature = $request.headers['x-freshdesk-signature'];
 * const payload = JSON.stringify($request.body);
 *
 * const hmac = crypto.createHmac('sha256', secret);
 * hmac.update(payload, 'utf8');
 * const expectedSignature = hmac.digest('hex');
 *
 * if (signature !== expectedSignature) {
 *   throw new Error('Invalid webhook signature');
 * }
 *
 * return { verified: true };
 */

/**
 * Example 2: Generate signature for outgoing webhook
 *
 * const payload = { ticketId: 123, action: 'update' };
 * const signature = generateSignature(payload, WEBHOOK_SECRETS.custom);
 *
 * // Include signature in request headers
 * headers['x-webhook-signature'] = signature;
 */
