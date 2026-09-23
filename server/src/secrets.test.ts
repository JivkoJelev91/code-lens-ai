import { describe, expect, it } from 'vitest';
import { REDACTED_MARKER, redactSecrets } from './secrets.js';

// Tokens are assembled at runtime on purpose: the source must not contain a
// contiguous secret-shaped literal, or GitHub Push Protection rejects pushes.
const fixture = (...parts: string[]) => parts.join('');

describe('redactSecrets', () => {
  it.each([
    ['openai', fixture('const key = "sk-proj-', 'abc123ABCxyz456DEF789', '";')],
    ['stripe', fixture('SECRET = sk_', 'live_', '5Z0k0Lc9e1cL3f0K5Z9m0X2c7V8q1A')],
    ['aws', fixture('key = "AKIA', 'IOSFODNN7EXAMPLE"')],
    ['pem', fixture('-----BEGIN OPENSSH PRIVATE KEY-----', '\nabc123\n', '-----END OPENSSH PRIVATE KEY-----')],
    ['github', fixture('token = "ghp_', '16C7e42F292c6912E7710c838347Ae178B4a"')],
    ['slack', fixture('token = "xoxb-', '123456789012-345678901234-ajQkDfWpZrYv"')],
  ])('redacts %s tokens', (_name, sample) => {
    const { text, matched } = redactSecrets(sample);
    expect(matched).toBe(true);
    expect(text).not.toContain(sample);
    expect(text).toContain(REDACTED_MARKER);
  });

  it('leaves clean code untouched', () => {
    const input = 'export const clamp = (value: number, min: number, max: number): number => {\n  return Math.min(Math.max(value, min), max);\n};\n';
    const { text, matched } = redactSecrets(input);
    expect(matched).toBe(false);
    expect(text).toBe(input);
  });

  it('preserves line count so reported line numbers stay accurate', () => {
    const input = fixture('const a = 1;\nconst key = "sk-proj-', 'abc123ABCxyz456DEF789', '";\nconst b = 2;\n');
    const { text } = redactSecrets(input);
    expect(text.split('\n')).toHaveLength(input.split('\n').length);
  });
});