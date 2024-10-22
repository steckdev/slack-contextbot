# Code Style Guide

This project follows a consistent style for clean and maintainable code. Here are the key guidelines:

## General Guidelines

- **Use TypeScript**: All files should be written in TypeScript (.ts).
- **No unused variables**: Unused variables are prohibited. ESLint will flag them, and you should remove or refactor accordingly.
- **Limit `any` usage**: Avoid using `any` as much as possible. Prefer strong typing to leverage TypeScript’s type system.
- **Use single quotes**: Use single quotes for strings in JavaScript/TypeScript files.

## Linting

- **ESLint**: This project uses ESLint for linting. All JavaScript/TypeScript files must pass the ESLint check before merging.
- **Linting rules**:
  - `quotes`: Single quotes should be used (`'`).
  - `semi`: Semicolons are required.
  - `no-console`: Use `console` sparingly; prefer structured logging.
  - `@typescript-eslint/no-unused-vars`: Ensure there are no unused variables, with an exception for variables starting with `_`.

## Formatting

- **Prettier** is recommended for consistent formatting, but this is optional depending on your workflow.
- Ensure the following:
  - Indentation is **2 spaces**.
  - Use **spaces**, not tabs.
  - Line endings are **LF** (Unix style).

## File and Folder Structure

- **src/**: All source code resides here.
- **dist/**: Compiled JavaScript output from TypeScript.
- **test/**: Unit and integration tests.
- **.vscode/**: VSCode configuration for debugging, linting, and task automation.

## Comments

- Use **JSDoc** style comments for documenting functions, classes, and modules.
- Keep comments concise and relevant. Prefer self-explanatory code over excessive comments.

### Example

```typescript
/**
 * Function to greet a user.
 * @param name - The name of the user.
 * @returns A greeting message.
 */
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```

## Testing

- **Jest** is used for both unit and integration tests.
- Ensure each module has corresponding tests covering happy paths and edge cases.
- Integration tests should use mocks for external services (e.g., API requests) whenever possible.

## Spelling

- **CSpell** is used for spell-checking.
- Run `npm run cspell` to check for typos in your code.
- Add project-specific terms to the `cspell.json` file if necessary.

## Commit Messages

- Write clear and descriptive commit messages.
- Use imperative tone in the subject line (e.g., "Add feature", "Fix bug").
