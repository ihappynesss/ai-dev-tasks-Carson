/**
 * NSW Strata Automation - PII Masking
 * Task 13.5: Configure PII masking in all log outputs
 * Date: 2025-10-15
 */

const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /(\+?61\s?)?(\(0?[2-8]\)\s?)?[0-9]{4}\s?[0-9]{4}/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  medicare: /\b\d{10}\b/g,
  tfn: /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
  address: /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Court|Ct|Place|Pl|NSW|VIC|QLD|SA|WA|TAS|NT|ACT)/gi
};

function maskPII(text, maskChar = '*') {
  if (!text) return text;

  let masked = text;
  masked = masked.replace(PII_PATTERNS.email, (email) => {
    const [name, domain] = email.split('@');
    return `${name.charAt(0)}${maskChar.repeat(name.length - 1)}@${domain}`;
  });
  masked = masked.replace(PII_PATTERNS.phone, (phone) => `${maskChar.repeat(phone.length)}`);
  masked = masked.replace(PII_PATTERNS.creditCard, (cc) => `${maskChar.repeat(12)}${cc.slice(-4)}`);

  return masked;
}

module.exports = { PII_PATTERNS, maskPII };
