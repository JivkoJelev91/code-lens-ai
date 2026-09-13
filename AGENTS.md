# Code Style Rules

Apply these rules to all code in this repo.

## Formatting
- Use semicolons everywhere. Never omit them.
- Keep every line under 110 characters.
- Guard clauses use a single-line return: `if (!x) return;`

## Variables
- Prefer destructuring for sibling `let`/`const` declarations that initialize
  together, one per line: `let [width, height, columns] = [0, 0, 0];`
  `const [node, label] = props.items;`