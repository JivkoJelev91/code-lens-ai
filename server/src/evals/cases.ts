export interface EvalExpectation {
  mustFind?: string[];
  minIssues?: number;
  maxIssues?: number;
  minScore?: number;
}

export interface EvalCase {
  name: string;
  description: string;
  code: string;
  expect: EvalExpectation;
}

export const CASES: EvalCase[] = [
  {
    name: 'sql-injection',
    description: 'String-concatenated SQL query must be flagged as injection',
    code: `async function getUser(
  db: { query: (sql: string) => Promise<unknown[]> },
  username: string,
) {
  const sql = "SELECT * FROM users WHERE username = '" + username + "'";
  return db.query(sql);
}
`,
    expect: { mustFind: ['injection'] },
  },
  {
    name: 'hardcoded-secret',
    description: 'API keys embedded in source must be flagged',
    code: `export const config = {
  apiKey: 'sk-live-4f9a2c8b1d7e6f5a3c2b',
  stripeSecret: 'sk-test-0123456789abcdef0123456789abcdef',
};
`,
    expect: { mustFind: ['hardcod'] },
  },
  {
    name: 'possible-undefined',
    description: 'Dereferencing an optional property must be flagged',
    code: `interface User {
  profile?: { email: string };
}

export function contactEmail(user: User): string {
  return user.profile.email;
}
`,
    expect: { minIssues: 1 },
  },
  {
    name: 'clean-pure-function',
    description: 'Flawless code must produce zero issues and a good score',
    code: `export const clamp = (value: number, min: number, max: number): number => {
  if (min > max) throw new RangeError('min must be <= max');
  return Math.min(Math.max(value, min), max);
};
`,
    expect: { maxIssues: 0, minScore: 7 },
  },
  {
    name: 'unawaited-promise',
    description: 'Un-awaited promise and swallowed error must be flagged',
    code: `export async function loadAll(fetchItems: () => Promise<string[]>) {
  try {
    const items = fetchItems();
    console.log(items.length);
    return [];
  } catch (err) {
    console.log(err);
  }
}
`,
    expect: { minIssues: 1 },
  },
];