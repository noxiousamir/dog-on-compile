// No vscode import, so this is testable with `node --test`.
export function isCompile(text: string, pattern: string): boolean {
  try {
    return new RegExp(pattern, 'i').test(text);
  } catch {
    return false; // invalid user regex: never trigger rather than throw on every task
  }
}
