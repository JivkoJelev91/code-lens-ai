export const REDACTED_MARKER = '[REDACTED_SECRET]';

const SECRET_PATTERNS: RegExp[] = [
  /\bsk-[A-Za-z0-9_-]{16,}\b/g,
  /\b(?:sk|pk)_(?:test|live)_[A-Za-z0-9]{16,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
  /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
];

export const redactSecrets = (input: string): { text: string; matched: boolean } => {
  let text = input;
  let matched = false;
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, () => {
      matched = true;
      return REDACTED_MARKER;
    });
  }
  return { text, matched };
};