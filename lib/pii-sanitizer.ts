/**
 * PII Sanitizer — strips sensitive data BEFORE it reaches the LLM.
 * Runs in the API route, not the client.
 * Logs a signal trace for every sanitization.
 */

// Patterns that should NEVER reach the LLM
const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  { name: 'ssn', pattern: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g, replacement: '[SSN REDACTED]' },
  { name: 'credit_card', pattern: /\b(?:\d{4}[-.\s]?){3}\d{4}\b/g, replacement: '[CARD REDACTED]' },
  { name: 'bank_account', pattern: /\b\d{8,17}\b(?=.*(?:account|routing|bank))/gi, replacement: '[ACCOUNT REDACTED]' },
  { name: 'routing_number', pattern: /\b(?:routing|aba)[\s:#]*\d{9}\b/gi, replacement: '[ROUTING REDACTED]' },
  { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL REDACTED]' },
];

// Patterns to flag but NOT strip (we need these for matching, but log that they're present)
const SENSITIVE_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'phone', pattern: /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { name: 'address', pattern: /\b\d+\s+[A-Z][a-z]+\s+(?:St|Ave|Blvd|Dr|Rd|Ln|Ct|Way|Pl)\b/gi },
];

export interface SanitizeResult {
  text: string;
  redacted: string[];     // what was stripped
  flagged: string[];      // what was flagged but kept
  redactedCount: number;
  durationMs: number;
}

export function sanitize(text: string): SanitizeResult {
  const start = performance.now();
  let cleaned = text;
  const redacted: string[] = [];
  const flagged: string[] = [];

  // Strip dangerous PII
  for (const { name, pattern, replacement } of PII_PATTERNS) {
    const matches = cleaned.match(pattern);
    if (matches) {
      redacted.push(...matches.map(() => name));
      cleaned = cleaned.replace(pattern, replacement);
    }
  }

  // Flag sensitive (but keep)
  for (const { name, pattern } of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      flagged.push(name);
    }
  }

  return {
    text: cleaned,
    redacted,
    flagged,
    redactedCount: redacted.length,
    durationMs: Math.round(performance.now() - start),
  };
}

/**
 * Validate data before DB write — reject if contains SSN/CC patterns
 */
export function validateForDB(data: Record<string, any>): { valid: boolean; rejectedFields: string[] } {
  const rejected: string[] = [];
  const dangerousPatterns = [
    /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/,  // SSN
    /\b(?:\d{4}[-.\s]?){3}\d{4}\b/,        // CC
  ];

  function checkValue(key: string, value: any) {
    if (typeof value === 'string') {
      for (const p of dangerousPatterns) {
        if (p.test(value)) {
          rejected.push(key);
          break;
        }
      }
    } else if (typeof value === 'object' && value !== null) {
      for (const [k, v] of Object.entries(value)) {
        checkValue(`${key}.${k}`, v);
      }
    }
  }

  for (const [k, v] of Object.entries(data)) {
    checkValue(k, v);
  }

  return { valid: rejected.length === 0, rejectedFields: rejected };
}
